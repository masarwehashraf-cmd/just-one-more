import net from 'node:net';

const MAX_HOSTS = 64;

function isValidSubnet(subnet) {
  if (typeof subnet !== 'string') {
    return false;
  }

  const segments = subnet.split('.');
  if (segments.length !== 3) {
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

function probeTcp(ip, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let completed = false;

    const finish = (open) => {
      if (completed) {
        return;
      }
      completed = true;
      socket.destroy();
      resolve(open);
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subnet, start, end, port } = req.body || {};

  if (!isValidSubnet(subnet)) {
    return res.status(400).json({ error: 'Invalid subnet format. Use first 3 octets, e.g. 192.168.1' });
  }

  const startHost = Number(start);
  const endHost = Number(end);
  const probePort = Number(port) || 80;

  if (!Number.isInteger(startHost) || !Number.isInteger(endHost) || startHost < 1 || endHost > 254 || startHost > endHost) {
    return res.status(400).json({ error: 'Invalid host range. Must be between 1 and 254.' });
  }

  if (!Number.isInteger(probePort) || probePort < 1 || probePort > 65535) {
    return res.status(400).json({ error: 'Invalid port. Must be between 1 and 65535.' });
  }

  const totalHosts = endHost - startHost + 1;
  if (totalHosts > MAX_HOSTS) {
    return res.status(400).json({ error: `Range too large. Scan up to ${MAX_HOSTS} hosts per request.` });
  }

  const checks = [];
  for (let host = startHost; host <= endHost; host += 1) {
    const ip = `${subnet}.${host}`;
    checks.push(
      probeTcp(ip, probePort).then((isOpen) => ({
        ip,
        port: probePort,
        portOpen: isOpen,
        reachable: isOpen,
      }))
    );
  }

  const results = await Promise.all(checks);
  const liveResults = results.filter((item) => item.reachable);
  return res.status(200).json({ devices: liveResults });
}
