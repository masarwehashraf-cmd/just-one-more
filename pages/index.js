import { useEffect, useState } from 'react';

export default function Home() {
  const [subnet, setSubnet] = useState('192.168.1.0');
  const [fromHost, setFromHost] = useState(1);
  const [toHost, setToHost] = useState(254);
  const [autoFullRange, setAutoFullRange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [detectedIp, setDetectedIp] = useState('');
  const [requestStatus, setRequestStatus] = useState({});
  const [actionFeedback, setActionFeedback] = useState({});

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
        // fallback
      }
    }

    loadNetworkInfo();
  }, []);

  async function runScan() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet, fromHost, toHost, autoFullRange, useCurrentConnection: true }),
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
          consentToken: null,
        },
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function refreshRequest(ip) {
    const request = requestStatus[ip];
    if (!request?.id) return;

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

  async function runControlAction(ip, action) {
    const request = requestStatus[ip];
    if (!request?.id) {
      setError('Send a consent request first.');
      return;
    }

    try {
      const response = await fetch('/api/control-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setActionFeedback((current) => ({
        ...current,
        [ip]: `${action}: ${data.status}`,
      }));
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  return (
    <main className="container">
      <h1>Automatic LAN Scanner + Consent Control</h1>
      <p className="subheading">
        Automatic subnet detection, automatic full-range scan, and consent-based management actions.
      </p>
      {detectedIp && <p className="detected">Detected local IP: {detectedIp}</p>}

      <section className="panel">
        <label>
          Subnet (auto-filled)
          <input value={subnet} onChange={(event) => setSubnet(event.target.value)} />
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={autoFullRange}
            onChange={(event) => setAutoFullRange(event.target.checked)}
          />
          Auto scan all hosts (.1 → .254)
        </label>

        {!autoFullRange && (
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
        )}

        <button type="button" onClick={runScan} disabled={loading}>
          {loading ? 'Scanning all devices...' : 'Run Automatic Scan'}
        </button>
      </section>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="panel left">
          <p className="warning">{result.warning}</p>
          <p>
            Subnet used: <strong>{result.subnetUsed}</strong>
          </p>
          <p>
            Devices found: <strong>{result.detected.length}</strong> / Hosts scanned: {result.scanned}
          </p>
          {result.diagnostics && (
            <p className="detected">
              Diagnostics → Ping: {result.diagnostics.pingDetected}, Port: {result.diagnostics.portDetected},
              ARP: {result.diagnostics.arpCandidatesInRange}
            </p>
          )}

          {result.detected.length === 0 ? (
            <p>No devices detected. Ensure same LAN/VLAN and disable client isolation on Wi-Fi.</p>
          ) : (
            <ul>
              {result.detected.map((device) => {
                const req = requestStatus[device.ip];
                const accepted = req?.status === 'accepted';

                return (
                  <li key={device.ip}>
                    <strong>{device.ip}</strong> — {device.suggestedType} — source: {device.discoverySource}
                    <div className="safe-actions">
                      Ports: {device.openPorts.length > 0 ? device.openPorts.join(', ') : 'none'}
                    </div>
                    <div className="safe-actions">Allowed actions: {device.safeActions.join(' • ')}</div>

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
                        Status: <strong>{req.status}</strong>
                        <a href={req.acceptUrl} target="_blank" rel="noreferrer">
                          Open Accept Page
                        </a>
                        {req.consentToken && <span>Token: {req.consentToken}</span>}
                      </div>
                    )}

                    {accepted && (
                      <div className="action-row">
                        <button type="button" onClick={() => runControlAction(device.ip, 'request-screen-share')}>
                          Request Screen Share
                        </button>
                        <button type="button" onClick={() => runControlAction(device.ip, 'request-restart')}>
                          Request Restart
                        </button>
                        <button type="button" onClick={() => runControlAction(device.ip, 'request-shutdown')}>
                          Request Shutdown
                        </button>
                      </div>
                    )}

                    {actionFeedback[device.ip] && (
                      <div className="safe-actions">Action status: {actionFeedback[device.ip]}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <p className="notice">{result.controlNotice}</p>
        </section>
      )}
    </main>
  );
}
