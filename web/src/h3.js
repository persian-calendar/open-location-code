// The handful of H3 functions the page uses, in a bundle of their own.
//
// h3-js is about 100 kB compressed, so the default Plus Codes page does not download it:
// main.js imports this file with `import('./h3.js')` the first time H3 is opened. Bun keeps
// it external to the page bundle (see build.js), and the service worker caches it then.
export {
	latLngToCell,
	cellToLatLng,
	cellToBoundary,
	isValidCell,
	getResolution,
	cellArea,
	getHexagonEdgeLengthAvg,
} from 'h3-js';
