from fpdf import FPDF

BLUE = (37, 99, 235)
DARK = (15, 23, 42)
GRAY = (100, 116, 139)

SECTIONS = [
    ("1. Abstract", "XamanProtocol is a private, invite-only VIP staking platform built for XRP holders who demand a security-first, non-custodial experience. Members generate a self-custodied wallet, stake into curated vaults, and earn continuously accruing yield - all from an installable, app-like interface."),
    ("2. Custody Model", "Each member's identity is a self-generated 12-word recovery phrase, encrypted on-device behind a PIN. The phrase never leaves the device unencrypted. Staking balances and accrued profit are platform-managed, off-chain figures confirmed by the protocol treasury. This hybrid model combines the sovereignty of self-custody with the flexibility of a managed yield desk."),
    ("3. Authentication", "There are no emails or passwords. Registration requires a first name, last name, and a unique username. On creation, a fresh wallet phrase is revealed once - the member must save it. Daily access uses a PIN or device biometric; recovery on any device uses the 12-word phrase. If the phrase is lost, the account cannot be recovered."),
    ("4. Yield and Accrual", "Each vault carries a fixed APY. Profit accrues continuously, computed per second against staked principal, and is displayed live on the member dashboard. Fixed-term vaults mature at their stated duration, after which principal and yield are withdrawable. An automated server engine advances accrual; the protocol may also apply manual yield adjustments."),
    ("5. Deposits and Withdrawals", "Deposits are made in XRP to a hot-wallet address paired with a member-unique destination tag, and are credited after administrative confirmation. Withdrawals are requested in-app and settled through manual approval to protect against fraud and ensure treasury integrity."),
    ("6. Security and Enforcement", "The database is the single source of truth. All account state is rendered live and enforced server-side - locked or restricted accounts are rejected immediately. Sensitive endpoints are never cached, and administrative changes propagate in real time."),
    ("7. Roadmap (Phase 2)", "Future releases introduce the YIELD token, on-platform governance, the Apex Cohort program (212 seats scored by a composite metric), and advanced portfolio analytics."),
]

VAULTS = [
    ("XRP Flex", "5.2%", "Flexible", "All members"),
    ("VIP Silver", "19.2%", "30 days", "Silver+"),
    ("VIP Gold", "38.4%", "45 days", "Gold+"),
    ("VIP Platinum", "83.6%", "60 days", "Platinum+"),
    ("VIP Diamond", "156%", "90 days", "Diamond"),
]

pdf = FPDF(format="A4")
pdf.set_margins(16, 16, 16)
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()
epw = pdf.epw

# Header band
pdf.set_fill_color(*DARK)
pdf.rect(0, 0, 210, 40, style="F")
pdf.set_xy(16, 11)
pdf.set_text_color(255, 255, 255)
pdf.set_font("Helvetica", "B", 22)
pdf.cell(0, 10, "XamanProtocol")
pdf.set_xy(16, 23)
pdf.set_text_color(120, 170, 255)
pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Protocol Whitepaper - v1.0")

pdf.set_xy(16, 50)
pdf.set_text_color(*DARK)
pdf.set_font("Helvetica", "B", 15)
pdf.multi_cell(epw, 9, "A non-custodial VIP staking protocol for XRP")
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(*GRAY)
pdf.multi_cell(epw, 6, "Engineered for security, transparency, and live yield. XamanProtocol is a private, invite-only platform. This document is illustrative and does not constitute financial advice.")
pdf.ln(4)

# Vault schedule table
pdf.set_text_color(*DARK)
pdf.set_font("Helvetica", "B", 13)
pdf.multi_cell(epw, 9, "Vault Schedule")
w = [50, 32, 40, epw - 122]
pdf.set_font("Helvetica", "B", 10)
pdf.set_fill_color(240, 244, 250)
heads = ["Vault", "APY", "Term", "Tier"]
for i, h in enumerate(heads):
    pdf.cell(w[i], 8, h, fill=True)
pdf.ln(8)
pdf.set_font("Helvetica", "", 10)
for name, apy, term, tier in VAULTS:
    pdf.set_text_color(*DARK)
    pdf.cell(w[0], 8, name)
    pdf.set_text_color(*BLUE)
    pdf.cell(w[1], 8, apy)
    pdf.set_text_color(*DARK)
    pdf.cell(w[2], 8, term)
    pdf.cell(w[3], 8, tier)
    pdf.ln(8)
pdf.ln(4)

for title, body in SECTIONS:
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(epw, 8, title)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(epw, 6, body)
    pdf.ln(3)

pdf.output("/app/frontend/public/whitepaper.pdf")
print("whitepaper.pdf written")
