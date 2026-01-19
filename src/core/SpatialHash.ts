/**
 * Spatial Hash for O(n) collision detection
 *
 * Divides space into a grid of cells. Each blob is assigned to a cell
 * based on its position. Collision queries only check neighboring cells.
 *
 * Time complexity:
 * - Rebuild: O(n)
 * - Query: O(k) where k = average blobs per cell neighborhood
 * - vs brute force O(n²)
 */

import type { ConvexBlob } from './types.js';

export class SpatialHash {
	private cellSize: number;
	private cells: Map<string, ConvexBlob[]>;
	private blobToCell: Map<ConvexBlob, string>;

	/**
	 * Create a spatial hash
	 * @param cellSize - Size of each grid cell (should be ~2x max blob interaction radius)
	 */
	constructor(cellSize: number = 50) {
		this.cellSize = cellSize;
		this.cells = new Map();
		this.blobToCell = new Map();
	}

	/**
	 * Compute cell key from world position
	 */
	private hash(x: number, y: number): string {
		const cellX = Math.floor(x / this.cellSize);
		const cellY = Math.floor(y / this.cellSize);
		return `${cellX},${cellY}`;
	}

	/**
	 * Parse cell key back to cell coordinates
	 */
	private parseKey(key: string): { cellX: number; cellY: number } {
		const [cellX, cellY] = key.split(',').map(Number);
		return { cellX, cellY };
	}

	/**
	 * Rebuild the spatial hash with current blob positions
	 * Call this once per frame before collision queries
	 *
	 * @param blobs - All blobs to index
	 */
	rebuild(blobs: ConvexBlob[]): void {
		this.cells.clear();
		this.blobToCell.clear();

		for (const blob of blobs) {
			const key = this.hash(blob.currentX, blob.currentY);

			if (!this.cells.has(key)) {
				this.cells.set(key, []);
			}

			this.cells.get(key)!.push(blob);
			this.blobToCell.set(blob, key);
		}
	}

	/**
	 * Query all blobs within radius of a position
	 *
	 * @param x - Query X position
	 * @param y - Query Y position
	 * @param radius - Search radius
	 * @param excludeBlob - Optional blob to exclude from results
	 * @returns Array of blobs within radius
	 */
	query(x: number, y: number, radius: number, excludeBlob?: ConvexBlob): ConvexBlob[] {
		const results: ConvexBlob[] = [];
		const cellRadius = Math.ceil(radius / this.cellSize);
		const radiusSquared = radius * radius;

		const centerCellX = Math.floor(x / this.cellSize);
		const centerCellY = Math.floor(y / this.cellSize);

		// Check all cells within range
		for (let dx = -cellRadius; dx <= cellRadius; dx++) {
			for (let dy = -cellRadius; dy <= cellRadius; dy++) {
				const key = `${centerCellX + dx},${centerCellY + dy}`;
				const cell = this.cells.get(key);

				if (cell) {
					for (const blob of cell) {
						if (blob === excludeBlob) continue;

						// Distance check
						const blobDx = blob.currentX - x;
						const blobDy = blob.currentY - y;
						const distSquared = blobDx * blobDx + blobDy * blobDy;

						if (distSquared < radiusSquared) {
							results.push(blob);
						}
					}
				}
			}
		}

		return results;
	}

	/**
	 * Query neighbors of a specific blob
	 *
	 * @param blob - The blob to find neighbors for
	 * @param radius - Search radius
	 * @returns Array of neighboring blobs
	 */
	queryNeighbors(blob: ConvexBlob, radius: number): ConvexBlob[] {
		return this.query(blob.currentX, blob.currentY, radius, blob);
	}

	/**
	 * Get all blob pairs within interaction distance
	 * Useful for bulk collision processing
	 *
	 * @param interactionRadius - Maximum interaction distance
	 * @returns Array of [blob1, blob2, distance] tuples
	 */
	getAllPairs(interactionRadius: number): Array<[ConvexBlob, ConvexBlob, number]> {
		const pairs: Array<[ConvexBlob, ConvexBlob, number]> = [];
		const processed = new Set<string>();
		const radiusSquared = interactionRadius * interactionRadius;

		for (const [key, blobs] of this.cells) {
			const { cellX, cellY } = this.parseKey(key);

			// Check blobs within same cell
			for (let i = 0; i < blobs.length; i++) {
				for (let j = i + 1; j < blobs.length; j++) {
					const b1 = blobs[i];
					const b2 = blobs[j];

					const dx = b2.currentX - b1.currentX;
					const dy = b2.currentY - b1.currentY;
					const distSquared = dx * dx + dy * dy;

					if (distSquared < radiusSquared) {
						pairs.push([b1, b2, Math.sqrt(distSquared)]);
					}
				}
			}

			// Check neighboring cells (only forward neighbors to avoid duplicates)
			const neighborOffsets = [
				[1, 0],
				[1, 1],
				[0, 1],
				[-1, 1],
			];

			for (const [dx, dy] of neighborOffsets) {
				const neighborKey = `${cellX + dx},${cellY + dy}`;
				const neighborBlobs = this.cells.get(neighborKey);

				if (neighborBlobs) {
					for (const b1 of blobs) {
						for (const b2 of neighborBlobs) {
							const blobDx = b2.currentX - b1.currentX;
							const blobDy = b2.currentY - b1.currentY;
							const distSquared = blobDx * blobDx + blobDy * blobDy;

							if (distSquared < radiusSquared) {
								pairs.push([b1, b2, Math.sqrt(distSquared)]);
							}
						}
					}
				}
			}
		}

		return pairs;
	}

	/**
	 * Get cell size
	 */
	getCellSize(): number {
		return this.cellSize;
	}

	/**
	 * Get number of occupied cells (for debugging)
	 */
	getCellCount(): number {
		return this.cells.size;
	}

	/**
	 * Get cell contents (for debugging)
	 */
	getCell(x: number, y: number): ConvexBlob[] {
		const key = this.hash(x, y);
		return this.cells.get(key) || [];
	}

	/**
	 * Clear the hash
	 */
	clear(): void {
		this.cells.clear();
		this.blobToCell.clear();
	}
}
