import { describe, it, expect } from 'vitest';

const builders = require('../src/builders');
const validateBuild = require('../src/validation/validateBuild');

// This file is the safety net under the honor system described in
// CONTRIBUTING.md: a PR that adds a new build type is supposed to add its
// own tests too, but a reviewer can miss that at 11pm. This test doesn't
// rely on anyone remembering. It loops over whatever is actually
// registered in src/builders/index.js -- today just 'standard', someday
// 'standard' plus 'sidebar' plus whatever comes after -- and holds every
// one of them to the baseline contract documented at the top of
// src/builders/standard.js. Add a new file to src/builders/ and one line
// to the registry, and this test starts covering it automatically, with
// zero changes needed here.
//
// This is a FLOOR, not a substitute for type-specific tests. A real
// sidebar builder still needs its own test file asserting on nav markup,
// page ordering, whatever is actually new about it. This only guarantees
// that whatever gets added doesn't break the one thing every build type
// must do regardless of layout: take escaped input, hand back a valid,
// non-throwing HTML document containing that input.

const buildTypes = Object.keys(builders);

const fixture = {
  title: 'Test &amp; Title',
  body: '<h1 id="test">Test &amp; Title</h1>\n<p>Body content goes here.</p>',
  cssPath: '/styles/help.css'
};

describe.each(buildTypes)('builder registry contract: %s', buildType => {
  const build = builders[buildType];

  it('is a function', () => {
    expect(typeof build).toBe('function');
  });

  it('does not throw given the standard { title, body, cssPath } shape', () => {
    expect(() => build(fixture)).not.toThrow();
  });

  it('returns a non-empty string', () => {
    const result = build(fixture);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a complete HTML document', () => {
    const result = build(fixture);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html');
    expect(result).toContain('</html>');
  });

  it('includes the given title', () => {
    expect(build(fixture)).toContain(fixture.title);
  });

  it('includes the given body content', () => {
    expect(build(fixture)).toContain(fixture.body);
  });

  it('includes the given css path when one is provided', () => {
    expect(build(fixture)).toContain(fixture.cssPath);
  });

  it('does not throw and produces valid output when cssPath is null', () => {
    const result = build({ ...fixture, cssPath: null });

    expect(typeof result).toBe('string');
    expect(result).toContain('<html');
  });

  it("is registered in validateBuild's allowlist (the two cannot drift apart)", () => {
    expect(() => validateBuild(buildType, 0)).not.toThrow();
  });
});

describe('builder registry: general shape', () => {
  it('is not empty -- at least one build type must exist', () => {
    expect(buildTypes.length).toBeGreaterThan(0);
  });

  it('includes the V1 standard layout', () => {
    expect(buildTypes).toContain('standard');
  });
});
