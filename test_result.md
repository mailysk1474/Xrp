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
  Increase the vault minimum-stake ladder (Flex 50k / Silver 150k / Gold 350k / Platinum 750k / Diamond 2M XRP)
  and display real USD values next to XRP amounts across the app using a live XRP->USD price.

backend:
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

frontend:
  - task: "USD values shown next to XRP across app"
    implemented: true
    working: "NA"
    file: "frontend/src/context/PriceContext.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added PriceProvider (polls /api/price/xrp every 60s) + fmtUSD/xrpToUsdLabel helpers. USD secondary lines added to VaultsPage, Dashboard, Deposit, Withdraw, History, and a live XRP price badge in AppShell header. Not yet UI-tested."
  - task: "Stop stake early UI + admin vault terms"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Dashboard.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Dashboard: 'Stop stake early' button on locked/unmatured stakes -> ExitStakeDialog showing principal, fee, slippage, forfeited profit, net received (with USD). History: 'Early exit' txn type. Admin: new Vaults tab to edit each vault's early exit fee % and slippage %. Not yet UI-tested."

metadata:
  created_by: "main_agent"
  version: "1.3"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Please test the NEW early-exit backend flow only. Admin creds in /app/memory/test_credentials.md (username admin, phrase 'legal winner thank year wave sausage worth useful legal winner thank yellow'). Steps: (1) create/register a normal test user via POST /api/auth/register (returns token+phrase). (2) As admin, credit that user's balance via POST /api/admin/users/{user_id}/adjust-balance (find user_id via GET /api/admin/users). (3) As the user, stake into a LOCKED vault e.g. vip_silver amount 150000 via POST /api/stakes. (4) GET /api/state and confirm the stake has can_exit=true, early_exit_fee=0.10, slippage=0.02, early_exit_fee_amount=15000, early_exit_slippage_amount=3000, early_exit_return=132000. (5) POST /api/stakes/{stake_id}/exit and confirm response returned=132000, fee_amount=15000, slippage_amount=3000; then GET /api/state shows the stake gone from active (principal 0/status exited), balance increased by 132000, and a 'early_exit' transaction in GET /api/transactions. (6) Confirm exiting a FLEX (unlocked) stake or an already-exited stake returns 400. Also verify admin PUT /api/admin/vaults/vip_silver with {early_exit_fee:0.15, slippage:0.03} persists and changes the quoted amounts (then set it back to 0.10/0.02)."
    -agent: "testing"
    -message: "✅ Backend testing complete. All 3 tests PASSED: (1) GET /api/price/xrp returns positive USD value (1.4299), correct source (coinbase), and caching works correctly. (2) GET /api/vaults returns all 5 vaults with exact min_amount values matching new ladder. (3) POST /api/stakes correctly validates min-amount and returns 400 'Minimum for this vault is 150000 XRP.' before balance check. Both backend tasks marked as working=true. No issues found."
    -agent: "testing"
    -message: "✅ Early-exit backend flow testing complete. ALL 8 TEST STEPS PASSED with no issues. Comprehensive testing covered: user registration, admin balance credit, locked vault staking, early-exit field calculations, exit execution, post-exit state verification, transaction logging, negative test cases (re-exit, flex vault exit, non-existent stake), and admin vault terms updates. All calculations are mathematically correct (150000 principal → 15000 fee + 3000 slippage = 132000 returned). Error handling works correctly for all edge cases. The early-exit feature is fully functional and ready for production use."
