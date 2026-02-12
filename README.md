# just-one-more

Simple Next.js app for **authorized local network device discovery**.

## What it does

- Detects local private IPv4 on the server (`/api/network`) and auto-fills subnet for scanning
- Scans a host range on that subnet (manual subnet still supported)
- Checks common ports (`22`, `80`, `443`, `8080`)
- Shows responsive hosts, guessed device type, and approved management actions
- Provides quick links for authorized management endpoints (`http://`, `https://`, `ssh://`)

## What it does not do

- No unauthorized remote control
- No exploit behavior
- No direct "control someone else" features

For shutdown/restart or mirroring, use official signed-in management systems with owner/admin consent (MDM/EMM, vendor admin apps, authenticated SSH/APIs).

## Run

```bash
npm run dev
```
