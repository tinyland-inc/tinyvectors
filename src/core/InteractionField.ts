export interface FieldVector {
	x: number;
	y: number;
}

export interface PointFieldOptions {
	origin: FieldVector;
	target: FieldVector;
	radius: number;
	strength: number;
}

const magnitude = (vector: FieldVector): number =>
	Math.sqrt(vector.x * vector.x + vector.y * vector.y);

export function clampFieldVector(vector: FieldVector, maxMagnitude = 1): FieldVector {
	const max = Math.max(0, maxMagnitude);
	const currentMagnitude = magnitude(vector);
	if (max === 0 || currentMagnitude === 0) return { x: 0, y: 0 };
	if (currentMagnitude <= max) return vector;

	const scale = max / currentMagnitude;
	return {
		x: vector.x * scale,
		y: vector.y * scale,
	};
}

export function combineFieldVectors(
	fields: FieldVector[],
	maxMagnitude = 1,
): FieldVector {
	const total = fields.reduce<FieldVector>(
		(accumulator, field) => ({
			x: accumulator.x + field.x,
			y: accumulator.y + field.y,
		}),
		{ x: 0, y: 0 },
	);

	return clampFieldVector(total, maxMagnitude);
}

export function directionalBiasField(
	input: FieldVector,
	strength: number,
	maxMagnitude = 1,
): FieldVector {
	const max = Math.max(0, maxMagnitude);
	const x = input.x * strength;
	const y = input.y * strength;
	const currentMagnitude = Math.sqrt(x * x + y * y);

	if (max === 0 || currentMagnitude === 0) return { x: 0, y: 0 };
	if (currentMagnitude <= max) return { x, y };

	const scale = max / currentMagnitude;
	return {
		x: x * scale,
		y: y * scale,
	};
}

export function smoothDistanceFalloff(distance: number, radius: number): number {
	const boundedDistance = Math.max(0, distance);
	if (radius <= 0 || boundedDistance >= radius) return 0;

	const normalized = 1 - boundedDistance / radius;
	return normalized * normalized;
}

export function pointAttractorField({
	origin,
	target,
	radius,
	strength,
}: PointFieldOptions): FieldVector {
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	if (distance === 0) return { x: 0, y: 0 };

	const falloff = smoothDistanceFalloff(distance, radius);
	const scale = (falloff * strength) / distance;
	return {
		x: dx * scale,
		y: dy * scale,
	};
}
