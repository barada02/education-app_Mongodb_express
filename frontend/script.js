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
    initializeNavigation();
    initializeEventListeners();
    loadHistory();
});

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
    const { concept, examples, quiz } = content;
    
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
    if (quiz && quiz.length > 0) {
        currentQuiz = quiz;
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
        isComplete: false
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
        const quizData = {
            contentId: currentContent._id,
            score: quizState.score,
            totalQuestions: currentQuiz.length,
            answers: quizState.answers,
            completedAt: new Date().toISOString()
        };

        // Note: Add quiz results endpoint to backend if needed
        console.log('Quiz completed:', quizData);
    } catch (error) {
        console.error('Error saving quiz result:', error);
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
style.textContent = additionalCSS;
document.head.appendChild(style);

// Export functions for global access
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.startQuiz = startQuiz;
window.switchToSection = switchToSection;
window.loadHistoryItem = loadHistoryItem;
