export interface PointerBounds {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface PhysicsPoint {
	x: number;
	y: number;
}

export interface PhysicsRange {
	min: number;
	max: number;
}

const DEFAULT_RANGE: PhysicsRange = { min: 0, max: 100 };

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function mapClientPointToPhysics(
	clientX: number,
	clientY: number,
	bounds: PointerBounds,
	range: PhysicsRange = DEFAULT_RANGE,
): PhysicsPoint {
	if (bounds.width <= 0 || bounds.height <= 0) {
		return {
			x: (range.min + range.max) / 2,
			y: (range.min + range.max) / 2,
		};
	}

	const span = range.max - range.min;
	const normalizedX = clamp01((clientX - bounds.left) / bounds.width);
	const normalizedY = clamp01((clientY - bounds.top) / bounds.height);

	return {
		x: range.min + normalizedX * span,
		y: range.min + normalizedY * span,
	};
}
