import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../.env", import.meta.url));
let content = "";
try {
  content = await fs.readFile(file, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (/^\s*ADMIN_TOKEN=\S+/m.test(content) && !process.argv.includes("--rotate")) {
  console.log("An administrator key already exists in backend/.env. Use --rotate to replace it.");
} else {
  const assignment = `ADMIN_TOKEN=${randomBytes(32).toString("base64url")}`;
  content = /^\s*ADMIN_TOKEN=.*$/m.test(content)
    ? content.replace(/^\s*ADMIN_TOKEN=.*$/m, assignment)
    : `${content.trimEnd()}\n${assignment}\n`.trimStart();
  await fs.writeFile(file, content, { mode: 0o600 });
  // writeFile's mode only applies to new files; also secure an existing configuration file.
  await fs.chmod(file, 0o600);
  console.log(
    "Administrator key saved in backend/.env. Restart the API, then use the key with Admin sign in. Keep this file private.",
  );
}
