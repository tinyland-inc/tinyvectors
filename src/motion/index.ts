



export {
	DeviceMotion,
	type DeviceMotionCallback,
	type DeviceMotionOptions,
	type DeviceMotionPermissionState,
	type MotionVector,
} from './DeviceMotion.js';
export {
	mapClientPointToPhysics,
	type PhysicsPoint,
	type PhysicsRange,
	type PointerBounds,
} from './PointerMapper.js';
export {
	createPointerPhysicsController,
	detectPointerPhysicsCapability,
	getLatestPointerEvent,
	type PointerCapabilityEnvironment,
	type PointerExitEventName,
	type PointerExitLikeEvent,
	type PointerLifecycleEventName,
	type PointerLikeEvent,
	type PointerMoveEventName,
	type PointerPhysicsController,
	type PointerPhysicsControllerOptions,
	type PointerPhysicsEventTarget,
} from './PointerPhysicsController.js';
export { ScrollHandler, type ScrollHandlerConfig, type PullForce } from './ScrollHandler.js';
