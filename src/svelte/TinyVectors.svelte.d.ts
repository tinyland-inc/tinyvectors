import type { Component } from 'svelte';
import type { BlobPhysicsConfig } from '../core/BlobPhysics.js';
import type { ThemePresetName } from '../core/theme-presets.js';
import type { MotionVector } from '../motion/DeviceMotion.js';
import type { TinyVectorsDeviceMotionStatus } from './types.js';

export interface TinyVectorsProps {
	/** Theme preset name */
	theme?: ThemePresetName;
	/** Custom colors (overrides theme preset) */
	colors?: string[];
	/** Whether animation is enabled */
	animated?: boolean;
	/** Component opacity */
	opacity?: number;
	/** Whether component should load */
	shouldLoad?: boolean;
	/** Number of blobs */
	blobCount?: number;
	/** Physics configuration */
	physicsConfig?: Partial<BlobPhysicsConfig>;
	/** Enable device orientation based motion */
	enableDeviceMotion?: boolean;
	/** Enable scroll physics */
	enableScrollPhysics?: boolean;
	/** Enable pointer/mouse physics */
	enablePointerPhysics?: boolean;
	/** Scales normalized screen-aligned tilt vectors before applying them to physics. */
	deviceMotionStrength?: number;
	/** Samples used by calibrateDeviceMotion() when no explicit count is supplied. */
	deviceMotionCalibrationSamples?: number;
	/** Milliseconds before paused device-orientation IO resets to neutral. */
	deviceMotionIdleResetMs?: number;
	/** Optional diagnostics hook for browser/dev harnesses. */
	onDeviceMotion?: (motionData: MotionVector) => void;
}

export interface TinyVectorsExports {
	requestDeviceMotionPermission(): Promise<boolean>;
	calibrateDeviceMotion(samples?: number): void;
	getDeviceMotionStatus(): TinyVectorsDeviceMotionStatus;
}

declare const TinyVectors: Component<TinyVectorsProps, TinyVectorsExports, ''>;
export default TinyVectors;
