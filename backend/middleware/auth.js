const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Check for token in multiple formats
    const authHeader = req.header('Authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    } else if (authHeader && authHeader.startsWith('Token ')) {
      token = authHeader.replace('Token ', '');
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'safwa_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
