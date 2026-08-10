# SAFWA Step 3 — Controllers & Business Logic Technical Audit Report

## 1. Executive Summary
This document provides a comprehensive, line-by-line audit of all **12 Controllers** and **12 Route files** in the `backend/` directory of the SAFWA Car Workshop Management System. 

The audit cross-references controller implementations against:
- The stabilized **Sequelize Models & Association Matrix** (Step 1).
- The stabilized **Database Migrations & Schema** (Step 1).
- The verified **Factories & Seeders** (Step 2).
- Real business workflows and API contracts.

---

## 2. Controller Inventory

| Controller File | Handlers / Methods | Status & Health Summary |
| :--- | :--- | :--- |
| `customerController.js` | `getDashboard` | **CRITICAL BUGS**: Queries non-existent columns `technical_report.vehicle_id`, `technical_report.status`, `invoice.client_id`. |
| `dashboardController.js` | `getMetrics`, `getCharts`, `getWorkOrders` | **CRITICAL BUGS**: Queries non-existent columns `technical_report.status`, `technical_report.repair_type`, `technical_report.vehicle_id`. |
| `vehicleController.js` | `getAllVehicles`, `getVehicleHistory`, `getMyVehicles`, `createVehicle`, `updateVehicle` | **HIGH BUGS**: `getVehicleHistory` queries non-existent `technical_report.vehicle_id` and uses wrong alias `as: 'technician'` instead of `mechanic`. |
| `appointmentController.js` | `getAvailableSlots`, `createAppointment`, `getMyAppointments`, `getAssignedTasks`, `getAllAppointments`, `updateAppointment`, `getAppointmentById` | **MEDIUM**: Status filtering/mapping aligns with DB ENUMs; minor fix needed in `getAppointmentById` field name (`visual_notes` vs `visual_inspection_notes`). |
| `invoiceController.js` | `getPendingReports`, `issueInvoice`, `getInvoice`, `payInvoice`, `getMyInvoices` | **HIGH BUGS**: `payInvoice` uses wrong column names (`amount_paid` & `payment_date` instead of `amount` & `paid_at`). Association alias mismatches (`as: 'Invoice'` & `inv.Appointment`). |
| `requiredPartController.js` | `submitRequest`, `updateApproval` | **STABLE**: Business logic functions correctly. Auto-creates technical report stub if missing. |
| `sparePartController.js` | `getAllParts`, `addPart`, `updatePart` | **STABLE**: Accurate pagination, low stock alert calculation (`stock_quantity <= min_stock_level`). |
| `reviewController.js` | `getAllReviews`, `createReview` | **STABLE**: Review creation and retrieval work with stabilized associations. |
| `technicalReportController.js` | `createReport` | **STABLE**: Creates report with all new migration fields (`odometer`, `obd2_codes`, etc.). |
| `userController.js` | `register`, `login`, `getMe`, `getAllUsers`, `getStaffHighlights`, `createUser`, `updateUser`, `updateUserStatus` | **STABLE**: Authentication and user CRUD functional. Role name alignment check needed for `mechanic` vs `technician` in highlights. |
| `invoiceItemController.js` | Empty shell | Unused module shell. |
| `paymentController.js` | Empty shell | Unused module shell. |

---

## 3. Controller → Route Mapping Matrix

| Route Endpoint | HTTP Method | Middleware | Controller Handler | Alias / Contract Check |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | None | `userController.register` | Valid |
| `/api/auth/login` | `POST` | None | `userController.login` | Valid |
| `/api/users/me` | `GET` | `auth` | `userController.getMe` | Valid |
| `/api/users` | `GET` | `auth` | `userController.getAllUsers` | Valid |
| `/api/users/staff-highlights` | `GET` | `auth` | `userController.getStaffHighlights` | Role name check (`mechanic`) |
| `/api/users` | `POST` | `auth` | `userController.createUser` | Valid |
| `/api/users/:id` | `PUT` | `auth` | `userController.updateUser` | Valid |
| `/api/users/:id/status` | `PUT` | `auth` | `userController.updateUserStatus` | Valid |
| `/api/dashboard/metrics` | `GET` | `auth` | `dashboardController.getMetrics` | Schema bug in count |
| `/api/dashboard/charts` | `GET` | `auth` | `dashboardController.getCharts` | Schema bug in group |
| `/api/dashboard/work-orders` | `GET` | `auth` | `dashboardController.getWorkOrders` | Schema bug in find |
| `/api/customer/dashboard` | `GET` | `auth` | `customerController.getDashboard` | Schema bugs in report & invoice |
| `/api/vehicles` | `GET` | `auth` | `vehicleController.getAllVehicles` | Valid |
| `/api/vehicles/my` | `GET` | `auth` | `vehicleController.getMyVehicles` | Valid |
| `/api/vehicles` | `POST` | `auth` | `vehicleController.createVehicle` | Valid |
| `/api/vehicles/:id` | `PUT` | `auth` | `vehicleController.updateVehicle` | Valid |
| `/api/vehicles/:id/history` | `GET` | `auth` | `vehicleController.getVehicleHistory` | Schema bug & Alias bug |
| `/api/appointments/slots` | `GET` | None | `appointmentController.getAvailableSlots` | Valid (contains UI helper data) |
| `/api/appointments` | `POST` | `auth` | `appointmentController.createAppointment` | Valid |
| `/api/appointments/my` | `GET` | `auth` | `appointmentController.getMyAppointments` | Valid |
| `/api/appointments/assigned` | `GET` | `auth` | `appointmentController.getAssignedTasks` | Valid |
| `/api/appointments` | `GET` | `auth` | `appointmentController.getAllAppointments` | Valid |
| `/api/appointments/:id` | `GET` | `auth` | `appointmentController.getAppointmentById` | Valid |
| `/api/appointments/:id` | `PUT` | `auth` | `appointmentController.updateAppointment` | Valid |
| `/api/invoices/my` | `GET` | `auth` | `invoiceController.getMyInvoices` | Alias case check (`as: 'appointment'`) |
| `/api/invoices/reports` | `GET` | `auth` | `invoiceController.getPendingReports` | Alias case check (`as: 'invoice'`) |
| `/api/invoices/issue` | `POST` | `auth` | `invoiceController.issueInvoice` | Valid |
| `/api/invoices/:id` | `GET` | `auth` | `invoiceController.getInvoice` | Valid |
| `/api/invoices/:id/pay` | `POST` | `auth` | `invoiceController.payInvoice` | Column name bug (`amount` vs `amount_paid`) |
| `/api/inventory` | `GET` | `auth` | `sparePartController.getAllParts` | Valid |
| `/api/inventory` | `POST` | `auth` | `sparePartController.addPart` | Valid |
| `/api/inventory/:id` | `PUT` | `auth` | `sparePartController.updatePart` | Valid |
| `/api/reports` | `POST` | `auth` | `technicalReportController.createReport` | Valid |
| `/api/required-parts` | `POST` | `auth` | `requiredPartController.submitRequest` | Valid |
| `/api/required-parts/approval` | `PUT` | `auth` | `requiredPartController.updateApproval` | Valid |
| `/api/reviews` | `GET` | `auth` | `reviewController.getAllReviews` | Valid |
| `/api/reviews` | `POST` | `auth` | `reviewController.createReview` | Valid |

---

## 4. Confirmed Broken Queries & Association Mismatches

### Bug 1: `customerController.js` — Non-existent columns on `TechnicalReport` & `Invoice`
- **Location**: `customerController.js:32-35` and `customerController.js:51-55`
- **Current Broken Code**:
  ```js
  const report = await TechnicalReport.findOne({
    where: { vehicle_id: vehicleIds, status: ['pending', 'in_progress', 'waiting_parts'] },
    order: [['created_at', 'DESC']]
  });
  const invoices = await Invoice.findAll({
    where: { client_id: req.user.id }
  });
  ```
- **Root Cause**: 
  - `TechnicalReport` table has NO `vehicle_id` or `status` column. The relationship is `TechnicalReport -> Appointment -> Vehicle`, and the status is stored in `Appointment.status`.
  - `Invoice` table has NO `client_id` column. The relationship is `Invoice -> Appointment (client_id)`.
- **Required Fix**:
  - Query active repairs by fetching `Appointment` records matching `client_id: req.user.id` and `status: ['pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts']`, including `TechnicalReport`.
  - Query invoices by including `Appointment` with `where: { client_id: req.user.id }`.

### Bug 2: `dashboardController.js` — Non-existent columns on `TechnicalReport`
- **Location**: `dashboardController.js:22-28`, `112-115`, `167-176`
- **Current Broken Code**:
  ```js
  const carsInWorkshop = await TechnicalReport.count({
    where: { status: { [Op.in]: ['pending', 'in_progress', 'waiting_parts'] } }
  });
  const typeCounts = await TechnicalReport.findAll({
    attributes: ['repair_type', [TechnicalReport.sequelize.fn('COUNT', TechnicalReport.sequelize.col('id')), 'count']],
    group: ['repair_type']
  });
  ```
- **Root Cause**: `TechnicalReport` does not have `status` or `repair_type` columns.
- **Required Fix**:
  - `carsInWorkshop`: Count `Appointment` records where `status` is in `['under_inspection', 'in_progress', 'waiting_parts']`.
  - `typeCounts`: Derive repair categories from `TechnicalReport.diagnostics` / `urgency_level` or count `Appointment.problem_description` without crashing on non-existent columns.

### Bug 3: `vehicleController.js` — Non-existent columns & wrong alias in `getVehicleHistory`
- **Location**: `vehicleController.js:50-56`
- **Current Broken Code**:
  ```js
  const reports = await TechnicalReport.findAll({
    where: { vehicle_id: req.params.id, status: 'completed' },
    include: [{ model: User, as: 'technician', attributes: ['name'] }]
  });
  ```
- **Root Cause**:
  - `TechnicalReport` does not have `vehicle_id` or `status`.
  - The association in `TechnicalReport.js` is `belongsTo(User, { foreignKey: 'mechanic_id', as: 'mechanic' })`, NOT `as: 'technician'`.
- **Required Fix**:
  - Query history via `Appointment` (`where: { vehicle_id: req.params.id, status: 'completed' }`) and include `TechnicalReport` and `User as: 'mechanic'`.

### Bug 4: `invoiceController.js` — Column name mismatch in `payInvoice`
- **Location**: `invoiceController.js:224-229`
- **Current Broken Code**:
  ```js
  await Payment.create({
    invoice_id: invoice.id,
    amount_paid: amount_paid || invoice.total_amount,
    payment_method: payment_method || 'credit_card',
    payment_date: new Date()
  });
  ```
- **Root Cause**: The DB columns in `payments` migration & model are `amount` (NOT `amount_paid`) and `paid_at` (NOT `payment_date`).
- **Required Fix**: Use `amount` and `paid_at`. Also verify payment amount against total invoice balance for accurate partial vs full payment status updates.

### Bug 5: `invoiceController.js` — Association Alias Case Mismatches
- **Location**: `invoiceController.js:44` and `invoiceController.js:244-256`
- **Current Broken Code**:
  - `include: [{ model: Invoice, as: 'Invoice' }]` (Capital 'I')
  - `include: [{ model: Appointment, required: true, where: { client_id: req.user.id } }]` (Missing `as: 'appointment'`)
- **Root Cause**: Step 1 established exact lowercase aliases: `as: 'invoice'` and `as: 'appointment'`.
- **Required Fix**: Align include aliases with `as: 'invoice'` and `as: 'appointment'`.

---

## 5. Previously Reported Observations — Verified Status

1. **`customerController` broken queries**: **VERIFIED**. Confirmed SQL errors on `vehicle_id`, `status`, and `client_id`.
2. **`dashboardController` broken queries**: **VERIFIED**. Confirmed SQL errors on `status` and `repair_type`.
3. **`vehicleController.getVehicleHistory` broken queries**: **VERIFIED**. Confirmed SQL errors on `vehicle_id` and alias `technician`.
4. **`invoiceController.payInvoice` broken columns**: **VERIFIED**. Confirmed `amount_paid` vs `amount` and `payment_date` vs `paid_at`.
5. **`invoiceController` alias mismatches**: **VERIFIED**. Confirmed `as: 'Invoice'` capitalization mismatch.
6. **`userController.getStaffHighlights` role name**: **VERIFIED**. Uses `role: 'technician'`, whereas seeders and role definitions use `role: 'mechanic'`.

---

## 6. Business Logic & Payment Calculation Review

### Invoice ↔ Payment Financial Logic
- **Current State**: `payInvoice` sets `invoice.status = 'paid'` blindly regardless of whether the payment amount covers the full `total_amount`.
- **Required Business Logic**:
  - Calculate `sum(existing_payments.amount) + new_payment.amount`.
  - If `total_paid >= invoice.total_amount`: `invoice.status = 'paid'`.
  - If `0 < total_paid < invoice.total_amount`: `invoice.status = 'partially_paid'`.
  - Prevent payments that exceed `invoice.total_amount`.

### Appointment Workflows & Statuses
- All controllers now reference valid ENUM statuses (`pending`, `awaiting_assignment`, `under_inspection`, `in_progress`, `waiting_parts`, `completed`, `cancelled`).
- Hyphenated `'in-progress'` is completely removed from controller logic.

---

## 7. Categorization of Mock / Fallback Data

| Controller / Method | Mock Data Description | Classification | Recommendation for Step 3 |
| :--- | :--- | :--- | :--- |
| `appointmentController.getAvailableSlots` | Available time slots & service list | **C. UI Helper Data** | Keep (Required by frontend presentation). |
| `dashboardController.getWorkOrders` | Hardcoded work orders array fallback | **B. Mock DB Data** | Remove fallback; return empty array `[]` when no work orders exist. |
| `dashboardController.getCharts` | Hardcoded distribution percentages | **C. UI Helper Data** | Keep default percentage structure if zero orders exist to maintain chart rendering. |
| `invoiceController.getPendingReports` | Hardcoded `REP-1022` fallback array | **B. Mock DB Data** | Remove fallback; return `[]`. |
| `invoiceController.getInvoice` | Hardcoded invoice details fallback | **B. Mock DB Data** | Remove fallback; return HTTP `404` when invoice ID is not found. |
| `vehicleController.getAllVehicles` | Hardcoded Toyota Camry fallback array | **B. Mock DB Data** | Remove fallback; return `[]`. |
| `vehicleController.getVehicleHistory` | Hardcoded history node fallback array | **B. Mock DB Data** | Remove fallback; return `[]`. |
| `reviewController.getAllReviews` | Hardcoded reviews fallback array | **B. Mock DB Data** | Remove fallback; return `[]`. |
| `userController.getStaffHighlights` | Random stats (`Math.random()`) | **C. UI Helper Data** | Calculate real count of completed appointments per mechanic or return clean zero stats. |

---

## 8. Data Ownership & Security Vulnerabilities (Pre-RBAC)

1. **`appointmentController.updateAppointment`**:
   - `PUT /api/appointments/:id` does not verify if `req.user.id` is an admin/mechanic or the client owning the appointment.
2. **`requiredPartController.updateApproval`**:
   - `PUT /api/required-parts/approval` does not verify if the user has authorization to approve parts.
3. **`vehicleController.updateVehicle`**:
   - Properly checks `where: { id, client_id: req.user.id }` (**SECURE**).
4. **`appointmentController.getMyAppointments`**:
   - Properly checks `where: { client_id: req.user.id }` (**SECURE**).

---

## 9. HTTP Status Codes Audit

- `500 Internal Server Error` is currently returned for all caught errors.
- **Recommended Improvements**:
  - Missing resource by ID -> `404 Not Found`.
  - Invalid input parameters / missing body fields -> `400 Bad Request`.
  - Resource modification unauthorized -> `403 Forbidden`.

---

## 10. Recommended Batch Fix Order for Step 3

To maintain strict incremental control, fixes for Step 3 should be executed in 4 controlled batches:

```
Batch 3.1: Customer & Dashboard Controllers Repair
- Fix customerController.js queries (Appointment & Invoice joins).
- Fix dashboardController.js metrics & work-orders queries.
- Clean mock fallbacks in customer & dashboard endpoints.

Batch 3.2: Vehicle & Technical Report Controllers Repair
- Fix vehicleController.js getVehicleHistory queries & mechanic alias.
- Verify vehicleController ownership checks.

Batch 3.3: Invoice & Payment Controllers Repair
- Fix invoiceController.js payInvoice column names (amount, paid_at).
- Implement financial partial vs full payment status calculation.
- Fix invoiceController.js association aliases (as: 'invoice', as: 'appointment').
- Clean mock fallbacks in invoice endpoints.

Batch 3.4: Appointments, Inventory, Reviews & User Controllers Polish
- Align role name query in getStaffHighlights ('mechanic').
- Remove remaining database mock fallbacks (reviews, inventory presentation).
- Finalize E2E programmatic verification of all 12 controllers.
```

---

## 11. Risk Level
- **CRITICAL**: High risk of runtime SQL errors in `customerController`, `dashboardController`, and `vehicleController` without fixes.
- **HIGH**: Financial data corruption risk in `invoiceController.payInvoice` if column names are not corrected.

---

## 12. Target Files for Modification in Step 3
- `backend/controllers/customerController.js`
- `backend/controllers/dashboardController.js`
- `backend/controllers/vehicleController.js`
- `backend/controllers/invoiceController.js`
- `backend/controllers/userController.js`
- `backend/controllers/reviewController.js`
- `backend/controllers/appointmentController.js`
- `backend/docs/STEP3_CONTROLLER_AUDIT.md`

---

## 13. Questions Requiring Project Owner Approval
1. Do you approve the proposed 4-batch implementation plan for Step 3? (APPROVED)
2. Do you confirm the removal of all mock database fallbacks (returning `404` for missing IDs and `[]` for empty lists) while preserving presentation UI helper structures? (APPROVED)

---

## 14. Batch 3.1 Execution & Verification Log

### Files Modified
- `backend/controllers/customerController.js`
- `backend/controllers/dashboardController.js`

### Changes Implemented
1. **`customerController.getDashboard`**:
   - Replaced invalid columns (`TechnicalReport.vehicle_id`, `status`, `Invoice.client_id`) with clean association queries on `Appointment` (`client_id: req.user.id`, `status: ['pending', 'awaiting_assignment', 'under_inspection', 'in_progress', 'waiting_parts']`).
   - Joined `Invoice` via `Appointment` with `as: 'appointment'` and filtered by `client_id: req.user.id`.
   - Enforced strict customer data ownership (`req.user.id`).
2. **`dashboardController.getMetrics`**:
   - Updated `carsInWorkshop` calculation to count `Appointment` records with workshop active statuses (`under_inspection`, `in_progress`, `waiting_parts`).
   - Updated `pendingAppointments` to count `Appointment` records with `pending` / `awaiting_assignment` statuses.
   - Calculated `lowStockCount` comparing `stock_quantity <= min_stock_level`.
3. **`dashboardController.getCharts`**:
   - Grouped technical reports by `urgency_level` safely mapped to labels, eliminating queries on non-existent `repair_type`.
4. **`dashboardController.getWorkOrders`**:
   - Queried `Appointment` with includes for `Vehicle (as: 'vehicle')`, `User (as: 'customer')`, `User (as: 'mechanic')`, and `Invoice (as: 'invoice')`.
   - Removed fallback mock work order `#WO-8842`. Returns empty array `[]` when no work orders exist.

### Test Execution & Results
- **DB Connection**: Verified.
- **Seeded Client (ID 73)**: Successfully returned 1 vehicle, active repair `#REP-6`, and 1 recent invoice.
- **Non-existent Client (ID 999999)**: Returned HTTP `404 Customer not found`.
- **Empty Client (0 vehicles)**: Returned `vehicles: []`, `activeRepair: null`, `recentInvoices: []`.
- **Dashboard Metrics & Charts**: All metrics and urgency counts calculated without SQL errors.
- **Dashboard Work Orders**: Returned clean DB records or `[]` when empty.

---

## 15. Batch 3.2 Execution & Verification Log

### Files Modified
- `backend/controllers/vehicleController.js`

### Changes Implemented
1. **`vehicleController.getAllVehicles`**:
   - Removed fallback mock vehicle (`veh_1`). Returns empty list `[]` when DB has 0 vehicles.
   - Preserved `owner` association (`as: 'owner'`).
2. **`vehicleController.getVehicleHistory`**:
   - Replaced invalid query on `TechnicalReport.vehicle_id` and `status` with clean `Appointment` join (`vehicle_id: req.params.id`, `status: 'completed'`).
   - Corrected mechanic association alias from `as: 'technician'` to `as: 'mechanic'`.
   - Joined `TechnicalReport (as: 'report')` and `Invoice (as: 'invoice')`.
   - Returned `404 Vehicle not found` if vehicle ID does not exist in DB.
   - Removed fallback mock history (`node_1`). Returns `[]` when no history records exist.
3. **`vehicleController.updateVehicle`**:
   - Verified strict vehicle ownership check (`client_id: req.user.id`). Unauthorized updates return `404 Vehicle not found or unauthorized`.

### Test Execution & Results
- **`getAllVehicles`**: Returned 5 vehicles from DB without errors or mock fallback.
- **`getMyVehicles`**: Returned 1 vehicle for client ID 73.
- **`getVehicleHistory`**: Successfully queried vehicle 6. Returned `[]` when no completed appointments existed.
- **Non-existent Vehicle ID**: Returned HTTP `404`.
- **Ownership Verification**: Owner update succeeded (200 OK); unauthorized client update rejected (404 Not Found).
- **Regression Check**: Batch 3.1 endpoints (`getDashboard`, `getMetrics`) passed 100%.

---

## 16. Batch 3.3 Execution & Verification Log

### Files Modified
- `backend/controllers/invoiceController.js`

### Changes Implemented
1. **`invoiceController.payInvoice`**:
   - Replaced invalid column names (`amount_paid`, `payment_date`) with correct DB schema columns (`amount`, `paid_at`).
   - Implemented dynamic calculation of existing payments (`SUM(payments.amount)`).
   - Enforced strict financial validation: rejected `NaN`, negative, zero, and overpayment (`paymentAmount > remainingBalance`) with HTTP 400.
   - Enforced accurate status logic: `unpaid`, `partially_paid`, `paid`.
   - Preserved all historical payments without overwriting or deleting old payments.
   - Wrapped `Payment.create()` and `Invoice.update()` in a Sequelize Transaction (`sequelize.transaction()`).
2. **`invoiceController.getInvoice`**:
   - Replaced mock Lexus invoice fallback with HTTP 404 when invoice does not exist.
   - Corrected model associations (`as: 'appointment'`, `as: 'items'`, `as: 'payments'`).
3. **`invoiceController.getPendingReports`**:
   - Fixed uppercase alias `as: 'Invoice'` to lowercase `as: 'invoice'`.
   - Removed mock fallbacks (`REP-1022`, `REP-1019`).
4. **`invoiceController.getMyInvoices`**:
   - Fixed missing alias `as: 'appointment'` in `include`.
   - Enforced customer data scoping (`client_id: req.user.id`).
5. **`invoiceController.issueInvoice`**:
   - Added check for existing invoice for the appointment and validation of total amount > 0.

### Test Execution & Results
- **TEST 1 (Get existing invoice)**: 200 OK with real costs, payments, and remaining balance.
- **TEST 2 (Non-existing invoice)**: HTTP 404.
- **TEST 3 & 4 (Pending reports)**: Returned 6 real records, no mock fallback.
- **TEST 5 & 7 (Partial payments)**: Processed 200 SAR then 100 SAR on 500 SAR invoice. Status transitioned to `partially_paid`, old payments preserved.
- **TEST 6 (Final balance payment)**: Remaining 200 SAR paid. Status transitioned to `paid`.
- **TEST 8 & 9 (Invalid amounts 0 / negative)**: Rejected with HTTP 400.
- **TEST 10 (Overpayment)**: 600 SAR payment on 500 SAR invoice rejected with HTTP 400.
- **TEST 11 (Non-existent invoice payment)**: HTTP 404.
- **TEST 12 (getMyInvoices)**: Executed without AssociationError.
- **TEST 13 (Financial Consistency Check)**: Verified `SUM(payments.amount) <= total_amount` across ALL invoices in DB.
- **Regression Check**: Step 1, Step 2, Batch 3.1, Batch 3.2 endpoints ALL PASSED.



