import { execSync } from "node:child_process";

const raw = execSync('npm query "*" --json', {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});
const packages = JSON.parse(raw).filter((entry) => entry.location);
const missing = packages.filter((entry) => !entry.license);
const invalid = packages.filter((entry) =>
  /^(UNLICENSED|SEE LICENSE IN)$/i.test(entry.license ?? ""),
);

if (missing.length || invalid.length) {
  const names = [...missing, ...invalid]
    .map((entry) => `${entry.name}@${entry.version}`)
    .join(", ");
  throw new Error(`Dependency license metadata requires review: ${names}`);
}

const counts = new Map();
for (const entry of packages) {
  counts.set(entry.license, (counts.get(entry.license) ?? 0) + 1);
}

console.log(`Verified license metadata for ${packages.length} installed packages.`);
for (const [license, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${license}: ${count}`);
}
