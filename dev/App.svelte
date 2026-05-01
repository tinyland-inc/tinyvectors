<script lang="ts">
	import TinyVectors from '../src/svelte/TinyVectors.svelte';
	import type { ThemePresetName } from '../src/core/schema.js';
	import type { MotionVector } from '../src/motion/DeviceMotion.js';
	import type { TinyVectorsDeviceMotionStatus } from '../src/svelte/types.js';

	interface TinyVectorsHandle {
		requestDeviceMotionPermission: () => Promise<boolean>;
		calibrateDeviceMotion: (samples?: number) => void;
		getDeviceMotionStatus: () => TinyVectorsDeviceMotionStatus;
	}

	interface Props {
		theme?: ThemePresetName;
		blobCount?: number;
		animated?: boolean;
		enableDeviceMotion?: boolean;
		enableScrollPhysics?: boolean;
		enablePointerPhysics?: boolean;
		deviceMotionIdleResetMs?: number;
		onMotionSample?: (sample: MotionVector) => void;
	}

	let {
		theme = 'tinyland',
		blobCount = 8,
		animated = true,
		enableDeviceMotion = true,
		enableScrollPhysics = true,
		enablePointerPhysics = true,
		deviceMotionIdleResetMs = 2000,
		onMotionSample,
	}: Props = $props();

	let vectorLayer: TinyVectorsHandle | undefined = $state(undefined);

	export async function requestDeviceMotionPermission(): Promise<boolean> {
		return vectorLayer?.requestDeviceMotionPermission() ?? false;
	}

	export function calibrateDeviceMotion(samples?: number): void {
		vectorLayer?.calibrateDeviceMotion(samples);
	}

	export function getDeviceMotionStatus(): TinyVectorsDeviceMotionStatus {
		return (
			vectorLayer?.getDeviceMotionStatus() ?? {
				enabled: enableDeviceMotion,
				supported: false,
				requiresPermission: false,
				permissionState: 'unknown',
				active: false,
			}
		);
	}
</script>

<div class="app-container">
	<TinyVectors
		bind:this={vectorLayer}
		{theme}
		{blobCount}
		{animated}
		opacity={0.8}
		shouldLoad={true}
		{enableDeviceMotion}
		{enableScrollPhysics}
		{enablePointerPhysics}
		deviceMotionCalibrationSamples={0}
		{deviceMotionIdleResetMs}
		onDeviceMotion={onMotionSample}
	/>

	<div class="content">
		<h1>TinyVectors</h1>
		<p>Animated blob physics simulation</p>
		<p class="info">Theme: <strong>{theme}</strong> | Blobs: <strong>{blobCount}</strong></p>
	</div>
</div>

<style>
	.app-container {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		min-height: 100dvh;
		position: relative;
		overflow: hidden;
	}

	.content {
		position: relative;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 1rem;
		text-align: center;
		color: white;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	h1 {
		font-size: 4rem;
		font-weight: 200;
		letter-spacing: 0;
		margin-bottom: 0.5rem;
	}

	p {
		font-size: 1.2rem;
		opacity: 0.8;
	}

	.info {
		margin-top: 2rem;
		font-size: 0.9rem;
		opacity: 0.6;
	}

	:global(body.light) .content {
		color: #333;
		text-shadow: 0 2px 4px rgba(255, 255, 255, 0.5);
	}

	@media (max-width: 720px) {
		h1 {
			font-size: 2.75rem;
		}

		p {
			font-size: 1rem;
		}

		.info {
			font-size: 0.8rem;
		}
	}

	@media (max-width: 420px) {
		h1 {
			font-size: 2.35rem;
		}
	}
</style>
