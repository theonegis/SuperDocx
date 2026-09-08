const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const MAX_BYTES = 50 * 1024 * 1024;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
function validateDocx(bytes, filename) {
  if (path.extname(filename).toLowerCase() !== '.docx') throw new Error('仅支持 .docx 文件；旧版 .doc 请先转换为 .docx。');
  if (!bytes?.length || bytes.length > MAX_BYTES) throw new Error('文档为空或超过 50 MB 限制。');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) throw new Error('文件不是有效的 DOCX 压缩包，或文档已加密。');
}
async function readDocx(filename) {
  const stat = await fs.stat(filename);
  if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('请选择小于 50 MB 的 DOCX 文件。');
  const bytes = await fs.readFile(filename);
  validateDocx(bytes, filename);
  return { bytes, hash: digest(bytes) };
}
async function atomicWrite(filename, bytes, expectedHash) {
  validateDocx(bytes, filename);
  if (expectedHash) {
    let current;
    try { current = await fs.readFile(filename); } catch { throw new Error('原文件已移动或删除，请使用“另存为”。'); }
    if (digest(current) !== expectedHash) throw new Error('文件已被其他程序修改，请使用“另存为”保留两份文档。');
  }
  const temporary = path.join(path.dirname(filename), `.${path.basename(filename)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    // Check again after serialization/write, before replacing the original.
    if (expectedHash && digest(await fs.readFile(filename)) !== expectedHash) throw new Error('文件在保存期间发生变化，请另存为。');
    await fs.rename(temporary, filename);
    return digest(bytes);
  } finally {
    await handle?.close();
    await fs.rm(temporary, { force: true });
  }
}
module.exports = { MAX_BYTES, digest, validateDocx, readDocx, atomicWrite };
