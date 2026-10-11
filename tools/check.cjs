'use strict';
// Checks every skill against the Agent Skills format and the release pins. No network, no writes.
//   node tools/check.cjs [path/to/marrow-install/package.json]
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repo = path.resolve(__dirname, '..');
const skillsDir = path.join(repo, 'skills');
let failures = 0;
function check(name, fn) {
  try {
    fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`FAIL ${name}: ${error.message}\n`);
  }
}

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, 'missing YAML frontmatter');
  const fields = {};
  for (const line of match[1].split('\n')) {
    const top = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (top) fields[top[1]] = top[2];
  }
  return fields;
}

const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
check('at least one skill', () => assert.ok(skills.length > 0));
for (const name of skills) {
  const text = fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');
  check(`${name}: frontmatter follows the Agent Skills format`, () => {
    const fields = frontmatter(text);
    assert.strictEqual(fields.name, name, 'name must match the directory');
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(name.length <= 64);
    assert.ok(fields.description && fields.description.length <= 1024, 'description 1-1024 characters');
    for (const key of Object.keys(fields)) {
      assert.ok(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'].includes(key), `unknown field ${key}`);
    }
    assert.strictEqual(fields['allowed-tools'], undefined, 'skills pre-approve no tools');
    assert.ok(text.split('\n').length < 500, 'SKILL.md under 500 lines');
  });
  check(`${name}: package commands are pinned`, () => {
    assert.ok(!/@latest\b/.test(text), 'names @latest');
    for (const m of text.matchAll(/npx -y (@getmarrow\/[a-z-]+)(@[^\s`]+)?/g)) {
      assert.ok(m[2] && /^@\d+\.\d+\.\d+$/.test(m[2]), `${m[0]} is not pinned to an exact version`);
    }
  });
  check(`${name}: links resolve inside the skill`, () => {
    for (const m of text.matchAll(/\]\(((?!https?:)[^)]+)\)/g)) {
      assert.ok(fs.existsSync(path.join(skillsDir, name, m[1])), `${m[1]} missing`);
    }
  });
}

const installPkg = process.argv[2];
check('pinned @getmarrow/install version equals the release', () => {
  if (!installPkg) throw new Error('pass the path to marrow-install/package.json');
  const version = JSON.parse(fs.readFileSync(path.resolve(installPkg), 'utf8')).version;
  for (const file of listRepo(repo).filter((f) => /\.md$/.test(f))) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/@getmarrow\/install@(\d+\.\d+\.\d+)/g)) {
      assert.strictEqual(m[1], version, `${path.relative(repo, file)} pins ${m[1]}`);
    }
  }
});

check('no secret-looking values in the repository', () => {
  const patterns = [/mrw_(?:live|test)_[A-Za-z0-9]{6,}/, /\bsk-[A-Za-z0-9_-]{20,}/, /\bgh[pousr]_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bAKIA[0-9A-Z]{16}\b/];
  for (const file of listRepo(repo)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) assert.ok(!pattern.test(text), `${path.relative(repo, file)} matches ${pattern}`);
  }
});

check('no instruction to bypass approvals or disable hooks', () => {
  for (const file of listRepo(repo).filter((f) => /\.md$/.test(f))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const phrase of [/disableAllHooks/, /--dangerously/, /bypassPermissions/, /MARROW_AUTO_HOOK=false/, /enable-all/]) {
      assert.ok(!phrase.test(text), `${path.relative(repo, file)} mentions ${phrase}`);
    }
  }
});

function listRepo(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listRepo(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

process.stdout.write(failures ? `${failures} FAILED\n` : 'ALL PASS\n');
process.exit(failures ? 1 : 0);
