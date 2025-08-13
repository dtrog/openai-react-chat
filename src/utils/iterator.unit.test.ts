import { describe, it, expect } from 'vitest';
import { sum } from './iterator.test';

describe('sum (iterator utility)', () => {
  it('returns correct sum for positive numbers', () => {
    expect(sum([10, 20, 30])).toBe(60);
  });
  it('returns 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });
  it('returns correct sum for negative numbers', () => {
    expect(sum([-5, -10, 15])).toBe(0);
  });
  it('handles large arrays', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i + 1); // 1..1000
    expect(sum(arr)).toBe(500500);
  });
});
