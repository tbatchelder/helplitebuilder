import { describe, it, expect } from 'vitest';

const buildStandard = require('../src/builders/standard');

describe('builders/standard', () => {
  it('omits the <link> tag entirely when cssPath is null', () => {
    const html = buildStandard({ title: 'T', body: '<p>x</p>', cssPath: null });

    expect(html).not.toContain('<link');
  });

  it('includes a stylesheet link when cssPath is given', () => {
    const html = buildStandard({ title: 'T', body: '<p>x</p>', cssPath: '/s.css' });

    expect(html).toContain('<link rel="stylesheet" href="/s.css">');
  });

  it('places the body between <body> and </body>', () => {
    const html = buildStandard({ title: 'T', body: '<p>unique-marker</p>', cssPath: null });

    const bodyStart = html.indexOf('<body>');
    const bodyEnd = html.indexOf('</body>');
    const markerIndex = html.indexOf('unique-marker');

    expect(markerIndex).toBeGreaterThan(bodyStart);
    expect(markerIndex).toBeLessThan(bodyEnd);
  });

  it('has no navigation markup -- this is the plain scrolling layout', () => {
    const html = buildStandard({ title: 'T', body: '<p>x</p>', cssPath: null });

    expect(html).not.toContain('<nav');
    expect(html).not.toContain('<aside');
  });
});
