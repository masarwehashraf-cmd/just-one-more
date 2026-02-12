import net from 'node:net';

function isValidIpv4(ip) {
  if (typeof ip !== 'string') {
    return false;
  }

  const segments = ip.split('.');
  if (segments.length !== 4) {
    return false;
  }

  return segments.every((segment) => {
    if (!/^\d+$/.test(segment)) {
      return false;
    }

    const value = Number(segment);
    return value >= 0 && value <= 255;
  });
}

function probe(ip, port = 80, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, ip);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { ip, action } = req.body || {};
  if (!isValidIpv4(ip)) {
    return res.status(400).json({ error: 'A valid IPv4 address is required.' });
  }

  if (!action) {
    return res.status(400).json({ error: 'Action is required.' });
  }

  if (action === 'shutdown') {
    return res.status(403).json({
      error:
        'Remote shutdown is blocked in this app. Use device-owner approved MDM tools (e.g., Intune, Jamf, or Google Admin) for managed shutdown workflows.',
    });
  }

  if (action === 'ping') {
    const reachable = await probe(ip, 80);
    return res.status(200).json({
      message: reachable
        ? `Ping-style probe to ${ip} succeeded (TCP/80 reachable).`
        : `Ping-style probe to ${ip} received no response on TCP/80.`,
    });
  }

  if (action === 'probe') {
    const open = await probe(ip, 443);
    return res.status(200).json({
      message: open ? `${ip} has TCP/443 open.` : `${ip} has TCP/443 closed or filtered.`,
    });
  }

  return res.status(400).json({ error: `Unsupported action: ${action}` });
}
