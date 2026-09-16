const path = require('path');

// Every output path in the project resolves through here. Three writers each
// calling path.join(process.cwd(), "help", ...) themselves meant the output
// location was defined in three places and could only ever be the real cwd --
// which is also what makes the writers impossible to point at a temp
// directory in a test, or at a configurable folder from a CLI flag.
function resolvePaths(root) {
  const helpDir = root || path.join(process.cwd(), 'help');

  return {
    helpDir,
    helpFile: path.join(helpDir, 'help.html'),
    pagesDir: path.join(helpDir, 'pages'),
    fieldsDir: path.join(helpDir, 'fields'),
    tooltipsFile: path.join(helpDir, 'fields', 'tooltips.json')
  };
}

module.exports = resolvePaths;
