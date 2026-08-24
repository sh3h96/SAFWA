const jwt = require('jsonwebtoken');
const { User } = require('../models');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment');
    }
    return 'safwa_secret_key';
  }
  return secret;
};

const authenticateToken = async (req, res, next) => {
  const secret = getJwtSecret();
  try {
    const authHeader = req.header('Authorization') || (req.headers && req.headers['authorization']);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const decoded = jwt.verify(token, secret);

    // Reject legacy tokens or tokens missing tokenVersion claim
    if (decoded.tokenVersion === undefined || decoded.tokenVersion === null) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    // Active DB verification: Check user exists, status is active, and tokenVersion matches
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'role', 'status', 'token_version']
    });

    if (!user) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    if (user.status === 'suspended' || user.status === 'موقوف') {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    if (user.token_version !== decoded.tokenVersion) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    // Attach verified user info with authoritative current DB role
    req.user = {
      id: user.id,
      role: user.role,
      email: decoded.email,
      status: user.status
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication token missing or invalid' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const userRole = req.user.role;
    const isAllowed = allowedRoles.includes(userRole) || (userRole === 'super_admin' && allowedRoles.includes('admin'));

    if (!isAllowed) {
      return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
    }

    next();
  };
};

// Backward Compatibility Export: Allows both `const auth = require('./auth')` and `const { requireRole } = require('./auth')`
const auth = authenticateToken;
auth.authenticateToken = authenticateToken;
auth.requireRole = requireRole;

module.exports = auth;
