// Web Mercator, the map's units, and the numbers both formats show.

export const MIN_ZOOM = 2;
export const MAX_ZOOM = 19;
export const MAX_LATITUDE = 85.05112878;
export const TILE_SIZE = 256;

const METRES_PER_DEGREE_LATITUDE = 111132;
const METRES_PER_DEGREE_LONGITUDE = 111320;

export const clamp = (value, low, high) => (value < low ? low : (value > high ? high : value));

export const wrapLongitude = (longitude) => (((longitude + 180) % 360 + 360) % 360) - 180;

export const project = (latitude, longitude) => {
	const radians = (clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
	return {
		x: (longitude + 180) / 360,
		y: 0.5 - Math.log((1 + Math.sin(radians)) / (1 - Math.sin(radians))) / (4 * Math.PI),
	};
};

export const unproject = (x, y) => {
	const n = Math.PI - 2 * Math.PI * y;
	return {
		latitude: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
		longitude: x * 360 - 180,
	};
};

// Seven decimals are about a centimetre, which is finer than the finest code.
export const formatDegrees = (value) =>
	value.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');

export const formatDistance = (metres) => {
	if (metres >= 1000) {
		const kilometres = metres / 1000;
		return `${kilometres >= 10 ? kilometres.toFixed(0) : kilometres.toFixed(1)} km`;
	}
	if (metres >= 10) return `${Math.round(metres)} m`;
	if (metres >= 1) return `${metres.toFixed(1)} m`;
	if (metres >= 0.01) return `${Math.round(metres * 100)} cm`;
	return `${Math.round(metres * 1000)} mm`;
};

export const cellCentre = (area) => ({
	latitude: (area.south + area.north) / 2,
	longitude: (area.west + area.east) / 2,
});

export const cellMetres = (area) => {
	const centre = cellCentre(area);
	return {
		latitude: (area.north - area.south) * METRES_PER_DEGREE_LATITUDE,
		longitude: (area.east - area.west) * METRES_PER_DEGREE_LONGITUDE *
			Math.cos((centre.latitude * Math.PI) / 180),
	};
};
