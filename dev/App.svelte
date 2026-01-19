<script lang="ts">
	import TinyVectors from '../src/svelte/TinyVectors.svelte';
	import type { ThemePresetName } from '../src/core/schema.js';

	interface Props {
		theme?: ThemePresetName;
		blobCount?: number;
		animated?: boolean;
	}

	let { theme = 'tinyland', blobCount = 8, animated = true }: Props = $props();
</script>

<div class="app-container">
	<TinyVectors
		{theme}
		{blobCount}
		{animated}
		opacity={0.8}
		shouldLoad={true}
		enableDeviceMotion={true}
		enableScrollPhysics={true}
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
		height: 100vh;
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
		text-align: center;
		color: white;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	h1 {
		font-size: 4rem;
		font-weight: 200;
		letter-spacing: 0.2em;
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
</style>
