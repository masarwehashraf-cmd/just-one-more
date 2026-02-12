# just-one-more

Simple Next.js app for **authorized local network device discovery**.

## What it does

- Detects local private IPv4 on the server (`/api/network`) and auto-fills subnet for scanning
- Scans host ranges and lists responsive devices (including likely iPhone/iPad hints when port `62078` is visible)
- Shows quick management links for approved admin use (`http://`, `https://`, `ssh://`)
- Lets you send a **consent request** per device and track accepted/rejected status

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
