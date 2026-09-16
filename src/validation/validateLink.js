function validateLink(cssPath, lineCount) {

  if (cssPath === null) {
    return;
  }

  if (!cssPath.trim()) {
    console.error(
      `[ERROR] Empty CSS path at line '${lineCount + 1}'.`
    );

    process.exit(1);
  }

  if (!/\.css($|\?)/.test(cssPath)) {
    console.error(
        `[ERROR] CSS path '${cssPath}' must end with '.css' at line '${lineCount + 1}'.`
    );

    process.exit(1);
  }  
}

module.exports = validateLink;