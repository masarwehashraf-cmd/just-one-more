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

function classifyDevice(openPorts) {
  if (openPorts.includes(22)) {
    return {
      suggestedType: 'Likely computer / Linux device',
      safeActions: ['Use SSH with credentials', 'Manage with endpoint-management tools'],
    };
  }

  if (openPorts.includes(8080)) {
    return {
      suggestedType: 'Likely smart device or local admin panel',
      safeActions: ['Open official admin page', 'Use vendor app for approved controls'],
    };
  }

  return {
    suggestedType: 'Web-capable device',
    safeActions: ['Use authenticated web admin', 'Use approved MDM / IT tooling'],
  };
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
    ...classifyDevice(openPorts),
  };
}

function parseSubnetBase(subnet) {
  const octets = subnet.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}`;
}

function normalizeIp(ip) {
  if (!ip) {
    return null;
  }

  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  if (ip === '::1') {
    return '127.0.0.1';
  }

  return ip;
}

function getRequesterIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }

  return normalizeIp(req.socket?.remoteAddress || req.connection?.remoteAddress || '');
}

function inferSubnetFromRequest(req) {
  const ip = getRequesterIp(req);
  const match = ip && ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { subnet, fromHost = 1, toHost = 20, useCurrentConnection = false } = req.body || {};
  const autoSubnet = useCurrentConnection ? inferSubnetFromRequest(req) : null;
  const base = parseSubnetBase(autoSubnet || subnet || '');

  if (!base) {
    res.status(400).json({
      error: 'Unable to detect subnet automatically. Please enter a subnet such as 192.168.1.0.',
    });
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
    const result = await detectDevice(ip);
    if (result) {
      detected.push(result);
    }
  }

  res.status(200).json({
    warning: 'Use this scanner only on networks/devices that you own or have explicit authorization to test.',
    subnetUsed: `${base}.0`,
    scanned: hosts.length,
    detected,
    controlNotice:
      'Direct shutdown, screen mirroring, or remote control requires explicit consent and vendor-approved management tools (MDM, EMM, or authenticated admin APIs).',
  });
}
