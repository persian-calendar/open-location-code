// Plus Codes: the format, its examples, and the few library calls the page makes.
import OpenLocationCode from '../../js/src/openlocationcode.js';

// Eight letters and the separator, the nine character form the page opens with.
export const DEFAULT_DIGITS = 8;

export const DIGITS_CHOICES = [
	{ digits: 2, label: '2 letters — 2 000 km' },
	{ digits: 4, label: '4 letters — 110 km' },
	{ digits: 6, label: '6 letters — 5.5 km' },
	{ digits: 8, label: '8 letters — 275 m' },
	{ digits: 10, label: '10 letters — 14 m' },
	{ digits: 11, label: '11 letters — 3 m' },
	{ digits: 12, label: '12 letters — 1 m' },
	{ digits: 13, label: '13 letters — 15 cm' },
	{ digits: 14, label: '14 letters — 3 cm' },
	{ digits: 15, label: '15 letters — 6 mm' },
];

const GOOGLEPLEX = { label: 'Googleplex', latitude: 37.4219999, longitude: -122.0840575 };
const TEHRAN = { label: 'Tehran', latitude: 35.6997, longitude: 51.338 };

export const EXAMPLES = [
	GOOGLEPLEX,
	{ label: 'Eiffel Tower', latitude: 48.8582954, longitude: 2.294505 },
	{ label: 'Nairobi', latitude: -1.2906, longitude: 36.8219 },
	TEHRAN,
	{ label: '🗿 Easter Island', latitude: -27.12, longitude: -109.35 },
];

// Where the page opens: Tehran for a browser on Iran's clock, and the address the format
// is usually introduced with anywhere else.
export const homeExample = () => {
	const minutesEastOfUtc = -new Date().getTimezoneOffset();
	return minutesEastOfUtc === 210 ? TEHRAN : GOOGLEPLEX;
};

// The cell a code covers, as the page draws and measures it. The library answers with the
// corners and with how many letters the code has, both already in degrees.
export const areaOf = (code) => {
	let area;
	try {
		area = OpenLocationCode.decode(code);
	} catch {
		return null;
	}
	const corners = {
		south: area.latitudeLo,
		west: area.longitudeLo,
		north: area.latitudeHi,
		east: area.longitudeHi,
		digits: area.codeLength,
	};
	for (const value of Object.values(corners)) {
		if (!Number.isFinite(value)) return null;
	}
	return corners;
};

// "full" for a complete code, "short" for one that has lost its beginning, and null for
// anything that is not a code at all: what a person types, not a failure.
export const kindOf = (code) => {
	if (OpenLocationCode.isFull(code)) return 'full';
	if (OpenLocationCode.isShort(code)) return 'short';
	return null;
};

export const encodeCode = (latitude, longitude, digits) =>
	OpenLocationCode.encode(latitude, longitude, digits);

export const recoverNearest = (code, latitude, longitude) =>
	OpenLocationCode.recoverNearest(code, latitude, longitude);
