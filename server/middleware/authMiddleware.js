const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token received:', token ? 'Present' : 'Missing');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded.id);

      // Get user and populate their company data
      req.user = await User.findById(decoded.id).populate('company').select('-password');
      
      if (!req.user) {
        console.log('User not found with ID:', decoded.id);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      console.log('User authenticated:', req.user.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('No authorization header or invalid format');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };