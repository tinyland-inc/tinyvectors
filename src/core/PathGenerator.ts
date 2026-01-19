/**
 * BlobPathGenerator - SVG path generation for blob shapes
 *
 * Pure TypeScript implementation for SSR-safe path generation.
 */

import type { RenderBlob } from './schema.js';

/**
 * Generate SVG path string
 */
export async function generateSmoothBlobPath(blob: RenderBlob): Promise<string> {
	return generateFallbackPath(blob);
}

/**
 * Synchronous path generation for render loops
 */
export function generateSmoothBlobPathSync(blob: RenderBlob): string {
	return generateFallbackPath(blob);
}

/**
 * Fallback path generation using pure TypeScript
 */
function generateFallbackPath(blob: RenderBlob): string {
	const cx = blob.currentX;
	const cy = blob.currentY;
	const r = blob.size;
	const phase = blob.phase || 0;

	// Generate 8 points around circle with slight deformation
	const points: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2;
		// Simple organic variation
		const radiusMod = 1.0 + 0.1 * Math.sin(angle * 2 + phase);
		const x = cx + Math.cos(angle) * r * radiusMod;
		const y = cy + Math.sin(angle) * r * radiusMod;
		points.push({ x, y });
	}

	// Build path with cubic bezier curves
	let path = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
	const smoothing = 0.15;

	for (let i = 0; i < 8; i++) {
		const curr = points[i];
		const next = points[(i + 1) % 8];
		const nextNext = points[(i + 2) % 8];

		const cp1x = curr.x + (next.x - curr.x) * smoothing;
		const cp1y = curr.y + (next.y - curr.y) * smoothing;
		const cp2x = next.x - (nextNext.x - curr.x) * (smoothing * 0.3);
		const cp2y = next.y - (nextNext.y - curr.y) * (smoothing * 0.3);

		path += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${next.x.toFixed(2)},${next.y.toFixed(2)}`;
	}

	path += ' Z';
	return path;
}

/**
 * Batch path generation for multiple blobs
 */
export async function generateBlobPathsBatch(blobs: RenderBlob[]): Promise<string[]> {
	return blobs.map((blob) => generateFallbackPath(blob));
}

/**
 * Synchronous batch path generation
 */
export function generateBlobPathsBatchSync(blobs: RenderBlob[]): string[] {
	return blobs.map((blob) => generateFallbackPath(blob));
}

/**
 * Pre-initialize path generator (no-op, for API compatibility)
 */
export async function preInitPathGenerator(): Promise<boolean> {
	return true;
}

/**
 * Check if path generator is ready (always true)
 */
export function isPathGeneratorReady(): boolean {
	return true;
}
