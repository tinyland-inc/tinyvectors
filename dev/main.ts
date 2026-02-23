import { mount, unmount } from 'svelte';
import App from './App.svelte';

let app: ReturnType<typeof mount> | null = null;
let currentProps = {
	theme: 'tinyland' as 'tinyland' | 'trans' | 'pride',
	blobCount: 12,
	animated: true,
};

function mountApp() {
	const target = document.getElementById('app');
	if (!target) return;

	if (app) {
		unmount(app);
	}

	app = mount(App, {
		target,
		props: currentProps,
	});
}


mountApp();


const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
themeSelect?.addEventListener('change', () => {
	currentProps.theme = themeSelect.value as 'tinyland' | 'trans' | 'pride';
	mountApp();
});


const blobCountSlider = document.getElementById('blob-count') as HTMLInputElement;
const blobCountValue = document.getElementById('blob-count-value');
blobCountSlider?.addEventListener('input', () => {
	currentProps.blobCount = parseInt(blobCountSlider.value, 10);
	if (blobCountValue) {
		blobCountValue.textContent = blobCountSlider.value;
	}
});
blobCountSlider?.addEventListener('change', () => {
	mountApp();
});


const darkModeCheckbox = document.getElementById('dark-mode') as HTMLInputElement;
darkModeCheckbox?.addEventListener('change', () => {
	document.body.classList.toggle('dark', darkModeCheckbox.checked);
	document.body.classList.toggle('light', !darkModeCheckbox.checked);
	document.documentElement.classList.toggle('dark', darkModeCheckbox.checked);
});


const animatedCheckbox = document.getElementById('animated') as HTMLInputElement;
animatedCheckbox?.addEventListener('change', () => {
	currentProps.animated = animatedCheckbox.checked;
	mountApp();
});


const reloadBtn = document.getElementById('reload-btn');
reloadBtn?.addEventListener('click', () => {
	mountApp();
});

export default app;
