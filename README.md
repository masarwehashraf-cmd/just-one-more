# just-one-more

Automatic local-network scanner for **authorized** device inventory and consent-based management.

## What it does

- Auto-detects local subnet and scans the full `/24` range (`.1` to `.254`) by default
- Combines discovery methods for better coverage:
  - TCP common ports (`22`, `80`, `443`, `8080`, `62078`)
  - ICMP ping
  - ARP cache hints
- Lists likely computers/phones and discovery source (`port`, `port+ping`, `ping-or-arp`)
- Supports consent requests per device and exposes control-request buttons only after acceptance
- Provides action request buttons (screen share / restart / shutdown) in an approved workflow

## Important safety

- No unauthorized control of other people's devices.
- Device owner must accept before control requests are enabled.
- Execute real actions through official tooling (MDM/EMM/vendor admin/SSH with credentials).

## Run

```bash
npm run dev
```
