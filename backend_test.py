#!/usr/bin/env python3
"""
Backend test for XamanProtocol email+password authentication.
Tests all auth endpoints: register, login, recover.
"""
import requests
import json
import time
import secrets
from typing import Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://9d5e4fd8-640f-4649-982f-0ea17001f397.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@xamanprotocol.com"
ADMIN_PASSWORD = "XamanAdmin2025!"
ADMIN_PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow"

def log(msg: str):
    """Print timestamped log message"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def assert_eq(actual, expected, msg: str):
    """Assert equality with detailed error message"""
    if actual != expected:
        raise AssertionError(f"{msg}: expected {expected}, got {actual}")
    log(f"✓ {msg}: {actual}")

def assert_true(condition, msg: str):
    """Assert condition is true"""
    if not condition:
        raise AssertionError(f"{msg}: condition failed")
    log(f"✓ {msg}")

def assert_in(item, container, msg: str):
    """Assert item is in container"""
    if item not in container:
        raise AssertionError(f"{msg}: {item} not in {container}")
    log(f"✓ {msg}")

def assert_not_empty(value, msg: str):
    """Assert value is not empty"""
    if not value:
        raise AssertionError(f"{msg}: value is empty")
    log(f"✓ {msg}: {value}")

class TestEmailPasswordAuth:
    def __init__(self):
        self.test_email = None
        self.test_password = "secret123"
        self.test_phrase = None
        self.test_token = None
        self.test_user_id = None
        self.test_username = None
        
    def case_1_register_valid_user(self):
        """Case 1: POST /api/auth/register with valid data -> 200 with token, phrase, user"""
        log("\n=== CASE 1: Register Valid User ===")
        
        # Generate unique email
        random_suffix = secrets.token_hex(4)
        self.test_email = f"authtest_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Test",
            "last_name": "User",
            "email": self.test_email,
            "password": self.test_password
        })
        
        assert_eq(resp.status_code, 200, "Register status code")
        data = resp.json()
        
        # Verify response structure
        assert_in("token", data, "Response has token")
        assert_in("phrase", data, "Response has phrase")
        assert_in("user", data, "Response has user")
        
        # Verify token is not empty
        assert_not_empty(data["token"], "Token is not empty")
        self.test_token = data["token"]
        
        # Verify phrase is 12 words
        phrase_words = data["phrase"].strip().split()
        assert_eq(len(phrase_words), 12, "Phrase has 12 words")
        self.test_phrase = data["phrase"]
        log(f"✓ Recovery phrase: {self.test_phrase}")
        
        # Verify user object
        user = data["user"]
        assert_in("id", user, "User has id")
        assert_in("email", user, "User has email")
        assert_in("username", user, "User has username")
        
        # Verify email matches
        assert_eq(user["email"], self.test_email, "User email matches")
        
        # Verify username is auto-generated and not empty
        assert_not_empty(user["username"], "Username is auto-generated")
        self.test_username = user["username"]
        self.test_user_id = user["id"]
        
        log(f"✓ User registered: email={self.test_email}, username={self.test_username}, id={self.test_user_id}")
        
    def case_2_register_duplicate_email(self):
        """Case 2: Register same email again -> 409"""
        log("\n=== CASE 2: Register Duplicate Email ===")
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Another",
            "last_name": "User",
            "email": self.test_email,
            "password": "anotherpassword123"
        })
        
        assert_eq(resp.status_code, 409, "Duplicate email returns 409")
        log(f"✓ Correctly rejected duplicate email: {resp.json().get('detail', '')}")
        
    def case_3_register_short_password(self):
        """Case 3: Register with password length 5 -> 400"""
        log("\n=== CASE 3: Register with Short Password ===")
        
        random_suffix = secrets.token_hex(4)
        email = f"shortpass_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Short",
            "last_name": "Pass",
            "email": email,
            "password": "12345"  # Only 5 characters
        })
        
        assert_eq(resp.status_code, 400, "Short password returns 400")
        log(f"✓ Correctly rejected short password: {resp.json().get('detail', '')}")
        
    def case_4_register_invalid_email(self):
        """Case 4: Register with invalid email 'abc' -> 400"""
        log("\n=== CASE 4: Register with Invalid Email ===")
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Invalid",
            "last_name": "Email",
            "email": "abc",  # Invalid email format
            "password": "validpassword123"
        })
        
        assert_eq(resp.status_code, 400, "Invalid email returns 400")
        log(f"✓ Correctly rejected invalid email: {resp.json().get('detail', '')}")
        
    def case_5_login_correct_and_wrong_password(self):
        """Case 5: POST /api/auth/login with correct password -> 200; wrong password -> 401"""
        log("\n=== CASE 5: Login with Correct and Wrong Password ===")
        
        # Test correct password
        log("Testing correct password...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        
        assert_eq(resp.status_code, 200, "Login with correct password returns 200")
        data = resp.json()
        assert_in("token", data, "Login response has token")
        assert_not_empty(data["token"], "Login token is not empty")
        log(f"✓ Login successful with correct password")
        
        # Test wrong password
        log("Testing wrong password...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": self.test_email,
            "password": "wrongpass"
        })
        
        assert_eq(resp.status_code, 401, "Login with wrong password returns 401")
        log(f"✓ Correctly rejected wrong password: {resp.json().get('detail', '')}")
        
    def case_6_admin_login(self):
        """Case 6: Admin login -> 200 with user.role == 'admin'"""
        log("\n=== CASE 6: Admin Login ===")
        
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert_eq(resp.status_code, 200, "Admin login returns 200")
        data = resp.json()
        assert_in("token", data, "Admin login response has token")
        assert_in("user", data, "Admin login response has user")
        
        user = data["user"]
        assert_in("role", user, "Admin user has role")
        assert_eq(user["role"], "admin", "Admin user role is 'admin'")
        
        log(f"✓ Admin login successful with role=admin")
        
    def case_7_recover_correct_and_wrong_phrase(self):
        """Case 7: POST /api/auth/recover with correct phrase -> 200; wrong phrase -> 401"""
        log("\n=== CASE 7: Recover with Correct and Wrong Phrase ===")
        
        # Test correct phrase
        log("Testing correct phrase...")
        resp = requests.post(f"{BASE_URL}/auth/recover", json={
            "email": self.test_email,
            "phrase": self.test_phrase
        })
        
        assert_eq(resp.status_code, 200, "Recover with correct phrase returns 200")
        data = resp.json()
        assert_in("token", data, "Recover response has token")
        assert_not_empty(data["token"], "Recover token is not empty")
        log(f"✓ Recovery successful with correct phrase")
        
        # Test wrong phrase (12 random valid-looking words)
        log("Testing wrong phrase...")
        wrong_phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
        resp = requests.post(f"{BASE_URL}/auth/recover", json={
            "email": self.test_email,
            "phrase": wrong_phrase
        })
        
        assert_eq(resp.status_code, 401, "Recover with wrong phrase returns 401")
        log(f"✓ Correctly rejected wrong phrase: {resp.json().get('detail', '')}")
        
    def case_8_admin_recover(self):
        """Case 8: Admin recover -> 200 with user.role == 'admin'"""
        log("\n=== CASE 8: Admin Recover ===")
        
        resp = requests.post(f"{BASE_URL}/auth/recover", json={
            "email": ADMIN_EMAIL,
            "phrase": ADMIN_PHRASE
        })
        
        assert_eq(resp.status_code, 200, "Admin recover returns 200")
        data = resp.json()
        assert_in("token", data, "Admin recover response has token")
        assert_in("user", data, "Admin recover response has user")
        
        user = data["user"]
        assert_in("role", user, "Admin user has role")
        assert_eq(user["role"], "admin", "Admin user role is 'admin'")
        
        log(f"✓ Admin recovery successful with role=admin")
        
    def case_9_auth_me_and_state(self):
        """Case 9: GET /api/auth/me and GET /api/state with token -> 200 with correct user"""
        log("\n=== CASE 9: GET /api/auth/me and /api/state ===")
        
        # Test GET /api/auth/me
        log("Testing GET /api/auth/me...")
        resp = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {self.test_token}"
        })
        
        assert_eq(resp.status_code, 200, "GET /api/auth/me returns 200")
        data = resp.json()
        assert_in("user", data, "Response has user")
        
        user = data["user"]
        assert_eq(user["id"], self.test_user_id, "User id matches")
        assert_eq(user["email"], self.test_email, "User email matches")
        assert_eq(user["username"], self.test_username, "User username matches")
        
        log(f"✓ GET /api/auth/me successful with correct user data")
        
        # Test GET /api/state
        log("Testing GET /api/state...")
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {self.test_token}"
        })
        
        assert_eq(resp.status_code, 200, "GET /api/state returns 200")
        data = resp.json()
        assert_in("user", data, "State response has user")
        
        user = data["user"]
        assert_eq(user["id"], self.test_user_id, "State user id matches")
        assert_eq(user["email"], self.test_email, "State user email matches")
        assert_eq(user["username"], self.test_username, "State user username matches")
        
        log(f"✓ GET /api/state successful with correct user data")
        
    def case_10_cleanup_note(self):
        """Case 10: Note test user for cleanup"""
        log("\n=== CASE 10: Cleanup Note ===")
        log(f"✓ Test user created: id={self.test_user_id}, email={self.test_email}, username={self.test_username}")
        log(f"✓ Main agent can delete this user if needed")
        
    def run_all_tests(self):
        """Run all test cases"""
        try:
            self.case_1_register_valid_user()
            self.case_2_register_duplicate_email()
            self.case_3_register_short_password()
            self.case_4_register_invalid_email()
            self.case_5_login_correct_and_wrong_password()
            self.case_6_admin_login()
            self.case_7_recover_correct_and_wrong_phrase()
            self.case_8_admin_recover()
            self.case_9_auth_me_and_state()
            self.case_10_cleanup_note()
            
            log("\n" + "="*60)
            log("✅ ALL 10 TEST CASES PASSED")
            log("="*60)
            return True
            
        except AssertionError as e:
            log(f"\n❌ TEST FAILED: {e}")
            return False
        except Exception as e:
            log(f"\n❌ UNEXPECTED ERROR: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    tester = TestEmailPasswordAuth()
    success = tester.run_all_tests()
    exit(0 if success else 1)
