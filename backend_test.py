#!/usr/bin/env python3
"""
Backend test for XamanProtocol early-exit (stop stake) flow.
Tests all steps as specified in the review request.
"""
import requests
import json
import time
from typing import Dict, Any

# Base URL from frontend/.env
BASE_URL = "https://9d5e4fd8-640f-4649-982f-0ea17001f397.preview.emergentagent.com/api"

# Admin credentials from test_credentials.md
ADMIN_USERNAME = "admin"
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

class TestEarlyExit:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.user_id = None
        self.user_username = None
        self.stake_id = None
        self.flex_stake_id = None
        
    def step_0_admin_login(self):
        """Step 0: Login as admin"""
        log("\n=== STEP 0: Admin Login ===")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "phrase": ADMIN_PHRASE
        })
        assert_eq(resp.status_code, 200, "Admin login status")
        data = resp.json()
        assert_in("token", data, "Admin login response has token")
        self.admin_token = data["token"]
        log(f"✓ Admin logged in successfully")
        
    def step_1_register_user(self):
        """Step 1: Register a fresh normal user"""
        log("\n=== STEP 1: Register Normal User ===")
        timestamp = int(time.time())
        username = f"testuser_{timestamp}"
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Test",
            "last_name": "User",
            "username": username
        })
        assert_eq(resp.status_code, 200, "User registration status")
        data = resp.json()
        assert_in("token", data, "Registration response has token")
        assert_in("phrase", data, "Registration response has phrase")
        assert_in("user", data, "Registration response has user")
        
        self.user_token = data["token"]
        self.user_id = data["user"]["id"]
        self.user_username = username
        log(f"✓ User registered: {username} (ID: {self.user_id})")
        log(f"✓ Recovery phrase: {data['phrase']}")
        
    def step_2_credit_balance(self):
        """Step 2: As admin, credit user balance"""
        log("\n=== STEP 2: Credit User Balance ===")
        
        # First, verify user exists via GET /api/admin/users
        resp = requests.get(f"{BASE_URL}/admin/users", headers={
            "Authorization": f"Bearer {self.admin_token}"
        })
        assert_eq(resp.status_code, 200, "Admin users list status")
        users = resp.json()["users"]
        user_found = any(u["id"] == self.user_id for u in users)
        assert_true(user_found, f"User {self.user_id} found in admin users list")
        
        # Credit balance: 200000 XRP (enough for 150000 stake)
        resp = requests.post(f"{BASE_URL}/admin/users/{self.user_id}/adjust-balance", 
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"amount": 200000}
        )
        assert_eq(resp.status_code, 200, "Balance adjustment status")
        log(f"✓ Credited 200000 XRP to user {self.user_username}")
        
    def step_3_stake_locked_vault(self):
        """Step 3: As user, stake into locked vault vip_silver"""
        log("\n=== STEP 3: Stake into Locked Vault (vip_silver) ===")
        resp = requests.post(f"{BASE_URL}/stakes",
            headers={"Authorization": f"Bearer {self.user_token}"},
            json={"vault_key": "vip_silver", "amount": 150000}
        )
        assert_eq(resp.status_code, 200, "Stake creation status")
        log(f"✓ Staked 150000 XRP into vip_silver")
        
    def step_4_verify_state(self):
        """Step 4: GET /api/state and verify early-exit fields"""
        log("\n=== STEP 4: Verify State with Early-Exit Fields ===")
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {self.user_token}"
        })
        assert_eq(resp.status_code, 200, "State fetch status")
        state = resp.json()
        
        # Find the stake
        stakes = state.get("stakes", [])
        assert_true(len(stakes) > 0, "User has at least one stake")
        
        stake = stakes[0]
        self.stake_id = stake["id"]
        
        # Verify early-exit fields
        assert_eq(stake["can_exit"], True, "can_exit is true")
        assert_eq(stake["early_exit_fee"], 0.10, "early_exit_fee is 0.10")
        assert_eq(stake["slippage"], 0.02, "slippage is 0.02")
        assert_eq(stake["early_exit_fee_amount"], 15000.0, "early_exit_fee_amount is 15000")
        assert_eq(stake["early_exit_slippage_amount"], 3000.0, "early_exit_slippage_amount is 3000")
        assert_eq(stake["early_exit_return"], 132000.0, "early_exit_return is 132000")
        assert_eq(stake["status"], "active", "status is active")
        
        log(f"✓ Stake ID: {self.stake_id}")
        log(f"✓ All early-exit fields verified correctly")
        
    def step_5_exit_stake(self):
        """Step 5: POST /api/stakes/{stake_id}/exit"""
        log("\n=== STEP 5: Exit Stake Early ===")
        
        # Get balance before exit
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {self.user_token}"
        })
        balance_before = resp.json()["balance"]
        total_staked_before = resp.json()["total_staked"]
        
        # Exit the stake
        resp = requests.post(f"{BASE_URL}/stakes/{self.stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 200, "Exit stake status")
        exit_data = resp.json()
        
        # Verify response
        assert_eq(exit_data["returned"], 132000.0, "returned is 132000")
        assert_eq(exit_data["fee_amount"], 15000.0, "fee_amount is 15000")
        assert_eq(exit_data["slippage_amount"], 3000.0, "slippage_amount is 3000")
        assert_eq(exit_data["principal"], 150000.0, "principal is 150000")
        
        log(f"✓ Exit response verified")
        
    def step_6_verify_post_exit_state(self):
        """Step 6: Verify state after exit"""
        log("\n=== STEP 6: Verify Post-Exit State ===")
        
        # Get state
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {self.user_token}"
        })
        state = resp.json()
        
        # Find the exited stake
        stakes = state.get("stakes", [])
        exited_stake = next((s for s in stakes if s["id"] == self.stake_id), None)
        
        if exited_stake:
            # Stake should have principal 0 and status exited
            assert_eq(exited_stake["principal"], 0.0, "Exited stake principal is 0")
            assert_eq(exited_stake["status"], "exited", "Exited stake status is 'exited'")
            log(f"✓ Stake marked as exited with principal 0")
        
        # Verify total_staked reduced
        assert_eq(state["total_staked"], 0.0, "total_staked reduced to 0")
        
        # Verify balance increased by exactly 132000
        # Note: balance_before was 50000 (200000 - 150000 staked)
        expected_balance = 50000 + 132000
        assert_eq(state["balance"], expected_balance, f"Balance increased by 132000 to {expected_balance}")
        
        log(f"✓ Balance correctly increased to {state['balance']}")
        
        # Verify transaction
        resp = requests.get(f"{BASE_URL}/transactions", headers={
            "Authorization": f"Bearer {self.user_token}"
        })
        txns = resp.json()["transactions"]
        
        early_exit_txn = next((t for t in txns if t["type"] == "early_exit"), None)
        assert_true(early_exit_txn is not None, "early_exit transaction exists")
        assert_eq(early_exit_txn["amount"], 132000.0, "Transaction amount is 132000")
        
        meta = early_exit_txn.get("meta", {})
        assert_eq(meta.get("fee_amount"), 15000.0, "Transaction meta fee_amount is 15000")
        assert_eq(meta.get("slippage_amount"), 3000.0, "Transaction meta slippage_amount is 3000")
        assert_true("forfeited_profit" in meta, "Transaction meta has forfeited_profit")
        
        log(f"✓ early_exit transaction verified with correct breakdown")
        
    def step_7a_exit_same_stake_again(self):
        """Step 7a: Try to exit the same stake again (should fail)"""
        log("\n=== STEP 7a: Negative Test - Exit Same Stake Again ===")
        resp = requests.post(f"{BASE_URL}/stakes/{self.stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 400, "Exit same stake again returns 400")
        log(f"✓ Correctly rejected: {resp.json().get('detail', '')}")
        
    def step_7b_exit_flex_stake(self):
        """Step 7b: Stake into FLEX vault and try to exit (should fail)"""
        log("\n=== STEP 7b: Negative Test - Exit Flexible Stake ===")
        
        # Stake into xrp_flex (need 50000 minimum)
        resp = requests.post(f"{BASE_URL}/stakes",
            headers={"Authorization": f"Bearer {self.user_token}"},
            json={"vault_key": "xrp_flex", "amount": 50000}
        )
        assert_eq(resp.status_code, 200, "Flex stake creation status")
        
        # Get the flex stake ID
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {self.user_token}"
        })
        stakes = resp.json()["stakes"]
        flex_stake = next((s for s in stakes if s["vault_key"] == "xrp_flex" and s["principal"] > 0), None)
        assert_true(flex_stake is not None, "Flex stake found")
        self.flex_stake_id = flex_stake["id"]
        
        # Try to exit flex stake
        resp = requests.post(f"{BASE_URL}/stakes/{self.flex_stake_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 400, "Exit flex stake returns 400")
        log(f"✓ Correctly rejected: {resp.json().get('detail', '')}")
        
    def step_7c_exit_nonexistent_stake(self):
        """Step 7c: Try to exit with bogus stake_id (should fail)"""
        log("\n=== STEP 7c: Negative Test - Exit Non-existent Stake ===")
        bogus_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        resp = requests.post(f"{BASE_URL}/stakes/{bogus_id}/exit",
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        assert_eq(resp.status_code, 404, "Exit non-existent stake returns 404")
        log(f"✓ Correctly rejected: {resp.json().get('detail', '')}")
        
    def step_8_admin_vault_terms(self):
        """Step 8: Admin updates vault terms and verifies new calculations"""
        log("\n=== STEP 8: Admin Vault Terms Update ===")
        
        # Update vip_silver vault terms
        resp = requests.put(f"{BASE_URL}/admin/vaults/vip_silver",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"early_exit_fee": 0.15, "slippage": 0.03}
        )
        assert_eq(resp.status_code, 200, "Vault update status")
        log(f"✓ Updated vip_silver: early_exit_fee=0.15, slippage=0.03")
        
        # Create a new user and stake to test new terms
        timestamp = int(time.time())
        username = f"testuser2_{timestamp}"
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "first_name": "Test2",
            "last_name": "User2",
            "username": username
        })
        user2_token = resp.json()["token"]
        user2_id = resp.json()["user"]["id"]
        
        # Credit balance
        resp = requests.post(f"{BASE_URL}/admin/users/{user2_id}/adjust-balance",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"amount": 200000}
        )
        assert_eq(resp.status_code, 200, "User2 balance adjustment status")
        
        # Stake
        resp = requests.post(f"{BASE_URL}/stakes",
            headers={"Authorization": f"Bearer {user2_token}"},
            json={"vault_key": "vip_silver", "amount": 150000}
        )
        assert_eq(resp.status_code, 200, "User2 stake creation status")
        
        # Verify new terms in state
        resp = requests.get(f"{BASE_URL}/state", headers={
            "Authorization": f"Bearer {user2_token}"
        })
        state = resp.json()
        stake = state["stakes"][0]
        
        # New calculations: fee=22500 (15%), slippage=4500 (3%), return=123000
        assert_eq(stake["early_exit_fee"], 0.15, "Updated early_exit_fee is 0.15")
        assert_eq(stake["slippage"], 0.03, "Updated slippage is 0.03")
        assert_eq(stake["early_exit_fee_amount"], 22500.0, "Updated early_exit_fee_amount is 22500")
        assert_eq(stake["early_exit_slippage_amount"], 4500.0, "Updated early_exit_slippage_amount is 4500")
        assert_eq(stake["early_exit_return"], 123000.0, "Updated early_exit_return is 123000")
        
        log(f"✓ New vault terms verified correctly")
        
        # Reset vault terms back to original
        resp = requests.put(f"{BASE_URL}/admin/vaults/vip_silver",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"early_exit_fee": 0.10, "slippage": 0.02}
        )
        assert_eq(resp.status_code, 200, "Vault reset status")
        log(f"✓ Reset vip_silver to original terms: early_exit_fee=0.10, slippage=0.02")
        
    def run_all_tests(self):
        """Run all test steps"""
        try:
            self.step_0_admin_login()
            self.step_1_register_user()
            self.step_2_credit_balance()
            self.step_3_stake_locked_vault()
            self.step_4_verify_state()
            self.step_5_exit_stake()
            self.step_6_verify_post_exit_state()
            self.step_7a_exit_same_stake_again()
            self.step_7b_exit_flex_stake()
            self.step_7c_exit_nonexistent_stake()
            self.step_8_admin_vault_terms()
            
            log("\n" + "="*60)
            log("✅ ALL TESTS PASSED")
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
    tester = TestEarlyExit()
    success = tester.run_all_tests()
    exit(0 if success else 1)
