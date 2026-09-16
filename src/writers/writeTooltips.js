const fs = require('fs');

const resolvePaths = require('../paths');

function writeTooltips(tooltips, paths = resolvePaths()) {
  if (!tooltips || Object.keys(tooltips).length === 0) {
    console.warn('[WARN] No tooltips found.');

    return;
  }

  fs.mkdirSync(paths.fieldsDir, {
    recursive: true
  });

  fs.writeFileSync(paths.tooltipsFile, JSON.stringify(tooltips, null, 2), 'utf8');

  console.log(`[INFO] Tooltips written: ${paths.tooltipsFile}`);
}

module.exports = writeTooltips;
