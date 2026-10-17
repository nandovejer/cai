/**
 * F8 security audit, hardening L1: the dev server does not serve the
 * repository's private files.
 *
 * vite.config.js sets `root` to the repository and `server.fs.allow` to it, so
 * everything under it is a URL: `GET /.claude/OWNER.md` and
 * `/.claude/settings.local.json` answered 200 with the file. Decision:
 * `server.fs.deny` lists `.env`, `.env.*`, `*.{crt,pem}`, `**\/.git/**` and
 * `**\/.claude/**`.
 *
 * What this file checks, against a real Vite dev server started
 * programmatically from vite.config.js (on a free port of 127.0.0.1, with the
 * websocket and the browser off):
 *   - the resolved `server.fs.deny` holds the five patterns;
 *   - /.claude/OWNER.md, /.claude/settings.json, /.claude/settings.local.json
 *     (the same through /@fs/) and /.git/config are answered 403 or 404 and the
 *     body has none of the file's text;
 *   - the pages and the packages' dist are still served;
 *   - in a temporary root, with that same `deny` list, a `.env`, a
 *     `.env.local`, a `.pem`, a `.crt`, a `.git/config` and a `.claude/` file
 *     are not served and an ordinary file is.
 *
 * Files under test:
 *   vite.config.js
 */
import { createServer as listenOnFreePort } from "node:net";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const DENIED = [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.claude/**"];

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = listenOnFreePort();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });

/** A dev server on a free port of the loopback; strictPort, so it never lands on another worktree's. */
async function start(options) {
  const port = await freePort();
  const server = await createServer({
    logLevel: "silent",
    ...options,
    server: { ...options.server, port, strictPort: true, host: "127.0.0.1", open: false, ws: false },
  });
  await server.listen();
  return { server, origin: `http://127.0.0.1:${port}` };
}

/** The start of a private file, or "" where the file is not there (OWNER.md and settings.local.json are not in git). */
const startOf = (file) => {
  try {
    return readFileSync(join(root, file), "utf-8").slice(0, 60);
  } catch {
    return "";
  }
};

const get = async (origin, path) => {
  const response = await fetch(origin + path);
  return { status: response.status, body: await response.text() };
};

/** The two ways to say no: 403 (restricted) or 404 (not there). Never 200, never a body of the file. */
function expectRefused(result, secret, label) {
  expect([403, 404], `${label}: status ${result.status}`).toContain(result.status);
  if (secret) expect(result.body, `${label}: the body is not the file`).not.toContain(secret);
}

describe("the dev server of vite.config.js", () => {
  let running;
  beforeAll(async () => {
    running = await start({ configFile: join(root, "vite.config.js") });
  }, 60_000);
  afterAll(async () => {
    await running?.server.close();
  });

  it("denies .env, .env.*, certificates and keys, .git and .claude", () => {
    expect(running.server.config.server.fs.deny).toEqual(expect.arrayContaining(DENIED));
  });

  // The first line of each file is enough to know it was served
  const PRIVATE = [
    ["/.claude/OWNER.md", ".claude/OWNER.md"],
    ["/.claude/settings.json", ".claude/settings.json"],
    ["/.claude/settings.local.json", ".claude/settings.local.json"],
  ];
  for (const [url, file] of PRIVATE) {
    it(`does not serve ${url}`, () => {
      const secret = startOf(file);
      return get(running.origin, url).then((result) => expectRefused(result, secret, url));
    });

    it(`does not serve ${url} through /@fs/ either`, () => {
      const secret = startOf(file);
      return get(running.origin, `/@fs${root}${file}`).then((result) => expectRefused(result, secret, `/@fs${root}${file}`));
    });
  }

  it("does not serve /.git/config or /.env", async () => {
    expectRefused(await get(running.origin, "/.git/config"), "[core]", "/.git/config");
    expectRefused(await get(running.origin, "/.env"), "", "/.env");
  });

  it("still serves a docs page", async () => {
    const result = await get(running.origin, "/docs/components/button/");
    expect(result.status).toBe(200);
    expect(result.body).toContain("<h1");
  });

  it("still serves the stylesheet of core's dist", async () => {
    const result = await get(running.origin, "/packages/core/dist/luz.css");
    expect(result.status).toBe(200);
    expect(result.body.length).toBeGreaterThan(1000);
  });
});

describe("the same deny list on a temporary root", () => {
  let dir;
  let running;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "luz-dev-deny-"));
    const files = {
      ".env": "TOKEN=env-secret\n",
      ".env.local": "TOKEN=env-local-secret\n",
      "key.pem": "-----BEGIN PRIVATE KEY-----\npem-secret\n",
      "site.crt": "-----BEGIN CERTIFICATE-----\ncrt-secret\n",
      ".git/config": "[core]\n\tgit-secret = 1\n",
      ".claude/OWNER.md": "claude-secret\n",
      "nested/.claude/settings.local.json": '{"claude-nested-secret": true}\n',
      "nested/.git/HEAD": "ref: refs/heads/git-nested-secret\n",
      "public.txt": "public-text\n",
    };
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    // The list the repository's own config resolves to, applied to a root with nothing else in it
    const real = await start({ configFile: join(root, "vite.config.js") });
    const deny = real.server.config.server.fs.deny;
    await real.server.close();
    running = await start({ configFile: false, root: dir, server: { fs: { allow: [dir], deny } } });
  }, 60_000);
  afterAll(async () => {
    await running?.server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  for (const [url, secret] of [
    ["/.env", "env-secret"],
    ["/.env.local", "env-local-secret"],
    ["/key.pem", "pem-secret"],
    ["/site.crt", "crt-secret"],
    ["/.git/config", "git-secret"],
    ["/.claude/OWNER.md", "claude-secret"],
    ["/nested/.claude/settings.local.json", "claude-nested-secret"],
    ["/nested/.git/HEAD", "git-nested-secret"],
  ]) {
    it(`does not serve ${url}`, async () => {
      expectRefused(await get(running.origin, url), secret, url);
    });
  }

  it("serves an ordinary file of the root", async () => {
    const result = await get(running.origin, "/public.txt");
    expect(result.status).toBe(200);
    expect(result.body).toContain("public-text");
  });
});
