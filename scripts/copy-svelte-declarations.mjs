import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';

const declarationPairs = [
	['BlobSVG.svelte.d.ts', 'BlobSVG.d.ts'],
	['TinyVectors.svelte.d.ts', 'TinyVectors.d.ts'],
];
const sourceDir = new URL('../src/svelte/', import.meta.url);
const outputDir = new URL('../dist-types/svelte/', import.meta.url);

await mkdir(outputDir, { recursive: true });

await Promise.all(
	declarationPairs.map(([sourceName, outputName]) =>
		copyFile(new URL(sourceName, sourceDir), new URL(outputName, outputDir)),
	),
);

await writeFile(
	new URL('index.d.ts', outputDir),
	[
		"export { default as TinyVectors, type TinyVectorsExports, type TinyVectorsProps } from './TinyVectors.js';",
		"export { default as BlobSVG, type BlobSVGProps } from './BlobSVG.js';",
		'',
	].join('\n'),
);

await Promise.all([
	rm(new URL('index.d.ts.map', outputDir), { force: true }),
	rm(new URL('BlobSVG.svelte.d.ts', outputDir), { force: true }),
	rm(new URL('TinyVectors.svelte.d.ts', outputDir), { force: true }),
]);
