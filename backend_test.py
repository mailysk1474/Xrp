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
BASE_URL = "https://e62481f0-4630-4eaa-a790-32b7e6e49bc2.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@xamanprotocol.com"
ADMIN_PASSWORD = "admin12345"  # Default password from backend/.env
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

class TestFlexibleVaultStopStake:
    """Test flexible vault stop stake with no penalty vs locked vault with penalty"""
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.user_id = None
        self.user_email = None
        self.flex_stake_id = None
        self.locked_stake_id = None
        
    def setup_admin_token(self):
        """Get admin token for balance adjustment"""
        log("\n=== SETUP: Admin Login ===")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert_eq(resp.status_code, 200, "Admin login")
        self.admin_token = resp.json()["token"]
        log(f"✓ Admin token obtained")
        
    def case_1_register_fresh_user(self):
        """Case 1: Register a fresh user"""
        log("\n=== CASE 1: Register Fresh User ===")
        random_suffix = secrets.token_hex(4)
        self.user_email = f"flextest_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Flex",
            "last_name": "Tester",
            "email": self.user_email,
            "password": "secret123"
        })
        
        assert_eq(resp.status_code, 200, "User registration")
        data = resp.json()
        self.user_token = data["token"]
        self.user_id = data["user"]["id"]
        log(f"✓ User registered: email={self.user_email}, id={self.user_id}")
        
    def case_2_admin_credits_balance(self):
        """Case 2: Admin credits user balance with 100000 XRP"""
        log("\n=== CASE 2: Admin Credits Balance ===")
        resp = requests.post(
            f"{BASE_URL}/admin/users/{self.user_id}/adjust-balance",
            json={"amount": 100000},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Admin balance credit")
        log(f"✓ Balance credited: 100000 XRP")
        
    def case_3_stake_into_xrp_flex(self):
        """Case 3: Stake 60000 XRP into xrp_flex"""
        log("\n=== CASE 3: Stake into xrp_flex ===")
        resp = requests.post(
            f"{BASE_URL}/stakes",
            json={"vault_key": "xrp_flex", "amount": 60000},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Stake creation")
        log(f"✓ Staked 60000 XRP into xrp_flex")
        
    def case_4_verify_flex_stake_state(self):
        """Case 4: GET /api/state - verify flex stake can_exit=true with no penalty"""
        log("\n=== CASE 4: Verify Flex Stake State ===")
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        # Find the flex stake
        stakes = data.get("stakes", [])
        assert_true(len(stakes) > 0, "User has at least one stake")
        
        flex_stake = None
        for s in stakes:
            if s.get("vault_key") == "xrp_flex" and s.get("status") == "active":
                flex_stake = s
                break
        
        assert_true(flex_stake is not None, "Found active xrp_flex stake")
        self.flex_stake_id = flex_stake["id"]
        
        # Verify flex stake properties
        assert_eq(flex_stake["can_exit"], True, "can_exit is true")
        assert_eq(flex_stake["exit_kind"], "flex", "exit_kind is 'flex'")
        assert_eq(flex_stake["early_exit_fee"], 0.0, "early_exit_fee is 0")
        assert_eq(flex_stake["slippage"], 0.0, "slippage is 0")
        assert_eq(flex_stake["early_exit_fee_amount"], 0.0, "early_exit_fee_amount is 0")
        assert_eq(flex_stake["early_exit_slippage_amount"], 0.0, "early_exit_slippage_amount is 0")
        
        # Verify early_exit_return >= principal (60000)
        early_exit_return = flex_stake["early_exit_return"]
        assert_true(early_exit_return >= 60000, f"early_exit_return ({early_exit_return}) >= 60000 (principal + profit)")
        log(f"✓ early_exit_return: {early_exit_return} XRP (principal 60000 + profit {early_exit_return - 60000})")
        
    def case_5_exit_flex_stake(self):
        """Case 5: POST /api/stakes/{stake_id}/exit - verify no penalty"""
        log("\n=== CASE 5: Exit Flex Stake ===")
        resp = requests.post(
            f"{BASE_URL}/stakes/{self.flex_stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Exit flex stake")
        data = resp.json()
        
        # Verify response
        assert_true(data["returned"] >= 60000, f"returned ({data['returned']}) >= 60000")
        assert_eq(data["fee_amount"], 0.0, "fee_amount is 0")
        assert_eq(data["slippage_amount"], 0.0, "slippage_amount is 0")
        assert_eq(data["principal"], 60000, "principal is 60000")
        
        log(f"✓ Flex stake exited: returned={data['returned']}, fee_amount={data['fee_amount']}, slippage_amount={data['slippage_amount']}")
        
    def case_6_verify_flex_exit_state(self):
        """Case 6: GET /api/state - verify stake exited, balance increased, transaction logged"""
        log("\n=== CASE 6: Verify Flex Exit State ===")
        
        # Get state
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        # Find the exited stake
        stakes = data.get("stakes", [])
        flex_stake = None
        for s in stakes:
            if s["id"] == self.flex_stake_id:
                flex_stake = s
                break
        
        assert_true(flex_stake is not None, "Found flex stake")
        assert_eq(flex_stake["principal"], 0.0, "Stake principal is 0")
        assert_eq(flex_stake["status"], "exited", "Stake status is 'exited'")
        
        # Verify balance increased (should be 40000 + returned amount)
        balance = data.get("balance", 0)
        assert_true(balance >= 100000, f"Balance ({balance}) >= 100000 (original balance after exit)")
        log(f"✓ Balance after exit: {balance} XRP")
        
        # Get transactions
        resp = requests.get(
            f"{BASE_URL}/transactions",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 200, "GET /api/transactions")
        txns = resp.json().get("transactions", [])
        
        # Find early_exit transaction
        exit_txn = None
        for t in txns:
            if t["type"] == "early_exit" and t.get("meta", {}).get("stake_id") == self.flex_stake_id:
                exit_txn = t
                break
        
        assert_true(exit_txn is not None, "Found early_exit transaction")
        meta = exit_txn.get("meta", {})
        assert_eq(meta.get("kind"), "flex", "Transaction meta.kind is 'flex'")
        assert_eq(meta.get("forfeited_profit"), 0.0, "forfeited_profit is 0")
        assert_true(meta.get("profit_paid", 0) >= 0, "profit_paid >= 0")
        log(f"✓ Transaction logged: kind={meta.get('kind')}, forfeited_profit={meta.get('forfeited_profit')}, profit_paid={meta.get('profit_paid')}")
        
    def case_7_stake_into_vip_silver(self):
        """Case 7: Stake 150000 XRP into vip_silver (locked vault)"""
        log("\n=== CASE 7: Stake into vip_silver (Locked) ===")
        
        # First, admin credits more balance
        resp = requests.post(
            f"{BASE_URL}/admin/users/{self.user_id}/adjust-balance",
            json={"amount": 150000},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert_eq(resp.status_code, 200, "Admin balance credit")
        
        # Stake into vip_silver
        resp = requests.post(
            f"{BASE_URL}/stakes",
            json={"vault_key": "vip_silver", "amount": 150000},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Stake creation")
        log(f"✓ Staked 150000 XRP into vip_silver")
        
    def case_8_verify_locked_stake_state(self):
        """Case 8: GET /api/state - verify locked stake has penalty"""
        log("\n=== CASE 8: Verify Locked Stake State ===")
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        # Find the locked stake
        stakes = data.get("stakes", [])
        locked_stake = None
        for s in stakes:
            if s.get("vault_key") == "vip_silver" and s.get("status") == "active":
                locked_stake = s
                break
        
        assert_true(locked_stake is not None, "Found active vip_silver stake")
        self.locked_stake_id = locked_stake["id"]
        
        # Verify locked stake properties
        assert_eq(locked_stake["exit_kind"], "locked", "exit_kind is 'locked'")
        assert_eq(locked_stake["early_exit_fee"], 0.10, "early_exit_fee is 0.10")
        assert_eq(locked_stake["slippage"], 0.02, "slippage is 0.02")
        assert_eq(locked_stake["early_exit_fee_amount"], 15000.0, "early_exit_fee_amount is 15000")
        assert_eq(locked_stake["early_exit_slippage_amount"], 3000.0, "early_exit_slippage_amount is 3000")
        assert_eq(locked_stake["early_exit_return"], 132000.0, "early_exit_return is 132000")
        
        log(f"✓ Locked stake verified: fee_amount=15000, slippage_amount=3000, return=132000")
        
    def case_9_exit_locked_stake(self):
        """Case 9: POST /api/stakes/{stake_id}/exit - verify penalty applied"""
        log("\n=== CASE 9: Exit Locked Stake ===")
        resp = requests.post(
            f"{BASE_URL}/stakes/{self.locked_stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Exit locked stake")
        data = resp.json()
        
        # Verify response
        assert_eq(data["returned"], 132000.0, "returned is 132000")
        assert_eq(data["fee_amount"], 15000.0, "fee_amount is 15000")
        assert_eq(data["slippage_amount"], 3000.0, "slippage_amount is 3000")
        assert_eq(data["principal"], 150000, "principal is 150000")
        
        log(f"✓ Locked stake exited: returned={data['returned']}, fee_amount={data['fee_amount']}, slippage_amount={data['slippage_amount']}")
        
        # Verify transaction meta
        resp = requests.get(
            f"{BASE_URL}/transactions",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 200, "GET /api/transactions")
        txns = resp.json().get("transactions", [])
        
        # Find early_exit transaction for locked stake
        exit_txn = None
        for t in txns:
            if t["type"] == "early_exit" and t.get("meta", {}).get("stake_id") == self.locked_stake_id:
                exit_txn = t
                break
        
        assert_true(exit_txn is not None, "Found early_exit transaction for locked stake")
        meta = exit_txn.get("meta", {})
        assert_eq(meta.get("kind"), "locked", "Transaction meta.kind is 'locked'")
        assert_true(meta.get("forfeited_profit", 0) >= 0, "forfeited_profit >= 0")
        log(f"✓ Transaction logged: kind={meta.get('kind')}, forfeited_profit={meta.get('forfeited_profit')}")
        
    def case_10_exit_already_exited_stake(self):
        """Case 10: Exit already exited stake -> 400"""
        log("\n=== CASE 10: Exit Already Exited Stake ===")
        resp = requests.post(
            f"{BASE_URL}/stakes/{self.flex_stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 400, "Exit already exited stake returns 400")
        log(f"✓ Correctly rejected exiting already exited stake: {resp.json().get('detail', '')}")
        
    def case_11_exit_nonexistent_stake(self):
        """Case 11: Exit non-existent stake -> 404"""
        log("\n=== CASE 11: Exit Non-existent Stake ===")
        fake_stake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        resp = requests.post(
            f"{BASE_URL}/stakes/{fake_stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 404, "Exit non-existent stake returns 404")
        log(f"✓ Correctly rejected exiting non-existent stake: {resp.json().get('detail', '')}")
        
    def run_all_tests(self):
        """Run all test cases"""
        try:
            self.setup_admin_token()
            self.case_1_register_fresh_user()
            self.case_2_admin_credits_balance()
            self.case_3_stake_into_xrp_flex()
            self.case_4_verify_flex_stake_state()
            self.case_5_exit_flex_stake()
            self.case_6_verify_flex_exit_state()
            self.case_7_stake_into_vip_silver()
            self.case_8_verify_locked_stake_state()
            self.case_9_exit_locked_stake()
            self.case_10_exit_already_exited_stake()
            self.case_11_exit_nonexistent_stake()
            
            log("\n" + "="*60)
            log("✅ ALL 11 FLEXIBLE VAULT STOP STAKE TEST CASES PASSED")
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


class TestUserSelfService:
    """Test user self-service endpoints: update-profile, change-password, notification prefs, transaction export"""
    def __init__(self):
        self.user_token = None
        self.user_id = None
        self.user_email = None
        self.user_password = "InitialPass123"
        self.new_password = "NewSecurePass456"
        
    def case_1_register_fresh_user(self):
        """Case 1: Register a fresh user for self-service testing"""
        log("\n=== CASE 1: Register Fresh User ===")
        random_suffix = secrets.token_hex(4)
        self.user_email = f"selfservice_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": self.user_email,
            "password": self.user_password
        })
        
        assert_eq(resp.status_code, 200, "User registration")
        data = resp.json()
        self.user_token = data["token"]
        self.user_id = data["user"]["id"]
        log(f"✓ User registered: email={self.user_email}, id={self.user_id}")
        
    def case_2_update_profile_happy_path(self):
        """Case 2: POST /api/auth/update-profile with valid names -> 200"""
        log("\n=== CASE 2: Update Profile - Happy Path ===")
        
        resp = requests.post(
            f"{BASE_URL}/auth/update-profile",
            json={"first_name": "Sarah Marie", "last_name": "Johnson-Smith"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Update profile returns 200")
        data = resp.json()
        
        assert_eq(data["ok"], True, "Response ok is true")
        assert_in("user", data, "Response has user")
        
        user = data["user"]
        assert_eq(user["first_name"], "Sarah Marie", "First name updated")
        assert_eq(user["last_name"], "Johnson-Smith", "Last name updated")
        
        log(f"✓ Profile updated: first_name={user['first_name']}, last_name={user['last_name']}")
        
    def case_3_update_profile_blank_name(self):
        """Case 3: POST /api/auth/update-profile with blank name -> 400"""
        log("\n=== CASE 3: Update Profile - Blank Name ===")
        
        resp = requests.post(
            f"{BASE_URL}/auth/update-profile",
            json={"first_name": "", "last_name": "Johnson"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 400, "Blank first name returns 400")
        detail = resp.json().get("detail", "")
        assert_in("required", detail.lower(), "Error message mentions 'required'")
        log(f"✓ Correctly rejected blank name: {detail}")
        
    def case_4_change_password_wrong_current(self):
        """Case 4: POST /api/auth/change-password with wrong current_password -> 400"""
        log("\n=== CASE 4: Change Password - Wrong Current Password ===")
        
        resp = requests.post(
            f"{BASE_URL}/auth/change-password",
            json={"current_password": "WrongPassword123", "new_password": "NewSecurePass456"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 400, "Wrong current password returns 400")
        detail = resp.json().get("detail", "")
        assert_in("incorrect", detail.lower(), "Error message mentions 'incorrect'")
        log(f"✓ Correctly rejected wrong current password: {detail}")
        
    def case_5_change_password_short_new(self):
        """Case 5: POST /api/auth/change-password with new_password < 8 chars -> 400"""
        log("\n=== CASE 5: Change Password - Short New Password ===")
        
        resp = requests.post(
            f"{BASE_URL}/auth/change-password",
            json={"current_password": self.user_password, "new_password": "Short1"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 400, "Short new password returns 400")
        detail = resp.json().get("detail", "")
        assert_in("8 characters", detail.lower(), "Error message mentions '8 characters'")
        log(f"✓ Correctly rejected short new password: {detail}")
        
    def case_6_change_password_happy_path(self):
        """Case 6: POST /api/auth/change-password with correct current + valid new -> 200"""
        log("\n=== CASE 6: Change Password - Happy Path ===")
        
        resp = requests.post(
            f"{BASE_URL}/auth/change-password",
            json={"current_password": self.user_password, "new_password": self.new_password},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Change password returns 200")
        data = resp.json()
        assert_eq(data["ok"], True, "Response ok is true")
        
        log(f"✓ Password changed successfully")
        
    def case_7_verify_new_password_login(self):
        """Case 7: Verify login with NEW password works, OLD password fails"""
        log("\n=== CASE 7: Verify New Password Login ===")
        
        # Test login with NEW password
        log("Testing login with NEW password...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": self.user_email,
            "password": self.new_password
        })
        
        assert_eq(resp.status_code, 200, "Login with new password returns 200")
        data = resp.json()
        assert_in("token", data, "Login response has token")
        log(f"✓ Login successful with NEW password")
        
        # Test login with OLD password
        log("Testing login with OLD password...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": self.user_email,
            "password": self.user_password
        })
        
        assert_eq(resp.status_code, 401, "Login with old password returns 401")
        log(f"✓ Login correctly rejected OLD password: {resp.json().get('detail', '')}")
        
    def case_8_set_notification_prefs(self):
        """Case 8: PUT /api/notifications/prefs -> 200 with prefs echoed"""
        log("\n=== CASE 8: Set Notification Preferences ===")
        
        prefs = {
            "matured": True,
            "deposit": False,
            "withdrawal": True,
            "restake": False
        }
        
        resp = requests.put(
            f"{BASE_URL}/notifications/prefs",
            json=prefs,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Set notification prefs returns 200")
        data = resp.json()
        
        assert_eq(data["ok"], True, "Response ok is true")
        assert_in("notify_prefs", data, "Response has notify_prefs")
        
        notify_prefs = data["notify_prefs"]
        assert_eq(notify_prefs["matured"], True, "matured pref is True")
        assert_eq(notify_prefs["deposit"], False, "deposit pref is False")
        assert_eq(notify_prefs["withdrawal"], True, "withdrawal pref is True")
        assert_eq(notify_prefs["restake"], False, "restake pref is False")
        
        log(f"✓ Notification prefs set: {notify_prefs}")
        
    def case_9_verify_prefs_in_state(self):
        """Case 9: GET /api/state confirms user.notify_prefs matches what was set"""
        log("\n=== CASE 9: Verify Prefs in GET /api/state ===")
        
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state returns 200")
        data = resp.json()
        
        assert_in("user", data, "State response has user")
        user = data["user"]
        assert_in("notify_prefs", user, "User has notify_prefs")
        
        notify_prefs = user["notify_prefs"]
        assert_eq(notify_prefs["matured"], True, "matured pref persisted")
        assert_eq(notify_prefs["deposit"], False, "deposit pref persisted")
        assert_eq(notify_prefs["withdrawal"], True, "withdrawal pref persisted")
        assert_eq(notify_prefs["restake"], False, "restake pref persisted")
        
        log(f"✓ Notification prefs persisted in state: {notify_prefs}")
        
    def case_10_export_csv(self):
        """Case 10: GET /api/transactions/export?fmt=csv -> 200 text/csv with correct header"""
        log("\n=== CASE 10: Export Transactions CSV ===")
        
        resp = requests.get(
            f"{BASE_URL}/transactions/export?fmt=csv",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Export CSV returns 200")
        
        # Verify Content-Type
        content_type = resp.headers.get("Content-Type", "")
        assert_in("text/csv", content_type, "Content-Type is text/csv")
        
        # Verify CSV header row
        csv_content = resp.text
        lines = csv_content.strip().split("\n")
        assert_true(len(lines) >= 1, "CSV has at least header row")
        
        header = lines[0]
        expected_header = "Date (UTC),Type,Amount (XRP),Status,Details"
        assert_eq(header, expected_header, "CSV header matches expected")
        
        log(f"✓ CSV export successful: Content-Type={content_type}, header={header}")
        
    def case_11_export_pdf(self):
        """Case 11: GET /api/transactions/export?fmt=pdf -> 200 application/pdf starting with %PDF"""
        log("\n=== CASE 11: Export Transactions PDF ===")
        
        resp = requests.get(
            f"{BASE_URL}/transactions/export?fmt=pdf",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Export PDF returns 200")
        
        # Verify Content-Type
        content_type = resp.headers.get("Content-Type", "")
        assert_in("application/pdf", content_type, "Content-Type is application/pdf")
        
        # Verify PDF magic bytes
        pdf_content = resp.content
        assert_true(len(pdf_content) > 4, "PDF content is not empty")
        
        pdf_header = pdf_content[:4].decode("latin-1", errors="ignore")
        assert_eq(pdf_header, "%PDF", "PDF starts with %PDF magic bytes")
        
        log(f"✓ PDF export successful: Content-Type={content_type}, starts with {pdf_header}")
        
    def case_12_export_without_auth(self):
        """Case 12: GET /api/transactions/export without Authorization -> 401/403"""
        log("\n=== CASE 12: Export Without Authorization ===")
        
        # Test CSV without auth
        resp = requests.get(f"{BASE_URL}/transactions/export?fmt=csv")
        assert_true(resp.status_code in [401, 403], f"CSV export without auth returns 401/403 (got {resp.status_code})")
        log(f"✓ CSV export correctly requires auth: {resp.status_code}")
        
        # Test PDF without auth
        resp = requests.get(f"{BASE_URL}/transactions/export?fmt=pdf")
        assert_true(resp.status_code in [401, 403], f"PDF export without auth returns 401/403 (got {resp.status_code})")
        log(f"✓ PDF export correctly requires auth: {resp.status_code}")
        
    def run_all_tests(self):
        """Run all test cases"""
        try:
            self.case_1_register_fresh_user()
            self.case_2_update_profile_happy_path()
            self.case_3_update_profile_blank_name()
            self.case_4_change_password_wrong_current()
            self.case_5_change_password_short_new()
            self.case_6_change_password_happy_path()
            self.case_7_verify_new_password_login()
            self.case_8_set_notification_prefs()
            self.case_9_verify_prefs_in_state()
            self.case_10_export_csv()
            self.case_11_export_pdf()
            self.case_12_export_without_auth()
            
            log("\n" + "="*60)
            log("✅ ALL 12 USER SELF-SERVICE TEST CASES PASSED")
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


class TestAdminStatsAndLastLogin:
    """Test admin stats endpoint and last_login tracking"""
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.user_id = None
        self.user_email = None
        
    def setup_admin_token(self):
        """Get admin token"""
        log("\n=== SETUP: Admin Login ===")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert_eq(resp.status_code, 200, "Admin login")
        self.admin_token = resp.json()["token"]
        log(f"✓ Admin token obtained")
        
    def case_1_admin_stats_with_admin_token(self):
        """Case 1: GET /api/admin/stats with admin token -> 200 with all 6 fields"""
        log("\n=== CASE 1: GET /api/admin/stats with Admin Token ===")
        
        resp = requests.get(
            f"{BASE_URL}/admin/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/admin/stats returns 200")
        data = resp.json()
        
        # Verify all 6 required fields are present
        assert_in("total_users", data, "Response has total_users")
        assert_in("total_balance", data, "Response has total_balance")
        assert_in("total_staked", data, "Response has total_staked")
        assert_in("aum", data, "Response has aum")
        assert_in("pending_deposits", data, "Response has pending_deposits")
        assert_in("pending_withdrawals", data, "Response has pending_withdrawals")
        
        # Verify all fields are numeric
        total_users = data["total_users"]
        total_balance = data["total_balance"]
        total_staked = data["total_staked"]
        aum = data["aum"]
        pending_deposits = data["pending_deposits"]
        pending_withdrawals = data["pending_withdrawals"]
        
        assert_true(isinstance(total_users, int), f"total_users is int (got {type(total_users).__name__})")
        assert_true(isinstance(total_balance, (int, float)), f"total_balance is numeric (got {type(total_balance).__name__})")
        assert_true(isinstance(total_staked, (int, float)), f"total_staked is numeric (got {type(total_staked).__name__})")
        assert_true(isinstance(aum, (int, float)), f"aum is numeric (got {type(aum).__name__})")
        assert_true(isinstance(pending_deposits, int), f"pending_deposits is int (got {type(pending_deposits).__name__})")
        assert_true(isinstance(pending_withdrawals, int), f"pending_withdrawals is int (got {type(pending_withdrawals).__name__})")
        
        log(f"✓ All 6 fields present and numeric: total_users={total_users}, total_balance={total_balance}, total_staked={total_staked}, aum={aum}, pending_deposits={pending_deposits}, pending_withdrawals={pending_withdrawals}")
        
        # Verify aum == total_balance + total_staked (within 0.01 rounding)
        expected_aum = total_balance + total_staked
        aum_diff = abs(aum - expected_aum)
        assert_true(aum_diff < 0.01, f"aum ({aum}) == total_balance ({total_balance}) + total_staked ({total_staked}) = {expected_aum} (diff={aum_diff})")
        log(f"✓ aum calculation correct: {aum} == {total_balance} + {total_staked} (diff={aum_diff})")
        
        # Verify non-negative counts
        assert_true(total_users >= 1, f"total_users ({total_users}) >= 1")
        assert_true(pending_deposits >= 0, f"pending_deposits ({pending_deposits}) >= 0")
        assert_true(pending_withdrawals >= 0, f"pending_withdrawals ({pending_withdrawals}) >= 0")
        log(f"✓ All counts are non-negative and total_users >= 1")
        
    def case_2_admin_stats_without_auth(self):
        """Case 2: GET /api/admin/stats without Authorization header -> 401/403"""
        log("\n=== CASE 2: GET /api/admin/stats Without Authorization ===")
        
        resp = requests.get(f"{BASE_URL}/admin/stats")
        
        assert_true(resp.status_code in [401, 403], f"Without auth returns 401/403 (got {resp.status_code})")
        log(f"✓ Correctly rejected request without auth: {resp.status_code} - {resp.json().get('detail', '')}")
        
    def case_3_admin_stats_with_non_admin_token(self):
        """Case 3: Register non-admin user and GET /api/admin/stats with their token -> 403"""
        log("\n=== CASE 3: GET /api/admin/stats with Non-Admin Token ===")
        
        # Register a fresh non-admin user
        random_suffix = secrets.token_hex(4)
        self.user_email = f"nonadmin_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Regular",
            "last_name": "User",
            "email": self.user_email,
            "password": "regularuser123"
        })
        
        assert_eq(resp.status_code, 200, "Non-admin user registration")
        data = resp.json()
        self.user_token = data["token"]
        self.user_id = data["user"]["id"]
        log(f"✓ Non-admin user registered: email={self.user_email}, id={self.user_id}")
        
        # Try to access admin stats with non-admin token
        resp = requests.get(
            f"{BASE_URL}/admin/stats",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 403, "Non-admin user gets 403")
        log(f"✓ Correctly rejected non-admin user: {resp.json().get('detail', '')}")
        
    def case_4_last_login_tracking(self):
        """Case 4: Register user, login, verify last_login is set in GET /api/admin/users"""
        log("\n=== CASE 4: Last Login Tracking ===")
        
        # Register another fresh user
        random_suffix = secrets.token_hex(4)
        test_email = f"lastlogin_{random_suffix}@example.com"
        test_password = "testpass123"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Last",
            "last_name": "Login",
            "email": test_email,
            "password": test_password
        })
        
        assert_eq(resp.status_code, 200, "User registration")
        test_user_id = resp.json()["user"]["id"]
        log(f"✓ User registered: email={test_email}, id={test_user_id}")
        
        # Login with this user to trigger last_login update
        log("Logging in to trigger last_login update...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert_eq(resp.status_code, 200, "User login")
        log(f"✓ User logged in successfully")
        
        # Get admin users list and find this user
        log("Fetching admin users list...")
        resp = requests.get(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/admin/users returns 200")
        data = resp.json()
        assert_in("users", data, "Response has users")
        
        users = data["users"]
        test_user = None
        for u in users:
            if u["id"] == test_user_id:
                test_user = u
                break
        
        assert_true(test_user is not None, f"Found user {test_user_id} in admin users list")
        
        # Verify last_login is not null and is an ISO timestamp string
        last_login = test_user.get("last_login")
        assert_true(last_login is not None, "last_login is not null")
        assert_true(isinstance(last_login, str), f"last_login is a string (got {type(last_login).__name__})")
        assert_true(len(last_login) > 0, "last_login is not empty")
        
        # Verify it's a valid ISO timestamp format (contains T and Z or +/-)
        assert_true("T" in last_login, f"last_login ({last_login}) is ISO format with T separator")
        log(f"✓ last_login is set and valid: {last_login}")
        
    def run_all_tests(self):
        """Run all test cases"""
        try:
            self.setup_admin_token()
            self.case_1_admin_stats_with_admin_token()
            self.case_2_admin_stats_without_auth()
            self.case_3_admin_stats_with_non_admin_token()
            self.case_4_last_login_tracking()
            
            log("\n" + "="*60)
            log("✅ ALL 4 ADMIN STATS & LAST_LOGIN TEST CASES PASSED")
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


class TestTotalReturnModel:
    """Test total-return model: vault rates, accrual, restake compounding, auto-restake config"""
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.user_id = None
        self.user_email = None
        self.stake_id = None
        
    def setup_admin_token(self):
        """Get admin token for balance adjustment"""
        log("\n=== SETUP: Admin Login ===")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert_eq(resp.status_code, 200, "Admin login")
        self.admin_token = resp.json()["token"]
        log(f"✓ Admin token obtained")
        
    def case_1_vaults_return_total_return_rates(self):
        """Case 1: GET /api/vaults returns total-return rates in apy field"""
        log("\n=== CASE 1: Vaults Return Total-Return Rates ===")
        
        resp = requests.get(f"{BASE_URL}/vaults")
        assert_eq(resp.status_code, 200, "GET /api/vaults returns 200")
        data = resp.json()
        
        assert_in("vaults", data, "Response has vaults")
        vaults = data["vaults"]
        
        # Expected rates: xrp_flex=0.1999 (18d), vip_silver=0.2999 (30d), vip_gold=0.4999 (45d), 
        # vip_platinum=0.8999 (60d), vip_diamond=1.56 (90d)
        expected_rates = {
            "xrp_flex": (0.1999, 18),
            "vip_silver": (0.2999, 30),
            "vip_gold": (0.4999, 45),
            "vip_platinum": (0.8999, 60),
            "vip_diamond": (1.56, 90),
        }
        
        vault_map = {v["key"]: v for v in vaults}
        
        for key, (expected_apy, expected_days) in expected_rates.items():
            assert_in(key, vault_map, f"Vault {key} exists")
            vault = vault_map[key]
            
            actual_apy = vault.get("apy")
            actual_days = vault.get("duration_days")
            
            assert_eq(actual_apy, expected_apy, f"{key} apy")
            assert_eq(actual_days, expected_days, f"{key} duration_days")
            
            log(f"✓ {key}: apy={actual_apy}, duration_days={actual_days}")
        
        log(f"✓ All 5 vaults have correct total-return rates")
        
    def case_2_register_and_fund_user(self):
        """Case 2: Register user and admin funds balance"""
        log("\n=== CASE 2: Register and Fund User ===")
        
        # Register user
        random_suffix = secrets.token_hex(4)
        self.user_email = f"totalreturn_{random_suffix}@example.com"
        
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Total",
            "last_name": "Return",
            "email": self.user_email,
            "password": "secret123"
        })
        
        assert_eq(resp.status_code, 200, "User registration")
        data = resp.json()
        self.user_token = data["token"]
        self.user_id = data["user"]["id"]
        log(f"✓ User registered: email={self.user_email}, id={self.user_id}")
        
        # Admin funds user with 60000 XRP
        resp = requests.post(
            f"{BASE_URL}/admin/users/{self.user_id}/adjust-balance",
            json={"amount": 60000},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Admin balance credit")
        log(f"✓ Balance credited: 60000 XRP")
        
    def case_3_open_stake_vip_silver(self):
        """Case 3: Open stake in vip_silver (50000 XRP, 30 days, 0.2999 total return)"""
        log("\n=== CASE 3: Open Stake in vip_silver ===")
        
        resp = requests.post(
            f"{BASE_URL}/stakes",
            json={"vault_key": "vip_silver", "amount": 50000},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "Stake creation")
        log(f"✓ Staked 50000 XRP into vip_silver (30 days, 0.2999 total return)")
        
    def case_4_verify_accrual_starts_near_zero(self):
        """Case 4: GET /api/state immediately - verify accrued starts near 0"""
        log("\n=== CASE 4: Verify Accrual Starts Near Zero ===")
        
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        stakes = data.get("stakes", [])
        assert_true(len(stakes) > 0, "User has at least one stake")
        
        # Find vip_silver stake
        stake = None
        for s in stakes:
            if s.get("vault_key") == "vip_silver" and s.get("status") == "active":
                stake = s
                break
        
        assert_true(stake is not None, "Found active vip_silver stake")
        self.stake_id = stake["id"]
        
        accrued = stake.get("accrued", 0)
        principal = stake.get("principal", 0)
        apy = stake.get("apy", 0)
        
        assert_eq(principal, 50000, "Principal is 50000")
        assert_eq(apy, 0.2999, "APY is 0.2999")
        
        # Accrued should be very small (near 0) right after staking
        assert_true(accrued < 1.0, f"Accrued ({accrued}) < 1.0 (near zero right after staking)")
        log(f"✓ Accrued starts near zero: {accrued} XRP")
        
        return accrued
        
    def case_5_verify_accrual_increases(self, initial_accrued):
        """Case 5: Wait a few seconds, GET /api/state again - verify accrued increases"""
        log("\n=== CASE 5: Verify Accrual Increases Over Time ===")
        
        log("Waiting 5 seconds for accrual...")
        time.sleep(5)
        
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        stakes = data.get("stakes", [])
        stake = None
        for s in stakes:
            if s["id"] == self.stake_id:
                stake = s
                break
        
        assert_true(stake is not None, "Found stake")
        
        new_accrued = stake.get("accrued", 0)
        
        # Verify accrued increased
        assert_true(new_accrued > initial_accrued, 
                   f"Accrued increased from {initial_accrued} to {new_accrued}")
        log(f"✓ Accrued increased: {initial_accrued} -> {new_accrued} XRP")
        
        # Verify accrual calculation is in the right ballpark
        # For 50000 at 0.2999 over 30 days, after 5 seconds:
        # expected = 50000 * 0.2999 * (5 / (30 * 86400)) = 50000 * 0.2999 * (5 / 2592000)
        # = 50000 * 0.2999 * 0.00000193 = 0.0289 XRP
        expected_accrued = 50000 * 0.2999 * (5 / (30 * 86400))
        
        # Allow 50% tolerance due to timing variations
        lower_bound = expected_accrued * 0.5
        upper_bound = expected_accrued * 1.5
        
        assert_true(lower_bound <= new_accrued <= upper_bound,
                   f"Accrued ({new_accrued}) is in expected range [{lower_bound:.6f}, {upper_bound:.6f}] (expected ~{expected_accrued:.6f})")
        log(f"✓ Accrual calculation correct: {new_accrued} XRP (expected ~{expected_accrued:.6f} XRP)")
        
    def case_6_restake_with_stake_id(self):
        """Case 6: POST /api/reinvest {stake_id} - verify profit compounds into stake principal"""
        log("\n=== CASE 6: Restake Compounds Profit into Existing Stake ===")
        
        # Get current state
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        old_profit = data.get("profit", 0)
        
        stakes = data.get("stakes", [])
        stake = None
        for s in stakes:
            if s["id"] == self.stake_id:
                stake = s
                break
        
        old_principal = stake.get("principal", 0)
        old_accrued = stake.get("accrued", 0)
        
        log(f"Before reinvest: principal={old_principal}, accrued={old_accrued}, profit={old_profit}")
        
        # POST /api/reinvest with stake_id
        resp = requests.post(
            f"{BASE_URL}/reinvest",
            json={"stake_id": self.stake_id},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "POST /api/reinvest returns 200")
        reinvest_data = resp.json()
        
        assert_in("ok", reinvest_data, "Response has ok")
        assert_eq(reinvest_data["ok"], True, "Response ok is true")
        assert_in("amount", reinvest_data, "Response has amount")
        assert_in("principal", reinvest_data, "Response has principal")
        
        compounded_amount = reinvest_data["amount"]
        new_principal = reinvest_data["principal"]
        
        log(f"✓ Reinvest response: amount={compounded_amount}, principal={new_principal}")
        
        # Verify new principal = old principal + profit
        expected_principal = old_principal + old_profit
        # Allow small rounding difference
        assert_true(abs(new_principal - expected_principal) < 0.01,
                   f"New principal ({new_principal}) ≈ old principal ({old_principal}) + profit ({old_profit}) = {expected_principal}")
        log(f"✓ Principal increased by profit: {old_principal} + {old_profit} = {new_principal}")
        
    def case_7_verify_restake_reset_clock(self):
        """Case 7: GET /api/state - verify stake principal increased, accrued reset to ~0, profit ~0"""
        log("\n=== CASE 7: Verify Restake Reset Clock ===")
        
        resp = requests.get(
            f"{BASE_URL}/state",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "GET /api/state")
        data = resp.json()
        
        stakes = data.get("stakes", [])
        stake = None
        for s in stakes:
            if s["id"] == self.stake_id:
                stake = s
                break
        
        assert_true(stake is not None, "Found stake")
        
        new_principal = stake.get("principal", 0)
        new_accrued = stake.get("accrued", 0)
        new_profit = data.get("profit", 0)
        
        # Verify principal increased (should be > 50000)
        assert_true(new_principal > 50000, f"Principal ({new_principal}) > 50000 (original)")
        log(f"✓ Principal increased: {new_principal} XRP")
        
        # Verify accrued reset to near 0
        assert_true(new_accrued < 0.1, f"Accrued ({new_accrued}) reset to near 0")
        log(f"✓ Accrued reset: {new_accrued} XRP")
        
        # Verify profit reset to near 0
        assert_true(new_profit < 0.1, f"Profit ({new_profit}) reset to near 0")
        log(f"✓ Profit reset: {new_profit} XRP")
        
        # Verify there's still only ONE stake (no new stake created)
        vip_silver_stakes = [s for s in stakes if s.get("vault_key") == "vip_silver" and s.get("status") == "active"]
        assert_eq(len(vip_silver_stakes), 1, "Still only ONE active vip_silver stake (no new stake created)")
        log(f"✓ No new stake created - profit compounded into existing stake")
        
    def case_8_restake_invalid_stake_id(self):
        """Case 8: POST /api/reinvest with invalid/exited stake_id -> 400/404"""
        log("\n=== CASE 8: Restake with Invalid Stake ID ===")
        
        fake_stake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        
        resp = requests.post(
            f"{BASE_URL}/reinvest",
            json={"stake_id": fake_stake_id},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_true(resp.status_code in [400, 404], 
                   f"Invalid stake_id returns 400/404 (got {resp.status_code})")
        log(f"✓ Correctly rejected invalid stake_id: {resp.status_code} - {resp.json().get('detail', '')}")
        
    def case_9_auto_restake_config_valid(self):
        """Case 9: POST /api/auto-restake {enabled:true, threshold:10, vault_key} -> 200 (no minimum error)"""
        log("\n=== CASE 9: Auto-Restake Config with Valid Threshold ===")
        
        resp = requests.post(
            f"{BASE_URL}/auto-restake",
            json={"enabled": True, "threshold": 10, "vault_key": "vip_silver"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "POST /api/auto-restake returns 200")
        data = resp.json()
        
        assert_eq(data["ok"], True, "Response ok is true")
        assert_in("auto_restake", data, "Response has auto_restake")
        
        auto_restake = data["auto_restake"]
        assert_eq(auto_restake["enabled"], True, "enabled is true")
        assert_eq(auto_restake["threshold"], 10, "threshold is 10")
        assert_eq(auto_restake["vault_key"], "vip_silver", "vault_key is vip_silver")
        
        log(f"✓ Auto-restake config saved: enabled=True, threshold=10, vault_key=vip_silver")
        log(f"✓ NO 'threshold must be at least the vault minimum' error (validation removed)")
        
    def case_10_auto_restake_threshold_zero(self):
        """Case 10: POST /api/auto-restake {enabled:true, threshold:0} -> 400"""
        log("\n=== CASE 10: Auto-Restake with Threshold 0 ===")
        
        resp = requests.post(
            f"{BASE_URL}/auto-restake",
            json={"enabled": True, "threshold": 0},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 400, "threshold=0 returns 400")
        detail = resp.json().get("detail", "")
        assert_in("greater than 0", detail.lower(), "Error message mentions 'greater than 0'")
        log(f"✓ Correctly rejected threshold=0: {detail}")
        
    def case_11_auto_restake_disable(self):
        """Case 11: POST /api/auto-restake {enabled:false} -> 200"""
        log("\n=== CASE 11: Disable Auto-Restake ===")
        
        resp = requests.post(
            f"{BASE_URL}/auto-restake",
            json={"enabled": False},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        assert_eq(resp.status_code, 200, "POST /api/auto-restake returns 200")
        data = resp.json()
        
        assert_eq(data["ok"], True, "Response ok is true")
        assert_in("auto_restake", data, "Response has auto_restake")
        
        auto_restake = data["auto_restake"]
        assert_eq(auto_restake["enabled"], False, "enabled is false")
        
        log(f"✓ Auto-restake disabled successfully")
        
    def run_all_tests(self):
        """Run all test cases"""
        try:
            self.setup_admin_token()
            self.case_1_vaults_return_total_return_rates()
            self.case_2_register_and_fund_user()
            self.case_3_open_stake_vip_silver()
            initial_accrued = self.case_4_verify_accrual_starts_near_zero()
            self.case_5_verify_accrual_increases(initial_accrued)
            self.case_6_restake_with_stake_id()
            self.case_7_verify_restake_reset_clock()
            self.case_8_restake_invalid_stake_id()
            self.case_9_auto_restake_config_valid()
            self.case_10_auto_restake_threshold_zero()
            self.case_11_auto_restake_disable()
            
            log("\n" + "="*60)
            log("✅ ALL 11 TOTAL-RETURN MODEL TEST CASES PASSED")
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
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "totalreturn":
        # Run total-return model tests
        tester = TestTotalReturnModel()
        success = tester.run_all_tests()
    elif len(sys.argv) > 1 and sys.argv[1] == "flex":
        # Run flexible vault stop stake tests
        tester = TestFlexibleVaultStopStake()
        success = tester.run_all_tests()
    elif len(sys.argv) > 1 and sys.argv[1] == "selfservice":
        # Run user self-service tests
        tester = TestUserSelfService()
        success = tester.run_all_tests()
    elif len(sys.argv) > 1 and sys.argv[1] == "adminstats":
        # Run admin stats and last_login tests
        tester = TestAdminStatsAndLastLogin()
        success = tester.run_all_tests()
    else:
        # Run auth tests by default
        tester = TestEmailPasswordAuth()
        success = tester.run_all_tests()
    
    exit(0 if success else 1)
