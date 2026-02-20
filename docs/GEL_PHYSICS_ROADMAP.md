# TinyVectors Gel Physics Optimization Roadmap

**Created**: 2026-01-14
**Status**: Technical Analysis Complete

---

## Executive Summary

The current BlobPhysics implementation has **critical architectural gaps** preventing true gel-like behavior. The deformation model is **sinusoidal (fake physics)** rather than pressure-driven. Performance is **O(n²)** for collision detection with no spatial partitioning. All computation runs on the **main thread**, causing jank at higher blob counts.

---

## Current State Analysis

### What Works
- ✅ Basic anti-clustering (blobs repel each other)
- ✅ Wall bouncing with chaos injection
- ✅ Territory-based movement
- ✅ Convex hull path generation (prevents self-intersection)
- ✅ Control point smoothing (basic averaging)

### Critical Gaps

| Component | Current State | Required State |
|-----------|--------------|----------------|
| **Deformation model** | Sinusoidal pulsing (`Math.sin(time)`) | Pressure-driven spring system |
| **Surface tension** | Property exists, never applied | Active force toward circular shape |
| **Neighbor coupling** | None | Spring forces between adjacent control points |
| **Smoothing** | 3-point average | Gaussian kernel convolution |
| **Collision detection** | O(n²) brute force | Spatial hash O(n) average |
| **Threading** | Main thread only | Web Worker for physics |
| **Memory** | New arrays every frame | Object pooling + TypedArrays |

---

## Phase 1: True Gel Physics Model

### 1.1 Control Point Spring System

Current deformation is **decorative**, not physical:

```typescript
// CURRENT: Fake sinusoidal pulsing
const pulseAmount = Math.sin(time * 0.15) * 0.02;
point.radius = point.baseRadius * (1 + pulseAmount);
```

Required: **Mass-spring-damper system** per control point:

```typescript
interface GelControlPoint {
  // Position (polar from blob center)
  radius: number;
  angle: number;
  baseRadius: number;

  // Dynamics
  radialVelocity: number;
  angularVelocity: number;

  // Physical properties
  pressure: number;           // Internal hydrostatic pressure
  surfaceTension: number;     // γ (N/m) - force toward neighbors
  springConstant: number;     // k - stiffness to base radius
  dampingCoeff: number;       // c - velocity damping

  // Neighbor coupling (indices into controlPoints array)
  leftNeighbor: number;
  rightNeighbor: number;
  couplingStrength: number;   // Spring constant between neighbors
}

function updateGelControlPoint(
  point: GelControlPoint,
  neighbors: { left: GelControlPoint; right: GelControlPoint },
  externalForce: { radial: number; tangential: number },
  dt: number
): void {
  // 1. Spring force to base radius (restoring force)
  const F_spring = -point.springConstant * (point.radius - point.baseRadius);

  // 2. Surface tension (pull toward average of neighbors)
  const avgNeighborRadius = (neighbors.left.radius + neighbors.right.radius) / 2;
  const F_tension = point.surfaceTension * (avgNeighborRadius - point.radius);

  // 3. Pressure force (push outward uniformly)
  const F_pressure = point.pressure * 0.01;

  // 4. Neighbor coupling (spring to neighbors)
  const F_leftCoupling = point.couplingStrength * (neighbors.left.radius - point.radius);
  const F_rightCoupling = point.couplingStrength * (neighbors.right.radius - point.radius);
  const F_coupling = (F_leftCoupling + F_rightCoupling) * 0.5;

  // 5. Damping (viscosity)
  const F_damping = -point.dampingCoeff * point.radialVelocity;

  // 6. External forces (gravity, collisions, accelerometer)
  const F_external = externalForce.radial;

  // Total force
  const F_total = F_spring + F_tension + F_pressure + F_coupling + F_damping + F_external;

  // Update velocity (F = ma, assume m = 1)
  point.radialVelocity += F_total * dt;

  // Update position
  point.radius += point.radialVelocity * dt;

  // Clamp to prevent explosion
  const minRadius = point.baseRadius * 0.7;
  const maxRadius = point.baseRadius * 1.3;
  point.radius = Math.max(minRadius, Math.min(maxRadius, point.radius));
}
```

### 1.2 Gaussian Kernel Smoothing

Current smoothing is **simple averaging**:

```typescript
// CURRENT: 3-point average
const avgRadius = (prev.radius + current.radius + next.radius) / 3;
current.radius = lerp(current.radius, avgRadius, 0.05);
```

Required: **Proper Gaussian kernel convolution**:

```typescript
class GaussianKernel {
  private weights: Float32Array;
  private halfSize: number;

  constructor(size: number = 5, sigma: number = 1.0) {
    this.halfSize = Math.floor(size / 2);
    this.weights = new Float32Array(size);

    // Compute Gaussian weights
    let sum = 0;
    for (let i = 0; i < size; i++) {
      const x = i - this.halfSize;
      const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
      this.weights[i] = weight;
      sum += weight;
    }

    // Normalize
    for (let i = 0; i < size; i++) {
      this.weights[i] /= sum;
    }
  }

  /**
   * Convolve control point radii (circular buffer)
   * Preserves total area (mass conservation)
   */
  convolve(points: ControlPoint[]): void {
    const n = points.length;
    const originalRadii = new Float32Array(n);

    // Copy original values
    for (let i = 0; i < n; i++) {
      originalRadii[i] = points[i].radius;
    }

    // Apply kernel
    for (let i = 0; i < n; i++) {
      let smoothedRadius = 0;

      for (let j = 0; j < this.weights.length; j++) {
        const idx = (i + j - this.halfSize + n) % n; // Circular wrap
        smoothedRadius += originalRadii[idx] * this.weights[j];
      }

      points[i].radius = smoothedRadius;
    }
  }
}
```

### 1.3 Area Conservation (Incompressible Gel)

Gels are incompressible - total area must remain constant:

```typescript
function enforceAreaConservation(blob: ConvexBlob): void {
  const targetArea = Math.PI * blob.size * blob.size; // Circle area
  const currentArea = computePolygonArea(blob.controlPoints);

  if (Math.abs(currentArea - targetArea) > 0.01 * targetArea) {
    // Scale all radii uniformly to conserve area
    const scaleFactor = Math.sqrt(targetArea / currentArea);

    for (const point of blob.controlPoints) {
      point.radius *= scaleFactor;
      point.baseRadius *= scaleFactor; // Also adjust base to prevent drift
    }
  }
}

function computePolygonArea(points: ControlPoint[]): number {
  // Shoelace formula for polygon area
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = polarToCartesian(points[i]);
    const p2 = polarToCartesian(points[(i + 1) % n]);
    area += p1.x * p2.y - p2.x * p1.y;
  }

  return Math.abs(area) / 2;
}
```

---

## Phase 2: Performance Optimization

### 2.1 Spatial Hash for O(n) Collision Detection

Current anti-clustering is **O(n²)**:

```typescript
// CURRENT: Compare every pair
for (let i = 0; i < blobs.length; i++) {
  for (let j = i + 1; j < blobs.length; j++) {
    // O(n²) comparisons
  }
}
```

Required: **Spatial hash** for O(n) average:

```typescript
class SpatialHash {
  private cellSize: number;
  private cells: Map<string, ConvexBlob[]>;

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private hash(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  rebuild(blobs: ConvexBlob[]): void {
    this.cells.clear();

    for (const blob of blobs) {
      const key = this.hash(blob.currentX, blob.currentY);

      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key)!.push(blob);
    }
  }

  queryNeighbors(blob: ConvexBlob, radius: number): ConvexBlob[] {
    const neighbors: ConvexBlob[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    const centerCellX = Math.floor(blob.currentX / this.cellSize);
    const centerCellY = Math.floor(blob.currentY / this.cellSize);

    // Check adjacent cells only
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerCellX + dx},${centerCellY + dy}`;
        const cell = this.cells.get(key);

        if (cell) {
          for (const other of cell) {
            if (other !== blob) {
              const dist = Math.hypot(
                other.currentX - blob.currentX,
                other.currentY - blob.currentY
              );
              if (dist < radius) {
                neighbors.push(other);
              }
            }
          }
        }
      }
    }

    return neighbors;
  }
}
```

### 2.2 Object Pooling

Current: **New objects every frame**

```typescript
// CURRENT: Creates new array and objects each frame
return this.blobs.map((blob, i) => ({
  ...blob,
  color: themeColors[i % themeColors.length],
}));
```

Required: **Reuse objects**

```typescript
class BlobPool {
  private pool: ConvexBlob[] = [];
  private activeCount = 0;

  acquire(): ConvexBlob {
    if (this.activeCount < this.pool.length) {
      return this.pool[this.activeCount++];
    }

    const blob = this.createBlob();
    this.pool.push(blob);
    this.activeCount++;
    return blob;
  }

  releaseAll(): void {
    this.activeCount = 0;
  }

  // For rendering - reuse same array, just update values
  updateRenderData(blob: ConvexBlob, color: string): void {
    blob.color = color; // Mutate in place
  }
}
```

### 2.3 TypedArrays for Hot Paths

```typescript
// For WASM interop and SIMD optimization
interface BlobPhysicsState {
  positions: Float32Array;   // [x0, y0, x1, y1, ...]
  velocities: Float32Array;  // [vx0, vy0, vx1, vy1, ...]
  radii: Float32Array;       // Control point radii (flattened)

  // Sizes
  blobCount: number;
  controlPointsPerBlob: number;
}
```

---

## Phase 3: Web Worker Architecture

### 3.1 Worker Thread Design

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│      Main Thread            │     │     Physics Worker          │
│                             │     │                             │
│  TinyVectors.svelte         │     │  BlobPhysics instance       │
│  ├─ Receives blob data      │◄───►│  ├─ Spatial hash            │
│  ├─ Renders SVG             │     │  ├─ Gaussian kernel         │
│  └─ Handles user input      │     │  └─ Spring system           │
│                             │     │                             │
│  Input events ──────────────┼────►│  Accelerometer data         │
│                             │     │  Scroll events              │
│  Blob positions ◄───────────┼─────│  Tick at 60fps              │
│                             │     │                             │
└─────────────────────────────┘     └─────────────────────────────┘
```

### 3.2 Message Protocol

```typescript
// src/workers/physics.worker.ts

type WorkerMessage =
  | { type: 'init'; blobCount: number; config: BlobPhysicsConfig }
  | { type: 'tick' }
  | { type: 'setGravity'; x: number; y: number }
  | { type: 'setTilt'; x: number; y: number; z: number }
  | { type: 'dispose' };

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'frame'; blobs: BlobRenderData[] }
  | { type: 'error'; message: string };

// Minimal render data (not full ConvexBlob)
interface BlobRenderData {
  x: number;
  y: number;
  controlPointRadii: number[];  // Just radii, angles computed from index
  gradientId: string;
}

let physics: BlobPhysics | null = null;
let lastTime = performance.now();

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  switch (e.data.type) {
    case 'init':
      physics = new BlobPhysics(e.data.blobCount, e.data.config);
      physics.init().then(() => {
        self.postMessage({ type: 'ready' });
      });
      break;

    case 'tick':
      if (!physics) return;

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      physics.tick(dt, now / 1000);

      // Send minimal render data
      const renderData = physics.getRenderData();
      self.postMessage({ type: 'frame', blobs: renderData });
      break;

    case 'setGravity':
      physics?.setGravity({ x: e.data.x, y: e.data.y });
      break;

    case 'setTilt':
      physics?.setTilt({ x: e.data.x, y: e.data.y, z: e.data.z });
      break;

    case 'dispose':
      physics?.dispose();
      physics = null;
      break;
  }
};
```

### 3.3 Svelte 5 Integration

```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import { browser } from '../core/browser.js';

  let blobs = $state.raw<BlobRenderData[]>([]);
  let worker: Worker | null = null;

  $effect(() => {
    if (!browser || !shouldLoad) return;

    untrack(() => {
      worker = new Worker(
        new URL('../workers/physics.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        if (e.data.type === 'frame') {
          // $state.raw for bulk array updates
          blobs = e.data.blobs;
        }
      };

      worker.postMessage({
        type: 'init',
        blobCount,
        config: physicsConfig
      });
    });

    return () => {
      worker?.postMessage({ type: 'dispose' });
      worker?.terminate();
    };
  });

  // Animation loop just requests ticks
  $effect(() => {
    if (!worker || !animated) return;

    let frame: number;

    const tick = () => {
      worker!.postMessage({ type: 'tick' });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  });
</script>
```

---

## Phase 4: WASM Hot Paths (Optional)

### 4.1 Candidate Functions for WASM

| Function | Current Cost | WASM Benefit |
|----------|-------------|--------------|
| `applyEnhancedAntiClustering()` | O(n²) | SIMD parallel distance calc |
| `GaussianKernel.convolve()` | O(n×k) | SIMD multiply-accumulate |
| `generateConvexHull()` | O(n²) | Faster array iteration |
| `smoothControlPoints()` | O(n) | SIMD averaging |

### 4.2 Rust WASM Module

```rust
// wasm/gel-physics/src/lib.rs

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GelPhysics {
    positions: Vec<f32>,      // [x0, y0, x1, y1, ...]
    velocities: Vec<f32>,
    control_radii: Vec<f32>,  // Flattened control point radii

    blob_count: usize,
    control_points_per_blob: usize,

    // Precomputed
    gaussian_kernel: Vec<f32>,
    spatial_cells: Vec<Vec<usize>>,
}

#[wasm_bindgen]
impl GelPhysics {
    #[wasm_bindgen(constructor)]
    pub fn new(blob_count: usize, control_points: usize) -> Self {
        Self {
            positions: vec![0.0; blob_count * 2],
            velocities: vec![0.0; blob_count * 2],
            control_radii: vec![0.0; blob_count * control_points],
            blob_count,
            control_points_per_blob: control_points,
            gaussian_kernel: Self::compute_gaussian_kernel(5, 1.0),
            spatial_cells: Vec::new(),
        }
    }

    /// Hot path: Apply Gaussian smoothing to all control points
    pub fn smooth_all_control_points(&mut self) {
        let n = self.control_points_per_blob;
        let kernel = &self.gaussian_kernel;
        let half_k = kernel.len() / 2;

        for blob_idx in 0..self.blob_count {
            let start = blob_idx * n;
            let end = start + n;

            // Copy original radii
            let original: Vec<f32> = self.control_radii[start..end].to_vec();

            // Apply kernel with circular wrap
            for i in 0..n {
                let mut sum = 0.0;
                for (j, &weight) in kernel.iter().enumerate() {
                    let idx = (i + j + n - half_k) % n;
                    sum += original[idx] * weight;
                }
                self.control_radii[start + i] = sum;
            }
        }
    }

    /// Hot path: Spatial hash anti-clustering
    pub fn apply_anti_clustering(&mut self, cell_size: f32, repulsion_radius: f32) {
        // Rebuild spatial hash
        self.rebuild_spatial_hash(cell_size);

        // Apply repulsion using spatial queries
        for i in 0..self.blob_count {
            let neighbors = self.query_spatial_neighbors(i, repulsion_radius);

            for j in neighbors {
                if j <= i { continue; } // Avoid double processing

                let dx = self.positions[j * 2] - self.positions[i * 2];
                let dy = self.positions[j * 2 + 1] - self.positions[i * 2 + 1];
                let dist = (dx * dx + dy * dy).sqrt();

                if dist < repulsion_radius && dist > 0.0 {
                    let force = (repulsion_radius - dist) / repulsion_radius * 0.05;
                    let nx = dx / dist;
                    let ny = dy / dist;

                    self.velocities[i * 2] -= nx * force;
                    self.velocities[i * 2 + 1] -= ny * force;
                    self.velocities[j * 2] += nx * force;
                    self.velocities[j * 2 + 1] += ny * force;
                }
            }
        }
    }

    fn compute_gaussian_kernel(size: usize, sigma: f32) -> Vec<f32> {
        let mut kernel = vec![0.0; size];
        let half = (size / 2) as f32;
        let mut sum = 0.0;

        for i in 0..size {
            let x = i as f32 - half;
            let weight = (-x * x / (2.0 * sigma * sigma)).exp();
            kernel[i] = weight;
            sum += weight;
        }

        // Normalize
        for w in &mut kernel {
            *w /= sum;
        }

        kernel
    }
}
```

---

## Phase 5: Property-Based Testing

### 5.1 Gel Physics Invariants

```typescript
// tests/pbt/gel-physics-invariants.test.ts

import { describe } from 'vitest';
import { it } from '@fast-check/vitest';
import * as fc from 'fast-check';

describe('Gel Physics Invariants', () => {
  it.prop([blobArb, dtArb])(
    'INVARIANT: Area conserved after deformation (incompressible)',
    (blob, dt) => {
      const areaBefore = computePolygonArea(blob.controlPoints);

      physics.updateGelPhysics(blob, dt);
      enforceAreaConservation(blob);

      const areaAfter = computePolygonArea(blob.controlPoints);

      // Within 1% tolerance
      return Math.abs(areaAfter - areaBefore) / areaBefore < 0.01;
    }
  );

  it.prop([blobArb, forceArb])(
    'INVARIANT: External force causes deformation in force direction',
    (blob, force) => {
      const centerBefore = computeCentroid(blob.controlPoints);

      applyExternalForce(blob, force);
      physics.updateGelPhysics(blob, 0.016);

      const centerAfter = computeCentroid(blob.controlPoints);
      const displacement = {
        x: centerAfter.x - centerBefore.x,
        y: centerAfter.y - centerBefore.y
      };

      // Displacement should be in same general direction as force
      const dot = displacement.x * force.x + displacement.y * force.y;
      const forceMag = Math.hypot(force.x, force.y);

      return forceMag < 0.001 || dot >= 0;
    }
  );

  it.prop([blobArb, kernelArb])(
    'INVARIANT: Gaussian smoothing reduces radius variance',
    (blob, kernelSize) => {
      const varianceBefore = computeRadiusVariance(blob.controlPoints);

      const kernel = new GaussianKernel(kernelSize, 1.0);
      kernel.convolve(blob.controlPoints);

      const varianceAfter = computeRadiusVariance(blob.controlPoints);

      return varianceAfter <= varianceBefore * 1.01; // Allow tiny numerical error
    }
  );

  it.prop([blobArb])(
    'INVARIANT: Surface tension pulls toward circular shape',
    (blob) => {
      // Deform blob away from circular
      const deformAmount = 0.3;
      blob.controlPoints.forEach((p, i) => {
        p.radius *= 1 + Math.sin(i * 2) * deformAmount;
      });

      const circularityBefore = computeCircularity(blob);

      // Run many frames with high surface tension
      for (let i = 0; i < 200; i++) {
        physics.updateGelPhysics(blob, 0.016);
      }

      const circularityAfter = computeCircularity(blob);

      // Should be more circular (closer to 1.0)
      return circularityAfter >= circularityBefore - 0.05;
    }
  );
});

describe('Spatial Hash Invariants', () => {
  it.prop([blobsArb, queryPositionArb, queryRadiusArb])(
    'INVARIANT: Spatial hash returns superset of brute force results',
    (blobs, pos, radius) => {
      const hash = new SpatialHash(50);
      hash.rebuild(blobs);

      const hashResults = new Set(
        hash.queryNeighbors({ currentX: pos.x, currentY: pos.y }, radius)
      );

      const bruteForceResults = blobs.filter(b =>
        Math.hypot(b.currentX - pos.x, b.currentY - pos.y) < radius
      );

      // Hash must return at least everything brute force finds
      return bruteForceResults.every(b => hashResults.has(b));
    }
  );
});

describe('Spring System Invariants', () => {
  it.prop([controlPointArb, dtArb])(
    'INVARIANT: Spring force proportional to displacement',
    (point, dt) => {
      const displacement = point.radius - point.baseRadius;

      const forceSmall = computeSpringForce({ ...point, radius: point.baseRadius + 0.1 });
      const forceLarge = computeSpringForce({ ...point, radius: point.baseRadius + 0.2 });

      // Force should roughly double when displacement doubles
      const ratio = Math.abs(forceLarge / forceSmall);
      return ratio > 1.8 && ratio < 2.2;
    }
  );

  it.prop([controlPointArb])(
    'INVARIANT: Damping reduces velocity over time',
    (point) => {
      point.radialVelocity = 1.0; // High initial velocity

      const velocityBefore = Math.abs(point.radialVelocity);

      // Run updates with damping
      for (let i = 0; i < 100; i++) {
        applyDamping(point, 0.016);
      }

      const velocityAfter = Math.abs(point.radialVelocity);

      return velocityAfter < velocityBefore;
    }
  );
});
```

### 5.2 Arbitraries

```typescript
// tests/pbt/arbitraries.ts

import * as fc from 'fast-check';

export const controlPointArb = fc.record({
  radius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
  angle: fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
  baseRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
  targetRadius: fc.float({ min: Math.fround(5), max: Math.fround(50), noNaN: true }),
  pressure: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0), noNaN: true }),
  surfaceTension: fc.float({ min: 0, max: Math.fround(0.1), noNaN: true }),
  springConstant: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
  dampingCoeff: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3), noNaN: true }),
  radialVelocity: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
  angularVelocity: fc.float({ min: Math.fround(-0.01), max: Math.fround(0.01), noNaN: true }),
});

export const blobArb = fc.record({
  currentX: fc.float({ min: Math.fround(-40), max: Math.fround(140), noNaN: true }),
  currentY: fc.float({ min: Math.fround(-40), max: Math.fround(140), noNaN: true }),
  velocityX: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
  velocityY: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
  size: fc.float({ min: Math.fround(10), max: Math.fround(40), noNaN: true }),
  controlPoints: fc.array(controlPointArb, { minLength: 6, maxLength: 16 }),
});

export const forceArb = fc.record({
  x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
  y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
});

export const dtArb = fc.float({ min: Math.fround(0.001), max: Math.fround(0.05), noNaN: true });

export const kernelArb = fc.integer({ min: 3, max: 9 }).filter(n => n % 2 === 1);
```

---

## Phase 6: Svelte 5 Runes Optimization

### 6.1 Fine-Grained Reactivity

```svelte
<script lang="ts">
  // Use $state.raw for large arrays that change every frame
  let blobPositions = $state.raw<{x: number, y: number}[]>([]);
  let blobPaths = $state.raw<string[]>([]);

  // Use regular $state for values that change less frequently
  let isReady = $state(false);
  let themeColors = $state<string[]>([]);

  // $derived.by for computed values
  const hasBlobs = $derived.by(() => blobPositions.length > 0);

  // $effect.pre for pre-render setup (runs before DOM updates)
  $effect.pre(() => {
    if (worker && animated) {
      // Prepare next frame data before render
      worker.postMessage({ type: 'prepareFrame' });
    }
  });
</script>
```

### 6.2 Avoiding Effect Loops

```svelte
<script lang="ts">
  import { untrack } from 'svelte';

  // BAD: This creates an effect loop
  $effect(() => {
    someState = computeFromOtherState(); // Writing to state in effect!
  });

  // GOOD: Use $derived for computed values
  const computedValue = $derived.by(() => computeFromOtherState());

  // GOOD: Use untrack for side effects that shouldn't re-trigger
  $effect(() => {
    if (animated) {
      untrack(() => {
        startAnimation(); // Won't re-run when animation updates state
      });
    }
  });
</script>
```

---

## Implementation Priority

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| **1.1** Spring system | HIGH | Medium | Realistic gel feel |
| **1.2** Gaussian kernel | HIGH | Low | Smooth organic shapes |
| **2.1** Spatial hash | HIGH | Medium | 10x perf for many blobs |
| **3** Web Worker | HIGH | High | Eliminates main thread jank |
| **1.3** Area conservation | MEDIUM | Low | Physically correct |
| **5** PBT suite | MEDIUM | Medium | Regression prevention |
| **2.2** Object pooling | MEDIUM | Low | Reduces GC pressure |
| **4** WASM | LOW | High | Marginal gains (already fast) |

---

## Success Metrics

1. **Performance**: 60fps with 20+ blobs on mobile
2. **Feel**: Blobs feel like gel, not balloons
3. **Smoothness**: No jarring shape changes
4. **Stability**: No crashes, no effect loops
5. **Tests**: 95%+ PBT coverage of invariants

---

## Files to Create/Modify

### New Files
- `src/core/GaussianKernel.ts`
- `src/core/SpatialHash.ts`
- `src/core/GelControlPoint.ts`
- `src/workers/physics.worker.ts`
- `tests/pbt/gel-physics-invariants.test.ts`
- `tests/pbt/arbitraries.ts`

### Modified Files
- `src/core/BlobPhysics.ts` - Replace sinusoidal with spring system
- `src/core/types.ts` - Add GelControlPoint interface
- `src/svelte/TinyVectors.svelte` - Worker integration
- `src/svelte/BlobSVG.svelte` - Optimized path generation
