// Convert the approved artwork into native desktop icon formats.
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm, copyFile } from 'node:fs/promises';

const sourceIcon = 'build/icon-source.png';
const directory = 'build/app.iconset';
const linuxBaseIcon = 'build/icon-linux-rounded.png';
const isMac = process.platform === 'darwin';

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function runOrFalse(command) {
  try {
    run(command);
    return true;
  } catch {
    return false;
  }
}

function resize(source, target, size) {
  const dimensions = `${size}x${size}`;
  if (isMac && runOrFalse(`sips -z ${size} ${size} "${source}" --out "${target}"`)) {
    return;
  }
  if (runOrFalse(`magick "${source}" -resize ${dimensions} "${target}"`)) {
    return;
  }
  if (!runOrFalse(`convert "${source}" -resize ${dimensions} "${target}"`)) {
    throw new Error('No image tool found. Install ImageMagick (magick/convert) or run on macOS with sips.');
  }
}

function buildRoundedIcon(source, target, size) {
  const radius = Math.round(size * 0.12);
  const mask = `roundrectangle 0,0 ${size},${size} ${radius},${radius}`;
  const roundCommand = `magick "${source}" \\( -size ${size}x${size} xc:none -fill white -draw "${mask}" \\) -compose DstIn -composite "${target}"`;
  if (runOrFalse(roundCommand)) {
    return;
  }
  const fallbackCommand = `convert "${source}" \\( -size ${size}x${size} xc:none -fill white -draw "${mask}" \\) -compose DstIn -composite "${target}"`;
  if (!runOrFalse(fallbackCommand)) {
    throw new Error('No image tool found. Install ImageMagick (magick/convert) or run on macOS with sips.');
  }
}

await mkdir(directory, { recursive: true });
await copyFile(sourceIcon, 'build/icon.png');
buildRoundedIcon('build/icon.png', linuxBaseIcon, 1024);
await copyFile(linuxBaseIcon, 'build/icon.png');

for (const size of [16, 32, 128, 256, 512]) {
  for (const scale of [1, 2]) {
    const pixels = size * scale;
    const file = `${directory}/icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`;
    resize('build/icon.png', file, pixels);
  }
}

if (isMac) {
  runOrFalse('iconutil -c icns build/app.iconset -o build/icon.icns');
}

const sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const images = [];
for (const size of sizes) {
  const file = `${directory}/windows-${size}.png`;
  resize('build/icon.png', file, size);
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
resize('build/icon.png', 'public/favicon.png', 64);
await mkdir('build/icons', { recursive: true });
for (const size of [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]) {
  resize('build/icon.png', `build/icons/${size}x${size}.png`, size);
}
await rm(directory, { recursive: true, force: true });
console.log('Created PNG, ICNS, ICO and favicon assets.');
