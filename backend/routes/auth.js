/**
 * Authentication Routes
 * Phase 2: User Registration, Login, and Profile Management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { User, UserStatistics } = require('../models');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  validateRequest,
  requireAuth,
  authLimiter,
  registrationLimiter,
  createUserSession,
  destroyUserSession,
  sanitizeUser,
  handleAuthError
} = require('../middleware/auth');

const router = express.Router();

// ===========================
// USER REGISTRATION
// ===========================

router.post('/register', 
  registrationLimiter,
  async (req, res) => {
    try {
      const { firstName, lastName, username, email, password } = req.body;

      // Simple validation
      if (!username || username.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Username must be at least 3 characters long'
        });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      });

      if (existingUser) {
        const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
        return res.status(409).json({
          success: false,
          error: `User with this ${field} already exists`
        });
      }

      // Create new user
      const newUser = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        profile: {
          firstName: firstName || '',
          lastName: lastName || '',
          grade: 'other',
          interests: []
        }
      });

      await newUser.save();

      // Create user statistics record
      const userStats = new UserStatistics({
        userId: newUser._id,
        overall: {
          totalQuizzesTaken: 0,
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          overallAccuracy: 0,
          totalTimeSpent: 0,
          averageSessionTime: 0,
          topicsExplored: 0,
          currentLevel: 1,
          totalXP: 0
        },
        streaks: {
          current: { count: 0 },
          longest: { count: 0 }
        },
        categories: []
      });

      await userStats.save();

      // Create session
      createUserSession(req, newUser);

      console.log(`✅ New user registered: ${username} (${email})`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: sanitizeUser(newUser)
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }
  }
);

// ===========================
// USER LOGIN
// ===========================

router.post('/login',
  authLimiter,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Simple validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      // Find user by username or email
      const user = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ],
        isActive: true
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username/email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username/email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Create session
      createUserSession(req, user);

      console.log(`✅ User logged in: ${user.username}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: sanitizeUser(user)
        }
      });

    } catch (error) {
      handleAuthError(error, req, res);
    }
  }
);

// ===========================
// USER LOGOUT
// ===========================

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await destroyUserSession(req);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

// ===========================
// GET CURRENT USER
// ===========================

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user || !user.isActive) {
      await destroyUserSession(req);
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user)
      }
    });

  } catch (error) {
    handleAuthError(error, req, res);
  }
});

// ===========================
// GET USER PROFILE
// ===========================

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user || !user.isActive) {
      await destroyUserSession(req);
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user)
      }
    });

  } catch (error) {
    handleAuthError(error, req, res);
  }
});

// ===========================
// UPDATE USER PROFILE
// ===========================

router.put('/profile', 
  requireAuth,
  validateRequest(updateProfileSchema),
  async (req, res) => {
    try {
      const { profile, settings } = req.validatedData;
      
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update profile if provided
      if (profile) {
        user.profile = {
          ...user.profile,
          ...profile
        };
      }

      // Update settings if provided
      if (settings) {
        user.settings = {
          ...user.settings,
          ...settings
        };
      }

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: sanitizeUser(user)
        }
      });

    } catch (error) {
      handleAuthError(error, req, res);
    }
  }
);

// ===========================
// CHECK SESSION STATUS
// ===========================

router.get('/status', (req, res) => {
  const isAuthenticated = !!(req.session && req.session.userId);
  
  res.json({
    success: true,
    data: {
      isAuthenticated,
      userId: req.session?.userId || null,
      username: req.session?.username || null
    }
  });
});

// ===========================
// DELETE ACCOUNT (DEACTIVATE)
// ===========================

router.delete('/account', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Deactivate instead of deleting
    user.isActive = false;
    await user.save();

    // Destroy session
    await destroyUserSession(req);

    console.log(`⚠️ User account deactivated: ${user.username}`);

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    handleAuthError(error, req, res);
  }
});

// ===========================
// CHANGE PASSWORD
// ===========================

router.put('/password', 
  requireAuth,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
      }

      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      console.log(`🔐 Password changed for user: ${user.username}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      handleAuthError(error, req, res);
    }
  }
);

module.exports = router;
