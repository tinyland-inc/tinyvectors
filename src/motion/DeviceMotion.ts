/**
 * Device Motion handler for accelerometer/gyroscope input
 * Supports iOS 13+ permission model and falls back to orientation API
 */

export type DeviceMotionCallback = (data: { x: number; y: number; z: number }) => void;

export class DeviceMotion {
	private callback: DeviceMotionCallback;
	private isListening = false;
	private useMotionAPI = false;

	constructor(callback: DeviceMotionCallback) {
		this.callback = callback;
	}

	async initialize(): Promise<void> {
		// Check if we're in a browser
		if (typeof window === 'undefined') {
			return;
		}

		// Check if we're in a secure context (required for these APIs)
		if (!window.isSecureContext) {
			console.warn('DeviceMotion APIs require a secure context (HTTPS)');
			return;
		}

		// Try DeviceMotionEvent first (accelerometer)
		if ('DeviceMotionEvent' in window) {
			this.useMotionAPI = true;
		} else if ('DeviceOrientationEvent' in window) {
			this.useMotionAPI = false;
		} else {
			console.log('No device motion/orientation APIs supported');
			return;
		}

		// Check if permission is needed before starting
		const hasPermission = await this.requestPermission();
		if (hasPermission) {
			this.startListening();
		} else {
			console.warn('Device motion permission denied or not available');
		}
	}

	async requestPermission(): Promise<boolean> {
		// For iOS 13+ devices, we need to request permission
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

		// For other devices, permission is implicit
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

			// Normalize accelerometer values
			// Typical range is -9.8 to 9.8 m/s² (gravity)
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

			// Beta: Front-to-back tilt in degrees (-180 to 180)
			// Gamma: Left-to-right tilt in degrees (-90 to 90)
			// Alpha: Compass direction (0 to 360)

			const data = {
				x: event.beta / 90, // Normalize to -2 to 2
				y: event.gamma / 90, // Normalize to -1 to 1
				z: event.alpha ? event.alpha / 360 : 0, // Normalize to 0 to 1
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
