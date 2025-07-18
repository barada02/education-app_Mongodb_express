/**
 * Dashboard Routes
 * Phase 2: User Statistics, Progress, and Dashboard Data
 */

const express = require('express');
const mongoose = require('mongoose');
const { 
  User, 
  UserStatistics, 
  UserProgress, 
  Content, 
  Achievement, 
  UserAchievement,
  LearningSession 
} = require('../models');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ===========================
// DASHBOARD OVERVIEW
// ===========================

router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get user statistics
    let userStats = await UserStatistics.findOne({ userId });
    if (!userStats) {
      // Create default stats if not found
      userStats = new UserStatistics({
        userId,
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
    }

    // Get recent progress
    const recentProgress = await UserProgress.find({ userId })
      .populate('contentId', 'topic category difficulty')
      .sort({ lastAttemptAt: -1 })
      .limit(5);

    // Get recent achievements
    const recentAchievements = await UserAchievement.find({ userId })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .limit(3);

    // Get user-generated content statistics
    console.log(`📊 Fetching content stats for user: ${userId}`);
    
    const userContentStats = await Content.aggregate([
      { $match: { createdByUser: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          categories: { $addToSet: '$category' },
          difficulties: { $addToSet: '$difficulty' }
        }
      }
    ]);

    console.log(`📈 User content stats result:`, userContentStats);

    const contentStats = userContentStats[0] || {
      totalContent: 0,
      categories: [],
      difficulties: []
    };

    // Get current active study session
    const activeSession = await LearningSession.findOne({
      userId,
      endTime: null // Session is still active
    });

    // Calculate level progress
    const currentLevel = userStats.overall.currentLevel;
    const currentXP = userStats.overall.totalXP;
    const xpForNextLevel = currentLevel * 100; // 100 XP per level
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const levelProgress = ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

    res.json({
      success: true,
      data: {
        stats: userStats,
        recentProgress,
        recentAchievements,
        contentStats, // Add user-generated content statistics
        activeSession, // Add current study session info
        levelInfo: {
          currentLevel,
          currentXP,
          xpForNextLevel,
          levelProgress: Math.min(Math.max(levelProgress, 0), 100)
        }
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// ===========================
// DETAILED STATISTICS
// ===========================

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get comprehensive statistics
    const userStats = await UserStatistics.findOne({ userId });
    if (!userStats) {
      return res.status(404).json({
        success: false,
        error: 'User statistics not found'
      });
    }

    // Get progress by category
    const categoryProgress = await UserProgress.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'contents',
          localField: 'contentId',
          foreignField: '_id',
          as: 'content'
        }
      },
      { $unwind: '$content' },
      {
        $group: {
          _id: '$content.category',
          totalQuizzes: { $sum: 1 },
          averageScore: { $avg: '$bestScore' },
          totalTime: { $sum: { $sum: '$attempts.timeSpent' } },
          completedQuizzes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'mastered']] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get daily activity for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await UserProgress.aggregate([
      { 
        $match: { 
          userId: mongoose.Types.ObjectId(userId),
          lastAttemptAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$lastAttemptAt"
            }
          },
          quizzesTaken: { $sum: 1 },
          totalScore: { $avg: '$bestScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: userStats,
        categoryProgress,
        dailyActivity
      }
    });

  } catch (error) {
    console.error('Detailed stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch detailed statistics'
    });
  }
});

// ===========================
// ACHIEVEMENTS
// ===========================

router.get('/achievements', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Get all achievements
    const allAchievements = await Achievement.find({ isActive: true })
      .sort({ category: 1, type: 1 });

    // Get user's unlocked achievements
    const userAchievements = await UserAchievement.find({ userId })
      .populate('achievementId');

    // Create a map of unlocked achievements
    const unlockedMap = {};
    userAchievements.forEach(ua => {
      if (ua.achievementId) {
        unlockedMap[ua.achievementId._id.toString()] = {
          unlockedAt: ua.unlockedAt,
          progress: ua.progress
        };
      }
    });

    // Combine data
    const achievementsWithStatus = allAchievements.map(achievement => ({
      ...achievement.toObject(),
      isUnlocked: !!unlockedMap[achievement._id.toString()],
      unlockedAt: unlockedMap[achievement._id.toString()]?.unlockedAt,
      progress: unlockedMap[achievement._id.toString()]?.progress || 0
    }));

    // Group by category
    const achievementsByCategory = achievementsWithStatus.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    // Calculate summary stats
    const totalAchievements = allAchievements.length;
    const unlockedAchievements = userAchievements.length;
    const totalXPFromAchievements = userAchievements.reduce((sum, ua) => {
      return sum + (ua.achievementId?.xpReward || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        achievementsByCategory,
        summary: {
          total: totalAchievements,
          unlocked: unlockedAchievements,
          percentage: Math.round((unlockedAchievements / totalAchievements) * 100),
          totalXP: totalXPFromAchievements
        }
      }
    });

  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

// ===========================
// PROGRESS TRACKING
// ===========================

router.get('/progress', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { category, status, limit = 20, page = 1 } = req.query;
    
    // Build filter
    const filter = { userId: mongoose.Types.ObjectId(userId) };
    
    // Build aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'contents',
          localField: 'contentId',
          foreignField: '_id',
          as: 'content'
        }
      },
      { $unwind: '$content' }
    ];

    // Add category filter if specified
    if (category) {
      pipeline.push({
        $match: { 'content.category': category }
      });
    }

    // Add status filter if specified
    if (status) {
      pipeline.push({
        $match: { status }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { lastAttemptAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const progress = await UserProgress.aggregate(pipeline);
    
    // Get total count for pagination
    const totalCount = await UserProgress.countDocuments(filter);

    res.json({
      success: true,
      data: {
        progress,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Progress tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress data'
    });
  }
});

// ===========================
// LEARNING STREAKS
// ===========================

router.get('/streaks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const userStats = await UserStatistics.findOne({ userId });
    if (!userStats) {
      return res.status(404).json({
        success: false,
        error: 'User statistics not found'
      });
    }

    // Calculate streak calendar for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const streakActivity = await UserProgress.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          lastAttemptAt: { $gte: threeMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$lastAttemptAt"
            }
          },
          activityCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        currentStreak: userStats.streaks.current,
        longestStreak: userStats.streaks.longest,
        streakCalendar: streakActivity
      }
    });

  } catch (error) {
    console.error('Streaks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch streak data'
    });
  }
});

// ===========================
// LEADERBOARD (OPTIONAL)
// ===========================

router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { type = 'xp', limit = 10 } = req.query;
    
    let sortField;
    switch (type) {
      case 'streak':
        sortField = 'streaks.current.count';
        break;
      case 'accuracy':
        sortField = 'overall.overallAccuracy';
        break;
      case 'quizzes':
        sortField = 'overall.totalQuizzesTaken';
        break;
      default:
        sortField = 'overall.totalXP';
    }

    const leaderboard = await UserStatistics.find({})
      .populate('userId', 'username profile.firstName profile.lastName')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit));

    // Remove sensitive data and add ranking
    const sanitizedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.userId?.username || 'Anonymous',
      displayName: entry.userId?.profile?.firstName 
        ? `${entry.userId.profile.firstName} ${entry.userId.profile.lastName || ''}`.trim()
        : entry.userId?.username || 'Anonymous',
      value: type === 'xp' ? entry.overall.totalXP :
             type === 'streak' ? entry.streaks.current.count :
             type === 'accuracy' ? entry.overall.overallAccuracy :
             entry.overall.totalQuizzesTaken,
      level: entry.overall.currentLevel
    }));

    res.json({
      success: true,
      data: {
        leaderboard: sanitizedLeaderboard,
        type
      }
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

// ===========================
// STUDY SESSION MANAGEMENT
// ===========================

// Start a new study session
router.post('/study-session/start', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Check if there's already an active session
    const activeSession = await LearningSession.findOne({
      userId,
      endTime: null
    });

    if (activeSession) {
      return res.json({
        success: true,
        data: activeSession,
        message: 'Study session already active'
      });
    }

    // Create new study session
    const newSession = new LearningSession({
      userId,
      startTime: new Date(),
      activitiesCount: 0,
      quizzesCompleted: 0,
      contentGenerated: 0,
      xpEarned: 0
    });

    await newSession.save();

    console.log(`📚 Study session started for user ${userId}`);

    res.status(201).json({
      success: true,
      data: newSession,
      message: 'Study session started successfully'
    });

  } catch (error) {
    console.error('Start study session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start study session'
    });
  }
});

// End current study session
router.post('/study-session/end', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Find active session
    const activeSession = await LearningSession.findOne({
      userId,
      endTime: null
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        error: 'No active study session found'
      });
    }

    // End the session
    const endTime = new Date();
    const duration = Math.floor((endTime - activeSession.startTime) / 1000); // Duration in seconds

    activeSession.endTime = endTime;
    activeSession.duration = duration;

    await activeSession.save();

    console.log(`📚 Study session ended for user ${userId}. Duration: ${Math.floor(duration / 60)} minutes`);

    res.json({
      success: true,
      data: activeSession,
      message: 'Study session ended successfully'
    });

  } catch (error) {
    console.error('End study session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end study session'
    });
  }
});

// Update study session activity
router.put('/study-session/activity', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, data } = req.body; // type: 'quiz_completed', 'content_generated', etc.

    // Find active session
    const activeSession = await LearningSession.findOne({
      userId,
      endTime: null
    });

    if (!activeSession) {
      return res.status(404).json({
        success: false,
        error: 'No active study session found'
      });
    }

    // Update session based on activity type
    switch (type) {
      case 'quiz_completed':
        activeSession.quizzesCompleted += 1;
        activeSession.activitiesCount += 1;
        if (data?.xpEarned) activeSession.xpEarned += data.xpEarned;
        break;
      case 'content_generated':
        activeSession.contentGenerated = (activeSession.contentGenerated || 0) + 1;
        activeSession.activitiesCount += 1;
        break;
      default:
        activeSession.activitiesCount += 1;
    }

    await activeSession.save();

    res.json({
      success: true,
      data: activeSession,
      message: 'Study session updated successfully'
    });

  } catch (error) {
    console.error('Update study session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update study session'
    });
  }
});

module.exports = router;
