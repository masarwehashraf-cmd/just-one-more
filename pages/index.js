import { useEffect, useState } from 'react';

export default function Home() {
  const [subnet, setSubnet] = useState('192.168.1.0');
  const [fromHost, setFromHost] = useState(1);
  const [toHost, setToHost] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [detectedIp, setDetectedIp] = useState('');
  const [requestStatus, setRequestStatus] = useState({});

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

  async function sendControlRequest(device) {
    try {
      const response = await fetch('/api/control-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: device.ip,
          requestedAction: `Managed assistance for ${device.suggestedType}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create request');
      }

      setRequestStatus((current) => ({
        ...current,
        [device.ip]: {
          id: data.id,
          status: data.status,
          acceptUrl: data.acceptUrl,
        },
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function refreshRequest(ip) {
    const request = requestStatus[ip];
    if (!request?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/control-request?id=${request.id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to refresh request');
      }

      setRequestStatus((current) => ({
        ...current,
        [ip]: {
          ...current[ip],
          status: data.status,
          consentToken: data.consentToken,
        },
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="container">
      <h1>Wi-Fi Device Scanner (Authorized Use)</h1>
      <p className="subheading">
        Scan your current network, discover computers/phones, then request consent before any managed
        support action.
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
          {result.diagnostics && (
            <p className="detected">
              Diagnostics → Ping found: {result.diagnostics.pingDetected}, Port found:{' '}
              {result.diagnostics.portDetected}, ARP hints: {result.diagnostics.arpCandidatesInRange}
            </p>
          )}

          {result.detected.length === 0 ? (
            <p>No responsive devices found in this range.</p>
          ) : (
            <ul>
              {result.detected.map((device) => {
                const req = requestStatus[device.ip];
                return (
                  <li key={device.ip}>
                    <strong>{device.ip}</strong> —{' '}
                    {device.openPorts.length > 0
                      ? `open ports: ${device.openPorts.join(', ')}`
                      : 'no common ports open'}{' '}
                    — {device.suggestedType}
                    <div className="safe-actions">Allowed actions: {device.safeActions.join(' • ')}</div>
                    <div className="safe-actions">Discovery source: {device.discoverySource}</div>
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

                    <div className="action-row">
                      <button type="button" onClick={() => sendControlRequest(device)}>
                        Send Consent Request
                      </button>
                      {req?.id && (
                        <button type="button" onClick={() => refreshRequest(device.ip)}>
                          Refresh Status
                        </button>
                      )}
                    </div>

                    {req?.id && (
                      <div className="safe-actions">
                        Request status: <strong>{req.status}</strong>
                        <a href={req.acceptUrl} target="_blank" rel="noreferrer">
                          Open Accept Page
                        </a>
                        {req.consentToken && <span>Consent token: {req.consentToken}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="notice">{result.controlNotice}</p>
        </section>
      )}

      <section className="panel left">
        <h2>Important</h2>
        <p>
          This is consent-first workflow only. You can only proceed after the device owner accepts.
          For iPhone management, use Apple-approved MDM/Configurator flows.
        </p>
      </section>
    </main>
  );
}
