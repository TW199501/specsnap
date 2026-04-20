#!/usr/bin/env node
// Kill whoever is listening on the given TCP port. Cross-platform, zero deps.
// Uses execFileSync (no shell) so the port argument can't be turned into shell
// injection — even though we also validate the arg with a strict regex below.
// Exits 0 whether the port was free or we killed an occupant; both are success.

import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

const port = String(process.argv[2] ?? 5999);
if (!/^\d+$/.test(port)) {
  console.error(`kill-port: invalid port "${port}"`);
  process.exit(1);
}

function runNoThrow(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  }
  catch {
    return '';
  }
}

function killWin32() {
  // Note: `netstat -ano -p tcp` filters to IPv4-only on Windows, which misses
  // servers bound to IPv6 localhost ([::1]:<port>) — a very common Vite /
  // Node-on-Windows default. Use `-ano` alone and filter by port ourselves.
  const out = runNoThrow('netstat', ['-ano']);
  const suffix = `:${port}`;
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 4) continue;
    if (cols[0] !== 'TCP' && cols[0] !== 'UDP') continue;
    const local = cols[1] ?? '';
    // Local is either "0.0.0.0:<port>", "127.0.0.1:<port>", "[::]:<port>", or "[::1]:<port>".
    if (!local.endsWith(suffix)) continue;
    const pid = cols[cols.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    try {
      execFileSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore' });
      console.log(`kill-port ${port}: killed PID ${pid}`);
    }
    catch { /* already gone */ }
  }
}

function killPosix() {
  const out = runNoThrow('lsof', ['-ti', `tcp:${port}`]);
  const pids = out.trim().split(/\s+/).filter((s) => /^\d+$/.test(s));
  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL');
      console.log(`kill-port ${port}: killed PID ${pid}`);
    }
    catch { /* already gone */ }
  }
}

if (platform() === 'win32') killWin32();
else killPosix();
