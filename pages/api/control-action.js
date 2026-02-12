const requestStore = global.controlRequestStore || new Map();
global.controlRequestStore = requestStore;

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { requestId, action } = req.body || {};
  const request = requestStore.get(requestId);

  if (!request) {
    res.status(404).json({ error: 'Consent request not found' });
    return;
  }

  if (request.status !== 'accepted') {
    res.status(403).json({ error: 'Device owner has not accepted this request yet' });
    return;
  }

  const allowedActions = ['request-screen-share', 'request-restart', 'request-shutdown'];
  if (!allowedActions.includes(action)) {
    res.status(400).json({ error: 'Unsupported action' });
    return;
  }

  const updated = {
    ...request,
    lastAction: {
      action,
      at: new Date().toISOString(),
      status: 'queued-for-owner-approved-management',
    },
  };

  requestStore.set(requestId, updated);
  res.status(200).json({
    ok: true,
    ip: request.ip,
    action,
    status: updated.lastAction.status,
    message:
      'Action request queued. Execute via official management tooling (MDM/EMM/SSH/vendor admin) using the accepted consent context.',
  });
}
