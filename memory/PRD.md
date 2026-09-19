# XamanProtocol — PRD

## Product
Installable React/FastAPI/MongoDB PWA for private, invite-only, non-custodial VIP XRP staking.
Xaman-inspired light UI (white bg, near-black text, blue-primary + black-alternate CTA mix).

## Core requirements
- Phrase-based wallet creation/recovery, local PIN unlock, AES-256 on-device phrase encryption
- Live staking dashboard, deposits (QR + destination tag), withdrawals, VIP vaults, admin controls
- Real-time enforcement via WebSockets, browser notifications
- Landing page, whitepaper (PDF + /whitepaper page), Smartsupp live chat, PWA install

## Integrations
- MongoDB (MONGO_URL / DB_NAME) — source of truth
- Smartsupp live chat (public/index.html, lib/support.js)
- Browser Notifications API (lib/notify.js)
- qrcode.react for deposit QR
- FastAPI WebSockets for live updates

## Implemented (log)
- Full app: auth, dashboard, vaults, deposit/withdraw, history, admin, PWA, whitepaper
- Compare Vaults dialog + Restake (compound profit into fresh stake) — /api/reinvest endpoint (internal type "reinvest")
- 2026-06: Landing hero mockup redesigned to Mac (dashboard) + slim phone cluster; renamed user-facing "Reinvest" → "Restake" (button, dialog, confirm, toast, history label). Backend transaction type kept as "reinvest" internally.
- 2026-09: Recovered env after reset (repointed to Atlas). Made landing hero SlimPhone photorealistic — titanium frame, side buttons, Dynamic Island, status bar (time/signal/wifi/battery), glossy reflection, home indicator.

## Backlog / pending
- P1: Replace placeholder /app/frontend/public/whitepaper.pdf with user's real PDF when supplied
- P2: Optional full code-review remediation (React hook deps, localStorage→cookie, complexity)
- P2: Validate PWA install + browser notification delivery on real device

## Constraints
- Backend routes prefixed /api; frontend uses REACT_APP_BACKEND_URL; supervisor-managed; yarn only.
