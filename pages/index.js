import { useState } from 'react';

export default function Home() {
  const [subnet, setSubnet] = useState('192.168.1.0');
  const [fromHost, setFromHost] = useState(1);
  const [toHost, setToHost] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function runScan() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, fromHost, toHost }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setResult(data);
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Authorized Device Scanner</h1>
      <p className="subheading">
        This app helps you inventory devices on your own network. It does <strong>not</strong> provide
        unauthorized shutdown or control features.
      </p>

      <section className="panel">
        <label>
          Subnet (example: 192.168.1.0)
          <input value={subnet} onChange={(event) => setSubnet(event.target.value)} />
        </label>

        <div className="range-row">
          <label>
            From host
            <input
              type="number"
              min="1"
              max="254"
              value={fromHost}
              onChange={(event) => setFromHost(event.target.value)}
            />
          </label>
          <label>
            To host
            <input
              type="number"
              min="1"
              max="254"
              value={toHost}
              onChange={(event) => setToHost(event.target.value)}
            />
          </label>
        </div>

        <button type="button" onClick={runScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Devices'}
        </button>
      </section>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="panel left">
          <p className="warning">{result.warning}</p>
          <p>Hosts scanned: {result.scanned}</p>

          {result.detected.length === 0 ? (
            <p>No responsive devices found in this range.</p>
          ) : (
            <ul>
              {result.detected.map((device) => (
                <li key={device.ip}>
                  <strong>{device.ip}</strong> — open ports: {device.openPorts.join(', ')} —{' '}
                  {device.suggestedType}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="panel left">
        <h2>About remote actions</h2>
        <p>
          For shutdown/restart actions, use official management systems with explicit consent (MDM,
          enterprise endpoint management, or your own authenticated API).
        </p>
      </section>
    </main>
  );
}
