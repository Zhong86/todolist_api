const jwt = require('jsonwebtoken'); 
const ACCESS_TOKEN = '1d75ffdd91e81516eff0a932ed77c8f5';

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ error: 'No token provided' }); 
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN); 
    req.user = decoded; 
    next(); 
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED'
      }); 
    }
    res.status(401).json({ error: 'Invalid token' }); 
  }
}

module.exports = { authMiddleware, ACCESS_TOKEN };
