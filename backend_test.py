#!/usr/bin/env python3
"""
Backend API Tests for XamanProtocol
Tests the three critical endpoints:
1. GET /api/price/xrp - XRP->USD price with caching
2. GET /api/vaults - Vault minimum-stake ladder
3. POST /api/stakes - Stake creation with min-amount validation
"""

import requests
import time
import sys
import os

# Load backend URL from frontend/.env
BACKEND_URL = None
env_path = "/app/frontend/.env"
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BACKEND_URL = line.split("=", 1)[1].strip()
                break

if not BACKEND_URL:
    print("❌ FATAL: Could not find REACT_APP_BACKEND_URL in /app/frontend/.env")
    sys.exit(1)

BASE_URL = f"{BACKEND_URL}/api"
print(f"🔗 Testing backend at: {BASE_URL}\n")

# Admin credentials from test_credentials.md
ADMIN_USERNAME = "admin"
ADMIN_PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow"

# Expected vault minimums
EXPECTED_VAULTS = {
    "xrp_flex": 50000,
    "vip_silver": 150000,
    "vip_gold": 350000,
    "vip_platinum": 750000,
    "vip_diamond": 2000000,
}

def test_price_endpoint():
    """Test 1: GET /api/price/xrp"""
    print("=" * 70)
    print("TEST 1: GET /api/price/xrp - XRP->USD Price Endpoint")
    print("=" * 70)
    
    try:
        # First call - should be fresh (cached=False)
        print("\n📡 Making first call to /api/price/xrp...")
        r1 = requests.get(f"{BASE_URL}/price/xrp", timeout=10)
        print(f"Status: {r1.status_code}")
        print(f"Response: {r1.json()}")
        
        if r1.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {r1.status_code}")
            return False
        
        data1 = r1.json()
        
        # Validate response structure
        required_keys = ["usd", "source", "cached", "updated_at"]
        missing = [k for k in required_keys if k not in data1]
        if missing:
            print(f"❌ FAIL: Missing keys in response: {missing}")
            return False
        
        # Validate usd is a positive number
        usd_value = data1.get("usd")
        if not isinstance(usd_value, (int, float)) or usd_value <= 0:
            print(f"❌ FAIL: 'usd' should be a positive number, got: {usd_value}")
            return False
        
        print(f"✅ USD value is positive: {usd_value}")
        
        # Validate source
        source = data1.get("source")
        if source not in ["coinbase", "kraken"]:
            print(f"❌ FAIL: 'source' should be 'coinbase' or 'kraken', got: {source}")
            return False
        
        print(f"✅ Source is valid: {source}")
        
        # First call should be fresh (cached=False)
        if data1.get("cached") is not False:
            print(f"⚠️  WARNING: First call expected cached=False, got: {data1.get('cached')}")
            # Not a critical failure, continue
        else:
            print(f"✅ First call is fresh (cached=False)")
        
        # Second call - should be cached (cached=True)
        print("\n📡 Making second call immediately to test caching...")
        time.sleep(0.5)  # Small delay to ensure it's within cache window
        r2 = requests.get(f"{BASE_URL}/price/xrp", timeout=10)
        print(f"Status: {r2.status_code}")
        print(f"Response: {r2.json()}")
        
        if r2.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {r2.status_code}")
            return False
        
        data2 = r2.json()
        
        # Second call should be cached
        if data2.get("cached") is not True:
            print(f"❌ FAIL: Second call expected cached=True, got: {data2.get('cached')}")
            return False
        
        print(f"✅ Second call is cached (cached=True)")
        
        # USD value should be the same
        if data2.get("usd") != data1.get("usd"):
            print(f"❌ FAIL: Cached USD value changed: {data1.get('usd')} -> {data2.get('usd')}")
            return False
        
        print(f"✅ Cached USD value matches: {data2.get('usd')}")
        
        print("\n✅ TEST 1 PASSED: Price endpoint working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_vaults_endpoint():
    """Test 2: GET /api/vaults"""
    print("\n" + "=" * 70)
    print("TEST 2: GET /api/vaults - Vault Minimum-Stake Ladder")
    print("=" * 70)
    
    try:
        print("\n📡 Calling /api/vaults...")
        r = requests.get(f"{BASE_URL}/vaults", timeout=10)
        print(f"Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"❌ FAIL: Expected status 200, got {r.status_code}")
            return False
        
        data = r.json()
        print(f"Response keys: {list(data.keys())}")
        
        if "vaults" not in data:
            print(f"❌ FAIL: Response missing 'vaults' key")
            return False
        
        vaults = data["vaults"]
        print(f"\n📊 Found {len(vaults)} vaults")
        
        # Check each expected vault
        failures = []
        for vault in vaults:
            key = vault.get("key")
            min_amount = vault.get("min_amount")
            name = vault.get("name", "")
            
            print(f"\n  Vault: {name} ({key})")
            print(f"    min_amount: {min_amount}")
            
            if key in EXPECTED_VAULTS:
                expected = EXPECTED_VAULTS[key]
                if min_amount == expected:
                    print(f"    ✅ Matches expected: {expected}")
                else:
                    print(f"    ❌ Expected {expected}, got {min_amount}")
                    failures.append(f"{key}: expected {expected}, got {min_amount}")
        
        # Check if all expected vaults are present
        found_keys = {v.get("key") for v in vaults}
        missing = set(EXPECTED_VAULTS.keys()) - found_keys
        if missing:
            print(f"\n❌ FAIL: Missing vaults: {missing}")
            failures.append(f"Missing vaults: {missing}")
        
        if failures:
            print(f"\n❌ TEST 2 FAILED with {len(failures)} issue(s):")
            for f in failures:
                print(f"  - {f}")
            return False
        
        print("\n✅ TEST 2 PASSED: All vault minimums match expected values")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_stakes_min_validation():
    """Test 3: POST /api/stakes - Min-amount validation"""
    print("\n" + "=" * 70)
    print("TEST 3: POST /api/stakes - Min-Amount Validation")
    print("=" * 70)
    
    try:
        # Step 1: Login as admin
        print("\n🔐 Logging in as admin...")
        login_payload = {
            "username": ADMIN_USERNAME,
            "phrase": ADMIN_PHRASE
        }
        r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=10)
        print(f"Login status: {r_login.status_code}")
        
        if r_login.status_code != 200:
            print(f"❌ FAIL: Login failed with status {r_login.status_code}")
            print(f"Response: {r_login.text}")
            return False
        
        login_data = r_login.json()
        token = login_data.get("token")
        
        if not token:
            print(f"❌ FAIL: No token in login response")
            return False
        
        print(f"✅ Login successful, got token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Test min-amount validation
        # Try to stake below minimum for vip_silver (min: 150000)
        test_vault = "vip_silver"
        test_amount = 100  # Well below 150000
        
        print(f"\n📡 Attempting to stake {test_amount} XRP in {test_vault} (min: 150000)...")
        stake_payload = {
            "vault_key": test_vault,
            "amount": test_amount
        }
        
        r_stake = requests.post(f"{BASE_URL}/stakes", json=stake_payload, headers=headers, timeout=10)
        print(f"Status: {r_stake.status_code}")
        print(f"Response: {r_stake.text}")
        
        # Should return 400 with min-amount error
        if r_stake.status_code != 400:
            print(f"❌ FAIL: Expected status 400 for below-min stake, got {r_stake.status_code}")
            return False
        
        print(f"✅ Correctly rejected with 400 status")
        
        # Check error message mentions minimum
        response_text = r_stake.text.lower()
        if "minimum" not in response_text:
            print(f"⚠️  WARNING: Error message doesn't mention 'minimum': {r_stake.text}")
            # Not critical, but worth noting
        else:
            print(f"✅ Error message mentions minimum requirement")
        
        # Additional check: verify it's the min-amount validation, not balance check
        # The error should be about vault minimum, not insufficient balance
        if "balance" in response_text and "minimum" not in response_text:
            print(f"❌ FAIL: Got balance error instead of min-amount validation error")
            return False
        
        print("\n✅ TEST 3 PASSED: Min-amount validation working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("🧪 XamanProtocol Backend API Tests")
    print("=" * 70)
    
    results = {
        "Price Endpoint": test_price_endpoint(),
        "Vaults Endpoint": test_vaults_endpoint(),
        "Stakes Min Validation": test_stakes_min_validation(),
    }
    
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(results.values())
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
