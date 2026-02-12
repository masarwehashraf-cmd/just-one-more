# Device Discovery Console

A Next.js app that scans a local subnet for reachable devices and supports safe diagnostics.

## Features
- Scan a host range in your local subnet using a TCP probe.
- List responsive devices and basic reachability state.
- Run safe actions (`ping`-style probe and HTTPS port probe).
- Explicitly blocks harmful remote-control actions such as unauthorized shutdown.

## Run
```bash
npm run dev
```

Then open http://localhost:3000
