/**
 * Authentication JavaScript
 * Handles login, registration, and user session management
 */

class AuthManager {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api';
    this.currentUser = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthStatus();
  }

  bindEvents() {
    // Modal controls
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close');
    
    // Show modal buttons
    document.getElementById('loginBtn')?.addEventListener('click', () => this.showModal('login'));
    document.getElementById('registerBtn')?.addEventListener('click', () => this.showModal('register'));
    document.getElementById('heroLoginBtn')?.addEventListener('click', () => this.showModal('login'));
    document.getElementById('heroRegisterBtn')?.addEventListener('click', () => this.showModal('register'));
    document.getElementById('ctaRegisterBtn')?.addEventListener('click', () => this.showModal('register'));

    // Modal close
    closeBtn?.addEventListener('click', () => this.hideModal());
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.hideModal();
    });

    // Form switching
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });

    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // Form submissions
    document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin(e);
    });

    document.getElementById('registerFormElement')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister(e);
    });

    // Password strength checker
    document.getElementById('registerPassword')?.addEventListener('input', (e) => {
      this.checkPasswordStrength(e.target.value);
    });

    // Confirm password validation
    document.getElementById('confirmPassword')?.addEventListener('input', (e) => {
      this.validateConfirmPassword();
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideModal();
    });
  }

  showModal(type = 'login') {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    if (type === 'login') {
      this.showLoginForm();
    } else {
      this.showRegisterForm();
    }
  }

  hideModal() {
    const modal = document.getElementById('authModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    this.clearForms();
  }

  showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  }

  showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  }

  clearForms() {
    document.getElementById('loginFormElement')?.reset();
    document.getElementById('registerFormElement')?.reset();
    this.clearValidationErrors();
  }

  clearValidationErrors() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.classList.remove('error', 'success');
    });
  }

  async handleLogin(e) {
    const formData = new FormData(e.target);
    const loginData = {
      email: formData.get('email'),
      password: formData.get('password')
    };

    if (!this.validateLoginForm(loginData)) return;

    this.showLoading();

    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser = data.data.user;
        this.showToast('Welcome back!', 'success');
        this.hideModal();
        this.redirectToDashboard();
      } else {
        this.showToast(data.error || 'Login failed', 'error');
      }

    } catch (error) {
      console.error('Login error:', error);
      this.showToast('Network error. Please try again.', 'error');
    } finally {
      this.hideLoading();
    }
  }

  async handleRegister(e) {
    const formData = new FormData(e.target);
    const registerData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    };

    console.log('Registration data:', registerData); // Debug log

    if (!this.validateRegisterForm(registerData)) return;

    this.showLoading();

    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          username: registerData.username,
          email: registerData.email,
          password: registerData.password
        })
      });

      const data = await response.json();
      console.log('Registration response:', data); // Debug log

      if (data.success) {
        this.currentUser = data.data.user;
        this.showToast('Account created successfully!', 'success');
        this.hideModal();
        this.redirectToDashboard();
      } else {
        this.showToast(data.error || 'Registration failed', 'error');
        // Show field-specific errors if available
        if (data.details) {
          console.error('Validation errors:', data.details);
        }
      }

    } catch (error) {
      console.error('Registration error:', error);
      this.showToast('Network error. Please try again.', 'error');
    } finally {
      this.hideLoading();
    }
  }

  validateLoginForm(data) {
    let isValid = true;

    if (!data.email || !this.isValidEmail(data.email)) {
      this.setInputError('loginEmail', 'Please enter a valid email');
      isValid = false;
    }

    if (!data.password || data.password.length < 6) {
      this.setInputError('loginPassword', 'Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  }

  validateRegisterForm(data) {
    let isValid = true;

    // Clear previous errors
    this.clearValidationErrors();

    if (!data.firstName || data.firstName.trim().length < 2) {
      this.setInputError('firstName', 'First name must be at least 2 characters');
      isValid = false;
    }

    if (!data.lastName || data.lastName.trim().length < 2) {
      this.setInputError('lastName', 'Last name must be at least 2 characters');
      isValid = false;
    }

    if (!data.username || data.username.length < 3) {
      this.setInputError('username', 'Username must be at least 3 characters');
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      this.setInputError('username', 'Username can only contain letters, numbers, and underscores');
      isValid = false;
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      this.setInputError('registerEmail', 'Please enter a valid email');
      isValid = false;
    }

    if (!data.password || data.password.length < 6) {
      this.setInputError('registerPassword', 'Password must be at least 6 characters');
      isValid = false;
    }

    if (data.password !== data.confirmPassword) {
      this.setInputError('confirmPassword', 'Passwords do not match');
      isValid = false;
    }

    const agreeTerms = document.getElementById('agreeTerms').checked;
    if (!agreeTerms) {
      this.showToast('Please agree to the Terms of Service', 'error');
      isValid = false;
    }

    return isValid;
  }

  setInputError(inputId, message) {
    const input = document.getElementById(inputId);
    if (input) {
      input.classList.add('error');
      // Remove success class if present
      input.classList.remove('success');
      
      // Show error message via toast for now
      // You could create a more sophisticated error display system
      console.error(`${inputId}: ${message}`);
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let strengthLabel = 'Weak';

    if (password.length >= 6) strength += 1;
    if (password.match(/[a-z]+/)) strength += 1;
    if (password.match(/[A-Z]+/)) strength += 1;
    if (password.match(/[0-9]+/)) strength += 1;
    if (password.match(/[$@#&!]+/)) strength += 1;

    strengthBar.className = 'strength-fill';
    
    switch (strength) {
      case 0:
      case 1:
        strengthBar.classList.add('weak');
        strengthLabel = 'Weak';
        break;
      case 2:
        strengthBar.classList.add('fair');
        strengthLabel = 'Fair';
        break;
      case 3:
        strengthBar.classList.add('good');
        strengthLabel = 'Good';
        break;
      case 4:
      case 5:
        strengthBar.classList.add('strong');
        strengthLabel = 'Strong';
        break;
    }

    strengthText.textContent = `Password strength: ${strengthLabel}`;
  }

  validateConfirmPassword() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');

    if (confirmPassword && password !== confirmPassword) {
      confirmInput.classList.add('error');
    } else if (confirmPassword) {
      confirmInput.classList.remove('error');
      confirmInput.classList.add('success');
    }
  }

  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.apiUrl}/auth/profile`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.currentUser = data.data;
          this.redirectToDashboard();
        }
      }
    } catch (error) {
      console.log('Not authenticated');
    }
  }

  redirectToDashboard() {
    // Redirect to the main app page
    window.location.href = './app.html';
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

    // Auto remove after 5 seconds
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

// CSS for toast slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Initialize authentication manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});
