import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tests for global responsive and accessibility CSS rules.
 * Verifies the project ships mobile-first styles and a11y helpers
 * without requiring a running browser.
 */

const styles = readFileSync(resolve(__dirname, './styles.css'), 'utf8');

describe('Global styles — responsive', () => {
  it('defines mobile breakpoints at 768px and 480px', () => {
    expect(styles).toContain('@media (max-width: 768px)');
    expect(styles).toContain('@media (max-width: 480px)');
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
    expect(styles).toMatch(/input,\s*textarea,\s*select\s*\{[^}]*font-size:\s*16px/);
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
