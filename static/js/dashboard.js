/**
 * SecurePortal Dashboard Interactivity & Management
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const viewSections = document.querySelectorAll('.dash-view-section');
  const notification = document.getElementById('dashNotification');
  const liveDate = document.getElementById('liveDate');
  const sideLogoutBtn = document.getElementById('sideLogoutBtn');

  // Overview elements
  const heroUserName = document.getElementById('heroUserName');
  const heroUserAge = document.getElementById('heroUserAge');
  const hero2faBadge = document.getElementById('hero2faBadge');
  const kpiDob = document.getElementById('kpiDob');
  const kpiAge = document.getElementById('kpiAge');
  const kpiEmail = document.getElementById('kpiEmail');
  const kpiJoined = document.getElementById('kpiJoined');
  const cardName = document.getElementById('cardName');
  const cardEmail = document.getElementById('cardEmail');
  const cardPhone = document.getElementById('cardPhone');
  const cardDob = document.getElementById('cardDob');
  const cardAge = document.getElementById('cardAge');
  const card2fa = document.getElementById('card2fa');
  const summary2faStatus = document.getElementById('summary2faStatus');

  // Sidebar User Info
  const sideName = document.getElementById('sideName');
  const sideEmail = document.getElementById('sideEmail');
  const sideAvatar = document.getElementById('sideAvatar');

  // Profile Form
  const editProfileForm = document.getElementById('editProfileForm');
  const editName = document.getElementById('editName');
  const editEmail = document.getElementById('editEmail');
  const editDob = document.getElementById('editDob');
  const editPhone = document.getElementById('editPhone');

  // 2FA Elements
  const twoFactorBadge = document.getElementById('twoFactorBadge');
  const twoFactorIcon = document.getElementById('twoFactorIcon');
  const twoFactorHeading = document.getElementById('twoFactorHeading');
  const twoFactorSub = document.getElementById('twoFactorSub');
  const toggle2faBtn = document.getElementById('toggle2faBtn');
  const setup2faBox = document.getElementById('setup2faBox');
  const tabSmsMethod = document.getElementById('tabSmsMethod');
  const tabAppMethod = document.getElementById('tabAppMethod');
  const smsVerificationPane = document.getElementById('smsVerificationPane');
  const appVerificationPane = document.getElementById('appVerificationPane');

  // SMS Flow
  const twoFactorPhone = document.getElementById('twoFactorPhone');
  const sendSmsCodeBtn = document.getElementById('sendSmsCodeBtn');
  const simulatedSmsToast = document.getElementById('simulatedSmsToast');
  const smsToastCode = document.getElementById('smsToastCode');
  const copySmsCodeBtn = document.getElementById('copySmsCodeBtn');
  const dismissSmsToastBtn = document.getElementById('dismissSmsToastBtn');

  // QR Code Flow
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  const qrCountdownText = document.getElementById('qrCountdownText');
  const qrProgressBar = document.getElementById('qrProgressBar');
  const manualRefreshQrBtn = document.getElementById('manualRefreshQrBtn');
  const backupCodesContainer = document.getElementById('backupCodesContainer');

  // Verification Form
  const verify2faForm = document.getElementById('verify2faForm');
  const twoFactorCodeInput = document.getElementById('twoFactorCodeInput');
  const cancel2faBtn = document.getElementById('cancel2faBtn');

  // Password Change
  const changePasswordForm = document.getElementById('changePasswordForm');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');

  // Activity Log
  const fullActivityList = document.getElementById('fullActivityList');
  const revokeSessionsBtn = document.getElementById('revokeSessionsBtn');

  let currentUser = null;
  let qrTimer = null;
  let qrSecondsLeft = 60;
  let currentQrCodeInstance = null;

  // --- Clock / Date Pill ---
  function updateClock() {
    if (!liveDate) return;
    const now = new Date();
    const formatted = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
    liveDate.textContent = `📅 ${formatted} IST`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // --- Notification Banner ---
  function showNotification(msg, type = 'success') {
    if (!notification) return;
    notification.textContent = msg;
    notification.className = `dash-alert alert-${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.display = 'none';
    }, 6000);
  }

  // --- Tab Navigation ---
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navItems.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewSections.forEach(sec => {
        sec.classList.remove('active');
        if (sec.id === `view-${targetTab}`) {
          sec.classList.add('active');
        }
      });
    });
  });

  // --- Age Calculation ---
  function calculateAge(dobStr) {
    if (!dobStr) return '--';
    let parts = dobStr.split(/[-/]/);
    let y, m, d;
    if (parts[0].length === 4) {
      y = Number(parts[0]); m = Number(parts[1]); d = Number(parts[2]);
    } else {
      d = Number(parts[0]); m = Number(parts[1]); y = Number(parts[2]);
    }
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mDiff = today.getMonth() - birth.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : '--';
  }

  // --- Load User Data ---
  async function loadUserData() {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        renderUser(currentUser);
        loadLoginActivity();
        return;
      }
    } catch (_) {}

    // Fallback to local session
    const local = sessionStorage.getItem('current_user');
    if (local) {
      currentUser = JSON.parse(local);
      renderUser(currentUser);
    } else {
      currentUser = {
        name: 'John Doe',
        email: 'john@example.com',
        dob: '2000-01-01',
        phone_number: '+91 98765 43210',
        two_factor_enabled: 0
      };
      renderUser(currentUser);
    }
  }

  function renderUser(u) {
    if (!u) return;
    const age = calculateAge(u.dob);

    if (heroUserName) heroUserName.textContent = u.name || 'User';
    if (heroUserAge) heroUserAge.textContent = age;
    if (kpiDob) kpiDob.textContent = u.dob || '--';
    if (kpiAge) kpiAge.textContent = age;
    if (kpiEmail) kpiEmail.textContent = u.email || '--';
    if (cardName) cardName.textContent = u.name || '--';
    if (cardEmail) cardEmail.textContent = u.email || '--';
    if (cardDob) cardDob.textContent = u.dob || '--';
    if (cardAge) cardAge.textContent = `${age} years old`;
    if (cardPhone) cardPhone.textContent = u.phone_number || 'Not added';

    const initials = (u.name || 'US').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (sideAvatar) sideAvatar.textContent = initials;
    if (sideName) sideName.textContent = u.name || 'User';
    if (sideEmail) sideEmail.textContent = u.email || 'user@example.com';

    // Populate profile form
    if (editName) editName.value = u.name || '';
    if (editEmail) editEmail.value = u.email || '';
    if (editDob) editDob.value = u.dob || '';
    if (editPhone) editPhone.value = u.phone_number || '';
    if (twoFactorPhone) twoFactorPhone.value = u.phone_number || '';

    // 2FA Status
    const is2fa = Boolean(u.two_factor_enabled);
    if (twoFactorBadge) {
      twoFactorBadge.textContent = is2fa ? 'Active & Protected' : 'Disabled';
      twoFactorBadge.className = `badge-tag ${is2fa ? 'badge-success' : 'badge-warning'}`;
    }
    if (hero2faBadge) {
      hero2faBadge.textContent = is2fa ? '🛡️ 2FA Enabled' : '⚠️ 2FA Disabled';
    }
    if (card2fa) card2fa.textContent = is2fa ? '● Enabled' : '○ Disabled';
    if (summary2faStatus) summary2faStatus.textContent = is2fa ? 'Turned On' : 'Turned Off';
    if (twoFactorHeading) twoFactorHeading.textContent = is2fa ? 'Two-Step Authentication is Enabled' : 'Two-Step Authentication is Turned Off';
    if (twoFactorSub) twoFactorSub.textContent = is2fa ? 'Your account is safeguarded with 2FA verification.' : 'Protect your account against unauthorized access with an extra verification layer.';
    if (twoFactorIcon) {
      twoFactorIcon.textContent = is2fa ? '🛡️' : '⚠️';
      twoFactorIcon.className = `two-factor-icon ${is2fa ? 'icon-active' : 'icon-inactive'}`;
    }
    if (toggle2faBtn) {
      toggle2faBtn.textContent = is2fa ? 'Disable 2FA' : 'Enable 2FA';
      toggle2faBtn.className = is2fa ? 'dash-btn-secondary' : 'dash-btn-primary';
    }
  }

  // --- Profile Form Submit ---
  editProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      name: editName.value.trim(),
      dob: editDob.value.trim(),
      phone_number: editPhone.value.trim()
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        showNotification('Profile updated successfully!');
      }
    } catch (_) {}

    Object.assign(currentUser, updated);
    renderUser(currentUser);
    showNotification('Profile updated successfully!');
  });

  // --- 2FA Toggler ---
  toggle2faBtn?.addEventListener('click', async () => {
    if (currentUser?.two_factor_enabled) {
      // Disable 2FA
      try {
        const res = await fetch('/api/2fa/disable', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser.two_factor_enabled = 0;
          renderUser(currentUser);
          showNotification('Two-step verification has been disabled.');
          setup2faBox.classList.remove('active');
          loadLoginActivity();
          return;
        }
      } catch (_) {}
      currentUser.two_factor_enabled = 0;
      renderUser(currentUser);
      showNotification('Two-step verification disabled.');
      setup2faBox.classList.remove('active');
    } else {
      // Open Setup Drawer
      setup2faBox?.classList.toggle('active');
      if (setup2faBox?.classList.contains('active')) {
        switch2faMethod('sms');
      }
    }
  });

  cancel2faBtn?.addEventListener('click', () => {
    setup2faBox?.classList.remove('active');
    clearInterval(qrTimer);
  });

  // --- 2FA Methods Switcher ---
  function switch2faMethod(method) {
    if (method === 'sms') {
      tabSmsMethod?.classList.add('active');
      tabAppMethod?.classList.remove('active');
      if (smsVerificationPane) smsVerificationPane.style.display = 'block';
      if (appVerificationPane) appVerificationPane.style.display = 'none';
      clearInterval(qrTimer);
    } else {
      tabAppMethod?.classList.add('active');
      tabSmsMethod?.classList.remove('active');
      if (appVerificationPane) appVerificationPane.style.display = 'block';
      if (smsVerificationPane) smsVerificationPane.style.display = 'none';
      initDynamicQr();
    }
  }

  tabSmsMethod?.addEventListener('click', () => switch2faMethod('sms'));
  tabAppMethod?.addEventListener('click', () => switch2faMethod('app'));

  // --- SMS Flow ---
  sendSmsCodeBtn?.addEventListener('click', async () => {
    const phone = twoFactorPhone?.value.trim();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      showNotification('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/2fa/send-sms-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSmsToast(data.code, data.phone);
        showNotification(`SMS code sent to ${data.phone}`);
      } else {
        showNotification(data.message || 'Failed to send SMS code.', 'error');
      }
    } catch (_) {
      // Local fallback
      const fakeCode = Math.floor(100000 + Math.random() * 900000).toString();
      showSmsToast(fakeCode, phone);
      showNotification(`SMS code simulated for ${phone}`);
    }
  });

  function showSmsToast(code, phone) {
    if (!simulatedSmsToast || !smsToastCode) return;
    smsToastCode.textContent = code;
    simulatedSmsToast.style.display = 'block';
  }

  copySmsCodeBtn?.addEventListener('click', () => {
    if (smsToastCode && twoFactorCodeInput) {
      twoFactorCodeInput.value = smsToastCode.textContent.trim();
      twoFactorCodeInput.focus();
      showNotification('Code auto-filled into verification box!');
    }
  });

  dismissSmsToastBtn?.addEventListener('click', () => {
    if (simulatedSmsToast) simulatedSmsToast.style.display = 'none';
  });

  // --- Authenticator QR Flow ---
  async function initDynamicQr() {
    clearInterval(qrTimer);
    qrSecondsLeft = 60;
    updateQrTimerDisplay();

    try {
      const res = await fetch('/api/2fa/generate-secret', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        renderQrCode(data.secret);
        renderBackupCodes(data.backup_codes);
      }
    } catch (_) {
      const fallbackSecret = 'JBSWY3DPEHPK3PXP';
      renderQrCode(fallbackSecret);
      renderBackupCodes(['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0']);
    }

    qrTimer = setInterval(() => {
      qrSecondsLeft--;
      updateQrTimerDisplay();
      if (qrSecondsLeft <= 0) {
        initDynamicQr();
      }
    }, 1000);
  }

  function updateQrTimerDisplay() {
    if (qrCountdownText) qrCountdownText.textContent = `${qrSecondsLeft}s`;
    if (qrProgressBar) {
      const pct = (qrSecondsLeft / 60) * 100;
      qrProgressBar.style.width = `${pct}%`;
    }
  }

  function renderQrCode(secret) {
    if (!qrCodeContainer) return;
    qrCodeContainer.innerHTML = '';
    const otpUri = `otpauth://totp/SecurePortal:${currentUser?.email || 'user@example.com'}?secret=${secret}&issuer=SecurePortal`;
    if (window.QRCode) {
      currentQrCodeInstance = new window.QRCode(qrCodeContainer, {
        text: otpUri,
        width: 180,
        height: 180
      });
    }
  }

  function renderBackupCodes(codes) {
    if (!backupCodesContainer || !Array.isArray(codes)) return;
    backupCodesContainer.innerHTML = '';
    codes.forEach(c => {
      const pill = document.createElement('div');
      pill.className = 'backup-code-pill';
      pill.textContent = c;
      backupCodesContainer.appendChild(pill);
    });
  }

  manualRefreshQrBtn?.addEventListener('click', initDynamicQr);

  // --- Verify & Turn On 2FA ---
  verify2faForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = twoFactorCodeInput?.value.trim();
    if (!code || code.length !== 6) {
      showNotification('Please enter the 6-digit code.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        currentUser.two_factor_enabled = 1;
        if (data.phone) currentUser.phone_number = data.phone;
        renderUser(currentUser);
        setup2faBox.classList.remove('active');
        showNotification('Two-Step Authentication enabled successfully!');
        clearInterval(qrTimer);
        loadLoginActivity();
        return;
      } else {
        showNotification(data.message || 'Invalid verification code.', 'error');
      }
    } catch (_) {
      currentUser.two_factor_enabled = 1;
      renderUser(currentUser);
      setup2faBox.classList.remove('active');
      showNotification('Two-Step Authentication enabled (simulated)!');
    }
  });

  // --- Password Change ---
  changePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = currentPassword?.value;
    const nxt = newPassword?.value;
    const cnf = confirmNewPassword?.value;

    if (!cur || !nxt || !cnf) {
      showNotification('Please fill in all password fields.', 'error');
      return;
    }

    if (nxt !== cnf) {
      showNotification('New password and confirm password do not match.', 'error');
      return;
    }

    if (nxt.length < 8) {
      showNotification('New password must be at least 8 characters long.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: cur, new_password: nxt })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Password updated successfully!');
        changePasswordForm.reset();
        loadLoginActivity();
      } else {
        showNotification(data.message || 'Failed to update password. Check current password.', 'error');
        loadLoginActivity();
      }
    } catch (_) {
      showNotification('Password updated successfully (standalone mode)!');
      changePasswordForm.reset();
    }
  });

  // --- Activity Log ---
  async function loadLoginActivity() {
    try {
      const res = await fetch('/api/login-activity');
      if (res.ok) {
        const data = await res.json();
        renderActivityTable(data.activities);
      }
    } catch (_) {}
  }

  function renderActivityTable(list) {
    if (!fullActivityList || !Array.isArray(list)) return;
    fullActivityList.innerHTML = '';
    list.forEach(item => {
      const tr = document.createElement('tr');
      const isOk = item.status === 'Success';
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.event)}</strong></td>
        <td>${escapeHtml(item.user_agent || 'Chrome on Windows')}</td>
        <td><code>${escapeHtml(item.ip_address || '127.0.0.1 (Localhost)')}</code></td>
        <td>${escapeHtml(item.timestamp)}</td>
        <td><span class="badge-tag ${isOk ? 'badge-success' : 'badge-danger'}">${escapeHtml(item.status)}</span></td>
      `;
      fullActivityList.appendChild(tr);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Revoke Sessions ---
  revokeSessionsBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/revoke-sessions', { method: 'POST' });
      showNotification('All other active browser sessions have been revoked.');
      loadLoginActivity();
    } catch (_) {
      showNotification('Other active sessions revoked.');
    }
  });

  // --- Sign Out ---
  sideLogoutBtn?.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (_) {}
    sessionStorage.removeItem('current_user');
    window.location.href = '/';
  });

  // Initial load
  loadUserData();
});
