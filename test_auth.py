import os
import json
import unittest
from app import app, init_db, get_db_connection, get_totp_token

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.test_db = os.path.join(os.path.dirname(__file__), f'test_{self._testMethodName}.db')
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass
        app.config['TESTING'] = True
        app.config['DATABASE'] = self.test_db
        app.config['SECRET_KEY'] = 'test-secret'
        self.client = app.test_client()
        init_db(self.test_db)

    def tearDown(self):
        app.config.pop('DATABASE', None)
        if hasattr(self, 'test_db') and os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except Exception:
                pass

    def test_registration_validation(self):
        # Invalid email
        res = self.client.post('/api/register', json={
            'name': 'Test User',
            'email': 'not-an-email',
            'password': 'Password123!',
            'dob': '2000-01-01'
        })
        self.assertEqual(res.status_code, 400)

        # Underage (< 13 years)
        res = self.client.post('/api/register', json={
            'name': 'Kid User',
            'email': 'kid@example.com',
            'password': 'Password123!',
            'dob': '2025-01-01'
        })
        self.assertEqual(res.status_code, 400)

        # Successful registration (does not auto-login, prompts to sign in)
        res = self.client.post('/api/register', json={
            'name': 'John Doe',
            'email': 'john@example.com',
            'password': 'Password123!',
            'dob': '1998-05-15'
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['name'], 'John Doe')
        self.assertEqual(data['user']['email'], 'john@example.com')

        # Duplicate email
        res_dup = self.client.post('/api/register', json={
            'name': 'John Duplicate',
            'email': 'john@example.com',
            'password': 'Password123!',
            'dob': '1998-05-15'
        })
        self.assertEqual(res_dup.status_code, 409)

    def test_manual_dob_formats(self):
        # Test DD/MM/YYYY manual format
        res1 = self.client.post('/api/register', json={
            'name': 'Manual Dob User 1',
            'email': 'manual1@example.com',
            'password': 'Password123!',
            'dob': '25/12/1995'
        })
        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res1.get_json()['user']['dob'], '1995-12-25')

        # Test DD-MM-YYYY manual format
        res2 = self.client.post('/api/register', json={
            'name': 'Manual Dob User 2',
            'email': 'manual2@example.com',
            'password': 'Password123!',
            'dob': '14-02-1996'
        })
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.get_json()['user']['dob'], '1996-02-14')

        # Test YYYY/MM/DD manual format
        res3 = self.client.post('/api/register', json={
            'name': 'Manual Dob User 3',
            'email': 'manual3@example.com',
            'password': 'Password123!',
            'dob': '1992/08/30'
        })
        self.assertEqual(res3.status_code, 201)
        self.assertEqual(res3.get_json()['user']['dob'], '1992-08-30')

        # Test invalid manual date
        res_inv = self.client.post('/api/register', json={
            'name': 'Invalid Date User',
            'email': 'invalid_date@example.com',
            'password': 'Password123!',
            'dob': 'not-a-valid-date'
        })
        self.assertEqual(res_inv.status_code, 400)

    def test_registration_then_signin_opens_dashboard(self):
        # Step 1: Create an account
        res_reg = self.client.post('/api/register', json={
            'name': 'Alice Smith',
            'email': 'alice@example.com',
            'password': 'SecurePassword#2026',
            'dob': '1995-10-20'
        })
        self.assertEqual(res_reg.status_code, 201)
        reg_data = res_reg.get_json()
        self.assertTrue(reg_data['success'])

        # Prior to signing in, accessing /dashboard redirects to / (home/login)
        res_dash_unauth = self.client.get('/dashboard')
        self.assertEqual(res_dash_unauth.status_code, 302)

        # Step 2: Sign in with the registered credentials
        res_login = self.client.post('/api/login', json={
            'email': 'alice@example.com',
            'password': 'SecurePassword#2026'
        })
        self.assertEqual(res_login.status_code, 200)
        login_data = res_login.get_json()
        self.assertTrue(login_data['success'])
        self.assertEqual(login_data['redirect'], '/dashboard')
        self.assertEqual(login_data['user']['name'], 'Alice Smith')

        # Step 3: Now /dashboard opens and displays Alice Smith's details
        res_dash = self.client.get('/dashboard')
        self.assertEqual(res_dash.status_code, 200)
        self.assertIn(b'Alice Smith', res_dash.data)

        # 2FA Secret Generation
        res_2fa_gen = self.client.post('/api/2fa/generate-secret')
        self.assertEqual(res_2fa_gen.status_code, 200)
        secret = res_2fa_gen.get_json()['secret']
        self.assertIn('secret', res_2fa_gen.get_json())
        self.assertEqual(len(res_2fa_gen.get_json()['backup_codes']), 5)

        # 2FA Enable using real TOTP code from app (no demo bypass)
        real_totp_code = get_totp_token(secret)
        res_2fa_en = self.client.post('/api/2fa/enable', json={'code': real_totp_code})
        self.assertEqual(res_2fa_en.status_code, 200)
        self.assertTrue(res_2fa_en.get_json()['success'])

        # 2FA Disable directly (without requiring manual password entry)
        res_2fa_dis = self.client.post('/api/2fa/disable')
        self.assertEqual(res_2fa_dis.status_code, 200)
        self.assertTrue(res_2fa_dis.get_json()['success'])

        # Check Login Activity Log
        res_act = self.client.get('/api/login-activity')
        self.assertEqual(res_act.status_code, 200)
        acts = res_act.get_json()['activities']
        self.assertGreater(len(acts), 0)

        # Logout
        res_out = self.client.post('/api/logout')
        self.assertEqual(res_out.status_code, 200)

        # /dashboard should redirect back to / after logout
        res_dash_out = self.client.get('/dashboard')
        self.assertEqual(res_dash_out.status_code, 302)

    def test_failed_attempts_and_indian_timings(self):
        # 1. Register a user
        res_reg = self.client.post('/api/register', json={
            'name': 'Rahul Sharma',
            'email': 'rahul@example.com',
            'password': 'Password123!',
            'dob': '1995-05-15'
        })
        self.assertEqual(res_reg.status_code, 201)

        # 2. Attempt login with WRONG password
        res_fail = self.client.post('/api/login', json={
            'email': 'rahul@example.com',
            'password': 'WrongPassword123!'
        })
        self.assertEqual(res_fail.status_code, 401)

        # 3. Successful login
        res_login = self.client.post('/api/login', json={
            'email': 'rahul@example.com',
            'password': 'Password123!'
        })
        self.assertEqual(res_login.status_code, 200)

        # 4. Attempt password change with WRONG current password
        res_pwd_fail = self.client.post('/api/change-password', json={
            'current_password': 'IncorrectCurrentPassword!',
            'new_password': 'NewPassword123!'
        })
        self.assertEqual(res_pwd_fail.status_code, 400)

        # 5. Fetch activity history
        res_act = self.client.get('/api/login-activity')
        self.assertEqual(res_act.status_code, 200)
        acts = res_act.get_json()['activities']

        # Verify failed login attempt is present in history
        failed_logins = [a for a in acts if 'Failed Login Attempt' in a['event'] and a['status'] == 'Failed']
        self.assertGreater(len(failed_logins), 0, "Failed login attempt must be recorded in history")

        # Verify failed password change attempt is present in history
        failed_pwd = [a for a in acts if 'Failed Password Change' in a['event'] and a['status'] == 'Failed']
        self.assertGreater(len(failed_pwd), 0, "Failed password change must be recorded in history")

        # Verify all timestamps are in Indian timings (IST)
        for a in acts:
            self.assertIn('IST', a['timestamp'], f"Timestamp '{a['timestamp']}' must include IST")

    def test_sms_2fa_verification_flow(self):
        # 1. Register a user
        res_reg = self.client.post('/api/register', json={
            'name': 'Priya Patel',
            'email': 'priya@example.com',
            'password': 'Password123!',
            'dob': '1997-08-25'
        })
        self.assertEqual(res_reg.status_code, 201)

        # 2. Login
        res_login = self.client.post('/api/login', json={
            'email': 'priya@example.com',
            'password': 'Password123!'
        })
        self.assertEqual(res_login.status_code, 200)

        # 3. Request SMS code with invalid phone number (< 10 digits)
        res_inv_phone = self.client.post('/api/2fa/send-sms-code', json={'phone': '12345'})
        self.assertEqual(res_inv_phone.status_code, 400)
        self.assertFalse(res_inv_phone.get_json()['success'])

        # 4. Request SMS code with valid Indian phone number
        res_sms = self.client.post('/api/2fa/send-sms-code', json={'phone': '9876543210'})
        self.assertEqual(res_sms.status_code, 200)
        sms_data = res_sms.get_json()
        self.assertTrue(sms_data['success'])
        self.assertTrue('code' in sms_data)
        self.assertEqual(len(sms_data['code']), 6)
        self.assertTrue(sms_data['code'].isdigit())
        self.assertIn('+91', sms_data['phone'])
        sms_code = sms_data['code']

        # 5. Attempt enable with wrong code
        res_wrong = self.client.post('/api/2fa/enable', json={'code': '999999'})
        self.assertEqual(res_wrong.status_code, 400)

        # 6. Attempt enable with correct 6-digit SMS code
        res_enable = self.client.post('/api/2fa/enable', json={'code': sms_code})
        self.assertEqual(res_enable.status_code, 200)
        enable_data = res_enable.get_json()
        self.assertTrue(enable_data['success'])
        self.assertEqual(enable_data['phone'], sms_data['phone'])

        # 7. Check user profile /api/me
        res_me = self.client.get('/api/me')
        self.assertEqual(res_me.status_code, 200)
        me_data = res_me.get_json()
        self.assertEqual(me_data['user']['two_factor_enabled'], 1)
        self.assertEqual(me_data['user']['phone_number'], sms_data['phone'])

        # 8. Check login activity history records SMS 2FA enablement in IST
        res_act = self.client.get('/api/login-activity')
        self.assertEqual(res_act.status_code, 200)
        acts = res_act.get_json()['activities']
        sms_act = [a for a in acts if '2-Step Verification Enabled (via SMS' in a['event']]
        self.assertGreater(len(sms_act), 0)
        self.assertEqual(sms_act[0]['status'], 'Success')
        self.assertIn('IST', sms_act[0]['timestamp'])

        # 9. Disable 2FA
        res_dis = self.client.post('/api/2fa/disable')
        self.assertEqual(res_dis.status_code, 200)
        self.assertTrue(res_dis.get_json()['success'])

if __name__ == '__main__':
    unittest.main()

