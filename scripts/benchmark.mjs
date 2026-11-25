import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const MAX_CRITICAL_BROTLI_BYTES = 30 * 1024;
const distDir = join(process.cwd(), 'dist');
const assetsDir = join(distDir, 'assets');

function measureFile(filePath, label, isCritical) {
  const buf = readFileSync(filePath);
  const raw = buf.byteLength;
  const gzip = gzipSync(buf, { level: 9 }).byteLength;
  const brotli = brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).byteLength;
  return { label, isCritical, raw, gzip, brotli };
}

const files = [
  measureFile(join(distDir, 'index.html'), 'index.html', true),
  ...readdirSync(assetsDir)
    .sort()
    .map((name) => {
      const isCritical = /^index-.*\.(js|css)$/.test(name);
      return measureFile(join(assetsDir, name), `assets/${name}`, isCritical);
    }),
];

const critical = files.filter((f) => f.isCritical);
const deferred = files.filter((f) => !f.isCritical);

const sum = (arr, key) => arr.reduce((acc, item) => acc + item[key], 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

const critRaw = sum(critical, 'raw');
const critGzip = sum(critical, 'gzip');
const critBrotli = sum(critical, 'brotli');

const defRaw = sum(deferred, 'raw');
const defGzip = sum(deferred, 'gzip');
const defBrotli = sum(deferred, 'brotli');

// Network profile simulation (HTTP/2 multiplexed over single TLS connection: 2 RTTs + serialization time)
function estimateLoadMs(bytes, kbps, rttMs) {
  const bits = bytes * 8;
  const transferMs = (bits / (kbps * 1000)) * 1000;
  const parseExecMs = 12;
  return Math.round(rttMs * 2 + transferMs + parseExecMs);
}

const profiles = [
  { name: 'Broadband / Wi-Fi (50 Mbps, 20ms RTT)', kbps: 50000, rtt: 20 },
  { name: 'Fast 3G / Mobile (1.6 Mbps, 150ms RTT)', kbps: 1600, rtt: 150 },
  { name: 'Slow 3G (400 kbps, 400ms RTT)', kbps: 400, rtt: 400 },
  { name: '2G / Rural EDGE (150 kbps, 600ms RTT)', kbps: 150, rtt: 600 },
];

function countLines(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) total += countLines(full);
    else if (/\.(ts|tsx|css)$/.test(entry)) {
      total += readFileSync(full, 'utf8').split('\n').length;
    }
  }
  return total;
}

const t0 = performance.now();
const loc = countLines(join(process.cwd(), 'src'));
const scanMs = (performance.now() - t0).toFixed(2);

console.log('=== ASSET BREAKDOWN ===');
console.table(
  files.map((f) => ({
    Asset: f.label,
    Path: f.isCritical ? 'Critical (Boot)' : 'Lazy (On-Demand)',
    Raw: kb(f.raw),
    Gzip: kb(f.gzip),
    Brotli: kb(f.brotli),
  }))
);

console.log('\n=== PAYLOAD SUMMARY ===');
console.log(
  `Critical Initial Boot: Raw ${kb(critRaw)} | Gzip ${kb(critGzip)} | Brotli ${kb(critBrotli)} (Budget <= ${kb(MAX_CRITICAL_BROTLI_BYTES)})`
);
console.log(
  `Deferred Capability Plugins (Routes + 14 Stage/Inline Renderers): Raw ${kb(defRaw)} | Gzip ${kb(defGzip)} | Brotli ${kb(defBrotli)}`
);
console.log(`Total Source Lines (TS + TSX + CSS): ${loc} LOC (scanned in ${scanMs} ms)`);

console.log('\n=== NETWORK LOAD TIME BENCHMARK (Brotli Critical Payload) ===');
console.table(
  profiles.map((p) => ({
    Network: p.name,
    'This Build (Brotli)': `${estimateLoadMs(critBrotli, p.kbps, p.rtt)} ms`,
    'Typical React+SheetJS (~220 KB)': `${estimateLoadMs(220 * 1024, p.kbps, p.rtt)} ms`,
    Speedup: `${(
      estimateLoadMs(220 * 1024, p.kbps, p.rtt) / estimateLoadMs(critBrotli, p.kbps, p.rtt)
    ).toFixed(1)}x faster`,
  }))
);

if (critBrotli > MAX_CRITICAL_BROTLI_BYTES) {
  console.error(
    `\n[BUDGET FAIL] Critical initial boot Brotli payload (${kb(critBrotli)}) exceeds the ${kb(MAX_CRITICAL_BROTLI_BYTES)} limit.`
  );
  process.exit(1);
}
console.log(`\n[BUDGET PASS] Critical initial boot Brotli payload is within ${kb(MAX_CRITICAL_BROTLI_BYTES)}.`);
