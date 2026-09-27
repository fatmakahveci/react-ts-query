import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const execute = promisify(execFile);

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "query-admin-key-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const scripts = path.join(directory, "scripts");
  await fs.mkdir(scripts);
  const script = path.join(scripts, "create-admin-key.mjs");
  // Run the real CLI in an isolated package so tests can never rotate the developer's key.
  await fs.copyFile(new URL("../../scripts/create-admin-key.js", import.meta.url), script);
  return {
    file: path.join(directory, ".env"),
    run: (...args) => execute(process.execPath, [script, ...args], { cwd: scripts }),
  };
}

function readKey(content) {
  const assignments = content.match(/^ADMIN_TOKEN=([^\r\n]+)$/gm) || [];
  assert.equal(assignments.length, 1);
  const key = assignments[0].slice("ADMIN_TOKEN=".length);
  assert.match(key, /^[A-Za-z0-9_-]{43}$/);
  return key;
}

test("creates a private administrator key without logging its value", async (t) => {
  const { file, run } = await fixture(t);
  const result = await run();
  const key = readKey(await fs.readFile(file, "utf8"));
  assert.match(result.stdout, /Administrator key saved/);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes(key), false);
  if (process.platform !== "win32") assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
});

test("preserves an existing key and configuration unless rotation is requested", async (t) => {
  const { file, run } = await fixture(t);
  await run();
  const content = `# Local settings\nPORT=3100\n${await fs.readFile(file, "utf8")}\nCORS_ORIGIN=https://events.example\n`;
  await fs.writeFile(file, content);
  const result = await run();
  assert.equal(await fs.readFile(file, "utf8"), content);
  assert.match(result.stdout, /already exists/);
  assert.equal(result.stdout.includes(readKey(content)), false);
  assert.equal(result.stderr, "");
});

test("rotation replaces only the key and secures an existing configuration file", async (t) => {
  const { file, run } = await fixture(t);
  await run();
  const oldKey = readKey(await fs.readFile(file, "utf8"));
  const prefix = "# Preserve my settings\nPORT=3100\n";
  const suffix = "\nCORS_ORIGIN=https://events.example\n";
  await fs.writeFile(file, `${prefix}ADMIN_TOKEN=${oldKey}${suffix}`);
  await fs.chmod(file, 0o644);
  const result = await run("--rotate");
  const content = await fs.readFile(file, "utf8");
  const newKey = readKey(content);
  assert.notEqual(newKey, oldKey);
  assert.equal(content, `${prefix}ADMIN_TOKEN=${newKey}${suffix}`);
  assert.equal(result.stdout.includes(oldKey), false);
  assert.equal(result.stdout.includes(newKey), false);
  assert.equal(result.stderr, "");
  if (process.platform !== "win32") assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
});

test("fills an empty key assignment without creating duplicate environment entries", async (t) => {
  const { file, run } = await fixture(t);
  await fs.writeFile(file, "PORT=3100\nADMIN_TOKEN=\n# Keep this comment\n");
  await run();
  const content = await fs.readFile(file, "utf8");
  const key = readKey(content);
  assert.equal(content, `PORT=3100\nADMIN_TOKEN=${key}\n# Keep this comment\n`);
});
