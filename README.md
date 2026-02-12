# just-one-more

Simple Next.js app for **authorized local network device discovery**.

## What it does

- Detects local private IPv4 on the server (`/api/network`) and auto-fills subnet for scanning
- Scans host ranges and combines 3 discovery signals:
  - common TCP ports (`22`, `80`, `443`, `8080`, `62078`)
  - ICMP ping response
  - ARP cache hints
- Lists responsive devices, including likely iPhone/iPad hinting (`62078`) and ping-only clients
- Shows quick management links for approved admin use (`http://`, `https://`, `ssh://`)
- Lets you send a **consent request** per device and track accepted/rejected status

## Why devices may be missed

- Some phones block ping while sleeping / low power mode.
- Guest Wi-Fi and AP isolation can hide peers.
- Firewalls can block ping/ports.
- Run the app on a machine connected to the same LAN/VLAN as target devices.

## Consent-based control flow

1. Scan your subnet.
2. Click **Send Consent Request** for a device.
3. Share the generated **accept page** with that device owner.
4. Owner chooses Accept/Reject.
5. If accepted, a consent token is issued for follow-up managed workflows.

## What it does not do

- No unauthorized remote control
- No exploit behavior
- No stealth takeover of someone else’s phone/computer

Use official platforms (Apple MDM, Android Enterprise, Intune, SSH with credentials, vendor apps) after explicit owner/admin approval.

## Run

```bash
npm run dev
```
