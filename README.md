# 🛡️ Secure Login & Account Registration System

A modern, responsive, and secure authentication web application built with **Flask**, **SQLite**, and vanilla **HTML5 / CSS3 / JavaScript**.

---

## ✨ Features

### 1. 🔑 Sign In (Login Page)
* **Email Address**: Format validation with auto-focus.
* **Password Field**: Protected input with an interactive **Show/Hide password toggle** (`👁️`).
* **Remember Me & Forgot Password**: UI options with an informative modal.
* **Seamless Transition**: One-click switch to "Create Account" if you do not have an existing account.

### 2. 📝 Create Account (Registration Page)
* **Full Name**: Minimum character length validation.
* **Email Address**: Validated for standard RFC email patterns.
* **Date of Birth (DOB)**:
  * Native date-picker with min/max age boundaries.
  * Real-time age calculation (e.g., `Age: 24 years old`).
  * Enforces minimum age requirement (13+ years).
* **Password with Live Strength Meter**:
  * Real-time visual progress indicator (Weak / Fair / Good / Strong).
  * Dynamic rule checklist:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 number
    - At least 1 special symbol
* **Confirm Password**: Real-time match verification indicator.
* **Instant Sign In Link**: Switch back to login with one click.

### 3. 👤 Post-Login User Dashboard
* Displays personalized greeting with user avatar and calculated age.
* **Navigation Tabs**:
  * **📊 Dashboard (Overview)**: KPI cards (Date of Birth, Age, Security Level, Member Since, Primary Email) and Account Summary.
  * **👤 My Profile**: Edit Full Name and Date of Birth with live age recalculation.
  * **🔐 Security Center**: Comprehensive security management with 3 core modules:
    1. **Password Change**: Update password securely with verification of the current password and live validation of the new password.
    2. **Two-Step Authentication (2FA)**:
       - TOTP Authenticator app support (Google Authenticator, Microsoft Authenticator, Authy).
       - QR code scan and secret key copy with 6-digit confirmation code verification.
       - Emergency one-time recovery backup codes.
       - Status badge and ability to disable 2FA with password confirmation.
    3. **Login Activity & Active Sessions**:
       - Full history table logging event type, connected browser/OS (e.g. `Chrome on Windows`), IP address (`127.0.0.1 (Localhost)`), timestamp, and status.
       - "Revoke Other Sessions" action to terminate other active browser sessions.
* **Sign Out**: Clears server and local sessions immediately.

### 4. 🔒 Security Best Practices
* **Strong Password Hashing**: Passwords are cryptographically hashed using **Werkzeug's scrypt/pbkdf2** (Flask server mode) or **Web Crypto API SHA-256** (standalone browser mode). Passwords are never stored in plain text.
* **SQL Injection Prevention**: Parameterized SQLite queries (`?` placeholders).
* **Client & Server-Side Validation**: Ensures data integrity both on the frontend and backend.
* **Dual-Mode Operation**:
  * **Server Mode**: Full-stack Flask app with persistent SQLite database.
  * **Standalone Mode**: Can simply be double-clicked in Windows Explorer (`index.html`) and runs with `localStorage` and WebCrypto.

---

## 🚀 How to Run

### Method 1: Full-Stack Flask Server (Recommended)

1. Open a terminal in this folder:
   ```powershell
   cd "c:\Users\abhis\OneDrive\Documents\secure login system"
   ```

2. Start the Flask application:
   ```powershell
   python app.py
   ```

3. Open your browser and go to:
   ```
   http://127.0.0.1:5000
   ```

---

### Method 2: Direct Browser Launch (No Server Required)

Simply open the `index.html` file located in this directory by double-clicking it or right-clicking > **Open with Google Chrome / Microsoft Edge / Firefox**.

---

## 🧪 Running Automated Tests

To verify that the registration, validation, duplicate email handling, and login sessions are working properly:

```powershell
python test_auth.py
```

---

## 📂 Project Structure

```
secure login system/
├── app.py                 # Flask server with REST API & SQLite integration
├── database.db            # SQLite database file (created automatically)
├── index.html             # Standalone browser-ready single-page application
├── test_auth.py           # Automated unit tests for authentication logic
├── README.md              # Project documentation
├── static/
│   ├── css/
│   │   └── style.css      # Modern responsive UI styling and animations
│   └── js/
│       └── app.js         # Frontend interactivity, validation, strength meter
└── templates/
    └── index.html         # Jinja2 template served by Flask
```
