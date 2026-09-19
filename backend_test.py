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


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "flex":
        # Run flexible vault stop stake tests
        tester = TestFlexibleVaultStopStake()
        success = tester.run_all_tests()
    else:
        # Run auth tests by default
        tester = TestEmailPasswordAuth()
        success = tester.run_all_tests()
    
    exit(0 if success else 1)
