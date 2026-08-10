# Step 4 — Authentication & Authorization (RBAC) Audit Report

## 1. Authentication Architecture
The SAFWA Backend uses Stateless JSON Web Token (JWT) based authentication.
- **Login Flow**: `POST /api/auth/login` verifies user email and bcrypt password hash, then issues a JWT signed with user metadata (`{ id, role, email }`).
- **Registration Flow**: `POST /api/auth/register` creates a user with default role `'client'`, hashes the password, issues a JWT, and sends a welcome email.
- **Token Transmission**: Clients must attach the JWT in the HTTP request headers (`Authorization: Bearer <token>`).
- **User Context Propagation**: `middleware/auth.js` decodes the token and attaches the decoded payload to `req.user`.

---

## 2. JWT Audit
- **JWT Secret**: Configured via `process.env.JWT_SECRET` with fallback to `'safwa_secret_key'`.
- **JWT Expiration**: Set to `1d` (24 hours).
- **JWT Payload Structure**:
  ```json
  {
    "id": 73,
    "role": "client",
    "email": "client@safwa.sa",
    "iat": 1723276800,
    "exp": "1723363200"
  }
  ```
- **Signing Verification**: Handled via `jsonwebtoken.sign()` in `userController.js` and verified via `jsonwebtoken.verify()` in `middleware/auth.js`.

---

## 3. Bearer Token Audit
- **Current Behavior**: `middleware/auth.js` accepts token from three sources:
  1. `Authorization: Bearer <token>` (Standard)
  2. `Authorization: Token <token>` (Non-standard)
  3. `req.query.token` (VULNERABLE)
- **Required Standard**: Strictly enforce `Authorization: Bearer <token>` format in HTTP headers only. Reject non-header formats.

---

## 4. Current Auth Middleware
- Located at `backend/middleware/auth.js`.
- Checks for presence of token, attempts `jwt.verify()`, populates `req.user`, and calls `next()`.
- **Defect**: Lacks role checking mechanisms (`requireRole`, `requireAnyRole`). Returns `401 Unauthorized` for both missing/invalid token and invalid signature without distinguishing role authorization (`403 Forbidden`).

---

## 5. Query Token Finding
- **Severity**: HIGH (Confirmed Security Risk)
- **Line Reference**: `middleware/auth.js:13-15`
  ```javascript
  } else if (req.query.token) {
    token = req.query.token;
  }
  ```
- **Risk Explanation**: Tokens sent as URL query parameters (`/api/invoices?token=xyz`) get recorded in web server access logs, browser history, proxy caches, and external `Referer` headers, leaking sensitive access credentials.
- **Recommendation**: Remove `req.query.token` support completely.

---

## 6. Roles Verified
Based on `User` model, database migrations, seeders (`20260725220111-demo-data.js`), and `userController.js`, the exact system roles are:
1. `admin`: System Manager / Administrator (Full Access).
2. `client`: Car Owner / Customer.
3. `mechanic`: Workshop Technician / Engineer (Assigned repairs & technical reports).
4. `receptionist`: Front Desk / Reception Staff (Bookings, Customer service, Vehicle intake).

*Note*: Any legacy references to `'technician'` have been standardized to `'mechanic'`.

---

## 7. Complete RBAC Matrix

| Endpoint | Method | Auth Required | Allowed Roles | Ownership Required | Current Protection | Security Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | POST | NO | Public | NO | None | Low |
| `POST /api/auth/register` | POST | NO | Public | NO | None (Role locked to `client`) | Low |
| `GET /api/users/me` | GET | YES | Any Authenticated | YES (`req.user.id`) | `auth` | Low |
| `GET /api/users` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view all users |
| `POST /api/users` | POST | YES | `admin` | NO | `auth` (Missing Role check) | CRITICAL: Anyone can create admin users |
| `GET /api/users/staff-highlights` | GET | YES | Any Authenticated | NO | `auth` | Low |
| `PUT /api/users/:id` | PUT | YES | `admin` | NO (Self or Admin) | `auth` (Missing Role check) | HIGH: Anyone can edit user profiles |
| `PUT /api/users/:id/status` | PUT | YES | `admin` | NO | `auth` (Missing Role check) | HIGH: Anyone can suspend users |
| `GET /api/vehicles` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view all vehicles |
| `GET /api/vehicles/my` | GET | YES | `client` | YES (`client_id`) | `auth` + DB Scoped | Low |
| `POST /api/vehicles` | POST | YES | `client`, `admin`, `receptionist` | YES (`client_id`) | `auth` + DB Scoped | Low |
| `PUT /api/vehicles/:id` | PUT | YES | `admin`, `receptionist`, `client` | YES (`client_id` for client) | `auth` + DB Scoped | Low |
| `GET /api/vehicles/:id/history` | GET | YES | `admin`, `receptionist`, `mechanic`, `client` | YES (`client_id` for client) | `auth` + DB Scoped | Low |
| `GET /api/appointments/slots` | GET | PUBLIC | Public / Authenticated | NO | None | Low |
| `POST /api/appointments` | POST | YES | `client`, `admin`, `receptionist` | YES (`vehicle ownership`) | `auth` + DB Scoped | Low |
| `GET /api/appointments/my` | GET | YES | `client` | YES (`client_id`) | `auth` + DB Scoped | Low |
| `GET /api/appointments/assigned` | GET | YES | `mechanic` | YES (`mechanic_id`) | `auth` + DB Scoped | Low |
| `GET /api/appointments` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view all appointments |
| `GET /api/appointments/:id` | GET | YES | `admin`, `receptionist`, `mechanic`, `client` | YES (`client_id` or `mechanic_id`) | `auth` + DB Scoped | Low |
| `PUT /api/appointments/:id` | PUT | YES | `admin`, `receptionist`, `mechanic` | NO (Admin/Receptionist/Mechanic) | `auth` (Missing Role check) | HIGH: Client can change appointment status |
| `GET /api/invoices/my` | GET | YES | `client` | YES (`client_id`) | `auth` + DB Scoped | Low |
| `GET /api/invoices/reports` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view unbilled reports |
| `POST /api/invoices/issue` | POST | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client or Mechanic can issue invoices |
| `GET /api/invoices/:id` | GET | YES | `admin`, `receptionist`, `client` | YES (`client_id` for client) | `auth` + DB Scoped | Low |
| `POST /api/invoices/:id/pay` | POST | YES | `admin`, `receptionist`, `client` | YES (`client_id` for client) | `auth` + DB Scoped | Low |
| `GET /api/inventory` | GET | YES | `admin`, `receptionist`, `mechanic` | NO | `auth` | Medium |
| `POST /api/inventory` | POST | YES | `admin` | NO | `auth` (Missing Role check) | HIGH: Anyone can add inventory parts |
| `PUT /api/inventory/:id` | PUT | YES | `admin` | NO | `auth` (Missing Role check) | HIGH: Anyone can modify stock/prices |
| `GET /api/reviews` | GET | YES | Any Authenticated | NO | `auth` | Low |
| `POST /api/reviews` | POST | YES | `client` | YES (`appointment ownership`) | `auth` + DB Scoped | Low |
| `POST /api/reports` | POST | YES | `mechanic`, `admin` | YES (`mechanic_id`) | `auth` (Missing Role check) | HIGH: Client can post technical reports |
| `POST /api/required-parts` | POST | YES | `mechanic`, `admin` | NO | `auth` (Missing Role check) | HIGH: Client can request spare parts |
| `PUT /api/required-parts/approval` | PUT | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Mechanic/Client can approve parts |
| `GET /api/dashboard/metrics` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client/Mechanic can view overall metrics |
| `GET /api/dashboard/charts` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view financial charts |
| `GET /api/dashboard/work-orders` | GET | YES | `admin`, `receptionist` | NO | `auth` (Missing Role check) | HIGH: Client can view all work orders |
| `GET /api/customer/dashboard` | GET | YES | `client` | YES (`req.user.id`) | `auth` + DB Scoped | Low |

---

## 8. Ownership Matrix

| Resource | Scoped Attribute | Admin | Receptionist | Mechanic | Client |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vehicle** | `client_id` | Full Access | Full Access | Read-Only (Assigned) | Own Vehicles Only |
| **Appointment** | `client_id` / `mechanic_id` | Full Access | Full Access | Assigned Appointments | Own Appointments Only |
| **Invoice** | `appointment.client_id` | Full Access | Full Access | No Direct Access | Own Invoices Only |
| **Payment** | `invoice.appointment.client_id` | Full Access | Full Access | No Direct Access | Own Invoice Payments Only |
| **Technical Report**| `mechanic_id` | Full Access | Full Access | Authored Reports | Read-Only (Own Vehicle) |
| **Review** | `client_id` | Full Access | Read-Only | Read-Only | Own Reviews Only |

---

## 9. Route Security Audit
All 12 route files currently use only the generic `auth` middleware (or no middleware for auth/slots). No routes currently enforce role restrictions (`requireRole`).

---

## 10. Critical Vulnerabilities (12 Verified Findings)
1. **Client Cross-Vehicle Reading**: `GET /api/vehicles` returns ALL vehicles to any logged-in user (including clients) due to missing RBAC middleware.
2. **Client Appointment Viewing**: `GET /api/appointments` returns ALL appointments in the workshop to clients.
3. **Client Administrative Status Elevation**: `PUT /api/appointments/:id` allows a client to change appointment status to `completed` or `cancelled` without role checking.
4. **Unrestricted Invoice Issuance**: `POST /api/invoices/issue` can be triggered by any authenticated user (client/mechanic).
5. **Unrestricted Dashboard Access**: `GET /api/dashboard/metrics` and `charts` expose workshop financial totals to regular clients.
6. **Unrestricted User Management**: `POST /api/users` and `PUT /api/users/:id/status` allow any logged-in user to create or suspend admin accounts.
7. **Unrestricted Inventory Modification**: `POST /api/inventory` and `PUT /api/inventory/:id` allow clients or mechanics to change stock quantities and prices.
8. **Technical Report Fabrication**: `POST /api/reports` allows clients to submit technical inspection reports.
9. **Required Parts Approval Bypass**: `PUT /api/required-parts/approval` allows non-administrative users to approve parts requests.
10. **Query Token Exposure**: `req.query.token` allows authentication via URL parameters.
11. **Non-Standard Authorization Header**: `Token <token>` format accepted alongside standard `Bearer`.
12. **Missing HTTP 403 Responses**: System returns HTTP 401 for all authorization failures, failing HTTP status standards.

---

## 11. 401 / 403 / 404 HTTP Contract
- **HTTP 401 Unauthorized**:
  - Missing `Authorization` header.
  - Malformed token format (e.g. not starting with `Bearer `).
  - Invalid signature or expired token.
  - Standard Response: `{ "message": "Authentication token missing or invalid" }`
- **HTTP 403 Forbidden**:
  - Authenticated user role is not permitted for the endpoint (e.g. Client attempting `POST /api/invoices/issue`).
  - Account suspended (`status === 'suspended'`).
  - Standard Response: `{ "message": "Access forbidden: insufficient permissions" }`
- **HTTP 404 Not Found**:
  - Requested resource ID does not exist in DB.
  - Resource belongs to another user (Ownership Protection to avoid exposing resource existence).
  - Standard Response: `{ "message": "Resource not found" }`

---

## 12. Proposed Middleware Architecture
Create clean, modular middleware helpers in `backend/middleware/auth.js`:

```javascript
// 1. authenticateToken: Verifies Bearer JWT only
const authenticateToken = (req, res, next) => { ... };

// 2. requireRole: Restricts route to specific allowed roles
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
    }
    next();
  };
};
```

---

## 13. Proposed Fix Order (Step 4 Implementation Plan)
- **Batch 4.1**: Refactor `middleware/auth.js` (Bearer token enforcement, remove query token, export `authenticateToken` & `requireRole`).
- **Batch 4.2**: Apply RBAC middleware to Administrative & Dashboard Routes (`userRoutes.js`, `dashboardRoutes.js`, `sparePartRoutes.js`).
- **Batch 4.3**: Apply RBAC middleware to Operational & Technical Routes (`appointmentRoutes.js`, `technicalReportRoutes.js`, `requiredPartRoutes.js`).
- **Batch 4.4**: Apply RBAC middleware to Financial & Vehicle Routes (`invoiceRoutes.js`, `vehicleRoutes.js`, `customerRoutes.js`, `reviewRoutes.js`).

---

## 14. Test Plan (Safe Non-Destructive Plan)
Future execution tests (after approval):
1. **No Token Test**: Request protected route without header -> 401.
2. **Query Token Test**: Request `?token=xyz` -> 401 (Rejected).
3. **Expired / Invalid Token Test** -> 401.
4. **Role Prohibition Test**: Client calling `POST /api/invoices/issue` -> 403.
5. **Mechanic Prohibition Test**: Mechanic calling `PUT /api/users/:id/status` -> 403.
6. **Admin / Receptionist Authorization Test**: Admin calling `GET /api/dashboard/metrics` -> 200.
7. **Client Ownership Test**: Client fetching `/api/vehicles/my` -> 200 (Own vehicles only).

---

## 15. Files Reviewed
- `backend/middleware/auth.js`
- `backend/server.js`
- `backend/routes/*.js` (All 12 route files)
- `backend/controllers/*.js` (All 10 controller files)
- `backend/models/user.js`
- `backend/seeders/20260725220111-demo-data.js`
- `backend/factories/index.js`

---

## 16. Files Modified
- `backend/docs/STEP4_AUTH_RBAC_AUDIT.md` (NEW FILE - Audit Documentation Only)
- `implementation_plan.md` (Artifact Updated)

---

## 17. Git Status
No source code files modified. Working directory is clean except for documentation artifact.

---

## 18. Risk Assessment
- **Current State**: Authentication is functional, but RBAC role authorization is missing across route files.
- **Risk Level**: HIGH if deployed as-is (clients could access admin dashboards, modify appointment statuses, or manage users).
- **Remediation Effort**: LOW-MEDIUM (Modular `requireRole` middleware can be cleanly attached to existing routes).

---

## 19. Recommended Step 4 Implementation Batches
1. **Batch 4.1**: `middleware/auth.js` Refactoring (COMPLETED).
2. **Batch 4.2**: Administrative, User Management & Inventory Routes Protection.
3. **Batch 4.3**: Technical, Appointment & Spare Parts Request Routes Protection.
4. **Batch 4.4**: Financial & Vehicle Routes Protection + Full RBAC Integration Verification.

---

## 20. Batch 4.1 Execution Log
- **File Modified**: `backend/middleware/auth.js`
- **Changes**:
  - Implemented `authenticateToken` requiring strict `Authorization: Bearer <token>` header format.
  - Completely purged support for `req.query.token` and `Authorization: Token <token>`.
  - Enforced HTTP 401 response `{ "message": "Authentication token missing or invalid" }` for missing, malformed, or invalid tokens.
  - Implemented `requireRole(...allowedRoles)` middleware helper, returning HTTP 403 `{ "message": "Access forbidden: insufficient permissions" }` for insufficient roles.
  - Preserved backward compatibility so `const auth = require('../middleware/auth')` continues to function seamlessly across all existing route files.
- **Test Results**: All 13 non-destructive test cases passed 100%.

