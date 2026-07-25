// prefers-reduced-motion detection + change subscription. Mirrors
// themes/dark-mode.ts's isDarkMode()/watchDarkMode() shape (snapshot getter +
// subscribe-with-immediate-callback) so TinyVectors can drive its existing
// static-frame path from the same kind of media-query signal.

export function prefersReducedMotion(): boolean {
	if (typeof matchMedia !== 'function') return false;
	return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function watchReducedMotion(callback: (reduced: boolean) => void): () => void {
	if (typeof matchMedia !== 'function') return () => {};

	const mql = matchMedia('(prefers-reduced-motion: reduce)');
	const notify = () => callback(mql.matches);

	mql.addEventListener('change', notify);
	notify();

	return () => {
		mql.removeEventListener('change', notify);
	};
}
