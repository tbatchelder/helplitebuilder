import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// build.js's console.error/process.exit behavior lives inside
// `if (require.main === module)`, specifically so that requiring the file
// never triggers it (see build.test.js). That means the only honest way to
// cover it is to actually run the file as a real process, the way a
// developer's `npm run build-help` would, and check what it printed and
// exited with -- not to import it and hope.

const buildJs = path.join(__dirname, '..', 'src', 'build.js');

let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'helplite-builder-cli-'));
  fs.mkdirSync(path.join(tmpRoot, 'help-source'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function runCli() {
  return spawnSync('node', [buildJs], { cwd: tmpRoot, encoding: 'utf8' });
}

describe('build.js as a CLI process', () => {
  it('exits 0 and writes help/ for a valid source file', () => {
    fs.writeFileSync(
      path.join(tmpRoot, 'help-source', 'help.md'),
      '@build(standard)\n# Title\n\nBody text.\n'
    );

    const result = runCli();

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(tmpRoot, 'help', 'help.html'))).toBe(true);
  });

  it('exits 1 with a clean [ERROR] message, no stack trace, for a malformed source file', () => {
    fs.writeFileSync(path.join(tmpRoot, 'help-source', 'help.md'), '@tt\na | one\n');

    const result = runCli();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[ERROR] Unclosed '@tt' block at end of file.");
    // The whole point of catching HelpBuildError specially is that it does
    // NOT dump a stack trace -- that's what separates it from case below.
    expect(result.stderr).not.toContain('at Object.<anonymous>');
  });

  it('exits non-zero with a real stack trace, not a swallowed [ERROR], for a non-source-file problem', () => {
    // No help-source/help.md written at all -- an ENOENT, not a
    // HelpBuildError. This is the regression guard for the rethrow on
    // build.js's last line: a real bug or a filesystem problem must never
    // get relabeled as a tidy one-line [ERROR], because that would hide
    // exactly the information (the stack trace) needed to diagnose it.
    const result = runCli();

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ENOENT');
    expect(result.stderr).not.toContain('[ERROR]');
  });
});
