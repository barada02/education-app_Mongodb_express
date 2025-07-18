/**
 * Dashboard JavaScript
 * Handles dashboard functionality, data loading, and user interactions
 */

class Dashboard {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api';
    this.currentUser = null;
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.bindEvents();
    await this.loadDashboardData();
  }

  async checkAuth() {
    try {
      const response = await fetch(`${this.apiUrl}/auth/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.currentUser = data.data;
          this.updateUserProfile();
        } else {
          this.redirectToLanding();
        }
      } else {
        this.redirectToLanding();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      this.redirectToLanding();
    }
  }

  updateUserProfile() {
    const userName = document.getElementById('userName');
    const userLevel = document.getElementById('userLevel');
    
    if (userName && this.currentUser) {
      const displayName = this.currentUser.profile?.firstName 
        ? `${this.currentUser.profile.firstName} ${this.currentUser.profile.lastName || ''}`.trim()
        : this.currentUser.username;
      userName.textContent = displayName;
    }
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.showSection(section);
      });
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.logout();
    });

    // Quick actions
    window.showSection = (section) => this.showSection(section);
    window.continueLastQuiz = () => this.continueLastQuiz();
  }

  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(sectionName)?.classList.add('active');

    // Load section-specific data
    this.loadSectionData(sectionName);
  }

  async loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'achievements':
        await this.loadAchievements();
        break;
      case 'progress':
        await this.loadProgress();
        break;
      case 'leaderboard':
        await this.loadLeaderboard();
        break;
    }
  }

  async loadDashboardData() {
    try {
      this.showLoading();
      
      const response = await fetch(`${this.apiUrl}/dashboard/overview`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.updateDashboardStats(data.data);
        }
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      this.showToast('Failed to load dashboard data', 'error');
    } finally {
      this.hideLoading();
    }
  }

  updateDashboardStats(data) {
    const { stats, levelInfo, recentProgress } = data;

    // Update stats cards
    if (stats) {
      document.getElementById('currentStreak').textContent = stats.streaks?.current?.count || 0;
      document.getElementById('totalXP').textContent = stats.overall?.totalXP || 0;
      document.getElementById('averageScore').textContent = `${Math.round(stats.overall?.overallAccuracy || 0)}%`;
      document.getElementById('achievementCount').textContent = '0'; // Will be updated when achievements are loaded
    }

    // Update level info
    if (levelInfo) {
      document.getElementById('currentLevel').textContent = levelInfo.currentLevel;
      document.getElementById('nextLevel').textContent = levelInfo.currentLevel + 1;
      document.getElementById('currentXPProgress').textContent = levelInfo.currentXP;
      document.getElementById('nextLevelXP').textContent = levelInfo.xpForNextLevel;
      
      const progressBar = document.getElementById('levelProgressBar');
      if (progressBar) {
        progressBar.style.width = `${levelInfo.levelProgress}%`;
      }

      // Update user level in sidebar
      document.getElementById('userLevel').textContent = `Level ${levelInfo.currentLevel}`;
    }

    // Update recent activity
    this.updateRecentActivity(recentProgress || []);
  }

  updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas fa-info"></i>
          </div>
          <div class="activity-content">
            <div class="activity-title">Welcome to WiseBuddy!</div>
            <div class="activity-desc">Start learning by generating your first quiz</div>
          </div>
          <div class="activity-time">Just now</div>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-book"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.contentId?.topic || 'Quiz Completed'}</div>
          <div class="activity-desc">Score: ${activity.bestScore || 0}% | ${activity.status}</div>
        </div>
        <div class="activity-time">${this.formatTime(activity.lastAttemptAt)}</div>
      </div>
    `).join('');
  }

  async loadAchievements() {
    // Placeholder for achievements loading
    console.log('Loading achievements...');
  }

  async loadProgress() {
    // Placeholder for progress loading
    console.log('Loading progress...');
  }

  async loadLeaderboard() {
    // Placeholder for leaderboard loading
    console.log('Loading leaderboard...');
  }

  continueLastQuiz() {
    this.showSection('learning');
  }

  async logout() {
    try {
      const response = await fetch(`${this.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        this.showToast('Logged out successfully', 'success');
        setTimeout(() => {
          this.redirectToLanding();
        }, 1000);
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.redirectToLanding();
    }
  }

  redirectToLanding() {
    window.location.href = './index.html';
  }

  formatTime(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-${this.getToastIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  getToastIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});
