import net from 'net';

const commonPorts = [22, 80, 443, 8080];

function probePort(host, port, timeoutMs = 350) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (open) => {
      if (done) {
        return;
      }
      done = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));

    socket.connect(port, host);
  });
}

async function detectDevice(ip) {
  const checks = await Promise.all(commonPorts.map((port) => probePort(ip, port)));
  const openPorts = commonPorts.filter((_, index) => checks[index]);

  if (!openPorts.length) {
    return null;
  }

  return {
    ip,
    openPorts,
    suggestedType: openPorts.includes(22)
      ? 'Likely computer / Linux device'
      : openPorts.includes(8080)
        ? 'Likely smart device or local admin panel'
        : 'Web-capable device',
  };
}

function parseSubnetBase(subnet) {
  const octets = subnet.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { subnet, fromHost = 1, toHost = 20 } = req.body || {};
  const base = parseSubnetBase(subnet || '');

  if (!base) {
    res.status(400).json({ error: 'Please send a valid subnet such as 192.168.1.0' });
    return;
  }

  const start = Math.max(1, Math.min(254, Number(fromHost)));
  const end = Math.max(start, Math.min(254, Number(toHost)));

  const hosts = [];
  for (let i = start; i <= end; i += 1) {
    hosts.push(`${base}.${i}`);
  }

  const detected = [];
  for (const ip of hosts) {
    // Sequential scans are intentional to keep this route predictable in small environments.
    const result = await detectDevice(ip);
    if (result) {
      detected.push(result);
    }
  }

  res.status(200).json({
    warning: 'Use this scanner only on networks/devices that you own or have explicit authorization to test.',
    scanned: hosts.length,
    detected,
  });
}
