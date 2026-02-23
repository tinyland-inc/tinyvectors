






import { BlobPhysics, type BlobPhysicsConfig } from '../core/BlobPhysics.js';
import type { ConvexBlob } from '../core/types.js';


type WorkerInMessage =
	| { type: 'init'; blobCount: number; config: Partial<BlobPhysicsConfig> }
	| { type: 'tick' }
	| { type: 'setGravity'; x: number; y: number }
	| { type: 'setTilt'; x: number; y: number; z: number }
	| { type: 'setScrollStickiness'; value: number }
	| { type: 'updateMouse'; x: number; y: number }
	| { type: 'dispose' };


type WorkerOutMessage =
	| { type: 'ready' }
	| { type: 'frame'; blobs: BlobRenderData[] }
	| { type: 'error'; message: string };




export interface BlobRenderData {
	x: number;
	y: number;
	size: number;
	controlPointRadii: number[];
	controlPointAngles: number[];
	gradientId: string;
	intensity: number;
}


let physics: BlobPhysics | null = null;
let lastTime = performance.now();
let isInitialized = false;




function extractRenderData(blobs: ConvexBlob[]): BlobRenderData[] {
	return blobs.map((blob) => ({
		x: blob.currentX,
		y: blob.currentY,
		size: blob.size,
		controlPointRadii: blob.controlPoints?.map((cp) => cp.radius) || [],
		controlPointAngles: blob.controlPoints?.map((cp) => cp.angle) || [],
		gradientId: blob.gradientId,
		intensity: blob.intensity,
	}));
}




self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
	try {
		switch (e.data.type) {
			case 'init': {
				physics = new BlobPhysics(e.data.blobCount, e.data.config);
				physics.init().then(() => {
					isInitialized = true;
					lastTime = performance.now();
					self.postMessage({ type: 'ready' } satisfies WorkerOutMessage);
				});
				break;
			}

			case 'tick': {
				if (!physics || !isInitialized) return;

				const now = performance.now();
				const dt = Math.min((now - lastTime) / 1000, 0.033); 
				lastTime = now;

				physics.tick(dt, now / 1000);

				
				const renderData = extractRenderData(physics.getBlobs());
				self.postMessage({ type: 'frame', blobs: renderData } satisfies WorkerOutMessage);
				break;
			}

			case 'setGravity': {
				physics?.setGravity({ x: e.data.x, y: e.data.y });
				break;
			}

			case 'setTilt': {
				physics?.setTilt({ x: e.data.x, y: e.data.y, z: e.data.z });
				break;
			}

			case 'setScrollStickiness': {
				physics?.setScrollStickiness(e.data.value);
				break;
			}

			case 'updateMouse': {
				physics?.updateMousePosition(e.data.x, e.data.y);
				break;
			}

			case 'dispose': {
				physics?.dispose();
				physics = null;
				isInitialized = false;
				break;
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		self.postMessage({ type: 'error', message } satisfies WorkerOutMessage);
	}
};


export type { WorkerInMessage, WorkerOutMessage };
