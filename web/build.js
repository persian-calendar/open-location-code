// The build of the page: one document, with the library and the page's script bundled into
// it and minified.
//
// The library is `js/src/openlocationcode.js` of this repository, imported by `src/main.js`,
// so what is deployed is the JavaScript implementation itself rather than a build of another
// language's port. Bun resolves that import and minifies the result; this script writes it
// into the page, and copies the pieces a browser has to fetch on its own: icons, manifest,
// and the worker that keeps the page working offline.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drawIcons } from './icons.js';

const root = import.meta.dir;
const src = join(root, 'src');
const dist = join(root, 'dist');

// The deploy passes the commit; a build of one's own leaves the cache name alone.
const stamp = (process.env.OLC_BUILD || 'dev').slice(0, 12);

function fail(message) {
	throw new Error(message);
}

function kilobytes(bytes) {
	return (bytes / 1024).toFixed(1);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// What a browser fetches on its own: the icons the page is marked with, and the manifest
// that names them.
await cp(join(src, 'icons'), join(dist, 'icons'), { recursive: true });
await cp(join(src, 'manifest.webmanifest'), join(dist, 'manifest.webmanifest'));

// The PNG icons are drawn from the SVG, so they are a build product like the page itself and
// cannot drift from the mark. It takes librsvg, which is what the build asks for by name.
const drawn = await drawIcons(join(dist, 'icons'));

// The library and the page in one file, minified. An IIFE, because the page asks for a plain
// script and nothing else imports it. `./h3.js` is marked external: main.js imports it by
// name the first time H3 is opened, so the default Plus Codes path never downloads it.
const built = await Bun.build({
	entrypoints: [join(src, 'main.js')],
	target: 'browser',
	format: 'iife',
	minify: true,
	// Bun compares external entries with the resolved module path, so it is spelled out in
	// full; the emitted import stays `./h3.js`, relative to the page.
	external: [join(src, 'h3.js')],
});
if (!built.success) {
	for (const log of built.logs) console.error(log);
	fail('the page could not be bundled');
}
const bundle = await built.outputs[0].text();
const html = await readFile(join(src, 'index.html'), 'utf8');
const tag = '<script src="main.js"></script>';
if (!html.includes(tag)) fail(`index.html has no ${tag}`);

const page = html.replace(tag, () =>
	// Nothing inside the bundle may close the tag it is written into.
	'<script>\n' + bundle.replaceAll('</script', '<\\/script') + '\t</script>'
);
await writeFile(join(dist, 'index.html'), page);

// H3 in a bundle of its own, fetched only when the reader switches to H3. It is an ES
// module because that is what the page's dynamic import asks for.
const h3Built = await Bun.build({
	entrypoints: [join(src, 'h3.js')],
	target: 'browser',
	format: 'esm',
	minify: true,
});
if (!h3Built.success) {
	for (const log of h3Built.logs) console.error(log);
	fail('the H3 bundle could not be built');
}
const h3Bundle = await h3Built.outputs[0].text();
await writeFile(join(dist, 'h3.js'), h3Bundle);

// The worker is the version marker: the browser only looks for a new one when sw.js itself
// has changed, so a deploy has to change it, which is what the commit goes in for.
const workerSource = await readFile(join(src, 'sw.js'), 'utf8');
if (!workerSource.includes("const BUILD = 'dev';")) fail("sw.js has no BUILD to stamp");
const worker = workerSource
	.replace("const BUILD = 'dev';", `const BUILD = '${stamp}';`)
	// The page bundle is inlined and the H3 bundle is precached and preloaded by name, so a
	// precache entry that names the old page script would be stale.
	.split('\n')
	.filter((line) => !line.includes("'./main.js'") && !line.includes("'./web.js'"))
	.join('\n');
if (!worker.includes(`const BUILD = '${stamp}';`)) fail('sw.js was not stamped');
await writeFile(join(dist, 'sw.js'), worker);

const sizes = [];
for (const name of ['index.html', 'manifest.webmanifest', 'sw.js', 'h3.js']) {
	sizes.push(`${name} ${kilobytes((await readFile(join(dist, name))).length)} kB`);
}
console.log(`built dist (${stamp}): ${sizes.join(', ')}`);
console.log(`  of which the minified page bundle is ${kilobytes(Buffer.byteLength(bundle))} kB`);
console.log(`  H3, preloaded in the background: ${kilobytes(Buffer.byteLength(h3Bundle))} kB`);
console.log(`  icons: ${drawn} drawn from icon.svg`);
