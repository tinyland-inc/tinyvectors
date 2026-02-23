











import type { ConvexBlob } from './types.js';

export class SpatialHash {
	private cellSize: number;
	private cells: Map<string, ConvexBlob[]>;
	private blobToCell: Map<ConvexBlob, string>;

	



	constructor(cellSize: number = 50) {
		this.cellSize = cellSize;
		this.cells = new Map();
		this.blobToCell = new Map();
	}

	


	private hash(x: number, y: number): string {
		const cellX = Math.floor(x / this.cellSize);
		const cellY = Math.floor(y / this.cellSize);
		return `${cellX},${cellY}`;
	}

	


	private parseKey(key: string): { cellX: number; cellY: number } {
		const [cellX, cellY] = key.split(',').map(Number);
		return { cellX, cellY };
	}

	





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

	








	query(x: number, y: number, radius: number, excludeBlob?: ConvexBlob): ConvexBlob[] {
		const results: ConvexBlob[] = [];
		const cellRadius = Math.ceil(radius / this.cellSize);
		const radiusSquared = radius * radius;

		const centerCellX = Math.floor(x / this.cellSize);
		const centerCellY = Math.floor(y / this.cellSize);

		
		for (let dx = -cellRadius; dx <= cellRadius; dx++) {
			for (let dy = -cellRadius; dy <= cellRadius; dy++) {
				const key = `${centerCellX + dx},${centerCellY + dy}`;
				const cell = this.cells.get(key);

				if (cell) {
					for (const blob of cell) {
						if (blob === excludeBlob) continue;

						
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

	






	queryNeighbors(blob: ConvexBlob, radius: number): ConvexBlob[] {
		return this.query(blob.currentX, blob.currentY, radius, blob);
	}

	






	getAllPairs(interactionRadius: number): Array<[ConvexBlob, ConvexBlob, number]> {
		const pairs: Array<[ConvexBlob, ConvexBlob, number]> = [];
		const processed = new Set<string>();
		const radiusSquared = interactionRadius * interactionRadius;

		for (const [key, blobs] of this.cells) {
			const { cellX, cellY } = this.parseKey(key);

			
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

	


	getCellSize(): number {
		return this.cellSize;
	}

	


	getCellCount(): number {
		return this.cells.size;
	}

	


	getCell(x: number, y: number): ConvexBlob[] {
		const key = this.hash(x, y);
		return this.cells.get(key) || [];
	}

	


	clear(): void {
		this.cells.clear();
		this.blobToCell.clear();
	}
}
