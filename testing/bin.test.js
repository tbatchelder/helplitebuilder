import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mirrors test/cli.test.js's approach for build.js, for the same reason:
// bin/helplite-builder.js's dispatch logic lives inside
// `if (require.main === module)`, specifically so requiring it never runs
// it -- the only honest way to test it is to actually run it, the way a
// developer's `npx helplite-builder init` or `npx helplite-builder build`
// would.

const binFile = path.join(__dirname, '..', 'bin', 'helplite-builder.js');

let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'helplite-builder-bin-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function runCli(args) {
  return spawnSync('node', [binFile, ...args], { cwd: tmpRoot, encoding: 'utf8' });
}

describe('helplite-builder init (CLI)', () => {
  it('exits 0 and creates help-source/help.md', () => {
    const result = runCli(['init']);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpRoot, 'help-source', 'help.md'))).toBe(true);
  });

  it('exits 1 with a clean [ERROR] message, no stack trace, on a second run without --force', () => {
    runCli(['init']);

    const result = runCli(['init']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[ERROR]');
    expect(result.stderr).toContain('already exists');
    expect(result.stderr).not.toContain('at Object.<anonymous>');
  });

  it('exits 0 and overwrites on a second run with --force', () => {
    runCli(['init']);

    fs.writeFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'stale content');

    const result = runCli(['init', '--force']);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'utf8')).not.toBe(
      'stale content'
    );
  });
});

describe('helplite-builder build (CLI)', () => {
  it('exits 0 and writes help/ from help-source/help.md', () => {
    fs.mkdirSync(path.join(tmpRoot, 'help-source'));
    fs.writeFileSync(
      path.join(tmpRoot, 'help-source', 'help.md'),
      '@build(standard)\n# Title\n\nBody text.\n'
    );

    const result = runCli(['build']);

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpRoot, 'help', 'help.html'))).toBe(true);
  });

  it('exits 1 with a clean [ERROR] message, no stack trace, for a malformed source file', () => {
    fs.mkdirSync(path.join(tmpRoot, 'help-source'));
    fs.writeFileSync(path.join(tmpRoot, 'help-source', 'help.md'), '@tt\na | one\n');

    const result = runCli(['build']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('[ERROR]');
    expect(result.stderr).not.toContain('at Object.<anonymous>');
  });

  it('exits non-zero with a real stack trace when help-source/help.md does not exist', () => {
    const result = runCli(['build']);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ENOENT');
    expect(result.stderr).not.toContain('[ERROR]');
  });

  it('runs init then build back to back, matching the real intended workflow -- our own build.js consuming its own init.js output, then the developer\'s own "npm run build" chaining helplite-builder build into it', () => {
    const initResult = runCli(['init']);

    expect(initResult.status).toBe(0);

    const buildResult = runCli(['build']);

    expect(buildResult.status).toBe(0);
    expect(fs.existsSync(path.join(tmpRoot, 'help', 'help.html'))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, 'help', 'fields', 'tooltips.json'))).toBe(true);
  });
});

describe('helplite-builder (CLI usage)', () => {
  it('exits 0 and prints usage when run with no command', () => {
    const result = runCli([]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: helplite-builder');
  });

  it('exits 1 and prints usage for an unrecognized command', () => {
    const result = runCli(['nonsense']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Usage: helplite-builder');
  });
});
