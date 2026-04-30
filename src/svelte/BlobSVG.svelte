<script lang="ts">
	import { browser } from '../core/browser.js';
	import type { BlobPhysics } from '../core/BlobPhysics.js';
	import type { ConvexBlob } from '../core/types.js';

	interface Props {
		blobs?: ConvexBlob[];
		physics?: BlobPhysics | null;
	}

	const svgId = $props.id();
	let { blobs = [], physics = null }: Props = $props();

	let isDarkMode = $state(false);

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

	function getCirclePath(cx: number, cy: number, r: number): string {
		return `M ${cx - r},${cy} A ${r},${r} 0 1,1 ${cx + r},${cy} A ${r},${r} 0 1,1 ${cx - r},${cy}`;
	}

	function getBlobPath(blob: ConvexBlob): string {
		if (physics && blob.controlPoints && blob.controlPoints.length > 0) {
			return physics.generateSmoothBlobPath(blob);
		}
		return getCirclePath(blob.currentX, blob.currentY, blob.size);
	}

	function getDefinitionId(name: string): string {
		return `${svgId}-${name}`;
	}

	function getBlobDefinitionId(blob: ConvexBlob, name: string): string {
		return `${svgId}-${blob.gradientId}-${name}`;
	}
</script>

<svg
	width="100%"
	height="100%"
	viewBox="-33 -33 133 133"
	preserveAspectRatio="xMidYMid slice"
	shape-rendering="geometricPrecision"
	color-interpolation="sRGB"
	style:display="block"
	style:width="100%"
	style:height="100%"
>
	<defs>
		<filter
			id={getDefinitionId('glow-filter')}
			x="-90"
			y="-90"
			width="260"
			height="260"
			filterUnits="userSpaceOnUse"
			color-interpolation-filters="sRGB"
		>
			<feGaussianBlur in="SourceGraphic" stdDeviation="4.8" result="glow" />
		</filter>

		<filter
			id={getDefinitionId('soft-edge-filter')}
			x="-70"
			y="-70"
			width="220"
			height="220"
			filterUnits="userSpaceOnUse"
			color-interpolation-filters="sRGB"
		>
			<feGaussianBlur in="SourceGraphic" stdDeviation="0.95" result="soft" />
		</filter>

		<!--
			Each gradient sets --tvi once; stops use calc().
			This keeps the richer gel layers while preserving the Phase A
			per-frame Svelte expression reduction.
		-->
		{#each blobs as blob (blob.gradientId)}
			<radialGradient
				id={getBlobDefinitionId(blob, 'glow')}
				cx="48%"
				cy="46%"
				r="82%"
				fx="38%"
				fy="30%"
				style:--tvi={blob.intensity}
			>
				<stop offset="0%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.48)" />
				<stop offset="42%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.28)" />
				<stop offset="78%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.08)" />
				<stop offset="100%" stop-color={blob.color} stop-opacity="0" />
			</radialGradient>

			<radialGradient
				id={getBlobDefinitionId(blob, 'body')}
				cx="54%"
				cy="58%"
				r="64%"
				fx="38%"
				fy="28%"
				style:--tvi={blob.intensity}
			>
				<stop offset="0%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.9)" />
				<stop offset="38%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.72)" />
				<stop offset="72%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.34)" />
				<stop offset="92%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.1)" />
				<stop offset="100%" stop-color={blob.color} stop-opacity="0" />
			</radialGradient>

			<radialGradient
				id={getBlobDefinitionId(blob, 'specular')}
				cx="34%"
				cy="26%"
				r="42%"
				fx="28%"
				fy="20%"
				style:--tvi={blob.intensity}
			>
				<stop offset="0%" stop-color="#ffffff" stop-opacity="calc(var(--tvi) * 0.54)" />
				<stop offset="36%" stop-color="#ffffff" stop-opacity="calc(var(--tvi) * 0.2)" />
				<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
			</radialGradient>

			<radialGradient
				id={getBlobDefinitionId(blob, 'core')}
				cx="58%"
				cy="62%"
				r="40%"
				fx="48%"
				fy="48%"
				style:--tvi={blob.intensity}
			>
				<stop offset="0%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.9)" />
				<stop offset="62%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.48)" />
				<stop offset="100%" stop-color={blob.color} stop-opacity="calc(var(--tvi) * 0.12)" />
			</radialGradient>
		{/each}
	</defs>

	<g filter={`url(#${getDefinitionId('glow-filter')})`} opacity={isDarkMode ? 0.42 : 0.28}>
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getCirclePath(blob.currentX, blob.currentY, blob.size * 2.35)}
				fill={`url(#${getBlobDefinitionId(blob, 'glow')})`}
			/>
		{/each}
	</g>

	<g
		filter={`url(#${getDefinitionId('soft-edge-filter')})`}
		style:mix-blend-mode={isDarkMode ? 'screen' : 'multiply'}
		opacity={isDarkMode ? 0.72 : 0.78}
	>
		{#each blobs as blob (blob.gradientId)}
			<path d={getBlobPath(blob)} fill={`url(#${getBlobDefinitionId(blob, 'body')})`} />
		{/each}
	</g>

	<g style:mix-blend-mode={isDarkMode ? 'screen' : 'soft-light'} opacity={isDarkMode ? 0.34 : 0.24}>
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getCirclePath(
					blob.currentX - blob.size * 0.25,
					blob.currentY - blob.size * 0.32,
					blob.size * 0.9,
				)}
				fill={`url(#${getBlobDefinitionId(blob, 'specular')})`}
			/>
		{/each}
	</g>

	<g style:mix-blend-mode={isDarkMode ? 'screen' : 'multiply'} opacity={isDarkMode ? 0.78 : 0.58}>
		{#each blobs as blob (blob.gradientId)}
			<path
				d={getCirclePath(blob.currentX, blob.currentY, blob.size * 0.58)}
				fill={`url(#${getBlobDefinitionId(blob, 'core')})`}
			/>
		{/each}
	</g>
</svg>
