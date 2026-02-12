const store = global.controlRequestStore || new Map();
global.controlRequestStore = store;

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function getBaseUrl(req) {
  const host = req.headers.host || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return `${proto}://${host}`;
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { ip, requestedAction = 'Managed support session' } = req.body || {};
    if (!ip) {
      res.status(400).json({ error: 'IP is required' });
      return;
    }

    const id = randomId();
    const now = new Date().toISOString();
    store.set(id, { id, ip, requestedAction, status: 'pending', createdAt: now, decidedAt: null });

    const acceptUrl = `${getBaseUrl(req)}/control/${id}`;
    res.status(201).json({ id, status: 'pending', acceptUrl });
    return;
  }

  if (req.method === 'GET') {
    const id = req.query.id;
    const record = store.get(id);
    if (!record) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.status(200).json(record);
    return;
  }

  if (req.method === 'PATCH') {
    const { id, decision } = req.body || {};
    const record = store.get(id);
    if (!record) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (!['accepted', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'Decision must be accepted or rejected' });
      return;
    }

    const updated = {
      ...record,
      status: decision,
      decidedAt: new Date().toISOString(),
      consentToken: decision === 'accepted' ? `consent-${randomId()}` : null,
    };

    store.set(id, updated);
    res.status(200).json(updated);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
