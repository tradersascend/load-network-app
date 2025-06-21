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

      if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // Verify JWT_SECRET exists
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET not found in environment variables');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded.id);

      // Get user and populate their company data
      req.user = await User.findById(decoded.id).populate('company').select('-password');
      
      if (!req.user) {
        console.log('User not found with ID:', decoded.id);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Check if user's company still exists
      if (!req.user.company) {
        console.log('User company not found for user:', req.user.email);
        return res.status(401).json({ message: 'Not authorized, company not found' });
      }

      console.log('User authenticated:', req.user.email);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Not authorized, invalid token' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      } else {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }
    }
  } else {
    console.log('No authorization header or invalid format');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };