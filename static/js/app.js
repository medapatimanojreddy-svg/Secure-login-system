/**
 * Secure Login & Registration System - Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const authContainer = document.getElementById('authContainer');
  const dashboardCard = document.getElementById('dashboardCard');
  const alertBox = document.getElementById('alertBox');
  
  // Tabs
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const goToRegister = document.getElementById('goToRegister');
  const goToLogin = document.getElementById('goToLogin');
  
  // Forms
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const rememberMe = document.getElementById('rememberMe');
  
  // Register Fields
  const regName = document.getElementById('regName');
  const regEmail = document.getElementById('regEmail');
  const regDob = document.getElementById('regDob');
  const regDobPicker = document.getElementById('regDobPicker');
  const openDobPickerBtn = document.getElementById('openDobPickerBtn');
  const dobAgeHint = document.getElementById('dobAgeHint');
  const regPassword = document.getElementById('regPassword');
  const regConfirmPwd = document.getElementById('regConfirmPwd');
  const pwdMatchMsg = document.getElementById('pwdMatchMsg');
  
  // Strength Rules & Meter
  const pwdStrengthBar = document.getElementById('pwdStrengthBar');
  const ruleLen = document.getElementById('ruleLen');
  const ruleUpper = document.getElementById('ruleUpper');
  const ruleNum = document.getElementById('ruleNum');
  const ruleSpecial = document.getElementById('ruleSpecial');
  
  // Toggle Pwd Buttons
  const toggleLoginPwd = document.getElementById('toggleLoginPwd');
  const toggleRegPwd = document.getElementById('toggleRegPwd');
  const toggleRegConfirmPwd = document.getElementById('toggleRegConfirmPwd');
  
  // Modal Elements
  const forgotPwdLink = document.getElementById('forgotPwdLink');
  const forgotModal = document.getElementById('forgotModal');
  const closeForgotModal = document.getElementById('closeForgotModal');
  
  // Standalone Dashboard
  const dashName = document.getElementById('dashName');
  const dashEmail = document.getElementById('dashEmail');
  const dashDob = document.getElementById('dashDob');
  const dashAge = document.getElementById('dashAge');
  const dashAvatar = document.getElementById('dashAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- Check Remembered Email ---
  const savedEmail = localStorage.getItem('remembered_email');
  if (savedEmail && loginEmail) {
    loginEmail.value = savedEmail;
    if (rememberMe) rememberMe.checked = true;
  }

  // --- Tab Switching ---
  function switchTab(activeTab) {
    hideAlert();
    if (activeTab === 'login') {
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      loginPanel?.classList.add('active');
      registerPanel?.classList.remove('active');
      setTimeout(() => loginEmail?.focus(), 100);
    } else {
      tabRegister?.classList.add('active');
      tabLogin?.classList.remove('active');
      registerPanel?.classList.add('active');
      loginPanel?.classList.remove('active');
      setTimeout(() => regName?.focus(), 100);
    }
  }

  tabLogin?.addEventListener('click', () => switchTab('login'));
  tabRegister?.addEventListener('click', () => switchTab('register'));
  goToRegister?.addEventListener('click', (e) => { e.preventDefault(); switchTab('register'); });
  goToLogin?.addEventListener('click', (e) => { e.preventDefault(); switchTab('login'); });

  // --- Password Visibility Toggles ---
  function setupPasswordToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🔒' : '👁️';
    });
  }

  setupPasswordToggle(toggleLoginPwd, loginPassword);
  setupPasswordToggle(toggleRegPwd, regPassword);
  setupPasswordToggle(toggleRegConfirmPwd, regConfirmPwd);

  // --- Date of Birth Handling & Age Calculation ---
  function parseDob(inputStr) {
    if (!inputStr) return null;
    const clean = inputStr.trim();
    let y, m, d;

    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      [y, m, d] = clean.split('-').map(Number);
    } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
      [y, m, d] = clean.split('/').map(Number);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      [d, m, y] = clean.split('/').map(Number);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      [d, m, y] = clean.split('-').map(Number);
    } else {
      return null;
    }

    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }
    return date;
  }

  function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const mDiff = today.getMonth() - birthDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function validateDob() {
    if (!regDob || !dobAgeHint) return false;
    const dateObj = parseDob(regDob.value);
    if (!dateObj) {
      dobAgeHint.textContent = 'Please enter a valid date (e.g. 2000-05-15 or 15/05/2000)';
      dobAgeHint.className = 'field-msg msg-error';
      return false;
    }
    const age = calculateAge(dateObj);
    if (age < 0 || age > 120) {
      dobAgeHint.textContent = 'Invalid date of birth.';
      dobAgeHint.className = 'field-msg msg-error';
      return false;
    }
    if (age < 13) {
      dobAgeHint.textContent = `Age: ${age} yrs old. (Must be at least 13 years old)`;
      dobAgeHint.className = 'field-msg msg-error';
      return false;
    }
    dobAgeHint.textContent = `Valid! Calculated age: ${age} years old`;
    dobAgeHint.className = 'field-msg msg-success';
    return true;
  }

  regDob?.addEventListener('input', validateDob);
  regDob?.addEventListener('blur', validateDob);

  openDobPickerBtn?.addEventListener('click', () => {
    if (regDobPicker && typeof regDobPicker.showPicker === 'function') {
      regDobPicker.showPicker();
    } else if (regDobPicker) {
      regDobPicker.focus();
    }
  });

  regDobPicker?.addEventListener('change', (e) => {
    if (regDob && e.target.value) {
      regDob.value = e.target.value;
      validateDob();
    }
  });

  // --- Password Strength Meter ---
  function evaluatePassword(pwd) {
    const hasLen = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

    ruleLen?.classList.toggle('valid', hasLen);
    ruleUpper?.classList.toggle('valid', hasUpper);
    ruleNum?.classList.toggle('valid', hasNum);
    ruleSpecial?.classList.toggle('valid', hasSpecial);

    let score = 0;
    if (hasLen) score++;
    if (hasUpper) score++;
    if (hasNum) score++;
    if (hasSpecial) score++;

    if (!pwdStrengthBar) return score === 4;

    pwdStrengthBar.className = 'pwd-strength-bar';
    if (score === 0) {
      pwdStrengthBar.style.width = '0%';
    } else if (score === 1) {
      pwdStrengthBar.classList.add('weak');
    } else if (score === 2) {
      pwdStrengthBar.classList.add('fair');
    } else if (score === 3) {
      pwdStrengthBar.classList.add('good');
    } else if (score === 4) {
      pwdStrengthBar.classList.add('strong');
    }
    return score === 4;
  }

  regPassword?.addEventListener('input', () => {
    evaluatePassword(regPassword.value);
    validatePasswordMatch();
  });

  function validatePasswordMatch() {
    if (!regConfirmPwd || !pwdMatchMsg) return false;
    if (!regConfirmPwd.value) {
      pwdMatchMsg.textContent = '';
      pwdMatchMsg.className = 'field-msg';
      return false;
    }
    if (regPassword.value === regConfirmPwd.value) {
      pwdMatchMsg.textContent = '✓ Passwords match';
      pwdMatchMsg.className = 'field-msg msg-success';
      return true;
    } else {
      pwdMatchMsg.textContent = '✕ Passwords do not match';
      pwdMatchMsg.className = 'field-msg msg-error';
      return false;
    }
  }

  regConfirmPwd?.addEventListener('input', validatePasswordMatch);

  // --- Alerts UI ---
  function showAlert(message, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert-box alert-${type}`;
    alertBox.style.display = 'block';
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.style.display = 'none';
  }

  // --- Forgot Password Modal ---
  forgotPwdLink?.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal?.classList.add('active');
  });

  closeForgotModal?.addEventListener('click', () => {
    forgotModal?.classList.remove('active');
  });

  forgotModal?.addEventListener('click', (e) => {
    if (e.target === forgotModal) {
      forgotModal.classList.remove('active');
    }
  });

  // --- Sign In Handler ---
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = loginEmail?.value.trim();
    const password = loginPassword?.value;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    if (rememberMe?.checked) {
      localStorage.setItem('remembered_email', email);
    } else {
      localStorage.removeItem('remembered_email');
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        showDashboardCard(data.user);
      } else {
        showAlert(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      // Standalone mode fallback
      handleStandaloneLogin(email, password);
    }
  });

  // --- Registration Handler ---
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name = regName?.value.trim();
    const email = regEmail?.value.trim();
    const dob = regDob?.value.trim();
    const password = regPassword?.value;
    const confirmPwd = regConfirmPwd?.value;

    if (!name || name.length < 2) {
      showAlert('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Please enter a valid email address.');
      return;
    }

    if (!validateDob()) {
      showAlert('Please provide a valid date of birth (minimum 13 years old).');
      return;
    }

    if (!evaluatePassword(password)) {
      showAlert('Password must meet all 4 security criteria.');
      return;
    }

    if (password !== confirmPwd) {
      showAlert('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, dob })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showAlert('Registration successful! Please sign in with your credentials.', 'success');
        switchTab('login');
        if (loginEmail) loginEmail.value = email;
        if (loginPassword) loginPassword.value = '';
        registerForm.reset();
        evaluatePassword('');
      } else {
        showAlert(data.message || 'Registration failed.');
      }
    } catch (err) {
      // Standalone mode fallback
      handleStandaloneRegister({ name, email, password, dob });
    }
  });

  // --- Standalone Mode (localStorage & WebCrypto) ---
  async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleStandaloneRegister(userData) {
    const users = JSON.parse(localStorage.getItem('secure_portal_users') || '[]');
    if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      showAlert('Email address is already registered.');
      return;
    }
    const pwdHash = await sha256(userData.password);
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      dob: userData.dob,
      password_hash: pwdHash,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    users.push(newUser);
    localStorage.setItem('secure_portal_users', JSON.stringify(users));
    showAlert('Account created in standalone mode! Please sign in.', 'success');
    switchTab('login');
    if (loginEmail) loginEmail.value = userData.email;
  }

  async function handleStandaloneLogin(email, password) {
    const users = JSON.parse(localStorage.getItem('secure_portal_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      showAlert('Account not found. Please create an account.');
      return;
    }
    const pwdHash = await sha256(password);
    if (user.password_hash !== pwdHash) {
      showAlert('Incorrect password.');
      return;
    }
    showDashboardCard(user);
  }

  function showDashboardCard(user) {
    if (!user) return;
    if (authContainer) authContainer.style.display = 'none';
    if (dashboardCard) dashboardCard.style.display = 'block';

    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
    if (dashAvatar) dashAvatar.textContent = initials;
    if (dashName) dashName.textContent = `Welcome, ${user.name}!`;
    if (dashEmail) dashEmail.textContent = user.email;
    if (dashDob) dashDob.textContent = user.dob || 'Not specified';
    
    if (dashAge && user.dob) {
      const d = parseDob(user.dob);
      dashAge.textContent = d ? `${calculateAge(d)} years old` : '--';
    }

    sessionStorage.setItem('current_user', JSON.stringify(user));
  }

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (_) {}
    sessionStorage.removeItem('current_user');
    if (dashboardCard) dashboardCard.style.display = 'none';
    if (authContainer) authContainer.style.display = 'block';
    switchTab('login');
    showAlert('You have been signed out.', 'success');
  });

  // Check if session exists in standalone mode
  const activeSession = sessionStorage.getItem('current_user');
  if (activeSession) {
    try {
      showDashboardCard(JSON.parse(activeSession));
    } catch (_) {}
  }
});
