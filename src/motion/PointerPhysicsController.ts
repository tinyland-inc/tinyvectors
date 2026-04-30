import {
	mapClientPointToPhysics,
	type PhysicsPoint,
	type PhysicsRange,
	type PointerBounds,
} from './PointerMapper.js';

export type PointerMoveEventName = 'pointermove' | 'mousemove';
export type PointerExitEventName = 'pointerout' | 'mouseout';
export type PointerLifecycleEventName = PointerMoveEventName | PointerExitEventName | 'blur';

export interface PointerPhysicsEventTarget {
	addEventListener(
		type: PointerLifecycleEventName,
		listener: EventListener,
		options?: AddEventListenerOptions,
	): void;
	removeEventListener(type: PointerLifecycleEventName, listener: EventListener): void;
}

export interface PointerLikeEvent {
	clientX: number;
	clientY: number;
	getCoalescedEvents?: () => PointerLikeEvent[];
}

export interface PointerExitLikeEvent {
	relatedTarget?: EventTarget | null;
}

export interface PointerPhysicsControllerOptions {
	target: PointerPhysicsEventTarget;
	getBounds: () => PointerBounds;
	updatePosition: (position: PhysicsPoint) => void;
	range?: PhysicsRange;
	supportsPointerEvents?: boolean;
	requestFrame?: (callback: FrameRequestCallback) => number;
	cancelFrame?: (handle: number) => void;
}

export interface PointerCapabilityEnvironment {
	PointerEvent?: unknown;
	MouseEvent?: unknown;
	navigator?: {
		maxTouchPoints?: number;
	};
	matchMedia?: (query: string) => { matches: boolean };
}

export interface PointerPhysicsController {
	readonly eventName: PointerMoveEventName;
	readonly exitEventName: PointerExitEventName;
	flush(): void;
	dispose(): void;
}

export function getLatestPointerEvent(event: PointerLikeEvent): PointerLikeEvent {
	const coalesced =
		typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
	return coalesced.length > 0 ? coalesced[coalesced.length - 1] : event;
}

export function detectPointerPhysicsCapability(
	environment: PointerCapabilityEnvironment = globalThis,
): boolean {
	if (typeof environment.PointerEvent !== 'undefined') return true;
	if ((environment.navigator?.maxTouchPoints ?? 0) > 0) return true;
	if (environment.matchMedia?.('(pointer: fine), (pointer: coarse)').matches) return true;
	return typeof environment.MouseEvent !== 'undefined';
}

function getRangeCenter(range?: PhysicsRange): PhysicsPoint {
	const center = range ? (range.min + range.max) / 2 : 50;
	return { x: center, y: center };
}

export function createPointerPhysicsController(
	options: PointerPhysicsControllerOptions,
): PointerPhysicsController {
	const requestFrame = options.requestFrame ?? requestAnimationFrame;
	const cancelFrame = options.cancelFrame ?? cancelAnimationFrame;
	const supportsPointerEvents =
		options.supportsPointerEvents ?? typeof PointerEvent !== 'undefined';
	const eventName: PointerMoveEventName = supportsPointerEvents ? 'pointermove' : 'mousemove';
	const exitEventName: PointerExitEventName = supportsPointerEvents ? 'pointerout' : 'mouseout';

	let frame: number | null = null;
	let pendingPosition: PhysicsPoint | null = null;
	let disposed = false;

	const flush = () => {
		frame = null;
		if (disposed || !pendingPosition) return;

		options.updatePosition(pendingPosition);
		pendingPosition = null;
	};

	const resetPosition = () => {
		if (frame !== null) {
			cancelFrame(frame);
			frame = null;
		}
		pendingPosition = null;
		options.updatePosition(getRangeCenter(options.range));
	};

	const handleMove: EventListener = (event) => {
		if (disposed) return;

		const pointerEvent = getLatestPointerEvent(event as unknown as PointerLikeEvent);
		pendingPosition = mapClientPointToPhysics(
			pointerEvent.clientX,
			pointerEvent.clientY,
			options.getBounds(),
			options.range,
		);

		if (frame === null) {
			frame = requestFrame(flush);
		}
	};

	const handleExit: EventListener = (event) => {
		if (disposed) return;
		const exitEvent = event as unknown as PointerExitLikeEvent;
		if (exitEvent.relatedTarget) return;
		resetPosition();
	};

	const handleBlur: EventListener = () => {
		if (disposed) return;
		resetPosition();
	};

	options.target.addEventListener(eventName, handleMove, { passive: true });
	options.target.addEventListener(exitEventName, handleExit, { passive: true });
	options.target.addEventListener('blur', handleBlur);

	return {
		eventName,
		exitEventName,
		flush,
		dispose() {
			if (disposed) return;
			disposed = true;
			options.target.removeEventListener(eventName, handleMove);
			options.target.removeEventListener(exitEventName, handleExit);
			options.target.removeEventListener('blur', handleBlur);
			if (frame !== null) {
				cancelFrame(frame);
				frame = null;
			}
			pendingPosition = null;
		},
	};
}
