#!/usr/bin/env node
/**
 * FILE: utility-tools/env-sync.mjs
 *
 * Push the keys of a dotenv file to GitHub Actions from the command line,
 * so nobody has to paste values into the repository settings page.
 *
 *   node utility-tools/env-sync.mjs push --dry-run      # show the plan
 *   node utility-tools/env-sync.mjs push                # upload
 *   node utility-tools/env-sync.mjs check               # local file vs GitHub
 *   node utility-tools/env-sync.mjs pull --file .env.ci # variables back out
 *
 * Secrets vs variables
 *   A key is treated as a SECRET when its name looks like one
 *   (SECRET/TOKEN/KEY/PASSWORD/CREDENTIAL/PRIVATE) and as a VARIABLE
 *   otherwise. Override per run with --secret A,B and --var C,D.
 *   Secrets are write-only on GitHub: `pull` and `check` can see their
 *   names, never their values. That is a GitHub rule, not a limitation here.
 *
 * Why it shells out to `gh`
 *   `gh secret set` does the libsodium encryption for you, and `gh api`
 *   covers Actions variables on gh versions older than the `gh variable`
 *   command (this box has 2.23). Values travel on STDIN, never in argv, so
 *   they cannot show up in `ps` or your shell history.
 *
 * No dotenv package, no package manager involved: this is plain Node, and
 * locally you can load the same file with Node's own flag —
 *   node --env-file=.env index.js
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { ROOT } from "./workspaces.mjs";

const SECRETISH = /(SECRET|TOKEN|KEY|PASSWORD|PASSWD|CREDENTIAL|PRIVATE)/i;
const PLACEHOLDER = /^(REPLACE[_-]|CHANGE[_-]ME|<.*>|TODO)/i;

/* ---------------- args ---------------- */

const argv = process.argv.slice(2);
const command = argv.find((a) => !a.startsWith("-")) ?? "help";
const flag = (name, fallback = undefined) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  if (hit.includes("=")) return hit.slice(hit.indexOf("=") + 1);
  const next = argv[argv.indexOf(hit) + 1];
  return next && !next.startsWith("-") ? next : true;
};
const list = (name) =>
  String(flag(name, ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const options = {
  file: String(flag("file", ".env")),
  repo: flag("repo"),
  environment: flag("env"),
  only: list("only"),
  skip: list("skip"),
  asSecret: list("secret"),
  asVar: list("var"),
  dryRun: Boolean(flag("dry-run", false)),
  yes: Boolean(flag("yes", false)),
  allowPlaceholders: Boolean(flag("allow-placeholders", false)),
};

/* ---------------- helpers ---------------- */

const die = (message) => {
  console.error(`env-sync: ${message}`);
  process.exit(1);
};

function gh(args, { input, allowFail = false } = {}) {
  const result = spawnSync("gh", args, {
    input,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error?.code === "ENOENT") {
    die("the GitHub CLI (`gh`) is not installed — https://cli.github.com");
  }
  if (result.status !== 0 && !allowFail) {
    const detail = (result.stderr || result.stdout || "").trim();
    die(
      `gh ${args.filter((a) => a !== "--input").join(" ")} failed\n${detail}`,
    );
  }
  return {
    ok: result.status === 0,
    out: (result.stdout || "").trim(),
    err: (result.stderr || "").trim(),
  };
}

/** Parse a dotenv file: `export` prefix, quotes and trailing # comments. */
function parseEnvFile(file) {
  const absolute = path.resolve(ROOT, file);
  if (!fs.existsSync(absolute))
    die(`no such file: ${path.relative(ROOT, absolute)}`);
  const entries = [];
  for (const [index, line] of fs
    .readFileSync(absolute, "utf8")
    .split(/\r?\n/)
    .entries()) {
    const match =
      /^(?:\s*export\s+|\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trim().startsWith("#")) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    entries.push({ name: match[1], value, line: index + 1 });
  }
  return { absolute, entries };
}

function resolveRepo() {
  if (options.repo) return String(options.repo);
  const view = gh(
    ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    { allowFail: true },
  );
  if (view.ok && view.out) return view.out;
  die("could not detect the repository — pass --repo owner/name");
}

const repoId = (repo) => gh(["api", `/repos/${repo}`, "--jq", ".id"]).out;

const kindOf = (name) => {
  if (options.asSecret.includes(name)) return "secret";
  if (options.asVar.includes(name)) return "variable";
  return SECRETISH.test(name) ? "secret" : "variable";
};

function plan(repo) {
  const { absolute, entries } = parseEnvFile(options.file);
  const rows = [];
  for (const entry of entries) {
    if (options.only.length && !options.only.includes(entry.name)) continue;
    if (options.skip.includes(entry.name)) continue;
    let skip = null;
    if (entry.value === "") skip = "empty value";
    else if (!options.allowPlaceholders && PLACEHOLDER.test(entry.value))
      skip = "placeholder value";
    rows.push({ ...entry, kind: kindOf(entry.name), skip });
  }
  if (!rows.length)
    die(`nothing to do — no matching keys in ${path.relative(ROOT, absolute)}`);
  const target = options.environment
    ? `${repo} · environment "${options.environment}"`
    : repo;
  console.log(`source: ${path.relative(ROOT, absolute)}`);
  console.log(`target: ${target}\n`);
  for (const row of rows) {
    const mark = row.skip ? `skip (${row.skip})` : row.kind;
    console.log(`  ${row.name.padEnd(30)} ${mark}`);
  }
  return rows.filter((row) => !row.skip);
}

async function confirm(count) {
  if (options.yes || options.dryRun) return true;
  if (!process.stdin.isTTY) return true; // CI: the flags above are the gate
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) =>
    rl.question(`\nwrite ${count} entries to GitHub? [y/N] `, resolve),
  );
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

/* ---------------- writers ---------------- */

function setSecret(repo, name, value) {
  const args = ["secret", "set", name, "--repo", repo];
  if (options.environment) args.push("--env", String(options.environment));
  gh(args, { input: value }); // value on stdin: never in argv, never in `ps`
}

function setVariable(repo, name, value) {
  const body = JSON.stringify({ name, value });
  const base = options.environment
    ? `/repositories/${repoId(repo)}/environments/${options.environment}/variables`
    : `/repos/${repo}/actions/variables`;
  const created = gh(["api", "--method", "POST", base, "--input", "-"], {
    input: body,
    allowFail: true,
  });
  if (created.ok) return;
  if (!/already exists|422/i.test(created.err))
    die(`could not create variable ${name}\n${created.err}`);
  gh(["api", "--method", "PATCH", `${base}/${name}`, "--input", "-"], {
    input: body,
  });
}

/* ---------------- readers ---------------- */

const remoteSecretNames = (repo) => {
  const route = options.environment
    ? `/repositories/${repoId(repo)}/environments/${options.environment}/secrets`
    : `/repos/${repo}/actions/secrets`;
  const res = gh(["api", route, "--paginate", "--jq", ".secrets[].name"], {
    allowFail: true,
  });
  return res.ok ? res.out.split("\n").filter(Boolean) : null;
};

const remoteVariables = (repo) => {
  const route = options.environment
    ? `/repositories/${repoId(repo)}/environments/${options.environment}/variables`
    : `/repos/${repo}/actions/variables`;
  const res = gh(
    [
      "api",
      route,
      "--paginate",
      "--jq",
      ".variables[] | [.name, .value] | @tsv",
    ],
    { allowFail: true },
  );
  if (!res.ok) return null;
  return res.out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split("\t");
      return { name, value: rest.join("\t") };
    });
};

const PERMISSION_HINT =
  "GitHub refused the read — the token needs admin rights on the repository.\n" +
  "  gh auth refresh -h github.com -s repo,admin:org   (then retry)";

/* ---------------- commands ---------------- */

async function cmdPush() {
  const repo = resolveRepo();
  const rows = plan(repo);
  if (!(await confirm(rows.length)))
    return console.log("aborted — nothing was written");
  if (options.dryRun) return console.log("\ndry run: nothing was written");
  for (const row of rows) {
    if (row.kind === "secret") setSecret(repo, row.name, row.value);
    else setVariable(repo, row.name, row.value);
    console.log(`  wrote ${row.kind.padEnd(8)} ${row.name}`);
  }
  console.log(
    `\ndone — ${rows.length} entries written to ${repo}${options.environment ? ` (${options.environment})` : ""}`,
  );
}

function cmdCheck() {
  const repo = resolveRepo();
  const { absolute, entries } = parseEnvFile(options.file);
  const secrets = remoteSecretNames(repo);
  const variables = remoteVariables(repo);
  if (secrets === null || variables === null) die(PERMISSION_HINT);
  const remote = new Map([
    ...secrets.map((name) => [name, "secret"]),
    ...variables.map((v) => [v.name, "variable"]),
  ]);
  console.log(`local : ${path.relative(ROOT, absolute)}`);
  console.log(
    `remote: ${repo}${options.environment ? ` · environment "${options.environment}"` : ""}\n`,
  );
  let missing = 0;
  for (const entry of entries) {
    const want = kindOf(entry.name);
    const have = remote.get(entry.name);
    if (!have) {
      missing += 1;
      console.log(
        `  ${entry.name.padEnd(30)} MISSING on GitHub (would be a ${want})`,
      );
    } else if (have !== want) {
      console.log(
        `  ${entry.name.padEnd(30)} stored as ${have}, local name says ${want}`,
      );
    } else {
      console.log(`  ${entry.name.padEnd(30)} ok (${have})`);
    }
  }
  const localNames = new Set(entries.map((e) => e.name));
  for (const [name, kind] of remote) {
    if (!localNames.has(name))
      console.log(`  ${name.padEnd(30)} only on GitHub (${kind})`);
  }
  console.log(
    `\n${missing ? `${missing} key(s) missing on GitHub` : "every local key exists on GitHub"}`,
  );
  if (missing) process.exitCode = 1;
}

function cmdPull() {
  const repo = resolveRepo();
  const variables = remoteVariables(repo);
  if (variables === null) die(PERMISSION_HINT);
  const file = path.resolve(ROOT, String(flag("file", ".env.github")));
  const header =
    `# Written by utility-tools/env-sync.mjs from ${repo}` +
    `${options.environment ? ` (environment ${options.environment})` : ""}\n` +
    `# Actions VARIABLES only — secrets are write-only on GitHub and can never be read back.\n`;
  const body = variables.map((v) => `${v.name}=${v.value}`).join("\n");
  if (options.dryRun) {
    console.log(header + body);
    return;
  }
  fs.writeFileSync(file, `${header}${body}\n`);
  console.log(
    `wrote ${variables.length} variables to ${path.relative(ROOT, file)} (no secrets — GitHub cannot export them)`,
  );
}

function cmdHelp() {
  console.log(`env-sync — push a dotenv file to GitHub Actions without the web UI

  node utility-tools/env-sync.mjs push  [flags]   upload keys as secrets/variables
  node utility-tools/env-sync.mjs check [flags]   compare the local file with GitHub
  node utility-tools/env-sync.mjs pull  [flags]   write Actions variables to a file

FLAGS
  --file <path>          dotenv file to read (default .env)
  --repo <owner/name>    target repository (default: detected by gh)
  --env <environment>    target a deployment environment instead of the repo
  --only A,B             push only these keys
  --skip A,B             push everything except these keys
  --secret A,B           force these keys to be stored as secrets
  --var A,B              force these keys to be stored as variables
  --allow-placeholders   also push REPLACE_*/empty values (refused by default)
  --dry-run              print the plan, write nothing
  --yes                  skip the confirmation prompt

NOTES
  A key is a secret when its name contains SECRET/TOKEN/KEY/PASSWORD/
  CREDENTIAL/PRIVATE, otherwise a variable. Values are passed to gh on
  stdin, so they never appear in argv, \`ps\` or shell history.
  Locally you do not need dotenv or a package manager:
    node --env-file=.env index.js`);
}

const commands = {
  push: cmdPush,
  check: cmdCheck,
  pull: cmdPull,
  help: cmdHelp,
};
if (!commands[command])
  die(`unknown command "${command}" — try: push | check | pull | help`);
if (command !== "help") {
  const auth = gh(["auth", "status"], { allowFail: true });
  if (!auth.ok)
    die(`gh is not authenticated — run: gh auth login\n${auth.err}`);
}
await commands[command]();
