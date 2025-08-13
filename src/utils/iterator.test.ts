import { describe, it, expect } from 'vitest';

// Example utility function using an iterator
export function sum(arr: number[]): number {
  let total = 0;
  for (const n of arr) {
    total += n;
  }
  return total;
}

describe('sum', () => {
  it('sums an array of numbers', () => {
    expect(sum([1, 2, 3])).toBe(6);
  });
  it('returns 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });
  it('handles negative numbers', () => {
    expect(sum([-1, 1])).toBe(0);
  });
});
