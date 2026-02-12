import net from 'net';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const commonPorts = [22, 80, 443, 8080, 62078];

function probePort(host, port, timeoutMs = 500) {
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

async function pingHost(host) {
  try {
    if (os.platform() === 'win32') {
      await execFileAsync('ping', ['-n', '1', '-w', '1000', host], { timeout: 1600 });
      return true;
    }

    await execFileAsync('ping', ['-c', '1', host], { timeout: 1800 });
    return true;
  } catch (_error) {
    return false;
  }
}

function parseIpsFromArp(output) {
  const matches = output.match(/(\d+\.\d+\.\d+\.\d+)/g) || [];
  return [...new Set(matches)];
}

async function readArpIps() {
  try {
    const { stdout } = await execFileAsync('arp', ['-an'], { timeout: 1200 });
    return parseIpsFromArp(stdout || '');
  } catch (_error) {
    return [];
  }
}

function managementLinksFor(ip, openPorts) {
  const links = [];
  if (openPorts.includes(443)) {
    links.push(`https://${ip}`);
  }
  if (openPorts.includes(80) || openPorts.includes(8080)) {
    links.push(`http://${ip}`);
  }
  if (openPorts.includes(22)) {
    links.push(`ssh://${ip}`);
  }
  return links;
}

function classifyDevice(ip, openPorts, pingReachable) {
  if (openPorts.includes(62078)) {
    return {
      suggestedType: 'Likely iPhone/iPad (lockdown service visible)',
      safeActions: ['Use Apple Configurator/MDM', 'Request user-approved pairing'],
      managementLinks: managementLinksFor(ip, openPorts),
      discoverySource: pingReachable ? 'port+ping' : 'port',
    };
  }

  if (openPorts.includes(22)) {
    return {
      suggestedType: 'Likely computer / Linux device',
      safeActions: ['Use SSH with credentials', 'Manage with endpoint-management tools'],
      managementLinks: managementLinksFor(ip, openPorts),
      discoverySource: pingReachable ? 'port+ping' : 'port',
    };
  }

  if (openPorts.includes(8080)) {
    return {
      suggestedType: 'Likely smart device or local admin panel',
      safeActions: ['Open official admin page', 'Use vendor app for approved controls'],
      managementLinks: managementLinksFor(ip, openPorts),
      discoverySource: pingReachable ? 'port+ping' : 'port',
    };
  }

  if (openPorts.length > 0) {
    return {
      suggestedType: 'Web-capable device',
      safeActions: ['Use authenticated web admin', 'Use approved MDM / IT tooling'],
      managementLinks: managementLinksFor(ip, openPorts),
      discoverySource: pingReachable ? 'port+ping' : 'port',
    };
  }

  return {
    suggestedType: 'Likely phone/client device (responded to ping)',
    safeActions: ['Use vendor-approved management tools', 'Ask user to accept consent request'],
    managementLinks: [],
    discoverySource: 'ping',
  };
}

async function detectDevice(ip, arpHints) {
  const [pingReachable, checks] = await Promise.all([
    pingHost(ip),
    Promise.all(commonPorts.map((port) => probePort(ip, port))),
  ]);

  const openPorts = commonPorts.filter((_, index) => checks[index]);
  const seenInArp = arpHints.has(ip);

  if (!openPorts.length && !pingReachable && !seenInArp) {
    return null;
  }

  const classification = classifyDevice(ip, openPorts, pingReachable || seenInArp);
  return {
    ip,
    openPorts,
    pingReachable,
    seenInArp,
    ...classification,
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

  const { subnet, fromHost = 1, toHost = 60, useCurrentConnection = false } = req.body || {};
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

  const arpIps = await readArpIps();
  const arpHints = new Set(arpIps.filter((ip) => ip.startsWith(`${base}.`) && hosts.includes(ip)));

  const detected = [];
  for (const ip of hosts) {
    const result = await detectDevice(ip, arpHints);
    if (result) {
      detected.push(result);
    }
  }

  res.status(200).json({
    warning: 'Use this scanner only on networks/devices that you own or have explicit authorization to test.',
    subnetUsed: `${base}.0`,
    scanned: hosts.length,
    detected,
    diagnostics: {
      arpCandidatesInRange: arpHints.size,
      pingDetected: detected.filter((d) => d.pingReachable).length,
      portDetected: detected.filter((d) => d.openPorts.length > 0).length,
    },
    controlNotice:
      'Any control action must be consent-based. Device owners must explicitly accept requests before managed access workflows.',
  });
}
