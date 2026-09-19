**What does this change?**

**Why?**

**Checklist**

- [ ] `npm test` passes
- [ ] `npm run format` has been run
- [ ] If this touches parsing (`src/parse.js`), I've tested it against a
      source file with a fenced code block, an indented code block, and a
      nested list — not just a happy-path example
- [ ] If this adds or changes a build type (`src/builders/`), I've added
      `test/builders/<type>.test.js` for what's actually specific to it —
      the registry contract test alone is not enough (see CONTRIBUTING.md)
