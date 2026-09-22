const fs = require('fs');
const path = require('path');

const HelpBuildError = require('./errors');

const templateFile = path.join(__dirname, '..', 'templates', 'help.md');

// Scaffolds help-source/ in a consumer's project and copies the starter
// template into help-source/help.md. Deliberately built the way buildHelp()
// SHOULD have been built from the start: a real function taking its target
// directory as an argument, not a script that touches process.cwd()
// directly -- testable against a temp directory from day one, no retrofit
// needed the way build.js required.
//
// __dirname here always points at wherever this package's own files
// actually live -- inside a consumer's node_modules/helplite-builder/ once
// this is installed as a real dependency, same as it does in this repo
// during development. That's what makes templates/help.md resolve
// correctly either way, with no separate copy-into-place step at publish
// time. It does mean templates/ must never be excluded if a `files`
// allowlist is ever added to package.json for publishing -- worth
// remembering when that day comes.
function initHelp({ targetDir, force = false } = {}) {
  const resolvedTargetDir = targetDir || process.cwd();

  const helpSourceDir = path.join(resolvedTargetDir, 'help-source');

  const destFile = path.join(helpSourceDir, 'help.md');

  if (fs.existsSync(destFile) && !force) {
    throw new HelpBuildError(`${destFile} already exists. Re-run with --force to overwrite it.`);
  }

  fs.mkdirSync(helpSourceDir, { recursive: true });

  const template = fs.readFileSync(templateFile, 'utf8');

  fs.writeFileSync(destFile, template, 'utf8');

  console.log(`[INFO] Created ${destFile}`);

  return destFile;
}

module.exports = initHelp;
