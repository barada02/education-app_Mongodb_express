/**
 * Authentication Middleware and Validation
 * Phase 2: Backend Authentication System
 */

const Joi = require('joi');
const { User } = require('../models');

// ===========================
// VALIDATION SCHEMAS
// ===========================

const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username can only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 100 characters',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  
  profile: Joi.object({
    firstName: Joi.string().max(50).allow(''),
    lastName: Joi.string().max(50).allow(''),
    grade: Joi.string().valid('elementary', 'middle', 'high', 'college', 'adult', 'other'),
    interests: Joi.array().items(Joi.string())
  }).optional()
});

const loginSchema = Joi.object({
  identifier: Joi.string()
    .required()
    .messages({
      'any.required': 'Username or email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

const updateProfileSchema = Joi.object({
  profile: Joi.object({
    firstName: Joi.string().max(50).allow(''),
    lastName: Joi.string().max(50).allow(''),
    grade: Joi.string().valid('elementary', 'middle', 'high', 'college', 'adult', 'other'),
    interests: Joi.array().items(Joi.string())
  }),
  
  settings: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    notifications: Joi.boolean(),
    privacy: Joi.string().valid('public', 'friends', 'private')
  })
});

// ===========================
// AUTHENTICATION MIDDLEWARE
// ===========================

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  // Add user info to request if authenticated, but don't require it
  if (req.session && req.session.userId) {
    req.isAuthenticated = true;
    req.userId = req.session.userId;
  } else {
    req.isAuthenticated = false;
    req.userId = null;
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId || !req.session.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Middleware to attach user data to request
const attachUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password');
      if (user && user.isActive) {
        req.user = user;
        req.isAuthenticated = true;
      } else {
        // User not found or inactive, clear session
        req.session.destroy();
        req.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Error attaching user:', error);
      req.isAuthenticated = false;
    }
  } else {
    req.isAuthenticated = false;
  }
  next();
};

// ===========================
// VALIDATION MIDDLEWARE
// ===========================

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};

// ===========================
// RATE LIMITING MIDDLEWARE
// ===========================

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for successful requests
    return req.session && req.session.userId;
  }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later',
    code: 'REGISTRATION_LIMIT_EXCEEDED'
  }
});

// ===========================
// UTILITY FUNCTIONS
// ===========================

const createUserSession = (req, user) => {
  req.session.userId = user._id.toString();
  req.session.username = user.username;
  req.session.email = user.email;
  req.session.isAdmin = user.email === 'admin@example.com'; // Simple admin check
  
  // Update last login
  user.lastLoginAt = new Date();
  user.save().catch(console.error);
};

const destroyUserSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const sanitizeUser = (user) => {
  const userObj = user.toJSON ? user.toJSON() : user;
  delete userObj.password;
  return userObj;
};

// ===========================
// ERROR HANDLERS
// ===========================

const handleAuthError = (error, req, res, next) => {
  console.error('Authentication error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: `${field} already exists`,
      code: 'DUPLICATE_FIELD'
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

module.exports = {
  // Validation schemas
  registerSchema,
  loginSchema,
  updateProfileSchema,
  
  // Authentication middleware
  requireAuth,
  optionalAuth,
  requireAdmin,
  attachUser,
  
  // Validation middleware
  validateRequest,
  
  // Rate limiting
  authLimiter,
  registrationLimiter,
  
  // Utility functions
  createUserSession,
  destroyUserSession,
  sanitizeUser,
  
  // Error handlers
  handleAuthError
};
