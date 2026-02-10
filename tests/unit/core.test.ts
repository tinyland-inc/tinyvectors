/**
 * TinyVectors Core Unit Tests
 *
 * Tests for PathGenerator, SpatialHash, and GaussianKernel.
 * Includes both standard unit tests and PBT invariants.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSmoothBlobPath,
  generateSmoothBlobPathSync,
  generateBlobPathsBatch,
  generateBlobPathsBatchSync,
  preInitPathGenerator,
  isPathGeneratorReady,
} from '../../src/core/PathGenerator.js';
import { SpatialHash } from '../../src/core/SpatialHash.js';
import { GaussianKernel } from '../../src/core/GaussianKernel.js';
import type { RenderBlob } from '../../src/core/schema.js';
import type { ConvexBlob, ControlPoint } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestBlob(overrides: Partial<RenderBlob> = {}): RenderBlob {
  return {
    id: 1,
    x: 50,
    y: 50,
    vx: 0,
    vy: 0,
    radius: 20,
    color: 'rgba(100, 100, 200, 0.5)',
    baseX: 50,
    baseY: 50,
    currentX: 50,
    currentY: 50,
    size: 20,
    phase: 0,
    speed: 0.004,
    gradientId: 'blob-1',
    intensity: 0.75,
    stickiness: 2,
    elasticity: 0.0005,
    viscosity: 0.996,
    fluidMass: 0.6,
    scrollAffinity: 0.5,
    isAttractive: true,
    mouseDistance: 100,
    isStuck: false,
    radiusVariations: [],
    ...overrides,
  };
}

function createTestConvexBlob(x: number, y: number, size: number = 25): ConvexBlob {
  const controlPoints: ControlPoint[] = [];
  for (let i = 0; i < 8; i++) {
    controlPoints.push({
      radius: size,
      angle: (i / 8) * Math.PI * 2,
      baseRadius: size,
      targetRadius: size,
    });
  }

  return {
    baseX: x,
    baseY: y,
    currentX: x,
    currentY: y,
    velocityX: 0,
    velocityY: 0,
    size,
    elasticity: 0.0005,
    viscosity: 0.996,
    phase: 0,
    speed: 0.004,
    color: 'hsl(200, 70%, 60%)',
    gradientId: `blob-${x}-${y}`,
    intensity: 0.75,
    stickiness: 2,
    isAttractive: true,
    mouseDistance: 100,
    isStuck: false,
    radiusVariations: [],
    fluidMass: 0.6,
    scrollAffinity: 0.5,
    controlPoints,
    personalSpace: 45,
    repulsionStrength: 0.03,
  };
}

// ============================================================================
// PathGenerator Tests
// ============================================================================

describe('PathGenerator', () => {
  describe('generateSmoothBlobPathSync', () => {
    it('should generate a valid SVG path string', () => {
      const blob = createTestBlob();
      const path = generateSmoothBlobPathSync(blob);

      expect(path).toBeTruthy();
      expect(path).toMatch(/^M /); // Starts with Move command
      expect(path).toMatch(/ Z$/); // Ends with close path
    });

    it('should contain cubic bezier curve commands', () => {
      const blob = createTestBlob();
      const path = generateSmoothBlobPathSync(blob);

      // Should have 8 cubic bezier curves (one for each control point)
      const curveCount = (path.match(/ C /g) || []).length;
      expect(curveCount).toBe(8);
    });

    it('should generate paths centered around blob position', () => {
      const blob = createTestBlob({ currentX: 100, currentY: 100, size: 20 });
      const path = generateSmoothBlobPathSync(blob);

      // Parse first point from M command
      const match = path.match(/^M ([\d.-]+),([\d.-]+)/);
      expect(match).not.toBeNull();

      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);

        // First point should be near the blob center + radius
        expect(Math.abs(x - 100)).toBeLessThan(30);
        expect(Math.abs(y - 100)).toBeLessThan(30);
      }
    });

    it('should produce different paths for different phases', () => {
      const blob1 = createTestBlob({ phase: 0 });
      const blob2 = createTestBlob({ phase: Math.PI });

      const path1 = generateSmoothBlobPathSync(blob1);
      const path2 = generateSmoothBlobPathSync(blob2);

      expect(path1).not.toBe(path2);
    });

    it('should handle zero size gracefully', () => {
      const blob = createTestBlob({ size: 0 });
      const path = generateSmoothBlobPathSync(blob);

      expect(path).toBeTruthy();
      expect(path).toMatch(/^M /);
    });

    it('should handle negative coordinates', () => {
      const blob = createTestBlob({ currentX: -50, currentY: -50 });
      const path = generateSmoothBlobPathSync(blob);

      expect(path).toBeTruthy();
      expect(path).toContain('-');
    });
  });

  describe('generateSmoothBlobPath (async)', () => {
    it('should return the same result as sync version', async () => {
      const blob = createTestBlob();
      const asyncPath = await generateSmoothBlobPath(blob);
      const syncPath = generateSmoothBlobPathSync(blob);

      expect(asyncPath).toBe(syncPath);
    });
  });

  describe('generateBlobPathsBatchSync', () => {
    it('should generate paths for multiple blobs', () => {
      const blobs = [
        createTestBlob({ currentX: 10, currentY: 10 }),
        createTestBlob({ currentX: 50, currentY: 50 }),
        createTestBlob({ currentX: 90, currentY: 90 }),
      ];

      const paths = generateBlobPathsBatchSync(blobs);
      expect(paths).toHaveLength(3);
      paths.forEach(path => {
        expect(path).toMatch(/^M /);
        expect(path).toMatch(/ Z$/);
      });
    });

    it('should handle empty array', () => {
      const paths = generateBlobPathsBatchSync([]);
      expect(paths).toHaveLength(0);
    });
  });

  describe('generateBlobPathsBatch (async)', () => {
    it('should return same results as sync batch', async () => {
      const blobs = [createTestBlob(), createTestBlob({ currentX: 30, currentY: 30 })];

      const asyncPaths = await generateBlobPathsBatch(blobs);
      const syncPaths = generateBlobPathsBatchSync(blobs);

      expect(asyncPaths).toEqual(syncPaths);
    });
  });

  describe('preInitPathGenerator', () => {
    it('should return true (no-op)', async () => {
      const result = await preInitPathGenerator();
      expect(result).toBe(true);
    });
  });

  describe('isPathGeneratorReady', () => {
    it('should always return true', () => {
      expect(isPathGeneratorReady()).toBe(true);
    });
  });
});

// ============================================================================
// SpatialHash Tests
// ============================================================================

describe('SpatialHash', () => {
  describe('constructor', () => {
    it('should create with default cell size', () => {
      const hash = new SpatialHash();
      expect(hash.getCellSize()).toBe(50);
    });

    it('should create with custom cell size', () => {
      const hash = new SpatialHash(100);
      expect(hash.getCellSize()).toBe(100);
    });

    it('should start with zero cells', () => {
      const hash = new SpatialHash();
      expect(hash.getCellCount()).toBe(0);
    });
  });

  describe('rebuild', () => {
    it('should index all blobs', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(10, 10),
        createTestConvexBlob(60, 60),
        createTestConvexBlob(110, 110),
      ];

      hash.rebuild(blobs);
      expect(hash.getCellCount()).toBeGreaterThan(0);
    });

    it('should be idempotent (same cell count on rebuild)', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(10, 10),
        createTestConvexBlob(60, 60),
      ];

      hash.rebuild(blobs);
      const count1 = hash.getCellCount();

      hash.rebuild(blobs);
      const count2 = hash.getCellCount();

      expect(count1).toBe(count2);
    });

    it('should handle empty blob array', () => {
      const hash = new SpatialHash(50);
      hash.rebuild([]);
      expect(hash.getCellCount()).toBe(0);
    });

    it('should group co-located blobs in same cell', () => {
      const hash = new SpatialHash(100);
      const blobs = [
        createTestConvexBlob(10, 10),
        createTestConvexBlob(15, 15),
        createTestConvexBlob(20, 20),
      ];

      hash.rebuild(blobs);
      // All blobs within same 100x100 cell
      expect(hash.getCellCount()).toBe(1);
    });
  });

  describe('query', () => {
    it('should find blobs within radius', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(50, 50),
        createTestConvexBlob(55, 50), // 5 units away
        createTestConvexBlob(200, 200), // Far away
      ];

      hash.rebuild(blobs);
      const results = hash.query(50, 50, 20);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results).toContain(blobs[0]);
      expect(results).toContain(blobs[1]);
    });

    it('should not find distant blobs', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(0, 0),
        createTestConvexBlob(500, 500),
      ];

      hash.rebuild(blobs);
      const results = hash.query(0, 0, 10);

      expect(results).toContain(blobs[0]);
      expect(results).not.toContain(blobs[1]);
    });

    it('should exclude specified blob', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(50, 50),
        createTestConvexBlob(55, 50),
      ];

      hash.rebuild(blobs);
      const results = hash.query(50, 50, 100, blobs[0]);

      expect(results).not.toContain(blobs[0]);
      expect(results).toContain(blobs[1]);
    });

    it('should return empty array when no blobs match', () => {
      const hash = new SpatialHash(50);
      hash.rebuild([]);
      const results = hash.query(50, 50, 10);

      expect(results).toHaveLength(0);
    });
  });

  describe('queryNeighbors', () => {
    it('should find neighboring blobs excluding self', () => {
      const hash = new SpatialHash(50);
      const blobs = [
        createTestConvexBlob(50, 50),
        createTestConvexBlob(55, 50),
        createTestConvexBlob(60, 50),
      ];

      hash.rebuild(blobs);
      const neighbors = hash.queryNeighbors(blobs[0], 100);

      expect(neighbors).not.toContain(blobs[0]);
      expect(neighbors).toContain(blobs[1]);
      expect(neighbors).toContain(blobs[2]);
    });
  });

  describe('getAllPairs', () => {
    it('should find all interacting pairs', () => {
      const hash = new SpatialHash(100);
      const blobs = [
        createTestConvexBlob(10, 10),
        createTestConvexBlob(20, 10),
        createTestConvexBlob(30, 10),
      ];

      // Give unique gradient IDs for pair tracking
      blobs.forEach((b, i) => { b.gradientId = `blob-${i}`; });

      hash.rebuild(blobs);
      const pairs = hash.getAllPairs(50);

      // Should find pairs between close blobs
      expect(pairs.length).toBeGreaterThan(0);

      // Each pair should have distance
      for (const [b1, b2, distance] of pairs) {
        expect(b1).not.toBe(b2);
        expect(distance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not return self-pairs', () => {
      const hash = new SpatialHash(100);
      const blobs = [createTestConvexBlob(50, 50)];

      hash.rebuild(blobs);
      const pairs = hash.getAllPairs(100);

      for (const [b1, b2] of pairs) {
        expect(b1).not.toBe(b2);
      }
    });
  });

  describe('getCell', () => {
    it('should return blobs in specified cell', () => {
      const hash = new SpatialHash(100);
      const blobs = [
        createTestConvexBlob(10, 10),
        createTestConvexBlob(15, 15),
      ];

      hash.rebuild(blobs);
      const cellBlobs = hash.getCell(10, 10);

      expect(cellBlobs.length).toBe(2);
    });

    it('should return empty array for unoccupied cell', () => {
      const hash = new SpatialHash(100);
      hash.rebuild([]);

      const cellBlobs = hash.getCell(999, 999);
      expect(cellBlobs).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all blobs from hash', () => {
      const hash = new SpatialHash(50);
      hash.rebuild([createTestConvexBlob(10, 10)]);
      expect(hash.getCellCount()).toBeGreaterThan(0);

      hash.clear();
      expect(hash.getCellCount()).toBe(0);
    });
  });

  describe('INVARIANT: spatial hash returns superset of brute force', () => {
    it('should return all blobs found by brute force', () => {
      const hash = new SpatialHash(50);
      const blobs = Array.from({ length: 20 }, (_, i) =>
        createTestConvexBlob(
          Math.random() * 200 - 40,
          Math.random() * 200 - 40,
          15 + Math.random() * 20
        )
      );

      hash.rebuild(blobs);

      const queryX = 50;
      const queryY = 50;
      const radius = 60;

      const hashResults = new Set(hash.query(queryX, queryY, radius));

      // Brute force reference
      const bruteForce = blobs.filter(b => {
        const dx = b.currentX - queryX;
        const dy = b.currentY - queryY;
        return Math.sqrt(dx * dx + dy * dy) < radius;
      });

      // Hash must find everything brute force finds
      for (const b of bruteForce) {
        expect(hashResults.has(b)).toBe(true);
      }
    });
  });
});

// ============================================================================
// GaussianKernel Tests
// ============================================================================

describe('GaussianKernel', () => {
  describe('constructor', () => {
    it('should create kernel with odd size', () => {
      const kernel = new GaussianKernel(5, 1.0);
      expect(kernel.getSize()).toBe(5);
    });

    it('should force even size to next odd', () => {
      const kernel = new GaussianKernel(4, 1.0);
      expect(kernel.getSize()).toBe(5);
    });

    it('should use defaults (size=5, sigma=1.0)', () => {
      const kernel = new GaussianKernel();
      expect(kernel.getSize()).toBe(5);
    });
  });

  describe('getWeights', () => {
    it('INVARIANT: weights sum to 1.0 (normalized)', () => {
      const sizes = [3, 5, 7, 9];
      const sigmas = [0.5, 1.0, 2.0, 3.0];

      for (const size of sizes) {
        for (const sigma of sigmas) {
          const kernel = new GaussianKernel(size, sigma);
          const weights = kernel.getWeights();

          let sum = 0;
          for (let i = 0; i < weights.length; i++) {
            sum += weights[i];
          }

          expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
        }
      }
    });

    it('INVARIANT: kernel is symmetric', () => {
      const kernel = new GaussianKernel(7, 1.5);
      const weights = kernel.getWeights();
      const n = weights.length;

      for (let i = 0; i < Math.floor(n / 2); i++) {
        expect(Math.abs(weights[i] - weights[n - 1 - i])).toBeLessThan(0.0001);
      }
    });

    it('should have center weight as maximum', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const weights = kernel.getWeights();
      const center = Math.floor(weights.length / 2);

      for (let i = 0; i < weights.length; i++) {
        expect(weights[center]).toBeGreaterThanOrEqual(weights[i]);
      }
    });

    it('should have all positive weights', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const weights = kernel.getWeights();

      for (let i = 0; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThan(0);
      }
    });
  });

  describe('convolve', () => {
    it('should not modify uniform radii', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const uniformRadius = 20;
      const points: ControlPoint[] = Array.from({ length: 8 }, (_, i) => ({
        radius: uniformRadius,
        angle: (i / 8) * Math.PI * 2,
        baseRadius: uniformRadius,
        targetRadius: uniformRadius,
      }));

      kernel.convolve(points);

      for (const p of points) {
        expect(Math.abs(p.radius - uniformRadius)).toBeLessThan(0.001);
      }
    });

    it('INVARIANT: smoothing reduces radius variance', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const points: ControlPoint[] = Array.from({ length: 8 }, (_, i) => ({
        radius: 20 + Math.sin(i * 3) * 5, // Non-uniform
        angle: (i / 8) * Math.PI * 2,
        baseRadius: 20,
        targetRadius: 20,
      }));

      const radiiBefore = points.map(p => p.radius);
      const varianceBefore = GaussianKernel.computeVariance(radiiBefore);

      kernel.convolve(points);

      const radiiAfter = points.map(p => p.radius);
      const varianceAfter = GaussianKernel.computeVariance(radiiAfter);

      expect(varianceAfter).toBeLessThanOrEqual(varianceBefore * 1.01);
    });

    it('INVARIANT: smoothing preserves mean radius', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const points: ControlPoint[] = Array.from({ length: 8 }, (_, i) => ({
        radius: 20 + (i % 2 === 0 ? 3 : -3),
        angle: (i / 8) * Math.PI * 2,
        baseRadius: 20,
        targetRadius: 20,
      }));

      const meanBefore = points.reduce((s, p) => s + p.radius, 0) / points.length;

      kernel.convolve(points);

      const meanAfter = points.reduce((s, p) => s + p.radius, 0) / points.length;

      expect(Math.abs(meanAfter - meanBefore)).toBeLessThan(0.01);
    });

    it('should skip arrays with fewer than 3 points', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const points: ControlPoint[] = [
        { radius: 10, angle: 0, baseRadius: 10, targetRadius: 10 },
        { radius: 20, angle: Math.PI, baseRadius: 20, targetRadius: 20 },
      ];

      const radii = points.map(p => p.radius);
      kernel.convolve(points);

      expect(points[0].radius).toBe(radii[0]);
      expect(points[1].radius).toBe(radii[1]);
    });
  });

  describe('convolveArray', () => {
    it('should produce same results as convolve on ControlPoints', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const baseRadii = [18, 22, 19, 21, 20, 23, 17, 24];
      const count = baseRadii.length;

      // Method 1: convolveArray
      const inputArray = new Float32Array(baseRadii);
      const resultArray = kernel.convolveArray(inputArray, count);

      // Method 2: convolve (on ControlPoints)
      const points: ControlPoint[] = baseRadii.map((r, i) => ({
        radius: r,
        angle: (i / count) * Math.PI * 2,
        baseRadius: r,
        targetRadius: r,
      }));
      kernel.convolve(points);

      for (let i = 0; i < count; i++) {
        expect(Math.abs(resultArray[i] - points[i].radius)).toBeLessThan(0.001);
      }
    });

    it('should return a new Float32Array of correct length', () => {
      const kernel = new GaussianKernel(5, 1.0);
      const input = new Float32Array([10, 20, 30, 40, 50]);
      const result = kernel.convolveArray(input, 5);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(5);
      expect(result).not.toBe(input); // New array
    });
  });

  describe('computeVariance (static)', () => {
    it('should return 0 for empty array', () => {
      expect(GaussianKernel.computeVariance([])).toBe(0);
    });

    it('should return 0 for uniform values', () => {
      expect(GaussianKernel.computeVariance([5, 5, 5, 5])).toBe(0);
    });

    it('should compute correct variance', () => {
      // [1, 3] -> mean=2, variance = ((1-2)^2 + (3-2)^2) / 2 = 1
      expect(GaussianKernel.computeVariance([1, 3])).toBeCloseTo(1, 5);
    });

    it('should work with Float32Array', () => {
      const arr = new Float32Array([1, 3]);
      expect(GaussianKernel.computeVariance(arr)).toBeCloseTo(1, 3);
    });
  });
});
