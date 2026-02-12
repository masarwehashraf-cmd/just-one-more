# just-one-more

Simple Next.js app for **authorized local network device discovery**.

## What it does

- Auto-detects subnet from the current connection (when available) and scans a host range
- Allows manual subnet entry if automatic detection is unavailable
- Checks common ports (`22`, `80`, `443`, `8080`)
- Shows responsive hosts, guessed device type, and approved management action suggestions

## What it does not do

- No unauthorized remote control
- No exploit behavior
- No direct "shutdown any phone" or stealth screen-mirroring functionality

For power actions (shutdown/restart) or mirroring, use official signed-in management systems with explicit user/owner consent.

## Run

```bash
npm run dev
```
