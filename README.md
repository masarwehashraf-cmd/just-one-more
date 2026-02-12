# just-one-more

Simple Next.js app for **authorized local network device discovery**.

## What it does

- Scans a subnet range (example `192.168.1.1` to `192.168.1.20`)
- Checks a few common ports (`22`, `80`, `443`, `8080`)
- Shows responsive hosts and a simple guessed device type

## What it does not do

- No unauthorized remote control
- No exploit behavior
- No "shutdown any phone" functionality

For shutdown/restart workflows, use official endpoint-management solutions with explicit permission.

## Run

```bash
npm run dev
```
