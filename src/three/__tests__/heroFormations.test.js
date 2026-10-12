import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../heroFormations.js';

const KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz'];

describe('hero formations', () => {
  it('has at least five distinct formations', () => {
    expect(FORMATIONS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(FORMATIONS.map((f) => f.name)).size).toBe(FORMATIONS.length);
  });

  for (const n of [5, 7]) {
    it(`produces finite, in-frame poses for ${n} cards`, () => {
      for (const f of FORMATIONS) {
        for (let t = 0; t <= f.hold + 1.5; t += 0.25) {
          for (let i = 0; i < n; i++) {
            const p = f.pose(i, n, t, 1);
            for (const k of KEYS) expect(Number.isFinite(p[k])).toBe(true);
            expect(Math.abs(p.x)).toBeLessThan(2.6);
            expect(Math.abs(p.y)).toBeLessThan(2);
            expect(typeof p.card).toBe('string');
          }
        }
      }
    });
  }

  it('changes the cards on show between formations', () => {
    const hands = FORMATIONS.map((f) => [0, 1, 2, 3, 4].map((i) => f.pose(i, 5, 0, 1).card).join());
    expect(new Set(hands).size).toBe(FORMATIONS.length);
  });
});
