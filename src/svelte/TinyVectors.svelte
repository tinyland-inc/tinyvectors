<script lang="ts">
	import { browser } from '../core/browser.js';
	import { untrack } from 'svelte';
	import { BlobPhysics, type BlobPhysicsConfig } from '../core/BlobPhysics.js';
	import {
		DeviceMotion,
		type MotionVector,
	} from '../motion/DeviceMotion.js';
	import {
		createPointerPhysicsController,
		type PointerPhysicsController,
	} from '../motion/PointerPhysicsController.js';
	import type { PointerBounds } from '../motion/PointerMapper.js';
	import { ScrollHandler } from '../motion/ScrollHandler.js';
	import { THEME_PRESET_COLORS } from '../core/theme-colors.js';
	import type { ThemePresetName } from '../core/theme-presets.js';
	import BlobSVG from './BlobSVG.svelte';

	interface Props {
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
		/** Optional diagnostics hook for browser/dev harnesses. */
		onDeviceMotion?: (motionData: MotionVector) => void;
	}

	let {
		theme = 'tinyland',
		colors = [],
		animated = true,
		opacity = 1,
		shouldLoad = true,
		blobCount = 8,
		physicsConfig = {},
		enableDeviceMotion = true,
		enableScrollPhysics = true,
		enablePointerPhysics = true,
		deviceMotionStrength = 0.8,
		deviceMotionCalibrationSamples = 8,
		onDeviceMotion,
	}: Props = $props();

	let containerElement: HTMLDivElement | undefined = $state(undefined);
	let blobs = $state<ReturnType<BlobPhysics['getBlobs']>>([]);
	let isReady = $state(false);

	let physics = $state<BlobPhysics | null>(null);
	let animationFrame: number | null = null;
	let lastTime = 0;
	let deviceMotion: DeviceMotion | null = null;
	let scrollHandler: ScrollHandler | null = null;
	let pointerController: PointerPhysicsController | null = null;

	const themeColors = $derived.by(() => {
		if (colors.length > 0) return colors;
		return THEME_PRESET_COLORS[theme] ?? [];
	});

	const detectDeviceMotionCapability = (): boolean => {
		if (!browser || !window.isSecureContext) return false;
		return 'DeviceOrientationEvent' in window;
	};

	const createDeviceMotion = (): DeviceMotion =>
		new DeviceMotion(handleDeviceMotion, {
			calibrationSamples: deviceMotionCalibrationSamples,
			deadZone: 0.015,
		});

	const handleDeviceMotion = (motionData: MotionVector) => {
		if (!physics) return;

		onDeviceMotion?.(motionData);

		// DeviceMotion emits screen-aligned tilt, so no old beta/gamma axis swap.
		physics.setGravity({
			x: motionData.x * deviceMotionStrength,
			y: motionData.y * deviceMotionStrength,
		});
		physics.setTilt(motionData);
	};

	export async function requestDeviceMotionPermission(): Promise<boolean> {
		if (!browser || !enableDeviceMotion || !detectDeviceMotionCapability()) return false;

		deviceMotion ??= createDeviceMotion();

		const hasPermission = await deviceMotion.requestPermission();
		return hasPermission;
	}

	export function calibrateDeviceMotion(samples?: number): void {
		deviceMotion?.calibrate(samples);
	}

	const handleScroll = (event: WheelEvent) => {
		if (!scrollHandler || !physics) return;
		scrollHandler.handleScroll(event);
		const stickiness = scrollHandler.getStickiness() * 0.12;
		physics.setScrollStickiness(stickiness);
	};

	const getPointerBounds = (): PointerBounds => {
		const rect = containerElement?.getBoundingClientRect();

		if (rect && rect.width > 0 && rect.height > 0) {
			return {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			};
		}

		return {
			left: 0,
			top: 0,
			width: window.innerWidth || 1,
			height: window.innerHeight || 1,
		};
	};

	function tick(currentTime: number) {
		const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
		lastTime = currentTime;

		if (physics) {
			physics.tick(dt, currentTime / 1000);
			blobs = physics.getBlobs(themeColors);
		}

		animationFrame = requestAnimationFrame(tick);
	}

	function startAnimation() {
		if (animationFrame) return;
		lastTime = performance.now();
		animationFrame = requestAnimationFrame(tick);
	}

	function stopAnimation() {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = null;
		}
	}

	$effect(() => {
		if (!browser || !shouldLoad) return;

		let disposed = false;

		untrack(() => {
			// BlobPhysics owns base defaults; this component forwards caller overrides.
			const currentPhysics = new BlobPhysics(blobCount, physicsConfig);
			physics = currentPhysics;

			currentPhysics.init().then(() => {
				if (disposed || physics !== currentPhysics) return;

				const hasDeviceMotionCapability = detectDeviceMotionCapability();
				isReady = true;

				if (enableDeviceMotion && hasDeviceMotionCapability) {
					if (!deviceMotion) {
						deviceMotion = createDeviceMotion();
						void deviceMotion.initialize();
					}
				}

				if (enableScrollPhysics) {
					scrollHandler = new ScrollHandler();
				}

				if (animated) {
					startAnimation();
				} else if (physics) {
					blobs = physics.getBlobs(themeColors);
				}
			});

			if (enableScrollPhysics) {
				window.addEventListener('wheel', handleScroll, { passive: true });
			}

			if (enablePointerPhysics) {
				pointerController = createPointerPhysicsController({
					target: window,
					getBounds: getPointerBounds,
					supportsPointerEvents: 'PointerEvent' in window,
					updatePosition(position) {
						physics?.updateMousePosition(position.x, position.y);
					},
				});
			}
		});

		return () => {
			disposed = true;
			stopAnimation();
			if (enableScrollPhysics && browser) {
				window.removeEventListener('wheel', handleScroll);
			}
			pointerController?.dispose();
			pointerController = null;
			deviceMotion?.cleanup();
			deviceMotion = null;
			scrollHandler?.dispose();
			scrollHandler = null;
			physics?.dispose();
			physics = null;
			isReady = false;
			blobs = [];
		};
	});

	$effect(() => {
		if (!isReady) return;

		if (animated) {
			startAnimation();
		} else {
			stopAnimation();
		}
	});
</script>

{#if shouldLoad && themeColors.length > 0}
	<div
		bind:this={containerElement}
		style:position="absolute"
		style:inset="0"
		style:width="100%"
		style:height="100%"
		style:overflow="hidden"
		style:pointer-events="none"
		style:opacity
		style:transition="opacity 0.8s ease-in-out"
		aria-hidden="true"
		role="presentation"
	>
		<BlobSVG {blobs} {physics} />
	</div>
{/if}
