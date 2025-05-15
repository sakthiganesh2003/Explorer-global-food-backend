const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Invalid token format' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ msg: 'Token is not valid', error: err.message });
  }
};