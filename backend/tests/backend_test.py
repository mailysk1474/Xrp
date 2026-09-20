"""XamanProtocol backend test suite.

Covers auth, state, stakes, deposit-claim, withdraw, admin flows, real-time
enforcement of locked / withdrawals-disabled users, and audit logging.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://launch-hub-158.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USERNAME = "admin"
ADMIN_PHRASE = "legal winner thank year wave sausage worth useful legal winner thank yellow"


# ---- helpers ----
def _post(path, token=None, json=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(f"{API}{path}", json=json or {}, headers=h, timeout=30)


def _get(path, token=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(f"{API}{path}", headers=h, timeout=30)


@pytest.fixture(scope="module")
def admin_token():
    r = _post("/auth/login", json={"username": ADMIN_USERNAME, "phrase": ADMIN_PHRASE})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def user_ctx():
    """Register a fresh user; return dict with token, phrase, user_id, username."""
    uname = f"tester_{uuid.uuid4().hex[:10]}"
    r = _post("/auth/register", json={"first_name": "Test", "last_name": "User", "username": uname})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "phrase" in data and "user" in data
    words = data["phrase"].split()
    assert len(words) == 12, f"phrase must be 12 words, got {len(words)}"
    assert data["user"]["destination_tag"] is not None
    # Credit balance upfront so any test in any xdist worker has funds available.
    # test_admin_credit_balance_reflects_in_state still runs its own credit + check.
    ar = _post("/auth/login", json={"username": ADMIN_USERNAME, "phrase": ADMIN_PHRASE})
    if ar.status_code == 200:
        _post(f"/admin/users/{data['user']['id']}/adjust-balance", ar.json()["token"], {"amount": 500000.0})
    return {
        "token": data["token"],
        "phrase": data["phrase"],
        "user_id": data["user"]["id"],
        "username": uname,
        "destination_tag": data["user"]["destination_tag"],
    }


# ---- auth ----
class TestAuth:
    def test_register_duplicate_returns_409(self, user_ctx):
        r = _post("/auth/register", json={"first_name": "A", "last_name": "B", "username": user_ctx["username"]})
        assert r.status_code == 409

    def test_login_with_phrase(self, user_ctx):
        r = _post("/auth/login", json={"username": user_ctx["username"], "phrase": user_ctx["phrase"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_phrase_401(self, user_ctx):
        bad = "legal winner thank year wave sausage worth useful legal winner thank yellow"
        # ensure it's not accidentally correct
        if bad == user_ctx["phrase"]:
            bad = "abandon " * 11 + "about"
        r = _post("/auth/login", json={"username": user_ctx["username"], "phrase": bad})
        assert r.status_code == 401

    def test_state_requires_token(self):
        r = _get("/state")
        assert r.status_code == 401

    def test_state_with_token(self, user_ctx):
        r = _get("/state", user_ctx["token"])
        assert r.status_code == 200
        d = r.json()
        for k in ("balance", "stakes", "profit", "tier", "tier_info", "destination_tag"):
            assert k in d


# ---- admin permission ----
class TestAdminAuthz:
    def test_normal_user_forbidden(self, user_ctx):
        r = _get("/admin/users", user_ctx["token"])
        assert r.status_code == 403

    def test_admin_lists_users(self, admin_token, user_ctx):
        r = _get("/admin/users", admin_token)
        assert r.status_code == 200
        users = r.json()["users"]
        assert any(u["username"] == user_ctx["username"] for u in users)


# ---- balance / staking / accrual ----
class TestStakingFlow:
    def test_admin_credit_balance_reflects_in_state(self, admin_token, user_ctx):
        r = _post(f"/admin/users/{user_ctx['user_id']}/adjust-balance", admin_token, {"amount": 200000.0})
        assert r.status_code == 200
        s = _get("/state", user_ctx["token"]).json()
        assert s["balance"] >= 200000.0

    def test_stake_min_amount_error(self, user_ctx):
        r = _post("/stakes", user_ctx["token"], {"vault_key": "xrp_flex", "amount": 1})
        assert r.status_code == 400

    def test_stake_insufficient_balance(self, user_ctx):
        r = _post("/stakes", user_ctx["token"], {"vault_key": "xrp_flex", "amount": 99999999})
        assert r.status_code == 400

    def test_stake_success_and_live_accrual(self, user_ctx):
        r = _post("/stakes", user_ctx["token"], {"vault_key": "xrp_flex", "amount": 100.0})
        assert r.status_code == 200
        s1 = _get("/state", user_ctx["token"]).json()
        assert len(s1["stakes"]) >= 1
        # Flex APY is only 5.2%; accrual on 100 XRP is tiny per second, so also add a
        # bigger stake to make change visible.
        _post("/stakes", user_ctx["token"], {"vault_key": "vip_diamond", "amount": 100000.0})
        s2 = _get("/state", user_ctx["token"]).json()
        acc1 = sum(x["accrued"] for x in s2["stakes"])
        time.sleep(3)
        s3 = _get("/state", user_ctx["token"]).json()
        acc2 = sum(x["accrued"] for x in s3["stakes"])
        assert acc2 > acc1, f"accrual not increasing: {acc1} -> {acc2}"


# ---- deposit flow ----
class TestDepositFlow:
    def test_deposit_claim_and_admin_confirm(self, admin_token, user_ctx):
        r = _post("/deposit-claim", user_ctx["token"], {"amount": 50.0})
        assert r.status_code == 200
        tid = r.json()["transaction_id"]

        q = _get("/admin/deposits", admin_token).json()["deposits"]
        assert any(d["id"] == tid for d in q)

        before = _get("/state", user_ctx["token"]).json()["balance"]
        r2 = _post(f"/admin/deposits/{tid}/confirm", admin_token)
        assert r2.status_code == 200
        after = _get("/state", user_ctx["token"]).json()["balance"]
        assert round(after - before, 4) == 50.0


# ---- withdraw flow ----
class TestWithdrawFlow:
    def test_withdraw_pending_and_approve(self, admin_token, user_ctx):
        before = _get("/state", user_ctx["token"]).json()["balance"]
        r = _post("/withdraw", user_ctx["token"], {"amount": 10.0})
        assert r.status_code == 200, r.text
        tid = r.json()["transaction_id"]
        held = _get("/state", user_ctx["token"]).json()["balance"]
        assert round(before - held, 4) == 10.0

        r2 = _post(f"/admin/withdrawals/{tid}/approve", admin_token)
        assert r2.status_code == 200

    def test_withdraw_reject_refunds(self, admin_token, user_ctx):
        before = _get("/state", user_ctx["token"]).json()["balance"]
        r = _post("/withdraw", user_ctx["token"], {"amount": 5.0})
        assert r.status_code == 200
        tid = r.json()["transaction_id"]
        r2 = _post(f"/admin/withdrawals/{tid}/reject", admin_token)
        assert r2.status_code == 200
        after = _get("/state", user_ctx["token"]).json()["balance"]
        assert round(after, 4) == round(before, 4)


# ---- CRITICAL: real-time server-side enforcement ----
class TestRealTimeEnforcement:
    def test_withdrawals_disabled_blocks_only_withdraw(self, admin_token, user_ctx):
        # Disable
        r = _post(f"/admin/users/{user_ctx['user_id']}/withdrawals", admin_token, {"value": True})
        assert r.status_code == 200
        rw = _post("/withdraw", user_ctx["token"], {"amount": 1.0})
        assert rw.status_code == 403
        # deposit-claim still works
        rd = _post("/deposit-claim", user_ctx["token"], {"amount": 1.0})
        assert rd.status_code == 200
        # stake still works
        rs = _post("/stakes", user_ctx["token"], {"vault_key": "xrp_flex", "amount": 10.0})
        assert rs.status_code == 200
        # Re-enable
        _post(f"/admin/users/{user_ctx['user_id']}/withdrawals", admin_token, {"value": False})

    def test_lock_blocks_stake_deposit_withdraw(self, admin_token, user_ctx):
        r = _post(f"/admin/users/{user_ctx['user_id']}/lock", admin_token, {"value": True})
        assert r.status_code == 200
        # all 3 actions should be 403 even with valid token
        r1 = _post("/stakes", user_ctx["token"], {"vault_key": "xrp_flex", "amount": 10.0})
        r2 = _post("/deposit-claim", user_ctx["token"], {"amount": 5.0})
        r3 = _post("/withdraw", user_ctx["token"], {"amount": 1.0})
        assert r1.status_code == 403, r1.text
        assert r2.status_code == 403, r2.text
        assert r3.status_code == 403, r3.text
        # unlock for cleanup
        _post(f"/admin/users/{user_ctx['user_id']}/lock", admin_token, {"value": False})


# ---- audit log ----
class TestAudit:
    def test_audit_records_admin_actions(self, admin_token, user_ctx):
        r = _get("/admin/audit", admin_token)
        assert r.status_code == 200
        logs = r.json()["audit"]
        # We've made lots of admin actions during this run
        actions = {l["action"] for l in logs}
        assert "adjust_balance" in actions
        assert "lock" in actions or "unlock" in actions


# ---- misc ----
class TestMisc:
    def test_no_store_header(self, user_ctx):
        r = _get("/state", user_ctx["token"])
        assert "no-store" in r.headers.get("Cache-Control", "").lower()

    def test_vaults_public(self):
        r = _get("/vaults")
        assert r.status_code == 200
        vaults = r.json()["vaults"]
        keys = {v["key"] for v in vaults}
        assert {"xrp_flex", "vip_silver", "vip_gold", "vip_platinum", "vip_diamond"}.issubset(keys)



# ---- Reinvest ----
class TestReinvest:
    def test_reinvest_no_profit_returns_400(self):
        # fresh user has no profit
        uname = f"tester_np_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "N", "last_name": "P", "username": uname})
        assert r.status_code == 200
        tok = r.json()["token"]
        rr = _post("/reinvest", tok, {"vault_key": "xrp_flex"})
        assert rr.status_code == 400
        assert "no profit" in rr.json().get("detail", "").lower()

    def test_reinvest_below_min_returns_400(self, admin_token):
        # user with tiny bonus profit (< xrp_flex min 10) into flex
        uname = f"tester_bm_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "B", "last_name": "M", "username": uname})
        assert r.status_code == 200
        tok = r.json()["token"]
        uid = r.json()["user"]["id"]
        _post(f"/admin/users/{uid}/adjust-profit", admin_token, {"amount": 3.0})
        rr = _post("/reinvest", tok, {"vault_key": "xrp_flex"})
        assert rr.status_code == 400
        assert "at least" in rr.json().get("detail", "").lower()

    def test_reinvest_success_and_state_reset(self, admin_token):
        uname = f"tester_ri_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "R", "last_name": "I", "username": uname})
        assert r.status_code == 200
        tok = r.json()["token"]
        uid = r.json()["user"]["id"]
        # give 500 bonus profit
        _post(f"/admin/users/{uid}/adjust-profit", admin_token, {"amount": 500.0})
        s0 = _get("/state", tok).json()
        assert s0["profit"] >= 500.0
        stakes0 = len(s0["stakes"])

        rr = _post("/reinvest", tok, {"vault_key": "xrp_flex"})
        assert rr.status_code == 200, rr.text
        body = rr.json()
        assert body["ok"] is True
        assert body["amount"] >= 500.0

        s1 = _get("/state", tok).json()
        assert len(s1["stakes"]) == stakes0 + 1
        # profit should be ~0 (tiny drift from the new stake accruing since creation)
        assert s1["profit"] < 1.0, f"profit not reset: {s1['profit']}"
        assert s1["bonus_profit"] == 0.0
        # new stake principal == reinvested amount
        new_stake = max(s1["stakes"], key=lambda x: x["start_at"])
        assert new_stake["vault_key"] == "xrp_flex"
        assert abs(new_stake["principal"] - body["amount"]) < 0.01

        # reinvest tx is recorded
        txns = _get("/transactions", tok).json()["transactions"]
        assert any(t["type"] == "reinvest" and abs(t["amount"] - body["amount"]) < 0.01 for t in txns)

    def test_reinvest_combines_bonus_and_accrued(self, admin_token):
        uname = f"tester_rc_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "R", "last_name": "C", "username": uname})
        tok = r.json()["token"]; uid = r.json()["user"]["id"]
        # credit balance, stake diamond (very high APY) to accrue, plus bonus
        _post(f"/admin/users/{uid}/adjust-balance", admin_token, {"amount": 200000.0})
        _post("/stakes", tok, {"vault_key": "vip_diamond", "amount": 100000.0})
        _post(f"/admin/users/{uid}/adjust-profit", admin_token, {"amount": 200.0})
        time.sleep(2)
        s = _get("/state", tok).json()
        before_profit = s["profit"]
        assert before_profit > 200.0  # bonus + some accrued
        rr = _post("/reinvest", tok, {"vault_key": "xrp_flex"})
        assert rr.status_code == 200
        assert rr.json()["amount"] >= 200.0
        # after: profit near 0
        s2 = _get("/state", tok).json()
        assert s2["profit"] < 1.0

    def test_reinvest_locked_user_403(self, admin_token):
        uname = f"tester_rl_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "R", "last_name": "L", "username": uname})
        tok = r.json()["token"]; uid = r.json()["user"]["id"]
        _post(f"/admin/users/{uid}/adjust-profit", admin_token, {"amount": 500.0})
        _post(f"/admin/users/{uid}/lock", admin_token, {"value": True})
        rr = _post("/reinvest", tok, {"vault_key": "xrp_flex"})
        assert rr.status_code == 403
        _post(f"/admin/users/{uid}/lock", admin_token, {"value": False})

    def test_reinvest_unknown_vault_404(self, admin_token):
        uname = f"tester_rv_{uuid.uuid4().hex[:8]}"
        r = _post("/auth/register", json={"first_name": "R", "last_name": "V", "username": uname})
        tok = r.json()["token"]; uid = r.json()["user"]["id"]
        _post(f"/admin/users/{uid}/adjust-profit", admin_token, {"amount": 500.0})
        rr = _post("/reinvest", tok, {"vault_key": "nope_vault"})
        assert rr.status_code == 404
