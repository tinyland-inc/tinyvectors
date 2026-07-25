import type { Component } from 'svelte';
import type { BlobPhysics } from '../core/BlobPhysics.js';
import type { ConvexBlob } from '../core/types.js';

export interface BlobSVGProps {
	blobs?: ConvexBlob[];
	physics?: BlobPhysics | null;
	/** Explicit dark override; null auto-detects from the document. */
	isDark?: boolean | null;
}

declare const BlobSVG: Component<BlobSVGProps, {}, ''>;
export default BlobSVG;
