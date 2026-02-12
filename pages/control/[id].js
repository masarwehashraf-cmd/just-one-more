import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ControlConsentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  async function loadRequest() {
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/control-request?id=${id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load request');
      }
      setRequest(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadRequest();
  }, [id]);

  async function decide(decision) {
    try {
      const response = await fetch('/api/control-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update request');
      }
      setRequest(data);
    } catch (decisionError) {
      setError(decisionError.message);
    }
  }

  return (
    <main className="container">
      <h1>Access Request Consent</h1>
      {error && <p className="error">{error}</p>}

      {request ? (
        <section className="panel left">
          <p>
            Device IP: <strong>{request.ip}</strong>
          </p>
          <p>
            Requested action: <strong>{request.requestedAction}</strong>
          </p>
          <p>
            Status: <strong>{request.status}</strong>
          </p>

          {request.status === 'pending' && (
            <div className="button-row">
              <button type="button" onClick={() => decide('accepted')}>Accept</button>
              <button type="button" onClick={() => decide('rejected')}>Reject</button>
            </div>
          )}

          {request.status === 'accepted' && (
            <p className="notice">
              Consent granted. Share this token only with trusted admin: {request.consentToken}
            </p>
          )}
        </section>
      ) : (
        <p>Loading request...</p>
      )}
    </main>
  );
}
