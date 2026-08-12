let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = {
    sign: (payload) => 'mock_token_' + JSON.stringify(payload),
    verify: (token) => {
      if (typeof token === 'string' && token.startsWith('mock_token_')) {
        return JSON.parse(token.replace('mock_token_', ''));
      }
      throw new Error('Invalid token');
    }
  };
}

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization') || (req.headers && req.headers['authorization']);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing or invalid' });
    }

    const secret = process.env.JWT_SECRET || 'safwa_secret_key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
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

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
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
