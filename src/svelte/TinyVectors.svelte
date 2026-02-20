<script lang="ts">
	import { browser } from '../core/browser.js';
	import { untrack } from 'svelte';
	import { BlobPhysics, type BlobPhysicsConfig } from '../core/BlobPhysics.js';
	import { DeviceMotion } from '../motion/DeviceMotion.js';
	import { ScrollHandler } from '../motion/ScrollHandler.js';
	import { THEME_PRESETS, type ThemePresetName } from '../core/schema.js';
	import BlobSVG from './BlobSVG.svelte';

	// Props
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
		/** Enable device motion (accelerometer) */
		enableDeviceMotion?: boolean;
		/** Enable scroll physics */
		enableScrollPhysics?: boolean;
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
	}: Props = $props();

	// State - use regular variables for non-reactive state
	let containerElement: HTMLDivElement | undefined = $state(undefined);
	let blobs = $state<ReturnType<BlobPhysics['getBlobs']>>([]);
	let isReady = $state(false);
	let isMobileDevice = $state(false);
	let hasAccelerometerAccess = $state(false);

	// Non-reactive state (no $state needed - these don't trigger re-renders)
	let physics: BlobPhysics | null = null;
	let animationFrame: number | null = null;
	let lastTime = 0;
	let deviceMotion: DeviceMotion | null = null;
	let scrollHandler: ScrollHandler | null = null;
	let gravityX = 0;
	let gravityY = 0;
	let tiltX = 0;
	let tiltY = 0;
	let tiltZ = 0;

	// Get theme colors - use $derived.by for computed values
	const themeColors = $derived.by(() => {
		if (colors.length > 0) return colors;
		const preset = THEME_PRESETS[theme];
		if (!preset || !preset.hasVectors) return [];
		return preset.colors.map((c) => c.color);
	});

	// Default physics config
	const defaultPhysicsConfig: BlobPhysicsConfig = {
		antiClusteringStrength: 0.15,
		bounceDamping: 0.7,
		deformationSpeed: 0.5,
		territoryStrength: 0.1,
		viscosity: 0.3,
	};

	// Detect mobile device
	const detectMobileDevice = (): boolean => {
		if (!browser) return false;
		const userAgent = navigator.userAgent.toLowerCase();
		const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
		const isMobileUserAgent = mobileKeywords.some((keyword) => userAgent.includes(keyword));
		const isMobileScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
		const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const hasOrientationAPI = 'DeviceOrientationEvent' in window;
		return (isMobileUserAgent || (isMobileScreen && hasTouchScreen)) && hasOrientationAPI;
	};

	// Handle device motion - no reactive state updates
	const handleDeviceMotion = (motionData: { x: number; y: number; z: number }) => {
		if (!hasAccelerometerAccess || !physics) return;

		tiltX = motionData.x;
		tiltY = motionData.y;
		tiltZ = motionData.z;

		// Convert to gravity vector
		const newX = motionData.y * 0.8;
		const newY = -motionData.x * 0.8;

		// Smooth the values
		gravityX = newX * 0.7 + gravityX * 0.3;
		gravityY = newY * 0.7 + gravityY * 0.3;

		// Pass to physics
		physics.setGravity({ x: gravityX, y: gravityY });
		physics.setTilt({ x: tiltX, y: tiltY, z: tiltZ });
	};

	// Request accelerometer permission
	const requestAccelerometerPermission = async (): Promise<void> => {
		if (!isMobileDevice || !deviceMotion) return;

		try {
			const hasPermission = await deviceMotion.requestPermission();
			hasAccelerometerAccess = hasPermission;
			if (hasPermission) {
				console.log('[TinyVectors] Accelerometer access granted');
			}
		} catch (error) {
			console.log('[TinyVectors] Could not request accelerometer permission:', error);
			hasAccelerometerAccess = false;
		}
	};

	// Handle scroll - no reactive state updates
	const handleScroll = (event: WheelEvent) => {
		if (!scrollHandler || !physics) return;

		const scrollMagnitude = Math.abs(event.deltaY);
		if (scrollMagnitude > 50) {
			event.preventDefault();
		}

		scrollHandler.handleScroll(event);
		const stickiness = scrollHandler.getStickiness() * 0.12;
		physics.setScrollStickiness(stickiness);
	};

	// Animation tick function - updates blobs state once per frame
	function tick(currentTime: number) {
		const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
		lastTime = currentTime;

		if (physics) {
			physics.tick(dt, currentTime / 1000);
			// Update blobs state - this triggers re-render
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

	// Single initialization effect
	$effect(() => {
		if (!browser || !shouldLoad) return;

		// Use untrack to prevent this effect from re-running on state changes
		untrack(() => {
			const config = { ...defaultPhysicsConfig, ...physicsConfig };
			physics = new BlobPhysics(blobCount, config);

			physics.init().then(() => {
				// Detect mobile
				isMobileDevice = detectMobileDevice();
				isReady = true;

				// Initialize device motion on mobile
				if (enableDeviceMotion && isMobileDevice) {
					deviceMotion = new DeviceMotion(handleDeviceMotion);
					deviceMotion.initialize().then(() => {
						setTimeout(requestAccelerometerPermission, 1000);
					});
				}

				// Initialize scroll handler
				if (enableScrollPhysics) {
					scrollHandler = new ScrollHandler();
				}

				// Start animation if enabled
				if (animated) {
					startAnimation();
				} else if (physics) {
					blobs = physics.getBlobs(themeColors);
				}
			});

			// Set up scroll listener
			if (enableScrollPhysics) {
				window.addEventListener('wheel', handleScroll, { passive: false });
			}
		});

		return () => {
			stopAnimation();
			if (enableScrollPhysics && browser) {
				window.removeEventListener('wheel', handleScroll);
			}
			deviceMotion?.cleanup();
			physics?.dispose();
			physics = null;
		};
	});

	// Handle animated prop changes
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
		class="absolute inset-0 overflow-hidden pointer-events-none"
		style:opacity
		style:transition="opacity 0.8s ease-in-out"
		aria-hidden="true"
		role="presentation"
	>
		<BlobSVG {blobs} {containerElement} {physics} />

		<!-- Mobile accelerometer status (debug) -->
		{#if isMobileDevice && false}
			<div class="pointer-events-none fixed top-2 right-2 text-xs opacity-30">
				📱 {hasAccelerometerAccess ? '✅ Tilt Active' : '❌ Tilt Disabled'}
			</div>
		{/if}
	</div>
{/if}
