const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { validateDocx, readDocx, atomicWrite, digest, MAX_BYTES } = require('../electron/files.cjs');
const sample = Buffer.from([0x50, 0x4b, 3, 4, 1, 2, 3]);
test('rejects legacy, encrypted/corrupt and oversized files', () => {
  assert.throws(() => validateDocx(sample, 'a.doc'), /\.docx/);
  assert.throws(() => validateDocx(Buffer.from('broken'), 'a.docx'), /有效/);
  assert.throws(() => validateDocx(Buffer.alloc(MAX_BYTES + 1), 'a.docx'), /50 MB/);
});
test('save atomically, detect external changes, preserve existing bytes on errors', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'superdocx-test-'));
  const file = path.join(dir, '稿件.docx');
  try {
    const firstHash = await atomicWrite(file, sample);
    assert.equal(firstHash, digest(sample));
    assert.deepEqual((await readDocx(file)).bytes, sample);
    const edited = Buffer.concat([sample, Buffer.from('changed')]);
    const nextHash = await atomicWrite(file, edited, firstHash);
    assert.equal(nextHash, digest(edited));
    await assert.rejects(atomicWrite(file, sample, firstHash), /其他程序修改/);
    assert.deepEqual(await fs.readFile(file), edited);
    await assert.rejects(atomicWrite(file, Buffer.from('broken'), nextHash), /有效/);
    assert.deepEqual(await fs.readFile(file), edited);
    assert.deepEqual(await fs.readdir(dir), ['稿件.docx']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('Linux save preserves permissions, symlinks and read-only originals', { skip: process.platform === 'win32' }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'superdocx-permissions-'));
  const file = path.join(dir, 'original.docx');
  const link = path.join(dir, 'shortcut.docx');
  try {
    await fs.writeFile(file, sample);
    await fs.chmod(file, 0o664);
    await fs.symlink(file, link);
    const edited = Buffer.concat([sample, Buffer.from('revision')]);
    await atomicWrite(link, edited, digest(sample));
    assert.equal((await fs.stat(file)).mode & 0o777, 0o664);
    assert.equal((await fs.lstat(link)).isSymbolicLink(), true);
    assert.deepEqual(await fs.readFile(file), edited);
    await fs.chmod(file, 0o444);
    await assert.rejects(atomicWrite(file, sample, digest(edited)), /只读/);
    assert.deepEqual(await fs.readFile(file), edited);
    assert.deepEqual((await fs.readdir(dir)).sort(), ['original.docx', 'shortcut.docx']);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
