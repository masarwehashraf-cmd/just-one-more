import { useMemo, useState } from 'react';

const defaultSubnet = '192.168.1';

export default function Home() {
  const [subnet, setSubnet] = useState(defaultSubnet);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(25);
  const [port, setPort] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [actionLog, setActionLog] = useState('No actions yet.');

  const canScan = useMemo(() => {
    const validSubnet = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnet.trim());
    const validRange = Number(start) >= 1 && Number(end) <= 254 && Number(start) <= Number(end);
    return validSubnet && validRange;
  }, [subnet, start, end]);

  async function runScan() {
    if (!canScan) {
      setError('Please provide a valid subnet and host range.');
      return;
    }

    setIsLoading(true);
    setError('');
    setDevices([]);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, start: Number(start), end: Number(end), port: Number(port) }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Scan failed.');
      }

      setDevices(payload.devices);
      if (!payload.devices.length) {
        setActionLog('Scan complete. No responsive hosts found in this range.');
      }
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(deviceIp, action) {
    try {
      const response = await fetch('/api/device-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: deviceIp, action }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Action failed.');
      }
      setActionLog(`[${new Date().toLocaleTimeString()}] ${payload.message}`);
    } catch (actionError) {
      setActionLog(`[${new Date().toLocaleTimeString()}] ${actionError.message}`);
    }
  }

  return (
    <main className="container">
      <h1>Device Discovery Console</h1>
      <p className="intro">
        Scan your own local network for reachable devices and run safe diagnostics. This app intentionally blocks
        harmful remote-control actions such as unauthorized phone shutdown.
      </p>

      <section className="panel">
        <div className="controls-grid">
          <label>
            Subnet (first 3 octets)
            <input value={subnet} onChange={(event) => setSubnet(event.target.value)} placeholder="192.168.1" />
          </label>

          <label>
            Start host
            <input type="number" min="1" max="254" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>

          <label>
            End host
            <input type="number" min="1" max="254" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>

          <label>
            Probe port
            <input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} />
          </label>
        </div>

        <button className="primary" onClick={runScan} disabled={!canScan || isLoading}>
          {isLoading ? 'Scanning…' : 'Scan network'}
        </button>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Discovered Devices ({devices.length})</h2>
        {!devices.length ? (
          <p className="muted">Run a scan to list responsive hosts.</p>
        ) : (
          <ul className="device-list">
            {devices.map((device) => (
              <li key={device.ip} className="device-card">
                <div>
                  <strong>{device.ip}</strong>
                  <p className="muted">
                    Status: {device.reachable ? 'Reachable' : 'No response'} • Port {device.port}: {device.portOpen ? 'Open' : 'Closed/filtered'}
                  </p>
                </div>

                <div className="actions">
                  <button onClick={() => runAction(device.ip, 'ping')}>Ping</button>
                  <button onClick={() => runAction(device.ip, 'probe')}>Probe port</button>
                  <button className="blocked" onClick={() => runAction(device.ip, 'shutdown')}>
                    Shutdown (blocked)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel log-panel">
        <h2>Action log</h2>
        <pre>{actionLog}</pre>
      </section>
    </main>
  );
}
