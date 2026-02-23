




export type DeviceMotionCallback = (data: { x: number; y: number; z: number }) => void;

export class DeviceMotion {
	private callback: DeviceMotionCallback;
	private isListening = false;
	private useMotionAPI = false;

	constructor(callback: DeviceMotionCallback) {
		this.callback = callback;
	}

	async initialize(): Promise<void> {
		
		if (typeof window === 'undefined') {
			return;
		}

		
		if (!window.isSecureContext) {
			console.warn('DeviceMotion APIs require a secure context (HTTPS)');
			return;
		}

		
		if ('DeviceMotionEvent' in window) {
			this.useMotionAPI = true;
		} else if ('DeviceOrientationEvent' in window) {
			this.useMotionAPI = false;
		} else {
			console.log('No device motion/orientation APIs supported');
			return;
		}

		
		const hasPermission = await this.requestPermission();
		if (hasPermission) {
			this.startListening();
		} else {
			console.warn('Device motion permission denied or not available');
		}
	}

	async requestPermission(): Promise<boolean> {
		
		if (
			this.useMotionAPI &&
			typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
				.requestPermission === 'function'
		) {
			try {
				const response = await (
					DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }
				).requestPermission();
				return response === 'granted';
			} catch (error) {
				console.error('Error requesting device motion permission:', error);
				return false;
			}
		} else if (
			!this.useMotionAPI &&
			typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
				.requestPermission === 'function'
		) {
			try {
				const response = await (
					DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
				).requestPermission();
				return response === 'granted';
			} catch (error) {
				console.error('Error requesting device orientation permission:', error);
				return false;
			}
		}

		
		return true;
	}

	private startListening(): void {
		if (this.isListening) return;

		if (this.useMotionAPI) {
			window.addEventListener('devicemotion', this.handleMotion);
		} else {
			window.addEventListener('deviceorientation', this.handleOrientation);
		}
		this.isListening = true;
	}

	private handleMotion = (event: DeviceMotionEvent): void => {
		try {
			if (!event.accelerationIncludingGravity) return;

			const { x, y, z } = event.accelerationIncludingGravity;
			if (x === null || y === null || z === null) return;

			
			
			const data = {
				x: Math.max(-1, Math.min(1, x / 9.8)),
				y: Math.max(-1, Math.min(1, y / 9.8)),
				z: Math.max(-1, Math.min(1, z / 9.8)),
			};

			this.callback(data);
		} catch (error) {
			console.error('Error handling device motion:', error);
		}
	};

	private handleOrientation = (event: DeviceOrientationEvent): void => {
		try {
			if (event.beta === null || event.gamma === null) return;

			
			
			

			const data = {
				x: event.beta / 90, 
				y: event.gamma / 90, 
				z: event.alpha ? event.alpha / 360 : 0, 
			};

			this.callback(data);
		} catch (error) {
			console.error('Error handling device orientation:', error);
		}
	};

	cleanup(): void {
		if (this.isListening) {
			if (this.useMotionAPI) {
				window.removeEventListener('devicemotion', this.handleMotion);
			} else {
				window.removeEventListener('deviceorientation', this.handleOrientation);
			}
			this.isListening = false;
		}
	}
}
