import os from 'os';

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function subnetFromIp(ip) {
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const interfaces = os.networkInterfaces();
  const candidates = [];

  Object.entries(interfaces).forEach(([name, infos]) => {
    (infos || []).forEach((entry) => {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateIpv4(entry.address)) {
        candidates.push({ interface: name, ip: entry.address, subnet: subnetFromIp(entry.address) });
      }
    });
  });

  const primary = candidates[0] || null;

  res.status(200).json({
    primary,
    candidates,
    note: primary
      ? 'Detected server-side local network interface.'
      : 'No private IPv4 interface detected automatically.',
  });
}
