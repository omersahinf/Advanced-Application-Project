import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Tests for global responsive and accessibility CSS rules.
 * Verifies the project ships mobile-first styles and a11y helpers
 * without requiring a running browser.
 *
 * The global stylesheet is split into partials under `src/styles/`
 * (see angular.json -> styles). We read every `.scss` partial and
 * concat them so the assertions keep working against the shipped
 * source of truth regardless of how the partials are arranged.
 */

const stylesDir = resolve(__dirname, './styles');
const styles = readdirSync(stylesDir)
  .filter((f) => f.endsWith('.scss'))
  .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
  .join('\n');

describe('Global styles — responsive', () => {
  it('defines mobile breakpoints at 768px and 480px', () => {
    // Breakpoints live in _responsive.scss as SCSS variables; mixins emit
    // @media (max-width: ...) queries at 768px and 480px.
    expect(styles).toMatch(/\$bp-md:\s*768px/);
    expect(styles).toMatch(/\$bp-sm:\s*480px/);
  });

  it('provides responsive grid utility', () => {
    expect(styles).toMatch(/\.grid-responsive\s*\{/);
    expect(styles).toContain('auto-fit');
  });

  it('provides responsive table helper for horizontal scroll', () => {
    expect(styles).toMatch(/\.table-responsive\s*\{/);
    expect(styles).toContain('overflow-x: auto');
  });

  it('prevents iOS input zoom with 16px font-size on mobile', () => {
    // Inside the mobile-only override block, inputs get 16px font-size.
    expect(styles).toMatch(/input,\s*textarea,\s*select\s*\{\s*font-size:\s*16px/);
  });

  it('collapses 2-column and 3-column grids on mobile', () => {
    expect(styles).toContain('grid-template-columns: 1fr !important');
  });
});

describe('Global styles — accessibility', () => {
  it('provides sr-only helper for screen-reader-only text', () => {
    expect(styles).toMatch(/\.sr-only\s*\{/);
    expect(styles).toContain('position: absolute');
  });

  it('provides focus-visible outline for keyboard navigation', () => {
    expect(styles).toContain(':focus-visible');
    expect(styles).toMatch(/outline:\s*2px solid/);
  });

  it('respects prefers-reduced-motion', () => {
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toMatch(/animation-duration:\s*0\.001ms/);
  });
});

describe('Global styles — Flower design tokens', () => {
  it('defines the fathom brand color token', () => {
    expect(styles).toMatch(/--fathom:\s*#034f46/);
  });

  it('defines page background and card surface tokens', () => {
    expect(styles).toMatch(/--bg:\s*#e4e4d0/);
    expect(styles).toMatch(/--lumen:\s*#ffffeb/);
  });

  it('defines typography font stacks', () => {
    expect(styles).toMatch(/--sans:\s*'Inter'/);
    expect(styles).toMatch(/--serif:\s*'Georgia'/);
    expect(styles).toMatch(/--mono:\s*'JetBrains Mono'/);
  });
});
