/**
 * Spring System Unit Tests
 *
 * Tests for SpringSystem equilibrium, energy conservation, area computation,
 * circularity metrics, and PBT invariants.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SpringSystem,
  DEFAULT_SPRING_CONFIG,
  createControlPointVelocities,
  computePolygonArea,
  computeCircularity,
  enforceAreaConservation,
} from '../../src/core/SpringSystem.js';
import type { SpringConfig } from '../../src/core/SpringSystem.js';
import type { ControlPoint, ControlPointVelocity } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createCircularPoints(count: number, radius: number): ControlPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    radius,
    angle: (i / count) * Math.PI * 2,
    baseRadius: radius,
    targetRadius: radius,
  }));
}

function createDisplacedPoints(count: number, baseRadius: number, displacement: number): ControlPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    radius: baseRadius + displacement,
    angle: (i / count) * Math.PI * 2,
    baseRadius,
    targetRadius: baseRadius,
  }));
}

function createZeroVelocities(count: number): ControlPointVelocity[] {
  return Array.from({ length: count }, () => ({
    radialVelocity: 0,
    angularVelocity: 0,
    pressureVelocity: 0,
  }));
}

// ============================================================================
// SpringSystem Tests
// ============================================================================

describe('SpringSystem', () => {
  let spring: SpringSystem;

  beforeEach(() => {
    spring = new SpringSystem();
  });

  describe('constructor', () => {
    it('should use default config', () => {
      const config = spring.getConfig();
      expect(config.springConstant).toBe(DEFAULT_SPRING_CONFIG.springConstant);
      expect(config.dampingCoeff).toBe(DEFAULT_SPRING_CONFIG.dampingCoeff);
    });

    it('should accept custom config overrides', () => {
      const custom = new SpringSystem({ springConstant: 0.5, dampingCoeff: 0.9 });
      const config = custom.getConfig();

      expect(config.springConstant).toBe(0.5);
      expect(config.dampingCoeff).toBe(0.9);
      // Other values should remain default
      expect(config.couplingStrength).toBe(DEFAULT_SPRING_CONFIG.couplingStrength);
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      spring.setConfig({ springConstant: 0.2 });
      expect(spring.getConfig().springConstant).toBe(0.2);
      // Other values unchanged
      expect(spring.getConfig().dampingCoeff).toBe(DEFAULT_SPRING_CONFIG.dampingCoeff);
    });
  });

  describe('updateControlPoint', () => {
    it('should apply restoring force toward baseRadius', () => {
      const point: ControlPoint = {
        radius: 30, // Above base
        angle: 0,
        baseRadius: 20,
        targetRadius: 20,
      };
      const velocity: ControlPointVelocity = {
        radialVelocity: 0,
        angularVelocity: 0,
        pressureVelocity: 0,
      };
      const neighbor: ControlPoint = {
        radius: 20,
        angle: Math.PI / 4,
        baseRadius: 20,
        targetRadius: 20,
      };

      spring.updateControlPoint(point, velocity, neighbor, neighbor, 0, 0.016);

      // Velocity should be negative (restoring toward base)
      expect(velocity.radialVelocity).toBeLessThan(0);
    });

    it('should clamp velocity to maxVelocity', () => {
      const config: Partial<SpringConfig> = {
        springConstant: 10, // Very high spring constant
        maxVelocity: 1.0,
      };
      const stiffSpring = new SpringSystem(config);

      const point: ControlPoint = {
        radius: 50, // Way above base
        angle: 0,
        baseRadius: 20,
        targetRadius: 20,
      };
      const velocity: ControlPointVelocity = {
        radialVelocity: 0,
        angularVelocity: 0,
        pressureVelocity: 0,
      };
      const neighbor: ControlPoint = {
        radius: 20,
        angle: Math.PI / 4,
        baseRadius: 20,
        targetRadius: 20,
      };

      stiffSpring.updateControlPoint(point, velocity, neighbor, neighbor, 0, 0.016);

      expect(Math.abs(velocity.radialVelocity)).toBeLessThanOrEqual(1.0);
    });

    it('should clamp radius to prevent extreme deformation', () => {
      const point: ControlPoint = {
        radius: 100, // Way beyond limits
        angle: 0,
        baseRadius: 20,
        targetRadius: 20,
      };
      const velocity: ControlPointVelocity = {
        radialVelocity: 10, // Still pushing outward
        angularVelocity: 0,
        pressureVelocity: 0,
      };
      const neighbor: ControlPoint = {
        radius: 20,
        angle: Math.PI / 4,
        baseRadius: 20,
        targetRadius: 20,
      };

      spring.updateControlPoint(point, velocity, neighbor, neighbor, 0, 0.016);

      const maxRadius = 20 * (1 + DEFAULT_SPRING_CONFIG.maxDeformation);
      expect(point.radius).toBeLessThanOrEqual(maxRadius);
    });
  });

  describe('updateAllControlPoints', () => {
    it('should update all points in a circular arrangement', () => {
      const points = createCircularPoints(8, 20);
      const velocities = createZeroVelocities(8);

      // Displace one point
      points[0].radius = 25;

      spring.updateAllControlPoints(points, velocities, 0, 0.016);

      // Displaced point should have non-zero velocity
      expect(velocities[0].radialVelocity).not.toBe(0);
    });

    it('should skip arrays with fewer than 3 points', () => {
      const points = createCircularPoints(2, 20);
      const velocities = createZeroVelocities(2);

      points[0].radius = 25;

      spring.updateAllControlPoints(points, velocities, 0, 0.016);

      // Should be unchanged
      expect(velocities[0].radialVelocity).toBe(0);
    });

    it('should accept per-point external forces array', () => {
      const points = createCircularPoints(8, 20);
      const velocities = createZeroVelocities(8);
      const forces = Array.from({ length: 8 }, () => 0);
      forces[0] = 1.0; // Apply force to first point only

      spring.updateAllControlPoints(points, velocities, forces, 0.016);

      // First point should have more velocity than others
      expect(Math.abs(velocities[0].radialVelocity)).toBeGreaterThan(
        Math.abs(velocities[4].radialVelocity)
      );
    });

    it('should accept single scalar external force', () => {
      const points = createCircularPoints(8, 20);
      const velocities = createZeroVelocities(8);

      spring.updateAllControlPoints(points, velocities, 0.5, 0.016);

      // All points should have similar non-zero velocity
      for (const v of velocities) {
        expect(v.radialVelocity).not.toBe(0);
      }
    });
  });

  describe('applyImpulse', () => {
    it('should create directional deformation', () => {
      const points = createCircularPoints(8, 20);
      const velocities = createZeroVelocities(8);

      spring.applyImpulse(points, velocities, 0, 1.0); // Impulse from the right

      // Point at angle 0 (right side) should be compressed
      expect(velocities[0].radialVelocity).toBeLessThan(0);

      // Point at angle PI (left side) should be expanded
      const oppositeIdx = 4; // 180 degrees
      expect(velocities[oppositeIdx].radialVelocity).toBeGreaterThan(0);
    });
  });

  describe('applyPressure', () => {
    it('should affect all velocities', () => {
      const velocities = createZeroVelocities(8);

      spring.applyPressure(velocities, 1.0);

      for (const v of velocities) {
        expect(v.radialVelocity).not.toBe(0);
      }
    });
  });

  describe('getKineticEnergy', () => {
    it('should return 0 for stationary system', () => {
      const velocities = createZeroVelocities(8);
      expect(spring.getKineticEnergy(velocities)).toBe(0);
    });

    it('should return positive value for moving system', () => {
      const velocities = createZeroVelocities(8);
      velocities[0].radialVelocity = 1.0;

      expect(spring.getKineticEnergy(velocities)).toBeGreaterThan(0);
    });

    it('should compute 0.5 * v^2 for each point', () => {
      const velocities: ControlPointVelocity[] = [
        { radialVelocity: 2, angularVelocity: 0, pressureVelocity: 0 },
      ];

      // KE = 0.5 * 2^2 = 2
      expect(spring.getKineticEnergy(velocities)).toBeCloseTo(2, 5);
    });
  });

  describe('getPotentialEnergy', () => {
    it('should return 0 when all radii at base', () => {
      const points = createCircularPoints(8, 20);
      expect(spring.getPotentialEnergy(points)).toBe(0);
    });

    it('should return positive value when displaced', () => {
      const points = createDisplacedPoints(8, 20, 5);
      expect(spring.getPotentialEnergy(points)).toBeGreaterThan(0);
    });
  });

  describe('isAtRest', () => {
    it('should return true for equilibrium state', () => {
      const points = createCircularPoints(8, 20);
      const velocities = createZeroVelocities(8);

      expect(spring.isAtRest(points, velocities)).toBe(true);
    });

    it('should return false for displaced state', () => {
      const points = createDisplacedPoints(8, 20, 5);
      const velocities = createZeroVelocities(8);
      velocities[0].radialVelocity = 1.0;

      expect(spring.isAtRest(points, velocities)).toBe(false);
    });
  });

  describe('INVARIANT: spring system converges given damping > 0', () => {
    it('should converge to equilibrium with damping', () => {
      const dampedSystem = new SpringSystem({
        springConstant: 0.1,
        dampingCoeff: 0.2,
        couplingStrength: 0.05,
        surfaceTension: 0.02,
      });

      const points = createDisplacedPoints(8, 20, 5);
      const velocities = createZeroVelocities(8);

      // Give initial velocity
      for (const v of velocities) {
        v.radialVelocity = 1.0;
      }

      const initialEnergy = dampedSystem.getKineticEnergy(velocities)
        + dampedSystem.getPotentialEnergy(points);

      // Run many frames
      for (let i = 0; i < 500; i++) {
        dampedSystem.updateAllControlPoints(points, velocities, 0, 0.016);
      }

      const finalEnergy = dampedSystem.getKineticEnergy(velocities)
        + dampedSystem.getPotentialEnergy(points);

      // Energy must decrease
      expect(finalEnergy).toBeLessThan(initialEnergy);

      // Final energy should be very low
      expect(finalEnergy).toBeLessThan(initialEnergy * 0.1);
    });

    it('should bring radii close to baseRadius after many steps', () => {
      const dampedSystem = new SpringSystem({
        springConstant: 0.15,
        dampingCoeff: 0.3,
      });

      const baseRadius = 20;
      const points = createDisplacedPoints(8, baseRadius, 6);
      const velocities = createZeroVelocities(8);

      for (let i = 0; i < 1000; i++) {
        dampedSystem.updateAllControlPoints(points, velocities, 0, 0.016);
      }

      for (const p of points) {
        expect(Math.abs(p.radius - baseRadius)).toBeLessThan(1.0);
      }
    });
  });

  describe('INVARIANT: energy decreases over time with damping', () => {
    it('should monotonically decrease total energy over large intervals', () => {
      const dampedSystem = new SpringSystem({
        springConstant: 0.1,
        dampingCoeff: 0.25,
      });

      const points = createDisplacedPoints(8, 20, 4);
      const velocities = createZeroVelocities(8);
      for (const v of velocities) {
        v.radialVelocity = 1.5;
      }

      const energySamples: number[] = [];

      for (let batch = 0; batch < 5; batch++) {
        for (let i = 0; i < 100; i++) {
          dampedSystem.updateAllControlPoints(points, velocities, 0, 0.016);
        }
        const energy = dampedSystem.getKineticEnergy(velocities)
          + dampedSystem.getPotentialEnergy(points);
        energySamples.push(energy);
      }

      // Energy should generally decrease over batches
      for (let i = 1; i < energySamples.length; i++) {
        expect(energySamples[i]).toBeLessThanOrEqual(energySamples[i - 1] * 1.01);
      }
    });
  });
});

// ============================================================================
// createControlPointVelocities Tests
// ============================================================================

describe('createControlPointVelocities', () => {
  it('should create correct number of velocity objects', () => {
    const velocities = createControlPointVelocities(8);
    expect(velocities).toHaveLength(8);
  });

  it('should initialize radialVelocity to 0', () => {
    const velocities = createControlPointVelocities(4);
    for (const v of velocities) {
      expect(v.radialVelocity).toBe(0);
    }
  });

  it('should initialize small random angularVelocity', () => {
    const velocities = createControlPointVelocities(4);
    for (const v of velocities) {
      expect(Math.abs(v.angularVelocity!)).toBeLessThan(0.001);
    }
  });

  it('should initialize pressureVelocity to 0', () => {
    const velocities = createControlPointVelocities(4);
    for (const v of velocities) {
      expect(v.pressureVelocity).toBe(0);
    }
  });
});

// ============================================================================
// computePolygonArea Tests
// ============================================================================

describe('computePolygonArea', () => {
  it('should compute positive area for valid polygon', () => {
    const points = createCircularPoints(8, 20);
    const area = computePolygonArea(points);

    expect(area).toBeGreaterThan(0);
  });

  it('should approximate circle area for circular points', () => {
    const radius = 20;
    const count = 32; // More points = better approximation
    const points = createCircularPoints(count, radius);
    const area = computePolygonArea(points);

    const expectedArea = Math.PI * radius * radius;
    // Should be within 5% of circle area
    expect(Math.abs(area - expectedArea) / expectedArea).toBeLessThan(0.05);
  });

  it('should return 0 for fewer than 3 points', () => {
    expect(computePolygonArea([])).toBe(0);
    expect(computePolygonArea([
      { radius: 20, angle: 0, baseRadius: 20, targetRadius: 20 },
    ])).toBe(0);
    expect(computePolygonArea([
      { radius: 20, angle: 0, baseRadius: 20, targetRadius: 20 },
      { radius: 20, angle: Math.PI, baseRadius: 20, targetRadius: 20 },
    ])).toBe(0);
  });

  it('INVARIANT: area is always non-negative', () => {
    for (let i = 0; i < 20; i++) {
      const radius = 10 + Math.random() * 30;
      const points = createCircularPoints(8, radius);

      // Randomly perturb radii
      for (const p of points) {
        p.radius *= 0.5 + Math.random();
      }

      expect(computePolygonArea(points)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// computeCircularity Tests
// ============================================================================

describe('computeCircularity', () => {
  it('should return 1.0 for perfect circle', () => {
    const points = createCircularPoints(8, 20);
    expect(computeCircularity(points)).toBeCloseTo(1.0, 2);
  });

  it('should return value between 0 and 1', () => {
    const points = createCircularPoints(8, 20);
    // Deform
    points[0].radius *= 1.5;
    points[4].radius *= 0.5;

    const c = computeCircularity(points);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  it('should return 1.0 for empty array', () => {
    expect(computeCircularity([])).toBe(1.0);
  });

  it('should decrease with more deformation', () => {
    const uniform = createCircularPoints(8, 20);
    const deformed = createCircularPoints(8, 20);
    deformed[0].radius = 30;
    deformed[4].radius = 10;

    const c1 = computeCircularity(uniform);
    const c2 = computeCircularity(deformed);

    expect(c1).toBeGreaterThan(c2);
  });
});

// ============================================================================
// enforceAreaConservation Tests
// ============================================================================

describe('enforceAreaConservation', () => {
  it('should bring area close to target', () => {
    const points = createCircularPoints(8, 20);
    const targetArea = computePolygonArea(points);

    // Expand all radii
    for (const p of points) {
      p.radius *= 1.5;
    }

    enforceAreaConservation(points, targetArea, 0.01);

    const finalArea = computePolygonArea(points);
    expect(Math.abs(finalArea - targetArea) / targetArea).toBeLessThan(0.02);
  });

  it('should not modify points when area is within tolerance', () => {
    const points = createCircularPoints(8, 20);
    const targetArea = computePolygonArea(points);
    const radiiBefore = points.map(p => p.radius);

    enforceAreaConservation(points, targetArea, 0.1);

    const radiiAfter = points.map(p => p.radius);
    expect(radiiAfter).toEqual(radiiBefore);
  });

  it('should scale down when area is too large', () => {
    const points = createCircularPoints(8, 20);
    const smallTarget = computePolygonArea(points) * 0.5;

    enforceAreaConservation(points, smallTarget, 0.01);

    // Radii should be smaller now
    for (const p of points) {
      expect(p.radius).toBeLessThan(20);
    }
  });

  it('should scale up when area is too small', () => {
    const points = createCircularPoints(8, 20);
    const largeTarget = computePolygonArea(points) * 2;

    enforceAreaConservation(points, largeTarget, 0.01);

    // Radii should be larger now
    for (const p of points) {
      expect(p.radius).toBeGreaterThan(20);
    }
  });
});
