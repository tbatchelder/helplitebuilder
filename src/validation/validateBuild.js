function validateBuild(buildType, lineCount) {

  const validBuildTypes = [
    "standard"
    // "standard",
    // "sidebar",
    // "hamburger"
  ];

  if (!buildType) {
    console.error(
      "[ERROR] Missing build type."
    );

    process.exit(1);
  }

  if (!validBuildTypes.includes(buildType)) {
    console.error(
      `[ERROR] Invalid build type '${buildType}' at line '${lineCount + 1}'.`
    );

    process.exit(1);
  }

}

module.exports = validateBuild;