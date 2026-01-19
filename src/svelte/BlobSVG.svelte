<script lang="ts">
	import { browser } from '../core/browser.js';
	import type { BlobPhysics } from '../core/BlobPhysics.js';
	import type { ConvexBlob } from '../core/types.js';

	// Props using Svelte 5 $props() syntax
	interface Props {
		blobs?: ConvexBlob[];
		containerElement?: HTMLElement | undefined;
		physics?: BlobPhysics | null;
	}

	let { blobs = [], containerElement = undefined, physics = null }: Props = $props();

	// Track dark mode for blend mode switching
	let isDarkMode = $state(false);
	let primaryBlend = $derived(isDarkMode ? 'screen' : 'multiply');

	// Watch for dark mode changes
	$effect(() => {
		if (browser) {
			isDarkMode = document.documentElement.classList.contains('dark');

			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.attributeName === 'class') {
						isDarkMode = document.documentElement.classList.contains('dark');
					}
				}
			});

			observer.observe(document.documentElement, { attributes: true });

			return () => observer.disconnect();
		}
	});

	// Generate simple circle path (fast) - used for glow/core layers
	function getCirclePath(cx: number, cy: number, r: number): string {
		return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`;
	}

	// Generate organic path for main blob body only
	function getBlobPath(blob: ConvexBlob): string {
		if (physics && blob.controlPoints && blob.controlPoints.length > 0) {
			return physics.generateSmoothBlobPath(blob);
		}
		return getCirclePath(blob.currentX, blob.currentY, blob.size);
	}
</script>

<!-- Extended viewBox for margin overflow -->
<svg
	width="100%"
	height="100%"
	viewBox="-33 -33 133 133"
	preserveAspectRatio="xMidYMid slice"
	class="h-full w-full"
>
	<defs>
		<!-- Simple glow filter -->
		<filter id="glowFilter" x="-100%" y="-100%" width="300%" height="300%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="4.0" result="glow" />
		</filter>

		<!-- Soft edge filter -->
		<filter id="softEdge" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="soft" />
		</filter>

		<!-- Gradients for each blob -->
		{#each blobs as blob, i (blob.gradientId)}
			<!-- Glow gradient (outer) -->
			<radialGradient id="{blob.gradientId}Glow" cx="50%" cy="50%" r="80%">
				<stop offset="0%" stop-color={blob.color} stop-opacity={blob.intensity * 0.5} />
				<stop offset="40%" stop-color={blob.color} stop-opacity={blob.intensity * 0.3} />
				<stop offset="70%" stop-color={blob.color} stop-opacity={blob.intensity * 0.15} />
				<stop offset="100%" stop-color={blob.color} stop-opacity="0" />
			</radialGradient>

			<!-- Main gradient -->
			<radialGradient id="{blob.gradientId}Main" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color={blob.color} stop-opacity={blob.intensity * 0.9} />
				<stop offset="50%" stop-color={blob.color} stop-opacity={blob.intensity * 0.6} />
				<stop offset="80%" stop-color={blob.color} stop-opacity={blob.intensity * 0.3} />
				<stop offset="100%" stop-color={blob.color} stop-opacity="0" />
			</radialGradient>

			<!-- Core gradient (inner highlight) -->
			<radialGradient id="{blob.gradientId}Core" cx="50%" cy="50%" r="30%">
				<stop offset="0%" stop-color={blob.color} stop-opacity={blob.intensity * 1.0} />
				<stop offset="60%" stop-color={blob.color} stop-opacity={blob.intensity * 0.7} />
				<stop offset="100%" stop-color={blob.color} stop-opacity={blob.intensity * 0.3} />
			</radialGradient>
		{/each}
	</defs>

	<!-- Layer 1: Glow halo (simple circles, blurred) -->
	<g filter="url(#glowFilter)" opacity="0.35">
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getCirclePath(blob.currentX, blob.currentY, blob.size * 2.5)}
				fill="url(#{blob.gradientId}Glow)"
			/>
		{/each}
	</g>

	<!-- Layer 2: Main blob body with organic paths -->
	<g filter="url(#softEdge)" style:mix-blend-mode={primaryBlend} opacity="0.75">
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getBlobPath(blob)}
				fill="url(#{blob.gradientId}Main)"
			/>
		{/each}
	</g>

	<!-- Layer 3: Core highlight (simple circles) -->
	<g style:mix-blend-mode={primaryBlend} opacity="0.9">
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getCirclePath(blob.currentX, blob.currentY, blob.size * 0.6)}
				fill="url(#{blob.gradientId}Core)"
			/>
		{/each}
	</g>
</svg>
