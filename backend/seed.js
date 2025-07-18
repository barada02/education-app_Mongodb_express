/**
 * Database Seed File
 * Creates initial achievements and sample data
 */

const mongoose = require('mongoose');
const { Achievement } = require('./models');
require('dotenv').config();

const achievements = [
  // Streak Achievements
  {
    name: "First Steps",
    description: "Complete your first quiz",
    icon: "🎯",
    category: "milestone",
    type: "bronze",
    condition: {
      type: "total_quizzes",
      value: 1,
      operator: ">="
    },
    xpReward: 10
  },
  {
    name: "Learning Streak",
    description: "Study for 3 days in a row",
    icon: "🔥",
    category: "streak",
    type: "bronze",
    condition: {
      type: "streak_days",
      value: 3,
      operator: ">="
    },
    xpReward: 25
  },
  {
    name: "Dedication",
    description: "Study for 7 days in a row",
    icon: "🔥",
    category: "streak",
    type: "silver",
    condition: {
      type: "streak_days",
      value: 7,
      operator: ">="
    },
    xpReward: 50
  },
  {
    name: "Unstoppable",
    description: "Study for 30 days in a row",
    icon: "🔥",
    category: "streak",
    type: "gold",
    condition: {
      type: "streak_days",
      value: 30,
      operator: ">="
    },
    xpReward: 200
  },
  {
    name: "Legend",
    description: "Study for 100 days in a row",
    icon: "🔥",
    category: "streak",
    type: "platinum",
    condition: {
      type: "streak_days",
      value: 100,
      operator: ">="
    },
    xpReward: 1000
  },

  // Score Achievements
  {
    name: "Perfect Score",
    description: "Get 100% on a quiz",
    icon: "⭐",
    category: "score",
    type: "bronze",
    condition: {
      type: "perfect_scores",
      value: 1,
      operator: ">="
    },
    xpReward: 20
  },
  {
    name: "Accuracy Expert",
    description: "Maintain 80% accuracy across all quizzes",
    icon: "🎯",
    category: "score",
    type: "silver",
    condition: {
      type: "accuracy_percentage",
      value: 80,
      operator: ">="
    },
    xpReward: 75
  },
  {
    name: "Quiz Master",
    description: "Maintain 90% accuracy across all quizzes",
    icon: "👑",
    category: "score",
    type: "gold",
    condition: {
      type: "accuracy_percentage",
      value: 90,
      operator: ">="
    },
    xpReward: 150
  },
  {
    name: "Perfectionist",
    description: "Get perfect scores on 10 quizzes",
    icon: "💎",
    category: "score",
    type: "platinum",
    condition: {
      type: "perfect_scores",
      value: 10,
      operator: ">="
    },
    xpReward: 300
  },

  // Topic Achievements
  {
    name: "Explorer",
    description: "Complete quizzes in 3 different topics",
    icon: "🗺️",
    category: "topic",
    type: "bronze",
    condition: {
      type: "topics_completed",
      value: 3,
      operator: ">="
    },
    xpReward: 30
  },
  {
    name: "Knowledge Seeker",
    description: "Complete quizzes in 5 different topics",
    icon: "📚",
    category: "topic",
    type: "silver",
    condition: {
      type: "topics_completed",
      value: 5,
      operator: ">="
    },
    xpReward: 60
  },
  {
    name: "Renaissance Mind",
    description: "Complete quizzes in all available topics",
    icon: "🧠",
    category: "topic",
    type: "gold",
    condition: {
      type: "topics_completed",
      value: 6,
      operator: ">="
    },
    xpReward: 250
  },

  // Volume Achievements
  {
    name: "Getting Started",
    description: "Complete 5 quizzes",
    icon: "📖",
    category: "milestone",
    type: "bronze",
    condition: {
      type: "total_quizzes",
      value: 5,
      operator: ">="
    },
    xpReward: 25
  },
  {
    name: "Quiz Enthusiast",
    description: "Complete 25 quizzes",
    icon: "📚",
    category: "milestone",
    type: "silver",
    condition: {
      type: "total_quizzes",
      value: 25,
      operator: ">="
    },
    xpReward: 100
  },
  {
    name: "Knowledge Hunter",
    description: "Complete 50 quizzes",
    icon: "🏆",
    category: "milestone",
    type: "gold",
    condition: {
      type: "total_quizzes",
      value: 50,
      operator: ">="
    },
    xpReward: 200
  },
  {
    name: "Quiz Legend",
    description: "Complete 100 quizzes",
    icon: "👑",
    category: "milestone",
    type: "platinum",
    condition: {
      type: "total_quizzes",
      value: 100,
      operator: ">="
    },
    xpReward: 500
  },

  // Time Achievements
  {
    name: "Dedicated Learner",
    description: "Spend 1 hour learning",
    icon: "⏰",
    category: "time",
    type: "bronze",
    condition: {
      type: "time_spent_hours",
      value: 1,
      operator: ">="
    },
    xpReward: 15
  },
  {
    name: "Study Marathon",
    description: "Spend 10 hours learning",
    icon: "⏳",
    category: "time",
    type: "silver",
    condition: {
      type: "time_spent_hours",
      value: 10,
      operator: ">="
    },
    xpReward: 80
  },
  {
    name: "Time Master",
    description: "Spend 50 hours learning",
    icon: "🕐",
    category: "time",
    type: "gold",
    condition: {
      type: "time_spent_hours",
      value: 50,
      operator: ">="
    },
    xpReward: 300
  },

  // Special Achievements
  {
    name: "Early Bird",
    description: "Complete a quiz before 8 AM",
    icon: "🌅",
    category: "special",
    type: "bronze",
    condition: {
      type: "week_activity",
      value: 1,
      operator: ">="
    },
    xpReward: 20
  },
  {
    name: "Night Owl",
    description: "Complete a quiz after 10 PM",
    icon: "🦉",
    category: "special",
    type: "bronze",
    condition: {
      type: "week_activity",
      value: 1,
      operator: ">="
    },
    xpReward: 20
  },
  {
    name: "Weekend Warrior",
    description: "Study during the weekend",
    icon: "⚔️",
    category: "special",
    type: "silver",
    condition: {
      type: "week_activity",
      value: 2,
      operator: ">="
    },
    xpReward: 40
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('🗑️ Cleared existing achievements');

    // Insert new achievements
    const insertedAchievements = await Achievement.insertMany(achievements);
    console.log(`✅ Inserted ${insertedAchievements.length} achievements`);

    // Display summary
    const achievementCounts = await Achievement.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('\n📊 Achievement Summary:');
    achievementCounts.forEach(({ _id, count }) => {
      const emoji = {
        bronze: '🥉',
        silver: '🥈',
        gold: '🥇',
        platinum: '💎'
      };
      console.log(`   ${emoji[_id]} ${_id}: ${count} achievements`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, achievements };
