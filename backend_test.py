"""
Test THREE new backend features in XamanProtocol XRP staking app.
FEATURE 1: Withdrawal address book
FEATURE 2: Restake preview (non-mutating)
FEATURE 3: Admin activity feed
"""
import os
import time
import uuid
import requests

# Get backend URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://570c2f00-c088-4ef7-b39e-16694a7c2da5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@xamanprotocol.com"
ADMIN_PASSWORD = "admin12345"

print(f"Testing against: {API}")


def _post(path, token=None, json=None):
    """POST helper with auth header."""
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(f"{API}{path}", json=json or {}, headers=h, timeout=30)


def _get(path, token=None):
    """GET helper with auth header."""
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(f"{API}{path}", headers=h, timeout=30)


def _delete(path, token=None):
    """DELETE helper with auth header."""
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.delete(f"{API}{path}", headers=h, timeout=30)


def get_admin_token():
    """Login as admin and return token."""
    r = _post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def register_user(email_prefix):
    """Register a fresh user and return token, user_id."""
    email = f"{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    password = "Test12345"
    r = _post("/auth/register", json={
        "first_name": "Test",
        "last_name": "User",
        "email": email,
        "password": password
    })
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]["id"], email


def admin_credit_balance(admin_token, user_id, amount):
    """Admin credits balance to user."""
    r = _post(f"/admin/users/{user_id}/adjust-balance", admin_token, {"amount": amount})
    assert r.status_code == 200, f"Admin credit failed: {r.status_code} {r.text}"


def admin_credit_profit(admin_token, user_id, amount):
    """Admin credits profit to user."""
    r = _post(f"/admin/users/{user_id}/adjust-profit", admin_token, {"amount": amount})
    assert r.status_code == 200, f"Admin profit credit failed: {r.status_code} {r.text}"


def stake_into_vault(user_token, vault_key, amount):
    """User stakes into a vault."""
    r = _post("/stakes", user_token, {"vault_key": vault_key, "amount": amount})
    assert r.status_code == 200, f"Stake failed: {r.status_code} {r.text}"
    return r.json()


# =============================================================================
# FEATURE 1: Withdrawal address book
# =============================================================================
def test_feature1_withdrawal_address_book():
    """Test withdrawal address book (authenticated normal user)."""
    print("\n" + "="*80)
    print("FEATURE 1: Withdrawal address book")
    print("="*80)
    
    admin_token = get_admin_token()
    user_token, user_id, user_email = register_user("withdrawaddr")
    print(f"✓ Registered user: {user_email} (id={user_id})")
    
    # Test 1: POST valid address, then GET list includes it
    print("\n[Test 1.1] POST valid address with label, address, and tag")
    r = _post("/withdraw-addresses", user_token, {
        "label": "Ledger",
        "address": "rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4",
        "tag": "99"
    })
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("ok") is True, f"Expected ok=true, got {data}"
    assert "address" in data, f"Expected 'address' field in response, got {data}"
    addr_entry = data["address"]
    assert "id" in addr_entry, f"Expected 'id' in address entry, got {addr_entry}"
    assert addr_entry["label"] == "Ledger", f"Expected label='Ledger', got {addr_entry['label']}"
    assert addr_entry["address"] == "rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4"
    assert addr_entry["tag"] == "99"
    assert "created_at" in addr_entry
    saved_id = addr_entry["id"]
    print(f"✓ POST /api/withdraw-addresses returned 200 with id={saved_id}")
    
    print("\n[Test 1.2] GET /api/withdraw-addresses includes the saved address")
    r = _get("/withdraw-addresses", user_token)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "addresses" in data, f"Expected 'addresses' field, got {data}"
    addresses = data["addresses"]
    assert any(a["id"] == saved_id for a in addresses), f"Saved address not found in list: {addresses}"
    print(f"✓ GET /api/withdraw-addresses returned list with saved address")
    
    # Test 2: Validation errors
    print("\n[Test 2.1] POST with invalid address 'hello' -> 400")
    r = _post("/withdraw-addresses", user_token, {
        "label": "x",
        "address": "hello"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"✓ Invalid address correctly returned 400: {r.json().get('detail')}")
    
    print("\n[Test 2.2] POST with blank label -> 400")
    r = _post("/withdraw-addresses", user_token, {
        "label": "",
        "address": "rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"✓ Blank label correctly returned 400: {r.json().get('detail')}")
    
    print("\n[Test 2.3] POST with non-numeric tag 'abc' -> 400")
    r = _post("/withdraw-addresses", user_token, {
        "label": "y",
        "address": "rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4",
        "tag": "abc"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"✓ Non-numeric tag correctly returned 400: {r.json().get('detail')}")
    
    print("\n[Test 2.4] POST exact duplicate (same address+tag) -> 400")
    r = _post("/withdraw-addresses", user_token, {
        "label": "Ledger Duplicate",
        "address": "rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4",
        "tag": "99"
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    print(f"✓ Duplicate address+tag correctly returned 400: {r.json().get('detail')}")
    
    # Test 3: DELETE address
    print("\n[Test 3.1] DELETE /api/withdraw-addresses/{id} -> 200")
    r = _delete(f"/withdraw-addresses/{saved_id}", user_token)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("ok") is True, f"Expected ok=true, got {data}"
    print(f"✓ DELETE returned 200 with ok=true")
    
    print("\n[Test 3.2] GET again -> list no longer contains deleted address")
    r = _get("/withdraw-addresses", user_token)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    addresses = r.json()["addresses"]
    assert not any(a["id"] == saved_id for a in addresses), f"Deleted address still in list: {addresses}"
    print(f"✓ Deleted address no longer in list")
    
    # Test 4: Auth required
    print("\n[Test 4] GET /api/withdraw-addresses with NO auth header -> 401/403")
    r = _get("/withdraw-addresses")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"
    print(f"✓ No auth correctly returned {r.status_code}")
    
    print("\n✅ FEATURE 1 PASSED: All withdrawal address book tests passed")


# =============================================================================
# FEATURE 2: Restake preview (non-mutating)
# =============================================================================
def test_feature2_restake_preview():
    """Test restake preview endpoint (non-mutating)."""
    print("\n" + "="*80)
    print("FEATURE 2: Restake preview (non-mutating)")
    print("="*80)
    
    admin_token = get_admin_token()
    user_token, user_id, user_email = register_user("restakepreview")
    print(f"✓ Registered user: {user_email} (id={user_id})")
    
    # Admin credit balance
    admin_credit_balance(admin_token, user_id, 120000)
    print(f"✓ Admin credited 120000 XRP balance")
    
    # Stake into vip_silver
    print("\n[Setup] Staking 50000 XRP into vip_silver")
    stake_result = stake_into_vault(user_token, "vip_silver", 50000)
    print(f"✓ Staked 50000 XRP into vip_silver")
    
    # Get stake_id from state
    r = _get("/state", user_token)
    assert r.status_code == 200, f"GET /state failed: {r.status_code} {r.text}"
    state = r.json()
    stakes = state.get("stakes", [])
    assert len(stakes) > 0, f"No stakes found in state: {state}"
    stake = stakes[0]
    stake_id = stake["id"]
    initial_principal = stake["principal"]
    print(f"✓ Got stake_id: {stake_id}, initial principal: {initial_principal}")
    
    # Admin add profit
    admin_credit_profit(admin_token, user_id, 500)
    print(f"✓ Admin added 500 XRP profit")
    
    # Test 1: POST /api/reinvest/preview with valid stake_id
    print("\n[Test 1] POST /api/reinvest/preview with valid stake_id")
    r = _post("/reinvest/preview", user_token, {"stake_id": stake_id})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    preview = r.json()
    print(f"Preview response: {preview}")
    
    # Validate response fields
    assert "new_principal" in preview, f"Missing 'new_principal' in response: {preview}"
    assert "amount" in preview, f"Missing 'amount' in response: {preview}"
    assert "new_matures_at" in preview, f"Missing 'new_matures_at' in response: {preview}"
    assert "profit_at_maturity" in preview, f"Missing 'profit_at_maturity' in response: {preview}"
    assert "total_at_maturity" in preview, f"Missing 'total_at_maturity' in response: {preview}"
    
    new_principal = preview["new_principal"]
    amount = preview["amount"]
    new_matures_at = preview["new_matures_at"]
    profit_at_maturity = preview["profit_at_maturity"]
    total_at_maturity = preview["total_at_maturity"]
    
    # Validate values
    assert abs(new_principal - 50500) < 10, f"Expected new_principal ≈ 50500, got {new_principal}"
    assert abs(amount - 500) < 10, f"Expected amount ≈ 500, got {amount}"
    assert profit_at_maturity >= 0, f"Expected profit_at_maturity >= 0, got {profit_at_maturity}"
    # profit_at_maturity should be roughly new_principal * 0.2999 minus small claimed
    expected_profit = new_principal * 0.2999
    assert abs(profit_at_maturity - expected_profit) < 100, f"Expected profit_at_maturity ≈ {expected_profit}, got {profit_at_maturity}"
    assert abs(total_at_maturity - (new_principal + profit_at_maturity)) < 0.01, f"Expected total_at_maturity = new_principal + profit_at_maturity, got {total_at_maturity}"
    
    # Validate new_matures_at is a valid future ISO date
    assert new_matures_at is not None, "new_matures_at is None"
    assert "T" in new_matures_at, f"new_matures_at not ISO format: {new_matures_at}"
    print(f"✓ Preview returned valid values: new_principal={new_principal}, amount={amount}, profit_at_maturity={profit_at_maturity}, total_at_maturity={total_at_maturity}")
    
    # Test 2: CRUCIAL - verify preview did NOT mutate
    print("\n[Test 2] CRUCIAL: Verify preview did NOT mutate the stake")
    r = _get("/state", user_token)
    assert r.status_code == 200, f"GET /state failed: {r.status_code} {r.text}"
    state_after = r.json()
    stakes_after = state_after.get("stakes", [])
    stake_after = next((s for s in stakes_after if s["id"] == stake_id), None)
    assert stake_after is not None, f"Stake {stake_id} not found after preview"
    principal_after = stake_after["principal"]
    assert abs(principal_after - initial_principal) < 0.01, f"Principal changed! Before: {initial_principal}, After: {principal_after}. Preview MUTATED the stake!"
    print(f"✓ Principal unchanged: {principal_after} (expected {initial_principal}). Preview did NOT mutate.")
    
    # Test 3: Invalid stake_id -> 404
    print("\n[Test 3] POST /api/reinvest/preview with invalid stake_id 'bad123' -> 404")
    r = _post("/reinvest/preview", user_token, {"stake_id": "bad123"})
    assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
    print(f"✓ Invalid stake_id correctly returned 404: {r.json().get('detail')}")
    
    print("\n✅ FEATURE 2 PASSED: All restake preview tests passed (including non-mutation verification)")


# =============================================================================
# FEATURE 3: Admin activity feed
# =============================================================================
def test_feature3_admin_activity_feed():
    """Test admin activity feed endpoint."""
    print("\n" + "="*80)
    print("FEATURE 3: Admin activity feed")
    print("="*80)
    
    admin_token = get_admin_token()
    print(f"✓ Admin logged in")
    
    # Create some activity: register user, admin adjust balance, create deposit/withdrawal
    user_token, user_id, user_email = register_user("activitytest")
    print(f"✓ Registered user: {user_email} (signup activity created)")
    
    admin_credit_balance(admin_token, user_id, 10000)
    print(f"✓ Admin credited balance (admin_action activity created)")
    
    # Test 1: GET /api/admin/activity as admin
    print("\n[Test 1] GET /api/admin/activity as admin -> 200")
    r = _get("/admin/activity", admin_token)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "activity" in data, f"Expected 'activity' field, got {data}"
    activity = data["activity"]
    assert isinstance(activity, list), f"Expected activity to be a list, got {type(activity)}"
    print(f"✓ GET /api/admin/activity returned 200 with activity list (length={len(activity)})")
    
    # Validate activity items
    if len(activity) > 0:
        print(f"\n[Validation] Checking activity items structure")
        valid_kinds = {"deposit", "withdrawal", "admin_action", "signup"}
        for item in activity[:5]:  # Check first 5 items
            assert "kind" in item, f"Missing 'kind' in activity item: {item}"
            assert item["kind"] in valid_kinds, f"Invalid kind '{item['kind']}', expected one of {valid_kinds}"
            assert "created_at" in item, f"Missing 'created_at' in activity item: {item}"
        print(f"✓ Activity items have valid 'kind' and 'created_at' fields")
        
        # Check for admin_action items (from our balance adjustment)
        admin_actions = [a for a in activity if a.get("kind") == "admin_action"]
        print(f"✓ Found {len(admin_actions)} admin_action items")
        
        # Check for signup items
        signups = [a for a in activity if a.get("kind") == "signup"]
        print(f"✓ Found {len(signups)} signup items")
        
        # Verify at least one admin_action or signup exists
        assert len(admin_actions) > 0 or len(signups) > 0, "Expected at least one admin_action or signup item"
        print(f"✓ Activity feed contains expected item types")
    else:
        print("⚠ Activity list is empty (no historical data)")
    
    # Test 2: GET /api/admin/activity with NO auth -> 401/403
    print("\n[Test 2.1] GET /api/admin/activity with NO auth -> 401/403")
    r = _get("/admin/activity")
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"
    print(f"✓ No auth correctly returned {r.status_code}")
    
    # Test 2.2: GET /api/admin/activity with NON-admin user token -> 403
    print("\n[Test 2.2] GET /api/admin/activity with NON-admin user token -> 403")
    r = _get("/admin/activity", user_token)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print(f"✓ Non-admin user correctly returned 403: {r.json().get('detail')}")
    
    print("\n✅ FEATURE 3 PASSED: All admin activity feed tests passed")


# =============================================================================
# Main test runner
# =============================================================================
if __name__ == "__main__":
    print("\n" + "="*80)
    print("XamanProtocol Backend Testing - THREE NEW FEATURES")
    print("="*80)
    
    try:
        test_feature1_withdrawal_address_book()
        test_feature2_restake_preview()
        test_feature3_admin_activity_feed()
        
        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED - ALL THREE FEATURES WORKING CORRECTLY")
        print("="*80)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        raise
