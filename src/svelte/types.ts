import type { DeviceMotionPermissionState } from '../motion/DeviceMotion.js';

export interface TinyVectorsDeviceMotionStatus {
	enabled: boolean;
	supported: boolean;
	requiresPermission: boolean;
	permissionState: DeviceMotionPermissionState;
	active: boolean;
}
