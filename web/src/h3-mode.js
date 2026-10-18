// Helpers for the H3 mode, kept apart from the page so they can be tested without a DOM and
// without loading h3-js. The library itself is fetched only when H3 is first opened.

export const MIN_RESOLUTION = 0;
export const MAX_RESOLUTION = 15;
export const DEFAULT_RESOLUTION = 9;

// H3 indexes are hexadecimal and case-insensitive; the page reads and writes them lowercased.
export const normaliseIndex = (text) => String(text).trim().toLowerCase();

// One entry per resolution, labelled with the average edge length the library reports.
export const resolutionChoices = (h3, formatDistance) =>
	Array.from({ length: MAX_RESOLUTION - MIN_RESOLUTION + 1 }, (_, offset) => {
		const resolution = MIN_RESOLUTION + offset;
		const edge = h3.getHexagonEdgeLengthAvg(resolution, 'm');
		return {
			resolution,
			edgeMetres: edge,
			label: `Res ${resolution} — ${formatDistance(edge)} edge`,
		};
	});

const trimmed = (value, digits) =>
	digits === 0 ? String(Math.round(value)) : value.toFixed(digits).replace(/\.?0+$/, '');

// An area that reads at any scale, from a res 15 cell of under a square metre to a res 0
// cell of several million square kilometres. H3's own units are square metres.
export const formatArea = (squareMetres) => {
	if (!(squareMetres > 0)) return '—';
	if (squareMetres >= 1e4) {
		const kilometres = squareMetres / 1e6;
		const digits = kilometres >= 1 ? 2 : (kilometres >= 0.1 ? 3 : (kilometres >= 0.01 ? 4 : 5));
		return `${trimmed(kilometres, digits)} km²`;
	}
	if (squareMetres >= 1) return `${trimmed(squareMetres, squareMetres >= 10 ? 0 : 1)} m²`;
	return `${trimmed(squareMetres, squareMetres >= 0.1 ? 2 : 3)} m²`;
};

// The bounds of a cell's boundary, with every longitude unwrapped around the centre so a
// cell that touches the antimeridian still measures its real width rather than most of the
// world. The values may run a little beyond ±180 near the seam, which is what the map wants.
export const boundsOf = (boundary, centreLongitude) => {
	let south = Infinity;
	let north = -Infinity;
	let west = Infinity;
	let east = -Infinity;
	for (const [latitude, longitude] of boundary) {
		const unwrapped = centreLongitude + wrapDegrees(longitude - centreLongitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(unwrapped)) continue;
		if (latitude < south) south = latitude;
		if (latitude > north) north = latitude;
		if (unwrapped < west) west = unwrapped;
		if (unwrapped > east) east = unwrapped;
	}
	return { south, west, north, east };
};

export const wrapDegrees = (degrees) => (((degrees + 180) % 360 + 360) % 360) - 180;

// h3-js is a bundle of its own. Keep both the loaded module and the promise in flight so a
// second switch cannot fetch or parse it twice.
let loaded = null;
let loading = null;

export const loadH3 = () => {
	if (loaded) return Promise.resolve(loaded);
	if (!loading) {
		loading = import('./h3.js')
			.then((module) => {
				loaded = module;
				return module;
			})
			.catch((error) => {
				loading = null;
				throw error;
			});
	}
	return loading;
};
