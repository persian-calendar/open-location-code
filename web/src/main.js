// The page: the fields, the facts, the address bar, and the mode switch. The map lives in
// map.js, Web Mercator in geo.js, Plus Codes in plus.js, H3 in h3-mode.js, and the URL
// fragment in fragment.js.
import { cellCentre, cellMetres, formatDegrees, formatDistance } from './geo.js';
import {
	DEFAULT_DIGITS,
	DIGITS_CHOICES,
	EXAMPLES,
	areaOf,
	encodeCode,
	homeExample,
	kindOf,
	recoverNearest,
} from './plus.js';
import {
	DEFAULT_RESOLUTION,
	boundsOf,
	formatArea,
	loadH3,
	normaliseIndex,
	resolutionChoices,
} from './h3-mode.js';
import { createMap } from './map.js';

const codeInput = document.getElementById('code');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const digitsSelect = document.getElementById('digits');
const statusLine = document.getElementById('status');
const examplesBox = document.getElementById('examples');
const cellSizeCell = document.getElementById('cell-size');
const centreCell = document.getElementById('centre');
const shareLinkField = document.getElementById('share-link');
const sharePlusCodesField = document.getElementById('share-plus-codes');
const shareOsmField = document.getElementById('share-osm');
const h3Input = document.getElementById('h3');
const resolutionSelect = document.getElementById('resolution');
const plusField = document.getElementById('plus-field');
const h3Field = document.getElementById('h3-field');
const modesBox = document.getElementById('modes');
const modePlusButton = document.getElementById('mode-plus');
const modeH3Button = document.getElementById('mode-h3');
const sharePlusRow = document.getElementById('share-plus-row');
const shareLinkRow = document.getElementById('share-link-row');
const cellLabel = document.getElementById('fact-cell-label');

const home = homeExample();

let current = null;
let mode = 'plus';
let currentH3 = null;
let h3 = null;

const readFragment = () => {
	const fragment = location.hash.slice(1);
	if (!fragment) return null;
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
};

const looksLikeH3 = (text) => /^[0-9a-f]{15}$/i.test(String(text).trim());

const pagePath = () => location.pathname.replace(/index\.html$/, '');

const linkTo = (id) => (id ? `${pagePath()}#${id}` : pagePath());

const writeFragment = (id) => {
	try {
		history.replaceState(null, '', linkTo(id));
	} catch {
		// A page opened from the file system cannot rewrite its own address; the codes and
		// the link fields still work.
	}
};

const say = (message, isError = false) => {
	statusLine.textContent = message;
	statusLine.classList.toggle('is-error', isError);
};

const emptyCell = (element, text) => {
	element.textContent = text;
	element.classList.add('is-empty');
};

const fillCell = (element, text) => {
	element.textContent = text;
	element.classList.remove('is-empty');
};

const syncDigits = (digits) => {
	if (String(digits) === digitsSelect.value) return;
	for (const option of digitsSelect.options) {
		if (Number(option.value) === digits) {
			digitsSelect.value = String(digits);
			return;
		}
	}
};

const syncResolution = (resolution) => {
	if (String(resolution) === resolutionSelect.value) return;
	for (const option of resolutionSelect.options) {
		if (Number(option.value) === resolution) {
			resolutionSelect.value = String(resolution);
			return;
		}
	}
};

const digitsChosen = () => Number(digitsSelect.value) || DEFAULT_DIGITS;

const osmUrl = ({ latitude, longitude }) =>
	`https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}` +
	`#map=17/${latitude.toFixed(6)}/${longitude.toFixed(6)}`;

// What the code in the box says: the code itself, the size of the cell it names, and
// where that cell is. One code, at the precision chosen there.
const refreshPlusFacts = () => {
	if (!current) {
		emptyCell(cellSizeCell, '—');
		emptyCell(centreCell, '—');
		shareLinkField.value = '';
		sharePlusCodesField.value = '';
		shareOsmField.value = '';
		return;
	}

	const centre = cellCentre(current.area);
	const metres = cellMetres(current.area);
	fillCell(cellSizeCell,
		`${formatDistance(metres.latitude)} × ${formatDistance(metres.longitude)}`);
	fillCell(centreCell,
		`${formatDegrees(centre.latitude)}, ${formatDegrees(centre.longitude)}`);

	// Everything the page can hand on, written out where it can be read and taken,
	// which is the whole of what it computes: nothing here waits on a server.
	shareLinkField.value = `${location.origin}${linkTo(current.code)}`;
	sharePlusCodesField.value = `https://plus.codes/${current.code}`;
	shareOsmField.value = osmUrl(centre);
};

// What the H3 cell says: how big it is and where its centre is, plus a link to the index
// that identifies it.
const refreshH3Facts = () => {
	if (!currentH3) {
		emptyCell(cellSizeCell, '—');
		emptyCell(centreCell, '—');
		shareLinkField.value = '';
		shareOsmField.value = '';
		return;
	}
	const edge = h3 ? h3.getHexagonEdgeLengthAvg(currentH3.resolution, 'm') : 0;
	fillCell(cellSizeCell,
		`${formatArea(currentH3.area)}${edge ? ` · ${formatDistance(edge)} edge` : ''}`);
	fillCell(centreCell,
		`${formatDegrees(currentH3.centre.latitude)}, ${formatDegrees(currentH3.centre.longitude)}`);
	shareLinkField.value = `${location.origin}${linkTo(currentH3.index)}`;
	shareOsmField.value = osmUrl(currentH3.centre);
};

// Whichever format is showing.
const refreshFacts = () => {
	if (mode === 'h3') refreshH3Facts();
	else refreshPlusFacts();
};

const rememberUrl = () => {
	const id = mode === 'h3'
		? (currentH3?.index ?? null)
		: (current?.code ?? null);
	writeFragment(id);
};

// The one place a new Plus Code location lands: it settles the fields, the map, the facts
// and the address bar together, so none of them can disagree with another.
const setCurrent = (code, area, options = {}) => {
	current = {
		code,
		area,
		anchor: options.anchor || cellCentre(area),
	};

	if (options.source !== 'code') codeInput.value = code;
	// Only a code says where the point is; a change of precision leaves the point the
	// reader put in the fields alone and moves nothing but the code.
	if (options.source !== 'coordinates' && options.source !== 'precision') {
		const centre = cellCentre(area);
		latitudeInput.value = formatDegrees(centre.latitude);
		longitudeInput.value = formatDegrees(centre.longitude);
	}

	syncDigits(area.digits);
	map.show(area);

	if (options.zoomToCell) {
		map.moveTo(cellCentre(area), map.levelFor(area));
	} else if (options.recentre && !map.visible(area)) {
		map.moveTo(cellCentre(area), map.levelFor(area));
	}

	refreshFacts();
	rememberUrl();
};

// Typing a code only moves the map once the code names somewhere off the view, so the
// page does not jump under the cursor while it is being typed. Committing it, by leaving
// the field or pressing Enter, frames it properly.
const applyCode = (text, options = {}) => {
	const typed = String(text).trim();
	if (!typed) {
		current = null;
		map.show(null);
		refreshFacts();
		rememberUrl();
		say('Type a code, or click the map, to begin.');
		return;
	}

	const kind = kindOf(typed);
	if (!kind) {
		say('Not a Plus Code yet: up to eight letters, a plus sign, then a few more.', true);
		return;
	}

	let full = typed;
	let recovered = false;
	if (kind === 'short') {
		// A short code is a code with its beginning left off; it finds its place by being
		// read against where the map is looking.
		const reference = map.centre();
		try {
			full = recoverNearest(typed, reference.latitude, reference.longitude);
		} catch {
			say('That short code cannot be placed from here.', true);
			return;
		}
		recovered = true;
	}

	const area = areaOf(full);
	if (!area) {
		say('That code could not be read.', true);
		return;
	}

	setCurrent(full, area, {
		source: 'code',
		recentre: !options.commit,
		zoomToCell: Boolean(options.commit),
	});

	say(recovered ? `Short code, read from the middle of the map as ${full}.` : '');
};

const applyCoordinates = (latitude, longitude, options = {}) => {
	let code;
	try {
		code = encodeCode(latitude, longitude, options.digits || digitsChosen());
	} catch {
		say('That place could not be encoded.', true);
		return;
	}
	const area = areaOf(code);
	if (!area) {
		say('That place could not be read back.', true);
		return;
	}
	setCurrent(code, area, { ...options, anchor: { latitude, longitude } });
	say('');
};

const parsedCoordinates = () => ({
	latitude: Number.parseFloat(latitudeInput.value.replace(/,/g, '.').trim()),
	longitude: Number.parseFloat(longitudeInput.value.replace(/,/g, '.').trim()),
});

const coordinatesFromFields = () => {
	const { latitude, longitude } = parsedCoordinates();
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
	if (latitude < -90 || latitude > 90) return null;
	if (longitude < -180 || longitude > 180) return null;
	return { latitude, longitude };
};

const readCoordinates = () => {
	const { latitude, longitude } = parsedCoordinates();
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
	if (latitude < -90 || latitude > 90) {
		say('Latitude runs from -90 to 90.', true);
		return null;
	}
	if (longitude < -180 || longitude > 180) {
		say('Longitude runs from -180 to 180.', true);
		return null;
	}
	return { latitude, longitude };
};

const fillResolutions = () => {
	if (resolutionSelect.options.length) return;
	for (const choice of resolutionChoices(h3, formatDistance)) {
		const option = document.createElement('option');
		option.value = String(choice.resolution);
		option.textContent = choice.label;
		resolutionSelect.appendChild(option);
	}
	resolutionSelect.value = String(DEFAULT_RESOLUTION);
};

// The H3 counterpart of setCurrent: one place for the index, the fields, the map, the
// facts and the fragment.
const setCurrentH3 = (index, resolution, boundary, centre, area, options = {}) => {
	currentH3 = {
		index,
		resolution,
		boundary,
		centre,
		area,
		anchor: options.anchor || centre,
		bounds: boundsOf(boundary, centre.longitude),
	};

	h3Input.value = index;
	syncResolution(resolution);

	// A typed index names the centre; a point put on the map, or a change of resolution,
	// leaves the coordinates the reader chose where they are.
	if (options.source !== 'coordinates' && options.source !== 'resolution') {
		latitudeInput.value = formatDegrees(centre.latitude);
		longitudeInput.value = formatDegrees(centre.longitude);
	}

	map.showH3(boundary, centre);

	if (options.zoomToCell) {
		map.moveTo(centre, map.levelFor(currentH3.bounds));
	} else if (options.recentre && !map.visible(currentH3.bounds)) {
		map.moveTo(centre, map.levelFor(currentH3.bounds));
	}

	refreshFacts();
	rememberUrl();
};

const applyH3Coordinates = (latitude, longitude, options = {}) => {
	const point = { latitude, longitude };
	const resolution = options.resolution ??
		(Number(resolutionSelect.value) || DEFAULT_RESOLUTION);
	const index = h3.latLngToCell(latitude, longitude, resolution);
	const [centreLatitude, centreLongitude] = h3.cellToLatLng(index);
	const boundary = h3.cellToBoundary(index);
	setCurrentH3(
		index,
		resolution,
		boundary,
		{ latitude: centreLatitude, longitude: centreLongitude },
		h3.cellArea(index, 'm2'),
		{
			source: options.source,
			anchor: options.anchor || point,
			zoomToCell: options.zoomToCell,
			recentre: options.recentre,
		},
	);
};

const applyH3Index = (text, options = {}) => {
	const index = normaliseIndex(text);
	if (!index) {
		currentH3 = null;
		map.showH3(null, null);
		refreshFacts();
		rememberUrl();
		say('Type an H3 index, or click the map, to begin.');
		return;
	}
	if (!h3.isValidCell(index)) {
		say('Not an H3 cell yet: fifteen hexadecimal digits.', true);
		return;
	}
	const resolution = h3.getResolution(index);
	const [centreLatitude, centreLongitude] = h3.cellToLatLng(index);
	const boundary = h3.cellToBoundary(index);
	setCurrentH3(
		index,
		resolution,
		boundary,
		{ latitude: centreLatitude, longitude: centreLongitude },
		h3.cellArea(index, 'm2'),
		{ source: 'index', zoomToCell: options.zoomToCell, recentre: options.recentre },
	);
	say('');
};

// One place for the map and the coordinate fields to land, whichever format is on.
const applyPoint = (point, options) => {
	if (mode === 'h3') {
		if (h3) applyH3Coordinates(point.latitude, point.longitude, options);
	} else {
		applyCoordinates(point.latitude, point.longitude, options);
	}
};

const updateModeButtons = () => {
	modePlusButton.setAttribute('aria-checked', String(mode === 'plus'));
	modeH3Button.setAttribute('aria-checked', String(mode === 'h3'));
	modePlusButton.tabIndex = mode === 'plus' ? 0 : -1;
	modeH3Button.tabIndex = mode === 'h3' ? 0 : -1;
	modesBox.dataset.mode = mode;
};

const showModeFields = () => {
	plusField.hidden = mode !== 'plus';
	h3Field.hidden = mode !== 'h3';
	sharePlusRow.hidden = mode !== 'plus';
	shareLinkRow.hidden = false;
	cellLabel.textContent = mode === 'plus' ? 'Cell' : 'Area';
};

const showPlusMode = () => {
	mode = 'plus';
	updateModeButtons();
	showModeFields();
	h3Input.disabled = false;
	resolutionSelect.disabled = false;
};

const enterH3 = async (index) => {
	mode = 'h3';
	updateModeButtons();
	showModeFields();
	h3Input.disabled = true;
	resolutionSelect.disabled = true;

	// Carry the point that is on the map into the new format. With no code, the
	// coordinate fields are the best answer; with neither, the middle of the map.
	const point = current
		? cellCentre(current.area)
		: (coordinatesFromFields() || map.centre());
	const chosen = Number(resolutionSelect.value) || DEFAULT_RESOLUTION;

	say('Loading H3…');
	try {
		h3 = await loadH3();
		if (mode !== 'h3') return;
		fillResolutions();
		h3Input.disabled = false;
		resolutionSelect.disabled = false;

		if (index) {
			if (!h3.isValidCell(index)) {
				showPlusMode();
				applyCoordinates(home.latitude, home.longitude, { zoomToCell: true });
				say('That H3 index is not valid.', true);
				return;
			}
			applyH3Index(index, { zoomToCell: true });
			return;
		}

		applyH3Coordinates(point.latitude, point.longitude, {
			resolution: Number(resolutionSelect.value) || chosen,
			source: 'mode',
			anchor: point,
			zoomToCell: true,
		});
		say('');
	} catch {
		if (mode !== 'h3') return;
		showPlusMode();
		applyCoordinates(point.latitude, point.longitude, { zoomToCell: true });
		say('H3 could not be loaded. Plus Codes still works.', true);
	}
};

const enterPlus = () => {
	const point = currentH3 ? currentH3.centre : coordinatesFromFields();
	showPlusMode();
	if (!point) {
		refreshFacts();
		rememberUrl();
		return;
	}
	// The address bar becomes a code again, for the point that was on the map.
	applyCoordinates(point.latitude, point.longitude, {
		source: 'coordinates',
		zoomToCell: true,
	});
	say('');
};

const setMode = (next, index) => {
	if (next === mode) {
		// A link can name a different cell of the format already showing.
		if (next === 'h3' && index) applyH3Index(index, { zoomToCell: true });
		return;
	}
	if (next === 'h3') void enterH3(index);
	else enterPlus();
};

const body = document.body;
const sidebar = document.getElementById('sidebar');
const sidebarOpenButton = document.getElementById('sidebar-open');
const sidebarCloseButton = document.getElementById('sidebar-close');

// The panel floats over the map, so it can be put away to see the whole of it. A closed
// panel slides out of view rather than leaving the document, so it is taken out of the
// tab order and away from assistive technology by hand.
const setSidebar = (open) => {
	body.classList.toggle('is-sidebar-closed', !open);
	sidebarOpenButton.hidden = open;
	sidebarOpenButton.setAttribute('aria-expanded', String(open));
	sidebarCloseButton.setAttribute('aria-expanded', String(open));
	sidebar.setAttribute('aria-hidden', String(!open));
	if ('inert' in sidebar) sidebar.inert = !open;
};

sidebarOpenButton.addEventListener('click', () => {
	setSidebar(true);
	updateMapAnchor();
	sidebarCloseButton.focus();
});

sidebarCloseButton.addEventListener('click', () => {
	setSidebar(false);
	updateMapAnchor();
	sidebarOpenButton.focus();
});

// Escape puts the panel away while the focus is in it; over the map the key is left
// alone, where the map itself has no use for it.
document.addEventListener('keydown', (event) => {
	if (event.key !== 'Escape') return;
	if (body.classList.contains('is-sidebar-closed')) return;
	if (!sidebar.contains(document.activeElement)) return;
	setSidebar(false);
	updateMapAnchor();
	sidebarOpenButton.focus();
});

const map = createMap({
	element: document.getElementById('map'),
	tilesBox: document.getElementById('tiles'),
	cellBox: document.getElementById('cell'),
	pinBox: document.getElementById('pin'),
	shapeBox: document.getElementById('h3-shape'),
	shapePath: document.getElementById('h3-path'),
	onPick: (point) => {
		// Clicking the map is the other direction: a place, and the cell it falls in.
		latitudeInput.value = formatDegrees(point.latitude);
		longitudeInput.value = formatDegrees(point.longitude);
		applyPoint(point, { source: 'coordinates' });
	},
	onSettled: () => {
		// The map settled; either format's facts may have changed.
		refreshFacts();
	},
});

// On a narrow screen the panel is a sheet over the lower part of the map, so the centre
// of the view belongs in the strip above it. On a wide screen the panel is at the side
// and the map's own centre is already visible.
const updateMapAnchor = () => {
	const narrow = window.matchMedia('(max-width: 60rem)').matches;
	const closed = body.classList.contains('is-sidebar-closed');
	if (!narrow || closed) {
		map.setAnchorShift(0);
		return;
	}
	const top = sidebar.getBoundingClientRect().top;
	map.setAnchorShift(Math.max(0, window.innerHeight - top) / 2);
};

window.addEventListener('resize', updateMapAnchor);

for (const choice of DIGITS_CHOICES) {
	const option = document.createElement('option');
	option.value = String(choice.digits);
	option.textContent = choice.label;
	digitsSelect.appendChild(option);
}
digitsSelect.value = String(DEFAULT_DIGITS);

for (const example of EXAMPLES) {
	const button = document.createElement('button');
	button.type = 'button';
	button.textContent = example.label;
	button.addEventListener('click', () => {
		applyPoint(
			{ latitude: example.latitude, longitude: example.longitude },
			{ zoomToCell: true },
		);
	});
	examplesBox.appendChild(button);
}

codeInput.addEventListener('input', () => {
	applyCode(codeInput.value, {});
});

codeInput.addEventListener('change', () => {
	codeInput.value = codeInput.value.trim().toUpperCase();
	applyCode(codeInput.value, { commit: true });
});

codeInput.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	codeInput.blur();
});

for (const input of [latitudeInput, longitudeInput]) {
	input.addEventListener('input', () => {
		const point = readCoordinates();
		if (point) applyPoint(point, { source: 'coordinates' });
	});
	input.addEventListener('change', () => {
		const point = readCoordinates();
		if (!point) return;
		input.value = formatDegrees(input === latitudeInput ? point.latitude : point.longitude);
		applyPoint(point, { source: 'coordinates', zoomToCell: true });
	});
	input.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		input.blur();
	});
}

document.getElementById('find-code').addEventListener('click', () => {
	if (mode === 'h3') {
		if (!currentH3) return;
		map.moveTo(currentH3.centre, map.levelFor(currentH3.bounds));
		refreshFacts();
		return;
	}
	if (!current) return;
	map.moveTo(cellCentre(current.area), map.levelFor(current.area));
	refreshFacts();
});

digitsSelect.addEventListener('change', () => {
	if (mode !== 'plus' || !current) return;
	const { anchor } = current;
	applyCoordinates(anchor.latitude, anchor.longitude, {
		source: 'precision',
		zoomToCell: true,
	});
});

resolutionSelect.addEventListener('change', () => {
	if (mode !== 'h3' || !h3 || !currentH3) return;
	const resolution = Number(resolutionSelect.value);
	const { anchor } = currentH3;
	applyH3Coordinates(anchor.latitude, anchor.longitude, {
		resolution,
		source: 'resolution',
		anchor,
		zoomToCell: true,
	});
	say('');
});

h3Input.addEventListener('input', () => {
	if (mode !== 'h3' || !h3) return;
	applyH3Index(h3Input.value, { recentre: true });
});

h3Input.addEventListener('change', () => {
	if (mode !== 'h3' || !h3) return;
	h3Input.value = normaliseIndex(h3Input.value);
	applyH3Index(h3Input.value, { zoomToCell: true });
});

h3Input.addEventListener('keydown', (event) => {
	if (event.key !== 'Enter') return;
	event.preventDefault();
	h3Input.blur();
});

modePlusButton.addEventListener('click', () => setMode('plus'));

modeH3Button.addEventListener('click', () => setMode('h3'));

// The switch is a radio group: the arrow keys move between the two formats.
modesBox.addEventListener('keydown', (event) => {
	const next = {
		ArrowLeft: 'plus',
		ArrowUp: 'plus',
		ArrowRight: 'h3',
		ArrowDown: 'h3',
		Home: 'plus',
		End: 'h3',
	}[event.key];
	if (!next) return;
	event.preventDefault();
	setMode(next);
	(next === 'plus' ? modePlusButton : modeH3Button).focus();
});

// The map starts somewhere rather than nowhere: a short code in a link is read against
// the middle of the map, and an empty map would read it against nothing.
const homeArea = areaOf(encodeCode(home.latitude, home.longitude, DEFAULT_DIGITS));
if (homeArea) map.moveTo(cellCentre(homeArea), map.levelFor(homeArea));

// A link to the page that is already open does not load it again, so a fragment put
// there by hand has to be noticed here. A plus sign means a Plus Code; fifteen hex
// digits mean an H3 cell.
window.addEventListener('hashchange', () => {
	const fragment = readFragment();
	if (!fragment) return;
	const index = looksLikeH3(fragment) ? normaliseIndex(fragment) : null;
	if (index) {
		if (mode === 'h3') applyH3Index(index, { zoomToCell: true });
		else setMode('h3', index);
		return;
	}
	if (!kindOf(fragment)) return;
	if (mode === 'h3') showPlusMode();
	codeInput.value = fragment;
	applyCode(fragment, { commit: true });
});

// A shared link is a code, and everything else on the page follows from it. The fragment
// says which format it is: a Plus Code carries a plus sign, an H3 index does not. With
// neither, the page opens in Plus Codes at home.
const shared = readFragment();
if (shared && kindOf(shared)) {
	codeInput.value = shared;
	applyCode(shared, { commit: true });
} else if (shared && looksLikeH3(shared)) {
	setMode('h3', normaliseIndex(shared));
} else {
	applyCoordinates(home.latitude, home.longitude, { zoomToCell: true });
}

updateModeButtons();
showModeFields();
updateMapAnchor();
map.measure();
