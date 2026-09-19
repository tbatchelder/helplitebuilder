// The registry: the single place that knows which @build(type) values
// exist and which function builds each one's HTML document. Adding a new
// build type means adding one file to this folder and one line below --
// nothing else in the codebase needs to change to find it.
//
// validateBuild derives its allowlist directly from these keys (see
// src/validation/validateBuild.js), so the parser's accepted @build()
// values and the builders that actually exist can never drift apart --
// there is exactly one list, not two hand-maintained ones.
const standard = require('./standard');

module.exports = {
  standard
};
