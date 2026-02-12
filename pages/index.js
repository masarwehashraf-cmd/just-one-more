import { useEffect, useState } from 'react';

export default function Home() {
  const [subnet, setSubnet] = useState('192.168.1.0');
  const [fromHost, setFromHost] = useState(1);
  const [toHost, setToHost] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [detectedIp, setDetectedIp] = useState('');


  useEffect(() => {
    async function loadNetworkInfo() {
      try {
        const response = await fetch('/api/network');
        const data = await response.json();
        if (response.ok && data?.primary?.subnet) {
          setSubnet(data.primary.subnet);
          setDetectedIp(data.primary.ip);
        }
      } catch (_error) {
        // Silent fallback to manual subnet entry.
      }
    }

    loadNetworkInfo();
  }, []);

  async function runScan(useCurrentConnection = false) {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, fromHost, toHost, useCurrentConnection }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setSubnet(data.subnetUsed);
      setResult(data);
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Wi-Fi Device Scanner (Authorized Use)</h1>
      <p className="subheading">
        Scan your current network to discover active devices. This tool is for inventory and approved
        administration only.
      </p>
      {detectedIp && <p className="detected">Detected local IP: {detectedIp}</p>}

      <section className="panel">
        <div className="button-row">
          <button type="button" onClick={() => runScan(true)} disabled={loading}>
            {loading ? 'Scanning...' : 'Auto Detect Wi-Fi Subnet + Scan'}
          </button>
        </div>

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

        <button type="button" onClick={() => runScan(false)} disabled={loading}>
          {loading ? 'Scanning...' : 'Scan Using Manual Subnet'}
        </button>
      </section>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="panel left">
          <p className="warning">{result.warning}</p>
          <p>
            Subnet used: <strong>{result.subnetUsed}</strong>
          </p>
          <p>Hosts scanned: {result.scanned}</p>

          {result.detected.length === 0 ? (
            <p>No responsive devices found in this range.</p>
          ) : (
            <ul>
              {result.detected.map((device) => (
                <li key={device.ip}>
                  <strong>{device.ip}</strong> — open ports: {device.openPorts.join(', ')} —{' '}
                  {device.suggestedType}
                  <div className="safe-actions">Allowed actions: {device.safeActions.join(' • ')}</div>
                  {device.managementLinks?.length > 0 && (
                    <div className="safe-actions">
                      Quick links:{' '}
                      {device.managementLinks.map((link) => (
                        <a key={link} href={link} target="_blank" rel="noreferrer">
                          {link}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="notice">{result.controlNotice}</p>
        </section>
      )}

      <section className="panel left">
        <h2>About shutdown / screen mirroring</h2>
        <p>
          If you own/manage the devices, use the official method: Apple MDM, Android Enterprise,
          Windows Intune, Linux SSH/Ansible, or vendor smart-device apps with signed-in accounts.
        </p>
      </section>
    </main>
  );
}
