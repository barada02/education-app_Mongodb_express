// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const FRONTEND_URL = 'http://localhost:3000';

// Global state
let currentContent = null;
let currentQuiz = null;
let quizState = {
    currentQuestion: 0,
    answers: [],
    score: 0,
    isComplete: false
};

// DOM Elements
const elements = {
    generateForm: document.getElementById('generateForm'),
    generateBtn: document.getElementById('generateBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    toastContainer: document.getElementById('toastContainer'),
    contentArea: document.getElementById('contentArea'),
    quizArea: document.getElementById('quizArea'),
    historyArea: document.getElementById('historyArea'),
    historyContent: document.getElementById('historyContent'),
    historyLoading: document.getElementById('historyLoading')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    initializeNavigation();
    initializeUserMenu();
    initializeEventListeners();
    loadUserProfile();
    loadHistory();
    startStudySession(); // Start study session when app loads
    initializeStudyTimer(); // Initialize real-time study timer
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            credentials: 'include'
        });

        if (!response.ok) {
            // User not authenticated, redirect to login
            showToast('Please log in to access the application', 'warning');
            setTimeout(() => {
                window.location.href = './index.html';
            }, 2000);
            return;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, also redirect to login
        setTimeout(() => {
            window.location.href = './index.html';
        }, 2000);
    }
}

// Navigation System
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('data-section');

            // Update active nav link
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');

            // Show target section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');

            // Load section-specific data
            if (targetSection === 'history') {
                loadHistory();
            } else if (targetSection === 'dashboard') {
                loadDashboard();
            }
        });
    });
}

// Event Listeners
function initializeEventListeners() {
    // Generate form submission
    elements.generateForm.addEventListener('submit', handleGenerateContent);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            if (document.getElementById('home').classList.contains('active')) {
                handleGenerateContent(e);
            }
        }
    });
}

// Content Generation
async function handleGenerateContent(e) {
    e.preventDefault();
    
    // Check if user is logged in first
    const sessionStatus = await checkSession();
    if (!sessionStatus.authenticated) {
        showToast('Please log in to generate content', 'warning');
        return;
    }
    
    const formData = new FormData(elements.generateForm);
    const topic = formData.get('topic').trim();
    const difficulty = formData.get('difficulty');

    if (!topic || !difficulty) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    showLoading(true);
    setButtonLoading(elements.generateBtn, true);

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include session cookies
            body: JSON.stringify({ topic, difficulty })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            currentContent = data.data;
            displayContent(data.data);
            showToast('Content generated successfully!', 'success');
            
            // Track content generation activity
            updateStudyActivity('content_generated', { 
                contentId: data.data._id,
                topic: data.data.topic,
                difficulty: data.data.difficulty 
            });
            
            // Switch to content tab
            switchToSection('content');
        } else {
            throw new Error(data.error || 'Failed to generate content');
        }
    } catch (error) {
        console.error('Error generating content:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
        setButtonLoading(elements.generateBtn, false);
    }
}

// Display Content
function displayContent(content) {
    const { concept, examples, questions } = content;
    
    elements.contentArea.innerHTML = `
        <div class="content-card fade-in">
            <h3>${content.topic} - ${content.difficulty}</h3>
            
            <div class="concept">
                <h4>Concept:</h4>
                <p>${concept}</p>
            </div>
            
            ${examples && examples.length > 0 ? `
                <div class="examples">
                    <h4>Examples:</h4>
                    <ul>
                        ${examples.map(example => `<li>${example}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="content-actions">
                <button class="btn btn-primary" onclick="startQuiz()">
                    <i class="fas fa-play"></i>
                    Start Quiz
                </button>
                <button class="btn btn-secondary" onclick="switchToSection('quiz')">
                    <i class="fas fa-arrow-right"></i>
                    Go to Quiz
                </button>
            </div>
        </div>
    `;

    // Store quiz data
    if (questions && questions.length > 0) {
        // Convert Gemini format to frontend format
        currentQuiz = questions.map(q => {
            const options = q.options.map(opt => opt.option || opt);
            const correct = q.options.findIndex(opt => opt.is_correct === true);
            return {
                question: q.question,
                options: options,
                correct: correct,
                explanation: q.explanation || ''
            };
        });
        setupQuiz();
    }
}

// Quiz System
function setupQuiz() {
    if (!currentQuiz || currentQuiz.length === 0) {
        elements.quizArea.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>No quiz questions available</h3>
                <p>The generated content doesn't include quiz questions.</p>
            </div>
        `;
        return;
    }

    // Reset quiz state
    quizState = {
        currentQuestion: 0,
        answers: new Array(currentQuiz.length).fill(null),
        score: 0,
        isComplete: false,
        startTime: Date.now() // Track when quiz started
    };

    displayQuiz();
}

function displayQuiz() {
    if (!currentQuiz || quizState.isComplete) {
        displayQuizResults();
        return;
    }

    const question = currentQuiz[quizState.currentQuestion];
    const progress = ((quizState.currentQuestion) / currentQuiz.length) * 100;

    elements.quizArea.innerHTML = `
        <div class="quiz-container fade-in">
            <div class="quiz-header">
                <h3>Quiz: ${currentContent.topic}</h3>
                <div class="quiz-progress">
                    <div class="quiz-progress-bar" style="width: ${progress}%"></div>
                </div>
                <p>Question ${quizState.currentQuestion + 1} of ${currentQuiz.length}</p>
            </div>
            
            <div class="quiz-question">
                <h4>${question.question}</h4>
                <div class="quiz-options">
                    ${question.options.map((option, index) => `
                        <div class="quiz-option" onclick="selectAnswer(${index})" data-index="${index}">
                            ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="quiz-actions">
                <div class="quiz-score">
                    Score: ${quizState.score}/${quizState.currentQuestion}
                </div>
                <div>
                    ${quizState.currentQuestion > 0 ? `
                        <button class="btn btn-secondary" onclick="previousQuestion()">
                            <i class="fas fa-arrow-left"></i>
                            Previous
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="nextQuestion()" id="nextBtn" disabled>
                        ${quizState.currentQuestion === currentQuiz.length - 1 ? 'Finish Quiz' : 'Next'}
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Restore previous answer if exists
    if (quizState.answers[quizState.currentQuestion] !== null) {
        const selectedIndex = quizState.answers[quizState.currentQuestion];
        selectAnswer(selectedIndex);
    }
}

function selectAnswer(index) {
    // Remove previous selections
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Mark selected option
    const selectedOption = document.querySelector(`[data-index="${index}"]`);
    selectedOption.classList.add('selected');

    // Store answer
    quizState.answers[quizState.currentQuestion] = index;

    // Enable next button
    document.getElementById('nextBtn').disabled = false;
}

function nextQuestion() {
    if (quizState.answers[quizState.currentQuestion] === null) {
        showToast('Please select an answer', 'warning');
        return;
    }

    // Check if answer is correct
    const currentQuestion = currentQuiz[quizState.currentQuestion];
    const selectedAnswer = quizState.answers[quizState.currentQuestion];
    
    if (selectedAnswer === currentQuestion.correct) {
        quizState.score++;
    }

    // Move to next question or finish quiz
    if (quizState.currentQuestion < currentQuiz.length - 1) {
        quizState.currentQuestion++;
        displayQuiz();
    } else {
        quizState.isComplete = true;
        displayQuizResults();
    }
}

function previousQuestion() {
    if (quizState.currentQuestion > 0) {
        quizState.currentQuestion--;
        displayQuiz();
    }
}

function displayQuizResults() {
    const percentage = Math.round((quizState.score / currentQuiz.length) * 100);
    let resultClass = 'good';
    let resultMessage = 'Good job!';

    if (percentage >= 80) {
        resultClass = 'excellent';
        resultMessage = 'Excellent work!';
    } else if (percentage >= 60) {
        resultClass = 'good';
        resultMessage = 'Good job!';
    } else {
        resultClass = 'needs-improvement';
        resultMessage = 'Keep practicing!';
    }

    elements.quizArea.innerHTML = `
        <div class="quiz-container fade-in">
            <div class="quiz-results">
                <div class="result-header">
                    <h3>Quiz Complete!</h3>
                    <div class="result-score ${resultClass}">
                        <span class="score">${quizState.score}/${currentQuiz.length}</span>
                        <span class="percentage">${percentage}%</span>
                    </div>
                    <p>${resultMessage}</p>
                </div>
                
                <div class="result-details">
                    <h4>Question Review:</h4>
                    ${currentQuiz.map((question, index) => {
                        const userAnswer = quizState.answers[index];
                        const isCorrect = userAnswer === question.correct;
                        return `
                            <div class="result-question ${isCorrect ? 'correct' : 'incorrect'}">
                                <p><strong>Q${index + 1}:</strong> ${question.question}</p>
                                <p><strong>Your answer:</strong> ${question.options[userAnswer]}</p>
                                ${!isCorrect ? `<p><strong>Correct answer:</strong> ${question.options[question.correct]}</p>` : ''}
                                ${question.explanation ? `<p><strong>Explanation:</strong> ${question.explanation}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="result-actions">
                    <button class="btn btn-primary" onclick="startQuiz()">
                        <i class="fas fa-redo"></i>
                        Retake Quiz
                    </button>
                    <button class="btn btn-secondary" onclick="switchToSection('home')">
                        <i class="fas fa-home"></i>
                        Generate New Content
                    </button>
                </div>
            </div>
        </div>
    `;

    // Save quiz result to history
    saveQuizResult();
}

function startQuiz() {
    if (!currentQuiz) {
        showToast('No quiz available. Please generate content first.', 'warning');
        return;
    }
    
    setupQuiz();
    switchToSection('quiz');
}

// History Management
async function loadHistory() {
    if (!elements.historyLoading || !elements.historyContent) return;
    
    elements.historyLoading.style.display = 'block';
    elements.historyContent.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/content`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            displayHistory(data.data);
        } else {
            elements.historyContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h3>No learning history yet</h3>
                    <p>Start generating educational content to build your learning history.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading history:', error);
        elements.historyContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error loading history</h3>
                <p>Unable to load your learning history. Please try again later.</p>
            </div>
        `;
    } finally {
        elements.historyLoading.style.display = 'none';
    }
}

function displayHistory(historyData) {
    const historyHTML = historyData.map(item => {
        const date = new Date(item.createdAt).toLocaleDateString();
        const time = new Date(item.createdAt).toLocaleTimeString();
        
        return `
            <div class="history-item fade-in">
                <h4>${item.topic}</h4>
                <div class="meta">
                    <span><i class="fas fa-calendar"></i> ${date} at ${time}</span>
                    <span><i class="fas fa-signal"></i> ${item.difficulty}</span>
                </div>
                <div class="description">
                    ${item.concept ? item.concept.substring(0, 200) + '...' : 'Educational content generated'}
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary" onclick="loadHistoryItem('${item._id}')">
                        <i class="fas fa-eye"></i>
                        View Content
                    </button>
                </div>
            </div>
        `;
    }).join('');

    elements.historyContent.innerHTML = historyHTML;
}

async function loadHistoryItem(contentId) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/content/${contentId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            currentContent = data.data;
            displayContent(data.data);
            switchToSection('content');
            showToast('Content loaded successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to load content');
        }
    } catch (error) {
        console.error('Error loading history item:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function saveQuizResult() {
    if (!currentContent || !quizState.isComplete) return;

    try {
        console.log('💾 Saving quiz result...');
        
        // Calculate quiz metrics
        const totalQuestions = currentQuiz.length;
        const correctAnswers = quizState.score;
        const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
        const timeSpentSeconds = Math.floor((Date.now() - quizState.startTime) / 1000);
        
        // Prepare detailed answers data for backend
        const detailedAnswers = quizState.answers.map((selectedOption, questionIndex) => {
            const question = currentQuiz[questionIndex];
            const isCorrect = selectedOption === question.correct;
            
            return {
                questionIndex,
                selectedOption: selectedOption !== null ? selectedOption : 0,
                isCorrect,
                questionText: question.question,
                correctAnswer: question.correct,
                timeSpent: Math.floor(timeSpentSeconds / totalQuestions) // Distribute time evenly
            };
        });
        
        const quizData = {
            contentId: currentContent._id,
            score: scorePercentage,
            correctAnswers,
            totalQuestions,
            answers: quizState.answers, // Keep simple format for now, backend will transform
            detailedAnswers, // Send detailed format too for logging
            timeSpent: timeSpentSeconds,
            startedAt: new Date(quizState.startTime).toISOString(),
            completedAt: new Date().toISOString()
        };

        console.log('📤 Sending quiz data:', quizData);

        // Save quiz results to backend
        const response = await fetch(`${API_BASE_URL}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(quizData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Quiz result saved successfully:', result);
            
            // Track quiz completion in study session
            const xpEarned = Math.round(quizData.score); // 1 XP per percentage point
            updateStudyActivity('quiz_completed', { 
                contentId: quizData.contentId,
                score: quizData.score,
                xpEarned: xpEarned
            });
            
            // Update user statistics
            await updateUserStatistics(quizData);
            
            // Refresh dashboard if it's currently visible
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection && dashboardSection.classList.contains('active')) {
                loadDashboard();
            }
        } else {
            console.error('❌ Failed to save quiz result:', response.status);
        }
    } catch (error) {
        console.error('❌ Error saving quiz result:', error);
    }
}

// Get current user ID from session
async function getCurrentUserId() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.data.user._id;
        }
    } catch (error) {
        console.error('Error getting user ID:', error);
    }
    return null;
}

// Check current session status
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/session`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('🔍 Session status:', data);
            return data;
        }
    } catch (error) {
        console.error('❌ Error checking session:', error);
    }
    return { success: false, authenticated: false };
}

// Update user statistics after quiz completion
async function updateUserStatistics(quizData) {
    try {
        // This will be handled by the backend when saving progress
        // The backend should automatically update UserStatistics
        console.log('📊 User statistics will be updated by backend');
    } catch (error) {
        console.error('Error updating user statistics:', error);
    }
}

// Utility Functions
function switchToSection(sectionName) {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    // Update active nav link
    navLinks.forEach(nav => nav.classList.remove('active'));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Show target section
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');

    // Load section-specific data
    if (sectionName === 'history') {
        loadHistory();
    }
}

function showLoading(show) {
    elements.loadingOverlay.classList.toggle('show', show);
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    } else {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Generate Content';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    elements.toastContainer.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// User Menu Functions
function initializeUserMenu() {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');
    const userMenu = document.querySelector('.user-menu');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle user menu
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        userMenu.classList.remove('active');
    });

    // Prevent menu close when clicking inside dropdown
    userDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Logout functionality
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleLogout();
    });
}

// Load User Profile
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.user) {
                const user = data.data.user;
                document.getElementById('username').textContent = 
                    user.profile?.firstName || user.username || 'User';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        console.log('🔄 Loading dashboard data...');
        
        // Load dashboard overview - note the correct API path
        const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Dashboard API response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('📊 Dashboard data received:', data);
            
            if (data.success) {
                updateDashboardStats(data.data);
            } else {
                throw new Error(data.error || 'Failed to load dashboard data');
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        // Show helpful message for new users
        showWelcomeDashboard();
    }
}

// Show welcome dashboard for new users
function showWelcomeDashboard() {
    updateDashboardStats({
        stats: {
            overall: {
                totalQuizzesTaken: 0,
                overallAccuracy: 0,
                totalXP: 0
            },
            streaks: {
                current: { count: 0 }
            }
        },
        contentStats: {
            totalContent: 0
        },
        levelInfo: {
            currentLevel: 1,
            levelProgress: 0,
            currentXP: 0,
            xpForNextLevel: 100
        },
        recentProgress: [],
        recentAchievements: []
    });

    // Add welcome message
    const activityList = document.getElementById('recent-activity');
    if (activityList) {
        activityList.innerHTML = `
            <li class="activity-item welcome-message">
                <div class="activity-content">
                    <strong>🎉 Welcome to your learning dashboard!</strong>
                    <p>Generate content and take quizzes to see your progress here. Your study time will be tracked automatically!</p>
                </div>
            </li>
        `;
    }

    const achievementsList = document.getElementById('recent-achievements');
    if (achievementsList) {
        achievementsList.innerHTML = `
            <li class="achievement-item welcome-message">
                <div class="achievement-icon">🎯</div>
                <div class="achievement-content">
                    <strong>Your First Achievement Awaits!</strong>
                    <span>Complete your first quiz to unlock your first achievement</span>
                </div>
            </li>
        `;
    }
}

function updateDashboardStats(data) {
    try {
        console.log('🎯 Updating dashboard with data:', data);

        const { stats, recentProgress, recentAchievements, levelInfo, contentStats, activeSession } = data;

        // Update stats cards with the correct element IDs
        if (stats && stats.overall) {
            const totalQuizzesEl = document.getElementById('total-quizzes');
            const accuracyEl = document.getElementById('accuracy-rate');
            const streakEl = document.getElementById('current-streak');
            const xpEl = document.getElementById('total-xp');

            if (totalQuizzesEl) totalQuizzesEl.textContent = stats.overall.totalQuizzesTaken || 0;
            if (accuracyEl) accuracyEl.textContent = `${(stats.overall.overallAccuracy || 0).toFixed(1)}%`;
            if (streakEl) streakEl.textContent = stats.streaks?.current?.count || 0;
            if (xpEl) xpEl.textContent = stats.overall.totalXP || 0;
        }

        // Update content generated statistics
        if (contentStats) {
            const contentGeneratedEl = document.getElementById('content-generated');
            if (contentGeneratedEl) {
                contentGeneratedEl.textContent = contentStats.totalContent || 0;
            }
        }

        // Update study time (real-time timer will handle current session)
        // This shows total study time from previous sessions
        if (activeSession && activeSession.duration) {
            // If there's an active session, the timer will show current session time
            // This could show total time from completed sessions if needed
        }

        // Update level progress
        if (levelInfo) {
            const levelEl = document.getElementById('current-level');
            const progressEl = document.getElementById('level-progress');
            const xpTextEl = document.getElementById('level-xp');

            if (levelEl) levelEl.textContent = levelInfo.currentLevel || 1;
            if (progressEl) progressEl.style.width = `${levelInfo.levelProgress || 0}%`;
            if (xpTextEl) xpTextEl.textContent = `${levelInfo.currentXP || 0} / ${levelInfo.xpForNextLevel || 100} XP`;
        }

        // Update recent activity
        const activityList = document.getElementById('recent-activity');
        if (activityList) {
            activityList.innerHTML = '';
            
            if (!recentProgress || recentProgress.length === 0) {
                activityList.innerHTML = '<li class="activity-item">No recent activity. Start taking quizzes to see your progress!</li>';
            } else {
                recentProgress.forEach(progress => {
                    const activityItem = document.createElement('li');
                    activityItem.className = 'activity-item';
                    activityItem.innerHTML = `
                        <div class="activity-content">
                            <strong>${progress.contentId?.topic || 'Unknown Topic'}</strong>
                            <span class="activity-score">Score: ${progress.bestScore || 0}%</span>
                        </div>
                        <div class="activity-time">${formatTimeAgo(progress.lastAttemptAt)}</div>
                    `;
                    activityList.appendChild(activityItem);
                });
            }
        }

        // Update achievements
        const achievementsList = document.getElementById('recent-achievements');
        if (achievementsList) {
            achievementsList.innerHTML = '';
            
            if (!recentAchievements || recentAchievements.length === 0) {
                achievementsList.innerHTML = '<li class="achievement-item">No achievements yet. Keep learning to unlock achievements!</li>';
            } else {
                recentAchievements.forEach(achievement => {
                    const achievementItem = document.createElement('li');
                    achievementItem.className = 'achievement-item';
                    achievementItem.innerHTML = `
                        <div class="achievement-icon">🏆</div>
                        <div class="achievement-content">
                            <strong>${achievement.achievementId?.name || 'Achievement'}</strong>
                            <span>${achievement.achievementId?.description || 'Well done!'}</span>
                        </div>
                    `;
                    achievementsList.appendChild(achievementItem);
                });
            }
        }

        console.log('✅ Dashboard updated successfully');
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
    }
}

// Format time ago helper function
function formatTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        return 'Just now';
    } catch (error) {
        return 'Recently';
    }
}

function updateRecentActivity(activities) {
    const activityList = document.getElementById('activityList');
    
    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <strong>${activity.topic}</strong>
            <p>Score: ${activity.score}% - ${formatDate(activity.date)}</p>
        </div>
    `).join('');
}

function updateAchievements(achievements) {
    const achievementList = document.getElementById('achievementList');
    
    if (achievements.length === 0) {
        achievementList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-medal"></i>
                <p>No achievements yet</p>
            </div>
        `;
        return;
    }

    achievementList.innerHTML = achievements.map(achievement => `
        <div class="achievement-item">
            <i class="fas fa-trophy"></i>
            <strong>${achievement.title}</strong>
            <p>${achievement.description}</p>
        </div>
    `).join('');
}

// Logout Function
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('Logged out successfully', 'success');
            // Redirect to landing page
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1000);
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// Helper function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Add CSS for quiz results
const additionalCSS = `
.quiz-results {
    text-align: center;
}

.result-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e1e5e9;
}

.result-score {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 10px;
    background: #f8f9fa;
}

.result-score.excellent {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
}

.result-score.good {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
}

.result-score.needs-improvement {
    background: rgba(255, 193, 7, 0.1);
    color: #ffc107;
}

.result-score .score {
    font-size: 2rem;
    font-weight: 700;
    display: block;
}

.result-score .percentage {
    font-size: 1.2rem;
    opacity: 0.8;
}

.result-details {
    text-align: left;
    margin: 2rem 0;
}

.result-question {
    padding: 1rem;
    margin: 0.5rem 0;
    border-radius: 10px;
    border-left: 4px solid #e1e5e9;
}

.result-question.correct {
    background: rgba(40, 167, 69, 0.1);
    border-left-color: #28a745;
}

.result-question.incorrect {
    background: rgba(220, 53, 69, 0.1);
    border-left-color: #dc3545;
}

.result-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.content-actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.history-actions {
    margin-top: 1rem;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

@media (max-width: 768px) {
    .result-actions {
        flex-direction: column;
    }
    
    .content-actions {
        flex-direction: column;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
// Study Session Management
let currentStudySession = null;
let studyStartTime = null;
let studyTimerInterval = null;

// Start a study session
async function startStudySession() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/study-session/start`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentStudySession = data.data;
                studyStartTime = new Date(currentStudySession.startTime);
                console.log('📚 Study session started:', currentStudySession._id);
            }
        }
    } catch (error) {
        console.error('❌ Error starting study session:', error);
    }
}

// End current study session
async function endStudySession() {
    try {
        if (!currentStudySession) return;

        const response = await fetch(`${API_BASE_URL}/dashboard/study-session/end`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('📚 Study session ended. Duration:', Math.floor(data.data.duration / 60), 'minutes');
                currentStudySession = null;
                studyStartTime = null;
                if (studyTimerInterval) {
                    clearInterval(studyTimerInterval);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error ending study session:', error);
    }
}

// Update study session activity
async function updateStudyActivity(type, data = {}) {
    try {
        if (!currentStudySession) return;

        const response = await fetch(`${API_BASE_URL}/dashboard/study-session/activity`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                currentStudySession = result.data;
                console.log('📊 Study activity updated:', type);
            }
        }
    } catch (error) {
        console.error('❌ Error updating study activity:', error);
    }
}

// Initialize real-time study timer
function initializeStudyTimer() {
    studyTimerInterval = setInterval(() => {
        if (studyStartTime) {
            const now = new Date();
            const studyTime = Math.floor((now - studyStartTime) / 1000); // seconds
            updateStudyTimeDisplay(studyTime);
        }
    }, 1000); // Update every second
}

// Update study time display
function updateStudyTimeDisplay(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let timeString;
    if (hours > 0) {
        timeString = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        timeString = `${minutes}m ${secs}s`;
    } else {
        timeString = `${secs}s`;
    }

    const studyTimeEl = document.getElementById('study-time');
    if (studyTimeEl) {
        studyTimeEl.textContent = timeString;
    }
}

// End study session when user leaves/closes the page
window.addEventListener('beforeunload', () => {
    if (currentStudySession) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon(`${API_BASE_URL}/dashboard/study-session/end`, JSON.stringify({}));
    }
});

style.textContent = additionalCSS;
document.head.appendChild(style);

// Export functions for global access
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.startQuiz = startQuiz;
window.switchToSection = switchToSection;
window.loadHistoryItem = loadHistoryItem;
