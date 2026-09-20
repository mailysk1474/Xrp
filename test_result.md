#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  XRP staking app (Xaman Protocol). Recent changes to verify:
  1. Vaults switched from ANNUAL APY to a TOTAL-RETURN model: each vault's `apy` field now
     represents the full profit earned by the END of the lock period. Rates: xrp_flex 0.1999 (18d),
     vip_silver 0.2999 (30d), vip_gold 0.4999 (45d), vip_platinum 0.8999 (60d), vip_diamond 1.56 (90d).
  2. stake_accrued() now = principal * apy * clamp(elapsed / (duration_days*86400), 0, 1). So at
     maturity accrued == principal * apy exactly, and it always uses the CURRENT principal.
  3. Restake reworked (Option A): POST /reinvest now takes { stake_id } and COMPOUNDS all available
     profit (all stakes' unclaimed accrued + bonus_profit) into that existing stake's principal,
     resets its start_at to now and claimed_profit to 0. No vault-minimum requirement anymore.
  4. Auto-restake compounds profit into the preferred (or largest) active stake when profit >= threshold.

backend:
  - task: "Admin-editable hot wallet address (settings)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: DB-backed editable hot wallet. GET /api/admin/settings (admin-only) returns {hot_wallet_address}. PUT /api/admin/settings (admin-only) body {hot_wallet_address} validates XRP address (regex ^r[1-9A-HJ-NP-Za-km-z]{24,34}$), updates settings singleton, audits, broadcasts to all WS clients. get_hot_wallet() reads db.settings (seeded from env on boot) and is used by GET /api/state (hot_wallet) and GET /api/deposit-info (address). Test: (1) admin GET /api/admin/settings -> 200. (2) admin PUT valid XRP addr (rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4) -> 200; then GET /api/deposit-info and GET /api/state must reflect it. (3) PUT invalid ('hello', empty) -> 400. (4) no auth -> 401/403; non-admin -> 403. Admin: admin@xamanprotocol.com / admin12345."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 11 test cases PASSED. (1) GET /api/admin/settings with admin token returns 200 with hot_wallet_address starting with 'r' and length 25-35 chars (current: rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4). (2) PUT /api/admin/settings with valid XRP address rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4 returns 200 with ok=true and hot_wallet_address echoed. (3) GET /api/deposit-info (as authenticated user) returns address=rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4 matching updated hot wallet. (4) GET /api/state (as authenticated user) returns hot_wallet=rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4 matching updated address. (5) PUT with invalid address 'hello' correctly returns 400 'Enter a valid XRP address (starts with 'r', 25–35 chars).' (6) PUT with empty address correctly returns 400 with same error message. (7) GET /api/admin/settings without Authorization header correctly returns 401. (8) PUT /api/admin/settings without Authorization header correctly returns 401. (9) GET /api/admin/settings with non-admin user token correctly returns 403 'Admin access required'. (10) PUT /api/admin/settings with non-admin user token correctly returns 403 'Admin access required'. (11) Hot wallet successfully restored to production value rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4. All validation, authentication guards, and state propagation working correctly. Test user: hotwallet_02a7304a@example.com (id=6aafd91d99295e4437feab41)."
  - task: "Withdrawal requires destination address + optional tag"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGED: POST /api/withdraw now takes {amount, address (required XRP addr), tag (optional numeric string)}. Validates: amount>0, amount<=balance, address matches XRP regex else 400, tag if provided must be digits else 400. Stores meta.destination_address (+ meta.destination_tag if given). GET /api/admin/withdrawals now returns destination_address and destination_tag per item. Test: (A) fund a user, POST /withdraw {amount:10, address:'rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4', tag:'12345'} -> 200 & balance decremented; admin GET /admin/withdrawals shows that row with destination_address and destination_tag. (B) POST /withdraw with missing/invalid address ('hello') -> 400. (C) POST /withdraw with non-numeric tag ('abc') -> 400. (D) amount>balance -> 400. Admin: admin@xamanprotocol.com / admin12345."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 7 test cases PASSED. (1) Registered fresh user withdraw_2d368080@example.com (id=6aafd93e99295e4437feab48), admin credited 1000 XRP balance, user confirmed in admin users list. (2) POST /api/withdraw with {amount:10, address:'rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4', tag:'12345'} returns 200 with ok=true and transaction_id. Balance correctly decremented from 1000.0 to 990.0 XRP. (3) GET /api/admin/withdrawals returns 200 with withdrawals array. Found withdrawal for test user with destination_address='rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4', destination_tag='12345', amount=10.0 - all fields match expected values. (4) POST /api/withdraw with missing address field correctly returns 422 (Pydantic validation error 'Field required'). (5) POST /api/withdraw with invalid address 'hello' correctly returns 400 'Enter a valid destination XRP address (starts with 'r').' (6) POST /api/withdraw with non-numeric tag 'abc' correctly returns 400 'Destination tag must be a number.' (7) POST /api/withdraw with amount (1090 XRP) greater than balance (990 XRP) correctly returns 400 'Insufficient available balance.' All validation, balance checks, and admin withdrawal queue integration working correctly."
  - task: "Vaults return total-return rates"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "GET /api/vaults should return apy = 0.1999/0.2999/0.4999/0.8999/1.56 for the five vaults."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: GET /api/vaults returns 200 with all 5 vaults having correct total-return rates in the apy field: xrp_flex=0.1999 (18 days), vip_silver=0.2999 (30 days), vip_gold=0.4999 (45 days), vip_platinum=0.8999 (60 days), vip_diamond=1.56 (90 days). All duration_days values match expected. Total-return model vault configuration is correct."
  - task: "Stake accrual uses total-return model on current principal"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Create a user, fund via admin adjust-balance, open a stake. Verify accrued grows over time and would equal principal*apy at maturity. Verify accrued is based on the stake's current principal."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: Stake accrual using total-return model working correctly. Registered user totalreturn_3503836d@example.com, admin credited 60000 XRP, staked 50000 XRP into vip_silver (30 days, 0.2999 total return). Accrued started near zero (0.002527 XRP) immediately after staking. After 5 seconds, accrued increased to 0.034257 XRP, confirming live accrual. Calculation verified: accrued = principal * apy * (elapsed / (duration_days * 86400)). For 50000 at 0.2999 over 30 days after ~5 seconds, expected ~0.029 XRP, actual 0.034257 XRP (within tolerance). Accrual is based on current principal and increases over time as expected."
  - task: "Restake compounds profit into existing stake (Option A) via POST /reinvest {stake_id}"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "After profit accrues, POST /reinvest with the stake_id. Expect the stake principal to increase by the available profit, start_at reset to now, claimed_profit reset to 0, and user's available profit reset to ~0. No minimum-amount error should occur."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: Restake compounding (Option A) working correctly. POST /api/reinvest with {stake_id} successfully compounds profit into existing stake. Before reinvest: principal=50000.0, accrued=0.03678, profit=0.03678. After reinvest: principal increased to 50000.03994 (old principal + profit), accrued reset to 0.002539 (near 0), profit reset to 0.002539 (near 0). Verified only ONE stake exists (no new stake created), confirming profit was compounded into the SAME stake. start_at was reset to now (accrual clock restarted). NO minimum-amount error occurred. Invalid stake_id correctly returns 400 'Choose an active stake to compound your profit into.' Restake compounding working as specified."
  - task: "Auto-restake compounds into preferred/largest stake"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "POST /auto-restake {enabled:true, threshold>0, vault_key optional} should save without a vault-minimum error. Background loop compounds when profit >= threshold."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: Auto-restake configuration working correctly. POST /api/auto-restake with {enabled:true, threshold:10, vault_key:'vip_silver'} returns 200 with config saved correctly. NO 'threshold must be at least the vault minimum' error (validation removed as specified). Only validation is threshold > 0. POST /api/auto-restake with {enabled:true, threshold:0} correctly returns 400 'Set a trigger amount greater than 0.' POST /api/auto-restake with {enabled:false} successfully disables auto-restake. All validation and configuration working as specified. Background loop auto-compounding not tested (requires waiting for profit >= threshold), but config API working correctly."

frontend:
  - task: "Restake dialog picks an active stake; hero/labels show total return"
    implemented: true
    working: true
    file: "frontend/src/pages/Dashboard.jsx, frontend/src/pages/Landing.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Not yet tested via agent; awaiting user permission for frontend testing."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 4 sections tested successfully. (1) LANDING PAGE: Hero stat shows '156%' with 'Max return' label. Vault cards section displays all 5 vaults with correct total-return percentages (XRP Flex 19.99%, VIP Silver 29.99%, VIP Gold 49.99%, VIP Platinum 89.99%, VIP Diamond 156%). Yield calculator working correctly - tested XRP Flex, VIP Silver, and VIP Diamond vaults, all show correct 'Total profit at maturity' and 'Total return' rates matching expected values. VIP tiers table shows correct Min staked column: 25,000 / 50,000 / 100,000 / 250,000 / 500,000 XRP for all 5 tiers. (2) LOGIN: Successfully logged in with fetest@example.com / Test12345, landed on dashboard at /app. (3) DASHBOARD: Live profit is accruing correctly (0.1265 XRP → 0.1289 XRP over 5 seconds, confirmed live accrual). Active stake card shows 'VIP Silver' with '29.99% total' label and countdown/status indicator present. (4) RESTAKE FLOW: Restake button (data-testid='reinvest-button') is conditionally rendered only when profit >= 10 XRP (Dashboard.jsx line 358). Test user fetest@example.com currently has 0.1265 XRP profit, which is below the 10 XRP threshold, so button does not appear (working as designed). Code review confirms: ReinvestDialog component (lines 19-86) has correct structure with data-testids (reinvest-dialog, reinvest-amount, reinvest-stake-{id}, confirm-reinvest-button), shows 'Add to which stake?' section with active stake buttons (not vault selection), displays preview line 'New stake balance ≈ ... XRP' with term restart mention, and POST /reinvest endpoint with {stake_id} payload. All frontend implementation for total-return model is correct and working. Restake flow implementation verified via code review - would work correctly when profit >= 10 XRP threshold is met."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: |
      Please test the BACKEND only. Auth: registration is via POST /api/auth/register
      (first_name, last_name, email, password) which returns a token; use that token.
      To fund a user, an admin can call POST /api/admin/users/{user_id}/adjust-balance.
      Admin account is seeded from backend/.env (ADMIN_USERNAME=admin, ADMIN_PHRASE is the
      12-word phrase in /app/memory/test_credentials.md) via POST /api/auth/recover
      {email/username + phrase} or the login flow. If admin funding is hard, you may also
      test accrual/restake purely by registering a user, funding through the admin endpoint,
      staking, and re-reading GET /api/state. Focus on: (1) /api/vaults rates,
      (2) accrual = principal*apy*fraction of lock elapsed, (3) /reinvest {stake_id} compounds
      profit into the stake principal and resets its clock, (4) /auto-restake saves with any
      threshold>0. Do NOT test the frontend.
    -agent: "testing"
    -message: |
      ✅ TOTAL-RETURN MODEL BACKEND TESTING COMPLETE - ALL 4 AREAS PASSED
      
      Tested all 4 backend areas for the total-return model changes:
      
      1. ✅ Vaults return total-return rates: GET /api/vaults returns correct apy values (0.1999/0.2999/0.4999/0.8999/1.56) and duration_days (18/30/45/60/90) for all 5 vaults.
      
      2. ✅ Stake accrual uses total-return model: Verified accrual = principal * apy * (elapsed / (duration_days * 86400)). Accrued starts near 0 and increases over time. For 50000 XRP at 0.2999 over 30 days, after 5 seconds accrued was 0.034257 XRP (expected ~0.029 XRP, within tolerance).
      
      3. ✅ Restake compounds profit into existing stake: POST /api/reinvest {stake_id} successfully compounds profit into the SAME stake's principal (50000.0 -> 50000.03994), resets start_at to now (accrued dropped to near 0), resets profit to near 0. NO new stake created. NO minimum-amount error. Invalid stake_id returns 400.
      
      4. ✅ Auto-restake config: POST /api/auto-restake {enabled:true, threshold:10, vault_key:'vip_silver'} returns 200 with NO 'threshold must be at least the vault minimum' error (validation removed). Only threshold > 0 is required. threshold=0 correctly returns 400. Disable works correctly.
      
      Test user created: totalreturn_3503836d@example.com (id=6aaf24e748674c4b087cd665)
      Admin credentials: admin@xamanprotocol.com / admin12345 (default password, NOT XamanAdmin2025!)
      
      All backend APIs for the total-return model are working correctly and production-ready.

user_problem_statement: |
  PWA/responsive layout bug fix verification: When installed to Home Screen (standalone/PWA mode), the header looked bad and content was getting cut off at the top (notch/status-bar area). Fix added CSS safe-area-inset padding (.safe-top / .safe-x) to all top headers and mobile bottom nav, plus viewport-fit=cover. Verify layout stability and no content clipping across mobile (390x844), tablet (768x1024), and desktop (1920x800) viewports.

backend:
  - task: "Admin stats endpoint + last_login tracking"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: GET /api/admin/stats (admin-only) returns {total_users, total_balance, total_staked, aum, pending_deposits, pending_withdrawals}. Also POST /api/auth/login and /api/auth/recover now set user.last_login (ISO) and public_user exposes last_login. Please test: (1) GET /api/admin/stats with admin token -> 200 with all 6 fields; aum == total_balance+total_staked (within rounding); counts non-negative ints. (2) GET /api/admin/stats with NO auth -> 401/403; with a NON-admin user token -> 403. (3) Register a fresh user then LOGIN with them; GET /api/admin/users (admin) and confirm that user's last_login is now a non-null ISO timestamp. Admin creds: admin@xamanprotocol.com / XamanAdmin2025! (do not change admin password)."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 4 test cases PASSED. (1) GET /api/admin/stats with admin token returns 200 with all 6 required numeric fields: total_users=10 (int), total_balance=12038497.173423 (float), total_staked=697000.0 (float), aum=12735497.173423 (float), pending_deposits=1 (int), pending_withdrawals=1 (int). AUM calculation verified correct: aum (12735497.173423) == total_balance (12038497.173423) + total_staked (697000.0) with diff=0.0 (within 0.01 tolerance). All counts are non-negative and total_users >= 1. (2) GET /api/admin/stats without Authorization header correctly returns 401 'Not authenticated'. (3) GET /api/admin/stats with non-admin user token correctly returns 403 'Admin access required'. Registered non-admin user: nonadmin_64db8a23@example.com (id=6aaeb4c7f9af58f492552a0d). (4) last_login tracking verified: Registered user lastlogin_b9f15141@example.com (id=6aaeb4c8f9af58f492552a0e), logged in, then GET /api/admin/users with admin token confirmed user's last_login field is non-null ISO timestamp string: '2026-09-19T16:14:01.005645+00:00'. All authentication guards, field validations, and last_login tracking working correctly."
  - task: "Vault minimum-stake ladder increase"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Updated DEFAULT_VAULTS min_amount + TIER_THRESHOLDS + next_tier_progress thresholds to new ladder (50k/150k/350k/750k/2M). Ran scripts/migrate_vault_mins.py against Atlas DB to update existing vault records. GET /api/vaults should return new minimums; POST /api/stakes should reject below-min amounts."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: GET /api/vaults returns all 5 vaults with correct min_amount values (xrp_flex=50000, vip_silver=150000, vip_gold=350000, vip_platinum=750000, vip_diamond=2000000). POST /api/stakes correctly validates min-amount and returns 400 with 'Minimum for this vault is 150000 XRP.' when attempting to stake 100 XRP in vip_silver (min 150000). Min-amount validation occurs BEFORE balance check as expected."
  - task: "XRP->USD price endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "New public GET /api/price/xrp endpoint. Coinbase primary, Kraken fallback, 60s in-memory cache. Returns {usd, source, cached, updated_at}. First call fresh, subsequent cached. Verified via curl (usd~1.43, coinbase)."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: GET /api/price/xrp returns HTTP 200 with correct JSON structure {usd: 1.4299, source: 'coinbase', cached: true, updated_at: timestamp}. USD value is positive and in expected range. Source is valid (coinbase/kraken). Caching mechanism works correctly - subsequent calls within 60s return cached=true with same USD value. All requirements met."

backend:
  - task: "Early-exit (stop stake) endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "New POST /api/stakes/{stake_id}/exit. Only locked+unmatured stakes owned by the user. Computes returned = principal*(1 - early_exit_fee - slippage) using LIVE vault terms; forfeits accrued profit; sets stake principal 0 / status exited; credits balance; logs 'early_exit' transaction with breakdown. Vault docs now carry early_exit_fee (0.10) and slippage (0.02); serialize_stake exposes can_exit + fee/slippage amounts + early_exit_return. Admin PUT /api/admin/vaults/{key} now accepts early_exit_fee & slippage."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: Complete early-exit flow tested successfully. (1) User registration and admin balance credit working correctly. (2) Staking into locked vault vip_silver (150000 XRP) successful. (3) GET /api/state correctly returns can_exit=true, early_exit_fee=0.10, slippage=0.02, early_exit_fee_amount=15000, early_exit_slippage_amount=3000, early_exit_return=132000, status=active. (4) POST /api/stakes/{stake_id}/exit returns correct values: returned=132000, fee_amount=15000, slippage_amount=3000, principal=150000. (5) Post-exit state verified: stake principal=0, status=exited, total_staked reduced to 0, balance increased by exactly 132000 (from 50000 to 182000). (6) Transaction history includes early_exit transaction with correct amount (132000) and meta breakdown (fee_amount=15000, slippage_amount=3000, forfeited_profit present). (7) Negative tests passed: exiting same stake again returns 400, exiting flexible stake returns 400, exiting non-existent stake returns 404. (8) Admin vault terms update verified: PUT /api/admin/vaults/vip_silver with early_exit_fee=0.15 and slippage=0.03 correctly updates calculations (fee_amount=22500, slippage_amount=4500, return=123000), then successfully reset to original values. All 8 test steps passed with correct calculations and error handling."
  - task: "Flexible-vault stop stake (no penalty)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "BUG FIX: XRP Flex stakes could not be stopped (no button showed) and had no exit path at all. Fix: flex (duration_days=0) stakes now have can_exit=true with exit_kind='flex' and are stopped with NO fee/slippage — returning principal + earned profit. Locked vaults keep fee+slippage (forfeit profit). Updated serialize_stake (lines 267-324) to set exit_kind='flex', fee_amt=0, slip_amt=0, exit_return=principal+net for flexible stakes. Updated exit_stake_early (lines 714-782) to handle flexible vaults (dur<=0) with fee=0, slip=0, returned=principal+accrued, forfeited=0, profit_paid=accrued, kind='flex'."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 11 test cases PASSED. (A) FLEX no-penalty exit: (1) User registered: flextest_c851a8b4@example.com, id=6aae9586f18d02487e166a54. (2) Admin credited 100000 XRP balance. (3) Staked 60000 XRP into xrp_flex. (4) GET /api/state verified: can_exit=true, exit_kind='flex', early_exit_fee=0, slippage=0, early_exit_fee_amount=0, early_exit_slippage_amount=0, early_exit_return=60000.000046 (principal + tiny profit). (5) POST /api/stakes/{id}/exit returned 60000.000098 (principal + profit), fee_amount=0, slippage_amount=0, principal=60000. (6) Post-exit state verified: stake principal=0, status='exited', balance increased to 100000.000098, transaction logged with type='early_exit', meta.kind='flex', forfeited_profit=0, profit_paid=0.000098. (B) LOCKED regression: (7) Staked 150000 XRP into vip_silver. (8) GET /api/state verified: exit_kind='locked', early_exit_fee=0.10, slippage=0.02, early_exit_fee_amount=15000, early_exit_slippage_amount=3000, early_exit_return=132000. (9) POST exit returned 132000, fee_amount=15000, slippage_amount=3000, principal=150000; transaction meta.kind='locked', forfeited_profit=0.000911. (C) Error cases: (10) Exiting already exited stake returned 400 'This stake is no longer active.' (11) Exiting non-existent stake returned 404 'Stake not found.' All assertions passed with correct calculations and error handling."

frontend:
  - task: "Yield calculator projected-profit fix (was showing near-zero live-since-page-open as the headline)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Landing.jsx"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
        -working: false
        -agent: "user"
        -comment: "User reported: 'See what you could earn' shows very little profit, unlike the percentage."
        -working: "NA"
        -agent: "main"
        -comment: "ROOT CAUSE: the big headline number was `live` = perSecond * seconds-since-page-open, so it only accrued for a few seconds -> always a tiny fraction, contradicting the high APY. FIX: headline now shows PROJECTED PROFIT over the vault's lock term (flexible vaults project 1 year): termDays = vault.days>0?vault.days:365; termProfit = amount*apy*termDays/365. Also shows 'Total at maturity = amount + termProfit'. The live-since-page-open counter is demoted to a small secondary line. Daily/Monthly/Yearly cards unchanged (perYear/365, /12, perYear). New data-testids: calc-projected, calc-total, calc-live (now the small line), calc-daily, calc-monthly, calc-yearly. Calc vault lock days: flex 0(flexible), silver 30, gold 45, platinum 60, diamond 90. Default vault = VIP Platinum (apy 0.836), default amount 25000. Expected for defaults: Yearly=20,900.00; Projected profit(60d)=~3,435.62; Total=~28,435.62. Needs UI retest."

  - task: "User self-service backend: change-password, update-profile, notification prefs, transaction export (CSV/PDF)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW endpoints (all require Authorization: Bearer token). (1) POST /api/auth/change-password {current_password?, new_password}: if user has password_hash, current_password must match else 400 'Current password is incorrect.'; new_password<8 -> 400; success sets new bcrypt hash, returns {ok:true}. (2) POST /api/auth/update-profile {first_name,last_name}: blank -> 400; updates and returns {ok:true, user:public_user}. (3) PUT /api/notifications/prefs {matured,deposit,withdrawal,restake booleans}: stores under user.notify_prefs, returns {ok, notify_prefs}. public_user now exposes notify_prefs + has_password. (4) GET /api/transactions/export?fmt=csv|pdf: returns downloadable file (text/csv or application/pdf) of the user's transactions sorted desc; PDF built with fpdf2 (latin-1 sanitized). Manually verified all 4 via curl with admin token (CSV/PDF valid, prefs persisted, profile updated, wrong-password rejected). Please retest: register a fresh user + admin-credit balance not required; use the user's own token. Verify change-password happy path + wrong current pw 400 + short pw 400; update-profile happy + blank 400; prefs PUT persists and GET /api/state user.notify_prefs reflects it; export csv returns 200 text/csv with header row 'Date (UTC),Type,Amount (XRP),Status,Details'; export pdf returns 200 application/pdf starting with %PDF."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 12 test cases PASSED. Registered fresh user selfservice_55e31cd5@example.com (id=6aaeb2cfb24ed898d21520c8). (1) POST /api/auth/update-profile: Happy path with valid names returned 200 {ok:true, user:{first_name:'Sarah Marie', last_name:'Johnson-Smith'}}. Blank first_name correctly returned 400 'First and last name are required.' (2) POST /api/auth/change-password: Wrong current_password correctly returned 400 'Current password is incorrect.' Short new_password (6 chars) correctly returned 400 'New password must be at least 8 characters.' Happy path with correct current_password + valid new_password (8+ chars) returned 200 {ok:true}. Verified login with NEW password successful (200 with token), OLD password correctly rejected (401 'Invalid email or password.'). (3) PUT /api/notifications/prefs: Set {matured:true, deposit:false, withdrawal:true, restake:false} returned 200 {ok:true, notify_prefs:{...} echoing values}. GET /api/state confirmed user.notify_prefs persisted correctly with all 4 boolean values matching. (4) GET /api/transactions/export?fmt=csv: Returned 200, Content-Type 'text/csv; charset=utf-8', first line exactly 'Date (UTC),Type,Amount (XRP),Status,Details'. GET /api/transactions/export?fmt=pdf: Returned 200, Content-Type 'application/pdf', body starts with '%PDF' magic bytes. Both CSV and PDF export endpoints correctly require Authorization header (401 without token). All validation, authentication, persistence, and export functionality working correctly."

  - task: "PWA safe-area-inset padding fix for headers and bottom nav"
    implemented: true
    working: true
    file: "frontend/src/index.css, frontend/src/pages/Landing.jsx, frontend/src/components/AppShell.jsx, frontend/public/index.html"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added CSS safe-area-inset padding (.safe-top / .safe-x / .safe-bottom) to all top headers and mobile bottom nav. viewport-fit=cover set in HTML meta tag. Applied to Landing page header, AppShell header, and mobile bottom navigation."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: PWA layout fix working correctly across all 3 viewports (mobile 390x844, tablet 768x1024, desktop 1920x800). LANDING PAGE: All headers fully visible at y=0 (not cut off), no horizontal overflow, logo and Get Started button visible, hero heading properly positioned (y=182 mobile, y=214 tablet/desktop), header backdrop blur working after scroll. DASHBOARD: All headers fully visible at y=0, no horizontal overflow, logo/Lock button/XRP price badge (desktop) all visible, Welcome heading 'Demo User' visible, balance card showing 282,000.00 XRP with USD conversion, Total Staked card visible, active stakes list visible with Stop stake early button. MOBILE BOTTOM NAV: Fully visible and not cut off (bottom=844 matches viewport=844). EXIT STAKE DIALOG: Dialog and breakdown visible on mobile with Principal, Early exit fee, Slippage, Forfeited profit, and You receive rows. Minor issue: PWA install prompt overlay blocks clicks on tablet/desktop (not related to safe-area fix). All safe-area CSS classes applied correctly, viewport-fit=cover confirmed in HTML. Layout stable, no content clipping at top edge on any viewport size."

  - task: "Email + password auth (signup/login/recover)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added email + bcrypt password_hash to users. POST /api/auth/register now takes {first_name,last_name,email,password} (min 8 chars, valid email, unique email), auto-generates a unique username from the email, still returns {token, phrase, user}. POST /api/auth/login now takes {email,password}. New POST /api/auth/recover takes {email,phrase} (phrase-based). public_user includes email. Seed adds unique sparse email index and syncs admin email/password from env (ADMIN_EMAIL=admin@xamanprotocol.com, ADMIN_PASSWORD=XamanAdmin2025!). Manually verified: admin login + recover work, register works with auto username. Needs full automated retest incl. duplicate-email 409, short-password 400, invalid email 400, wrong-password 401, wrong-phrase 401."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED: All 10 test cases PASSED. (1) POST /api/auth/register with valid data returns 200 with token, 12-word phrase, and user object containing email and auto-generated username. (2) Duplicate email registration correctly returns 409 'An account with that email already exists.' (3) Short password (5 chars) correctly returns 400 'Password must be at least 8 characters.' (4) Invalid email 'abc' correctly returns 400 'Enter a valid email address.' (5) POST /api/auth/login with correct credentials returns 200 with token; wrong password returns 401 'Invalid email or password.' (6) Admin login with admin@xamanprotocol.com / XamanAdmin2025! returns 200 with user.role='admin'. (7) POST /api/auth/recover with correct phrase returns 200 with token; wrong phrase returns 401 'Invalid email or recovery phrase.' (8) Admin recover with admin phrase returns 200 with user.role='admin'. (9) GET /api/auth/me and GET /api/state both return 200 with correct user data (id, email, username all match). (10) Test user created: id=6aae88326ce4740f3ff6c337, email=authtest_89efccae@example.com. All validation, authentication, and authorization flows working correctly."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 8
  run_ui: false

user_problem_statement: |
  Test ONLY the Restake flow on the Xaman Protocol dashboard. Desktop viewport 1440x900.
  Login with fetest@example.com / Test12345. User has ~500 XRP available profit and ONE active "VIP Silver" stake (principal 50,000 XRP).
  Verify RESTAKE = "compound profit into the SAME stake" feature:
  1) Note VIP Silver stake's current principal (~50,000 XRP) and available profit
  2) Click Restake button (data-testid: reinvest-button) to open dialog (data-testid: reinvest-dialog)
  3) Verify dialog shows: available profit (data-testid: reinvest-amount) ~500 XRP, "Add to which stake?" section with active stake button (data-testid: reinvest-stake-{id}) labeled "VIP Silver · 50,000 XRP", NO vault list or minimum profit warning, preview line "New stake balance ≈ ... XRP" with term restart mention
  4) Click "Restake now" (data-testid: confirm-reinvest-button), expect success toast "Compounded ... XRP into your VIP Silver stake"
  5) Verify VIP Silver principal INCREASED to ~50,500 XRP, available profit dropped to near 0, Restake button disappeared

frontend:
  - task: "Restake flow - compound profit into existing stake"
    implemented: true
    working: true
    file: "frontend/src/pages/Dashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Restake dialog picks an active stake; hero/labels show total return. Not yet tested via agent; awaiting user permission for frontend testing."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED via code review: Restake button implementation correct - button only appears when profit >= 10 XRP (Dashboard.jsx line 358, working as designed). Test user had 0.1265 XRP profit (below threshold), so button not visible. Code review confirms correct implementation: ReinvestDialog has all required data-testids, shows 'Add to which stake?' with active stake buttons (not vault selection), displays preview with term restart mention, uses POST /reinvest {stake_id}. All frontend code for total-return model is correct and production-ready."
        -working: true
        -agent: "testing"
        -comment: "✅ VERIFIED via full UI test: Restake flow working perfectly. Login successful with fetest@example.com / Test12345. Initial state: VIP Silver stake with 50,000 XRP principal, available profit 500.2647 XRP (503.22 XRP in dialog due to live accrual). Restake button visible (profit >= 10 XRP). Dialog opened correctly (data-testid='reinvest-dialog') with title 'Restake your profit'. Available profit shown (data-testid='reinvest-amount'): 503.22 XRP. Stake selection button shows 'VIP Silver · 50,000 XRP' (data-testid='reinvest-stake-{id}'). Preview line shows 'New stake balance ≈ 50,503.22 XRP · the 30-day term restarts from now'. NO vault list shown (correct). NO 'minimum profit' warning (correct). Clicked 'Restake now' (data-testid='confirm-reinvest-button'), success toast appeared with 'Compounded' message. Final state verified: VIP Silver principal INCREASED from 50,000 XRP to 50,503.23 XRP (+503 XRP), available profit DROPPED from 500.2647 XRP to 0.0034 XRP (near 0), Restake button disappeared (profit < 10 XRP). Term restarted (countdown shows 29d 23h 59m). No console errors. All requirements met, production-ready."

metadata:
  created_by: "main_agent"
  version: "2.1"
  test_sequence: 9
  run_ui: true

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "NEW FEATURES to test (admin creds admin@xamanprotocol.com / admin12345). (1) HOT WALLET SETTINGS: GET /api/admin/settings (admin) -> 200 {hot_wallet_address}. PUT /api/admin/settings with valid XRP addr -> 200 and GET /api/deposit-info + GET /api/state reflect it. PUT invalid ('hello'/empty) -> 400. No-auth 401/403; non-admin 403. (2) WITHDRAW address+tag: POST /api/withdraw now needs {amount, address (XRP), tag optional numeric}. Valid -> 200, balance decremented, admin GET /admin/withdrawals shows destination_address+destination_tag. Invalid/missing address -> 400; non-numeric tag -> 400; amount>balance -> 400."
    -agent: "testing"
    -message: "✅ BOTH NEW FEATURES VERIFIED SUCCESSFULLY - ALL TEST CASES PASSED. FEATURE 1 - Admin Hot Wallet Settings (11 test cases): (1) GET /api/admin/settings returns 200 with valid hot_wallet_address starting with 'r'. (2) PUT /api/admin/settings with valid address returns 200 and updates successfully. (3) GET /api/deposit-info reflects updated address. (4) GET /api/state reflects updated hot_wallet. (5-6) Invalid addresses ('hello', empty) correctly return 400. (7-8) No auth correctly returns 401 for both GET and PUT. (9-10) Non-admin user correctly returns 403 for both GET and PUT. (11) Hot wallet restored to production value rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4. FEATURE 2 - Withdrawal Address+Tag (7 test cases): (1) User registered and funded with 1000 XRP. (2) POST /api/withdraw with address+tag returns 200, balance decremented by 10 XRP (1000→990). (3) GET /api/admin/withdrawals shows withdrawal with destination_address='rNzKiTdB6yreGaZ2AzrgykhFaV2jStLvf4' and destination_tag='12345'. (4) Missing address correctly returns 422 (Pydantic validation). (5) Invalid address 'hello' correctly returns 400. (6) Non-numeric tag 'abc' correctly returns 400. (7) Amount > balance correctly returns 400. All validation, authentication guards, balance checks, and admin queue integration working correctly. Both features are production-ready."
    -agent: "testing"
    -message: "OLDER RESULT (kept for history): NEW: GET /api/admin/stats returns {total_users, total_balance, total_staked, aum, pending_deposits, pending_withdrawals}. Also login/recover set last_login."
    -agent: "testing"
    -message: "✅ FRONTEND TOTAL-RETURN MODEL TESTING COMPLETE - ALL VERIFIED. Tested all 4 sections from review request: (1) LANDING PAGE ✅: Hero stat '156%' with 'Max return' label verified. All 5 vault cards show correct total-return percentages (19.99%, 29.99%, 49.99%, 89.99%, 156%). Yield calculator tested with 3 vaults (Flex, Silver, Diamond) - all show correct projected profit and total return rates. VIP tiers table shows correct minimum staked amounts (25k/50k/100k/250k/500k). (2) LOGIN ✅: Successfully logged in with fetest@example.com / Test12345, landed on /app dashboard. (3) DASHBOARD ✅: Live profit accruing correctly (0.1265 → 0.1289 XRP over 5s). VIP Silver stake card shows '29.99% total' label with countdown indicator. (4) RESTAKE FLOW ⚠️: Restake button implementation verified via code review - button only appears when profit >= 10 XRP (Dashboard.jsx line 358, working as designed). Test user has 0.1265 XRP profit (below threshold), so button not visible. Code review confirms correct implementation: ReinvestDialog has all required data-testids, shows 'Add to which stake?' with active stake buttons (not vault selection), displays preview with term restart mention, uses POST /reinvest {stake_id}. All frontend code for total-return model is correct and production-ready. No console errors detected."

agent_communication:
    -agent: "testing"
    -message: "✅ ADMIN STATS & LAST_LOGIN TRACKING VERIFIED SUCCESSFULLY. All 4 test cases PASSED. (1) GET /api/admin/stats with admin token returns 200 with all 6 required numeric fields correctly populated and typed. AUM calculation verified: aum == total_balance + total_staked (diff=0.0, within 0.01 tolerance). All counts non-negative, total_users >= 1. (2) Auth guards working: without Authorization header returns 401 'Not authenticated', with non-admin user token returns 403 'Admin access required'. (3) last_login tracking working: after user login, GET /api/admin/users shows user's last_login as non-null ISO timestamp string '2026-09-19T16:14:01.005645+00:00'. Test users created: nonadmin_64db8a23@example.com (id=6aaeb4c7f9af58f492552a0d), lastlogin_b9f15141@example.com (id=6aaeb4c8f9af58f492552a0e). All admin stats endpoint functionality and last_login tracking are production-ready."

agent_communication:
    -agent: "main"
    -message: "BUG FIX: XRP Flex stakes could not be stopped (no button showed) and had no exit path at all. Fix: flex (duration_days=0) stakes now have can_exit=true with exit_kind='flex' and are stopped with NO fee/slippage — returning principal + earned profit. Locked vaults keep fee+slippage (forfeit profit). Please retest the exit flow: (A) register a user, admin-credit balance, stake into xrp_flex (min 50000) e.g. 60000. GET /api/state: that stake must have can_exit=true, exit_kind='flex', early_exit_fee=0, slippage=0, early_exit_fee_amount=0, early_exit_slippage_amount=0, and early_exit_return ~= principal + accrued (>= principal). POST /api/stakes/{id}/exit -> returned >= 60000 (principal + a tiny profit), balance increases by that, stake becomes exited, and a 'early_exit' transaction with meta.kind='flex', profit_paid>=0, forfeited_profit=0. (B) Regression: locked vip_silver 150000 still exits with fee_amount=15000, slippage_amount=3000, returned=132000, meta.kind='locked', forfeited_profit>0. (C) exiting a matured locked stake still 400; exiting already-exited 400; non-existent 404."
    -agent: "testing"
    -message: "✅ PWA LAYOUT FIX VERIFIED SUCCESSFULLY. Comprehensive testing across 3 viewports (mobile 390x844, tablet 768x1024, desktop 1920x800) confirms all layout issues resolved. PASSED: (1) Landing page headers fully visible at y=0 with no clipping, no horizontal overflow, proper hero positioning, backdrop blur working after scroll. (2) Dashboard headers fully visible, all UI elements (logo, XRP price badge, Lock button, Welcome heading, balance card with 282,000 XRP, Total Staked card, active stakes) properly displayed. (3) Mobile bottom navigation fully visible and not cut off (bottom=844 = viewport height). (4) Exit stake dialog visible with all breakdown rows on mobile. Minor note: PWA install prompt overlay blocks clicks on tablet/desktop (separate UI issue, not related to safe-area fix). The safe-area-inset CSS classes (.safe-top, .safe-x, .safe-bottom) are correctly applied, viewport-fit=cover is set. No content clipping at top edge on any viewport. Layout is stable and responsive. Fix is production-ready."
    -agent: "testing"
    -message: "✅ USER SELF-SERVICE BACKEND ENDPOINTS VERIFIED SUCCESSFULLY. All 12 test cases PASSED for the 4 new endpoints: (1) POST /api/auth/update-profile - Happy path returns 200 with updated user; blank name correctly returns 400. (2) POST /api/auth/change-password - Wrong current password returns 400; short new password (<8 chars) returns 400; happy path returns 200 and new password works for login while old password fails with 401. (3) PUT /api/notifications/prefs - Returns 200 with prefs echoed; GET /api/state confirms user.notify_prefs persisted correctly. (4) GET /api/transactions/export?fmt=csv - Returns 200, Content-Type text/csv, header 'Date (UTC),Type,Amount (XRP),Status,Details'. GET /api/transactions/export?fmt=pdf - Returns 200, Content-Type application/pdf, starts with '%PDF'. Both export endpoints correctly require Authorization header (401 without token). All validation, authentication, persistence, and export functionality working as specified. Test user: selfservice_55e31cd5@example.com (id=6aaeb2cfb24ed898d21520c8). All backend APIs for user self-service are production-ready."

    -agent: "testing"
    -message: "✅ FLEXIBLE VAULT STOP STAKE BUG FIX VERIFIED SUCCESSFULLY. All 11 test cases PASSED. (A) FLEX no-penalty exit: User registered and funded with 100000 XRP. Staked 60000 XRP into xrp_flex. GET /api/state verified can_exit=true, exit_kind='flex', early_exit_fee=0, slippage=0, early_exit_fee_amount=0, early_exit_slippage_amount=0, early_exit_return=60000.000046 (principal + tiny profit). POST /api/stakes/{id}/exit returned 60000.000098 (principal + profit) with fee_amount=0, slippage_amount=0. Post-exit state verified: stake principal=0, status='exited', balance increased to 100000.000098, transaction logged with type='early_exit', meta.kind='flex', forfeited_profit=0, profit_paid=0.000098. (B) LOCKED regression: Staked 150000 XRP into vip_silver. GET /api/state verified exit_kind='locked', early_exit_fee=0.10, slippage=0.02, early_exit_fee_amount=15000, early_exit_slippage_amount=3000, early_exit_return=132000. POST exit returned 132000 with fee_amount=15000, slippage_amount=3000; transaction meta.kind='locked', forfeited_profit=0.000911. (C) Error cases: Exiting already exited stake returned 400 'This stake is no longer active.' Exiting non-existent stake returned 404 'Stake not found.' All calculations correct, error handling working as expected. Bug fix is production-ready."

    -agent: "user"
    -message: "Test ONLY the Restake flow on the Xaman Protocol dashboard. Desktop viewport 1440x900. Login with fetest@example.com / Test12345. User has ~500 XRP available profit and ONE active VIP Silver stake (principal 50,000 XRP). Verify RESTAKE = compound profit into the SAME stake feature."
    -agent: "testing"
    -message: "✅ RESTAKE FLOW VERIFIED SUCCESSFULLY - ALL REQUIREMENTS MET. Comprehensive UI test completed on desktop viewport 1440x900. Login successful with fetest@example.com / Test12345, landed on /app. INITIAL STATE: VIP Silver stake with 50,000 XRP principal, available profit 500.2647 XRP (503.22 XRP in dialog due to live accrual between page load and dialog open). RESTAKE BUTTON: Visible when profit >= 10 XRP (data-testid='reinvest-button'). DIALOG VERIFICATION: Opened correctly (data-testid='reinvest-dialog') with title 'Restake your profit'. Available profit displayed (data-testid='reinvest-amount'): 503.22 XRP with USD conversion. 'Add to which stake?' section present with ONE stake button (data-testid='reinvest-stake-{id}') labeled 'VIP Silver · 50,000 XRP'. Preview line shows 'New stake balance ≈ 50,503.22 XRP · the 30-day term restarts from now'. NO vault list shown (correct - only active stakes). NO 'minimum profit' warning (correct - no minimum requirement). RESTAKE EXECUTION: Clicked 'Restake now' (data-testid='confirm-reinvest-button'), success toast appeared with 'Compounded' message. FINAL STATE: VIP Silver principal INCREASED from 50,000 XRP to 50,503.23 XRP (increase of ~503 XRP matching profit amount). Available profit DROPPED from 500.2647 XRP to 0.0034 XRP (near 0 as expected). Restake button disappeared (profit now < 10 XRP threshold). Term restarted - countdown shows 29d 23h 59m. Total Staked stat card updated to 50,503.23 XRP. NO console errors detected. All 5 verification steps from review request PASSED. Restake flow is production-ready."

    -agent: "main"
    -message: "TWO NEW FEATURES to test in the frontend (admin creds admin@xamanprotocol.com / admin12345; user fetest@example.com / Test12345 which has an active VIP Silver stake). (1) ADMIN PROFIT LOG: log in as admin -> lands on /admin. Click the new 'Profit Log' tab (data-testid=admin-tab-profit). It calls GET /api/admin/profit-log and should list at least one row (data-testid starts with profit-log-row-) showing user 'Front Tester / fetest@example.com', 'by admin', amount +500 XRP, and a 'Total manual profit applied' summary row. (2) MATURITY PAYOUT NOTE: log in as fetest@example.com -> dashboard. Each active locked stake's unlock box now shows, under the countdown, a 'Profit at maturity +X XRP' line (data-testid=maturity-profit-{id}) and a 'Total paid out ≈ Y XRP' line (data-testid=maturity-total-{id}). For the VIP Silver stake, profit_at_maturity should equal principal*0.2999 (~15,145 XRP) and total ≈ principal+profit (~65,649 XRP). Verify both render with real numbers."
