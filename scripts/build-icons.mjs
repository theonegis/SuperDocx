// Run on macOS: convert the approved artwork into native desktop icon formats.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
const directory = 'build/app.iconset';
await mkdir(directory, { recursive: true });
execFileSync('sips', ['-z', '1024', '1024', 'build/icon-source.png', '--out', 'build/icon.png']);
for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const pixels = size * scale;
    const file = `${directory}/icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
    execFileSync('sips', ['-z', String(pixels), String(pixels), 'build/icon.png', '--out', file]);
  }
}
execFileSync('iconutil', ['-c', 'icns', directory, '-o', 'build/icon.icns']);
const sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const images = [];
for (const size of sizes) {
  const file = `${directory}/windows-${size}.png`;
  execFileSync('sips', ['-z', String(size), String(size), 'build/icon.png', '--out', file]);
  images.push(await readFile(file));
}
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
});
await writeFile('build/icon.ico', Buffer.concat([header, ...images]));
execFileSync('sips', ['-z', '64', '64', 'build/icon.png', '--out', 'public/favicon.png']);
await mkdir('build/icons', { recursive: true });
for (const size of [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]) {
  execFileSync('sips', ['-z', String(size), String(size), 'build/icon.png', '--out', `build/icons/${size}x${size}.png`]);
}
await rm(directory, { recursive: true, force: true });
console.log('Created PNG, ICNS, ICO and favicon assets.');
