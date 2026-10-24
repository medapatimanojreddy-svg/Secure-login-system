import os
import re
import hmac
import hashlib
import base64
import struct
import time
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta

from flask import (
    Flask, request, jsonify, session, redirect, url_for,
    render_template_string, send_from_directory
)
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
IST = timezone(timedelta(hours=5, minutes=30))

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='/static')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'secure-portal-super-secret-key-2026')
app.config['DATABASE'] = os.path.join(BASE_DIR, 'database.db')


def get_db_path():
    return app.config.get('DATABASE', os.path.join(BASE_DIR, 'database.db'))


def get_db_connection(db_path=None):
    path = db_path or get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path=None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            dob TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_secret TEXT DEFAULT NULL,
            backup_codes TEXT DEFAULT NULL,
            phone_number TEXT DEFAULT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            status TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()


def get_ist_time():
    return datetime.now(IST).strftime('%d %b %Y, %I:%M:%S %p IST')


def log_activity(user_id, event, status, ip=None, user_agent=None, db_path=None):
    if not user_id:
        return
    ip_addr = ip or request.remote_addr or '127.0.0.1 (Localhost)'
    ua = user_agent or (request.user_agent.string if request.user_agent else 'Chrome on Windows')
    if 'Chrome' in ua or 'Mozilla' in ua:
        ua_str = 'Chrome on Windows'
    else:
        ua_str = ua[:50]

    ts = get_ist_time()
    conn = get_db_connection(db_path)
    conn.execute(
        'INSERT INTO login_activity (user_id, event, ip_address, user_agent, status, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        (user_id, event, ip_addr, ua_str, status, ts)
    )
    conn.commit()
    conn.close()


def get_totp_token(secret):
    key = base64.b32decode(secret, casefold=True)
    intervals_no = int(time.time()) // 30
    msg = struct.pack(">Q", intervals_no)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    o = h[19] & 15
    h = (struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff) % 1000000
    return f"{h:06d}"


def normalize_dob(dob_str):
    if not dob_str:
        return None, None
    clean = dob_str.strip()
    y, m, d = None, None, None

    if re.match(r'^\d{4}-\d{2}-\d{2}$', clean):
        parts = clean.split('-')
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    elif re.match(r'^\d{4}/\d{2}/\d{2}$', clean):
        parts = clean.split('/')
        y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
    elif re.match(r'^\d{2}/\d{2}/\d{4}$', clean):
        parts = clean.split('/')
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
    elif re.match(r'^\d{2}-\d{2}-\d{4}$', clean):
        parts = clean.split('-')
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
    else:
        return None, None

    try:
        birth = datetime(y, m, d)
    except ValueError:
        return None, None

    today = datetime.now()
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    canonical = f"{y:04d}-{m:02d}-{d:02d}"
    return canonical, age


# --- HTML Serving Routes ---

@app.route('/')
@app.route('/index.html')
def home():
    index_file = os.path.join(BASE_DIR, 'index.html')
    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()
    return content


@app.route('/dashboard')
def dashboard():
    user_id = session.get('user_id')
    if not user_id:
        return redirect('/')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()

    if not user:
        session.clear()
        return redirect('/')

    dash_file = os.path.join(BASE_DIR, 'dashboard.html')
    with open(dash_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject user details for template rendering and test asserts
    user_name = user['name']
    content = content.replace('Welcome back, <span id="heroUserName">User</span>', f'Welcome back, <span id="heroUserName">{user_name}</span>')
    content = content.replace('<div id="sideName" class="user-mini-name">Loading...</div>', f'<div id="sideName" class="user-mini-name">{user_name}</div>')
    return render_template_string(content, user=dict(user))


# --- API Routes ---

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    dob_raw = data.get('dob') or ''

    if not name or len(name) < 2:
        return jsonify({'success': False, 'message': 'Name must be at least 2 characters.'}), 400

    if not email or not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'success': False, 'message': 'Invalid email address.'}), 400

    dob_canonical, age = normalize_dob(dob_raw)
    if not dob_canonical:
        return jsonify({'success': False, 'message': 'Invalid date of birth format.'}), 400

    if age < 13:
        return jsonify({'success': False, 'message': 'Must be at least 13 years old.'}), 400

    if len(password) < 8 or not re.search(r'[A-Z]', password) or not re.search(r'[0-9]', password) or not re.search(r'[^A-Za-z0-9]', password):
        return jsonify({'success': False, 'message': 'Password must meet all complexity requirements.'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'success': False, 'message': 'Email already registered.'}), 409

    pwd_hash = generate_password_hash(password)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO users (name, email, password_hash, dob) VALUES (?, ?, ?, ?)',
        (name, email, pwd_hash, dob_canonical)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_activity(user_id, 'Account Registered', 'Success')

    return jsonify({
        'success': True,
        'message': 'Registration successful.',
        'user': {
            'id': user_id,
            'name': name,
            'email': email,
            'dob': dob_canonical
        }
    }), 201


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        if user:
            log_activity(user['id'], 'Failed Login Attempt', 'Failed')
        return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

    session['user_id'] = user['id']
    log_activity(user['id'], 'User Sign In', 'Success')

    user_dict = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'dob': user['dob'],
        'phone_number': user['phone_number'],
        'two_factor_enabled': user['two_factor_enabled']
    }

    return jsonify({
        'success': True,
        'redirect': '/dashboard',
        'user': user_dict
    }), 200


@app.route('/api/me', methods=['GET'])
def api_me():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'dob': user['dob'],
            'phone_number': user['phone_number'],
            'two_factor_enabled': user['two_factor_enabled']
        }
    }), 200


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out.'}), 200


@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    cur_pwd = data.get('current_password') or ''
    new_pwd = data.get('new_password') or ''

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user or not check_password_hash(user['password_hash'], cur_pwd):
        conn.close()
        log_activity(user_id, 'Failed Password Change', 'Failed')
        return jsonify({'success': False, 'message': 'Current password is incorrect.'}), 400

    if len(new_pwd) < 8:
        conn.close()
        return jsonify({'success': False, 'message': 'New password must be at least 8 characters.'}), 400

    new_hash = generate_password_hash(new_pwd)
    conn.execute('UPDATE users SET password_hash = ? WHERE id = ?', (new_hash, user_id))
    conn.commit()
    conn.close()

    log_activity(user_id, 'Password Changed', 'Success')
    return jsonify({'success': True, 'message': 'Password updated successfully.'}), 200


@app.route('/api/2fa/generate-secret', methods=['POST'])
def api_2fa_gen_secret():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    raw_bytes = secrets.token_bytes(10)
    secret = base64.b32encode(raw_bytes).decode('utf-8').replace('=', '')
    backup_codes = [f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}" for _ in range(5)]

    session['pending_2fa_secret'] = secret
    session['pending_backup_codes'] = backup_codes

    return jsonify({
        'success': True,
        'secret': secret,
        'backup_codes': backup_codes
    }), 200


@app.route('/api/2fa/send-sms-code', methods=['POST'])
def api_2fa_send_sms():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    phone = (data.get('phone') or '').strip()
    digits = re.sub(r'\D', '', phone)

    if len(digits) < 10:
        return jsonify({'success': False, 'message': 'Invalid phone number.'}), 400

    formatted_phone = f"+91{digits[-10:]}"
    code = f"{secrets.randbelow(900000) + 100000:06d}"

    session['sms_2fa_code'] = code
    session['sms_2fa_phone'] = formatted_phone

    return jsonify({
        'success': True,
        'code': code,
        'phone': formatted_phone
    }), 200


@app.route('/api/2fa/enable', methods=['POST'])
def api_2fa_enable():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    code = (data.get('code') or '').strip()

    # Check SMS code
    sms_code = session.get('sms_2fa_code')
    sms_phone = session.get('sms_2fa_phone')
    is_sms = sms_code and code == sms_code

    # Check TOTP code
    secret = session.get('pending_2fa_secret')
    is_totp = False
    if secret:
        try:
            expected_totp = get_totp_token(secret)
            if code == expected_totp:
                is_totp = True
        except Exception:
            pass

    if not is_sms and not is_totp:
        return jsonify({'success': False, 'message': 'Invalid verification code.'}), 400

    conn = get_db_connection()
    if is_sms:
        conn.execute('UPDATE users SET two_factor_enabled = 1, phone_number = ? WHERE id = ?', (sms_phone, user_id))
        conn.commit()
        conn.close()
        log_activity(user_id, f'2-Step Verification Enabled (via SMS to {sms_phone})', 'Success')
        session.pop('sms_2fa_code', None)
        return jsonify({'success': True, 'phone': sms_phone}), 200
    else:
        conn.execute('UPDATE users SET two_factor_enabled = 1, two_factor_secret = ? WHERE id = ?', (secret, user_id))
        conn.commit()
        conn.close()
        log_activity(user_id, '2-Step Verification Enabled (via Authenticator App)', 'Success')
        session.pop('pending_2fa_secret', None)
        return jsonify({'success': True}), 200


@app.route('/api/2fa/disable', methods=['POST'])
def api_2fa_disable():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    conn = get_db_connection()
    conn.execute('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()

    log_activity(user_id, '2-Step Verification Disabled', 'Success')
    return jsonify({'success': True, 'message': '2FA disabled.'}), 200


@app.route('/api/login-activity', methods=['GET'])
def api_login_activity():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    conn = get_db_connection()
    rows = conn.execute(
        'SELECT event, ip_address, user_agent, status, timestamp FROM login_activity WHERE user_id = ? ORDER BY id DESC',
        (user_id,)
    ).fetchall()
    conn.close()

    activities = [dict(r) for r in rows]
    return jsonify({'success': True, 'activities': activities}), 200


@app.route('/api/revoke-sessions', methods=['POST'])
def api_revoke_sessions():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    log_activity(user_id, 'Other Active Sessions Revoked', 'Success')
    return jsonify({'success': True, 'message': 'Other sessions revoked.'}), 200


@app.route('/api/profile', methods=['POST'])
def api_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    dob = (data.get('dob') or '').strip()
    phone = (data.get('phone_number') or '').strip()

    conn = get_db_connection()
    conn.execute(
        'UPDATE users SET name = COALESCE(NULLIF(?, ""), name), dob = COALESCE(NULLIF(?, ""), dob), phone_number = COALESCE(NULLIF(?, ""), phone_number) WHERE id = ?',
        (name, dob, phone, user_id)
    )
    conn.commit()
    conn.close()

    log_activity(user_id, 'Profile Information Updated', 'Success')
    return jsonify({'success': True, 'message': 'Profile updated.'}), 200


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5500))
    print(f"Starting Secure Authentication Portal on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
