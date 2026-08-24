'use strict';

const { AuditLog } = require('../models');

/**
 * List of sensitive key patterns to redact from audit log snapshots.
 */
const FORBIDDEN_KEY_PATTERNS = [
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'verification_token',
  'verification_token_hash',
  'verification_token_expires_at',
  'reset_token',
  'reset_token_hash',
  'reset_token_expires_at',
  'token_version',
  'jwt_secret',
  'secret',
  'auth_hash'
];

/**
 * Recursively sanitize an object or array, stripping or redacting sensitive keys.
 * @param {*} data - Data object to sanitize
 * @returns {*} Sanitized copy of the data
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return null;
  }

  // Handle Sequelize instances or objects with toJSON method
  if (typeof data === 'object' && typeof data.toJSON === 'function') {
    data = data.toJSON();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = FORBIDDEN_KEY_PATTERNS.some(pattern => lowerKey.includes(pattern));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Log an audit trail entry.
 * @param {Object} params
 * @param {Object} [params.req] - Express request object (actor is extracted strictly from req.user.id)
 * @param {String} params.action - Action name from audit taxonomy
 * @param {String} params.entityType - Entity type affected (e.g., 'User', 'Vehicle', 'Appointment')
 * @param {String|Number} [params.entityId] - ID of the entity affected
 * @param {Object} [params.oldValues] - Prior state snapshot
 * @param {Object} [params.newValues] - New state snapshot
 * @param {Object} [params.transaction] - Optional Sequelize transaction
 */
async function logAudit({ req, action, entityType, entityId, oldValues, newValues, transaction = null }) {
  try {
    // Identity Enforcement: Actor ID comes STRICTLY from authenticated req.user.id
    const actor_user_id = req?.user?.id || null;

    const sanitizedOld = oldValues !== undefined && oldValues !== null ? sanitizeData(oldValues) : null;
    const sanitizedNew = newValues !== undefined && newValues !== null ? sanitizeData(newValues) : null;

    // IP Address extraction
    let ip_address = null;
    if (req) {
      ip_address = req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null;
      if (typeof ip_address === 'string' && ip_address.includes(',')) {
        ip_address = ip_address.split(',')[0].trim();
      }
    }

    // User Agent extraction
    const user_agent = req?.headers?.['user-agent'] || null;

    const auditData = {
      actor_user_id,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      old_values: sanitizedOld,
      new_values: sanitizedNew,
      ip_address,
      user_agent
    };

    const options = transaction ? { transaction } : {};
    return await AuditLog.create(auditData, options);
  } catch (error) {
    // Non-blocking catch: audit failures are logged server-side without breaking primary workflow
    console.error('Audit Log Insertion Failed:', error.message, { action, entityType, entityId });
    return null;
  }
}

module.exports = {
  logAudit,
  sanitizeData
};
