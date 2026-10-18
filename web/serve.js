// Serves the built page, for looking at it: `bun run dev` builds first, then runs this.
//
// It is the same origin and the same paths GitHub Pages serves, so the fragment links and the
// service worker behave here as they do there — with one exception, which the page itself
// makes: a worker is not registered on localhost, so what is served here is always what was
// just built.
const dist = new URL('./dist/', import.meta.url).pathname;
const port = Number(process.env.PORT) || 8200;

const types = {
	html: 'text/html; charset=utf-8',
	js: 'text/javascript; charset=utf-8',
	json: 'application/json; charset=utf-8',
	webmanifest: 'application/manifest+json; charset=utf-8',
	svg: 'image/svg+xml',
	png: 'image/png',
};

Bun.serve({
	port,
	async fetch(request) {
		const path = new URL(request.url).pathname;
		const name = path === '/' ? 'index.html' : decodeURIComponent(path).replace(/^\/+/, '');
		const file = Bun.file(dist + name);
		if (await file.exists()) {
			const type = types[name.split('.').pop()] || 'application/octet-stream';
			return new Response(file, { headers: { 'content-type': type } });
		}
		// A path that names no file is the page: the demo has one address.
		return new Response(Bun.file(dist + 'index.html'), {
			headers: { 'content-type': types.html },
		});
	},
});

console.log(`Plus Codes at http://localhost:${port}/`);
