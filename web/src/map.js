// A slippy map drawn by hand: one box that clips its contents, tiles placed inside it with
// transforms, and the cell a code covers drawn over them. It keeps the centre of the view
// and the zoom level, and reports a click on the map and the end of a move. A Plus Code
// cell is a rectangle; an H3 cell is a ring of vertices drawn as a path.
import {
	MIN_ZOOM,
	MAX_ZOOM,
	MAX_LATITUDE,
	TILE_SIZE,
	cellCentre,
	cellMetres,
	clamp,
	project,
	unproject,
	wrapLongitude,
} from './geo.js';

const TILE_URL = 'https://tile.openstreetmap.org/';
// Wheel deltas arrive in pixels, in lines, or in pages depending on the device; about a
// hundred and forty pixels make a level, which leaves a mouse wheel close to one level a
// notch and a touchpad gliding.
const PIXELS_PER_LEVEL = 140;

export const createMap = ({
	element,
	tilesBox,
	cellBox,
	pinBox,
	shapeBox,
	shapePath,
	onPick,
	onSettled,
}) => {
	let centre = { latitude: 0, longitude: 0 };
	// The zoom is a number rather than a level: a touchpad moves it a fraction of a step at
	// a time and the map eases towards wherever it is heading. Tiles are laid at the nearest
	// whole level and scaled to fit between them.
	let zoom = 2;
	let targetZoom = 2;
	let zoomAnchor = null;
	let zoomFrame = 0;
	const tiles = new Map();
	let width = 0;
	let height = 0;
	// Screen pixels the centre of the view is moved up from the middle of the element. A
	// bottom sheet covers the lower part of a narrow screen, so the map's centre belongs in
	// the strip that is still visible; the tiles themselves still fill the whole element.
	let anchorShift = 0;
	let frame = 0;
	let drag = null;
	let area = null;
	let shape = null;
	let pin = null;

	const worldSize = () => TILE_SIZE * 2 ** zoom;

	const anchorY = () => height / 2 - anchorShift;

	const tileLevel = () => clamp(Math.round(zoom), MIN_ZOOM, MAX_ZOOM);

	const centrePixels = () => {
		const point = project(centre.latitude, centre.longitude);
		const size = worldSize();
		return { x: point.x * size, y: point.y * size };
	};

	// Where a screen point sits in the world, as a fraction of it. The value does not change
	// with the zoom, so holding on to it keeps that point still on screen.
	const worldFractionAt = (clientX, clientY) => {
		const box = element.getBoundingClientRect();
		const size = worldSize();
		const origin = centrePixels();
		return {
			x: (origin.x - width / 2 + clientX - box.left - element.clientLeft) / size,
			y: (origin.y - anchorY() + clientY - box.top - element.clientTop) / size,
		};
	};

	const holdAnchor = () => {
		if (!zoomAnchor) return;
		const size = worldSize();
		const x = zoomAnchor.fraction.x * size - zoomAnchor.x + width / 2;
		const y = zoomAnchor.fraction.y * size - zoomAnchor.y + anchorY();
		centre = unproject(x / size, clamp(y, 0, size) / size);
	};

	const schedule = () => {
		if (frame) return;
		// A hidden tab would never run the frame request; draw now so the state is right
		// when the tab comes back into view.
		if (document.visibilityState === 'hidden') {
			render();
			return;
		}
		frame = requestAnimationFrame(() => {
			frame = 0;
			render();
		});
	};

	const place = (tile, x, y, pixels) => {
		tile.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) scale(${pixels / TILE_SIZE})`;
	};

	const drawOverlays = (left, top) => {
		const size = worldSize();
		const originX = centrePixels().x;

		if (area) {
			const northWest = project(area.north, area.west);
			const southEast = project(area.south, area.east);
			// The world repeats, so a cell just across the antimeridian belongs to the copy
			// of the world this view is looking at.
			const middle = ((northWest.x + southEast.x) / 2) * size;
			let shift = 0;
			if (middle - originX > size / 2) shift = -size;
			else if (originX - middle > size / 2) shift = size;

			const x = northWest.x * size + shift - left;
			const y = northWest.y * size - top;
			// A cell of a few centimetres would round away to nothing, and it is still the
			// answer, so it is drawn at least as a small square.
			cellBox.style.left = `${x}px`;
			cellBox.style.top = `${y}px`;
			cellBox.style.width = `${Math.max(3, southEast.x * size + shift - left - x)}px`;
			cellBox.style.height = `${Math.max(3, southEast.y * size - top - y)}px`;
			cellBox.hidden = false;
		} else {
			cellBox.hidden = true;
		}

		if (shape) {
			// H3 boundaries arrive as rings: hexagons, and the twelve pentagons of each
			// resolution. The ring is unwrapped around the cell centre so a cell that crosses
			// the antimeridian stays in one piece, then drawn on the copy of the world nearest
			// the middle of the view, as the rectangle is.
			const reference = project(shape.centre.latitude, shape.centre.longitude);
			const worldShift = Math.round(originX / size - reference.x);
			let path = '';
			shape.ring.forEach(([latitude, longitude], index) => {
				const unwrapped = shape.centre.longitude + wrapLongitude(longitude - shape.centre.longitude);
				const vertex = project(latitude, unwrapped);
				const x = (vertex.x + worldShift) * size - left;
				const y = vertex.y * size - top;
				path += `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
			});
			shapePath.setAttribute('d', `${path}Z`);
			// SVG elements do not reflect the HTML `hidden` property; set the attribute.
			shapeBox.removeAttribute('hidden');
		} else {
			shapePath.setAttribute('d', '');
			shapeBox.setAttribute('hidden', '');
		}

		if (pin) {
			const point = project(pin.latitude, pin.longitude);
			pinBox.style.left = `${point.x * size - left}px`;
			pinBox.style.top = `${point.y * size - top}px`;
			pinBox.hidden = false;
		} else {
			pinBox.hidden = true;
		}
	};

	function render() {
		if (!width || !height) return;
		const level = tileLevel();
		const columns = 2 ** level;
		// A tile at the level being drawn is this many pixels across at the current zoom,
		// and one from the level either side of it is that much bigger or smaller.
		const tilePixels = TILE_SIZE * 2 ** (zoom - level);
		const origin = centrePixels();
		const left = origin.x - width / 2;
		const top = origin.y - anchorY();

		const firstColumn = Math.floor(left / tilePixels);
		const lastColumn = Math.floor((left + width - 1) / tilePixels);
		const firstRow = Math.max(0, Math.floor(top / tilePixels));
		const lastRow = Math.min(columns - 1, Math.floor((top + height - 1) / tilePixels));

		const kept = new Set();
		for (let column = firstColumn; column <= lastColumn; column += 1) {
			const wrapped = ((column % columns) + columns) % columns;
			for (let row = firstRow; row <= lastRow; row += 1) {
				// The x in the name is the unwrapped one, so the copies of a world that wraps
				// around the edge of the view are separate tiles in separate places.
				const name = `${level}/${column}/${row}`;
				kept.add(name);
				let tile = tiles.get(name);
				if (!tile) {
					tile = document.createElement('img');
					tile.alt = '';
					tile.decoding = 'async';
					tile.src = `${TILE_URL}${level}/${wrapped}/${row}.png`;
					tile.addEventListener('load', () => tile.classList.add('is-loaded'));
					tilesBox.appendChild(tile);
					tiles.set(name, tile);
				}
				place(tile, column * tilePixels - left, row * tilePixels - top, tilePixels);
			}
		}

		// A level either side is kept on screen while the one being drawn is still arriving:
		// a zoom eases through the change instead of blinking through it. Once that level is
		// all there, the others have nothing left to cover.
		let ready = true;
		for (const [name, tile] of tiles) {
			if (kept.has(name) && (!tile.complete || !tile.naturalWidth)) ready = false;
		}
		for (const [name, tile] of tiles) {
			if (kept.has(name)) continue;
			const [otherLevel, xName, yName] = name.split('/');
			const other = Number(otherLevel);
			const pixels = TILE_SIZE * 2 ** (zoom - other);
			const x = Number(xName) * pixels - left;
			const y = Number(yName) * pixels - top;
			// A tile of another level that has been panned well out of sight goes even if the
			// level being drawn never finishes arriving, which an offline page would
			// otherwise let pile up.
			const outOfSight = x < -width || x > width * 2 || y < -height || y > height * 2;
			if (ready || outOfSight || Math.abs(other - level) > 1) {
				tile.remove();
				tiles.delete(name);
				continue;
			}
			place(tile, x, y, pixels);
		}

		drawOverlays(left, top);
	}

	const latitudeLongitudeAt = (clientX, clientY) => {
		const box = element.getBoundingClientRect();
		const size = worldSize();
		const origin = centrePixels();
		const point = unproject(
			(origin.x - width / 2 + clientX - box.left - element.clientLeft) / size,
			(origin.y - anchorY() + clientY - box.top - element.clientTop) / size,
		);
		return {
			latitude: clamp(point.latitude, -MAX_LATITUDE, MAX_LATITUDE),
			longitude: wrapLongitude(point.longitude),
		};
	};

	const panBy = (x, y) => {
		const size = worldSize();
		const origin = centrePixels();
		const point = unproject((origin.x + x) / size, clamp(origin.y + y, 0, size) / size);
		centre = { latitude: point.latitude, longitude: point.longitude };
		schedule();
	};

	// Zooming happens over a few frames rather than at once, and keeps whatever is under the
	// pointer under the pointer, which is what makes a wheel feel like the map rather than
	// like a control. A touchpad sends many small movements; they add up to a target that the
	// zoom eases towards, so it cannot run away.
	const zoomBy = (steps, clientX, clientY) => {
		const next = clamp(targetZoom + steps, MIN_ZOOM, MAX_ZOOM);
		if (next === targetZoom && !zoomFrame) return;
		targetZoom = next;
		if (typeof clientX === 'number') {
			const box = element.getBoundingClientRect();
			zoomAnchor = {
				x: clientX - box.left - element.clientLeft,
				y: clientY - box.top - element.clientTop,
				fraction: worldFractionAt(clientX, clientY),
			};
		} else {
			// Nothing to hold on to, so the middle of the view stays where it is.
			zoomAnchor = null;
		}
		if (!zoomFrame) zoomFrame = requestAnimationFrame(stepZoom);
	};

	function stepZoom() {
		zoomFrame = 0;
		const difference = targetZoom - zoom;
		if (Math.abs(difference) < 0.004) {
			zoom = targetZoom;
			holdAnchor();
			render();
			zoomAnchor = null;
			onSettled?.();
			return;
		}
		zoom += difference * 0.25;
		holdAnchor();
		render();
		zoomFrame = requestAnimationFrame(stepZoom);
	}

	element.addEventListener('pointerdown', (event) => {
		if (event.target.closest?.('button')) return;
		if (event.button !== undefined && event.button !== 0) return;
		drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
		element.setPointerCapture?.(event.pointerId);
	});

	element.addEventListener('pointermove', (event) => {
		if (!drag || drag.id !== event.pointerId) return;
		const x = event.clientX - drag.x;
		const y = event.clientY - drag.y;
		if (!drag.moved && Math.abs(x) + Math.abs(y) < 4) return;
		drag.moved = true;
		drag.x = event.clientX;
		drag.y = event.clientY;
		element.classList.add('is-dragging');
		panBy(-x, -y);
	});

	const endDrag = (event) => {
		if (!drag || drag.id !== event.pointerId) return;
		const moved = drag.moved;
		drag = null;
		element.classList.remove('is-dragging');
		if (element.hasPointerCapture?.(event.pointerId)) {
			element.releasePointerCapture(event.pointerId);
		}
		if (moved) {
			onSettled?.();
		} else {
			element.classList.add('is-used');
			onPick?.(latitudeLongitudeAt(event.clientX, event.clientY));
		}
	};

	element.addEventListener('pointerup', endDrag);
	element.addEventListener('pointercancel', endDrag);

	element.addEventListener('wheel', (event) => {
		if (!event.deltaY) return;
		event.preventDefault();
		const pixels = event.deltaMode === 1
			? event.deltaY * 16
			: (event.deltaMode === 2 ? event.deltaY * height : event.deltaY);
		// One event is never worth more than a level, however it is measured, so a single
		// oversized delta cannot throw the view across several of them.
		zoomBy(clamp(-pixels / PIXELS_PER_LEVEL, -1, 1), event.clientX, event.clientY);
	}, { passive: false });

	element.addEventListener('keydown', (event) => {
		const step = Math.round(width / 4);
		let handled = true;
		switch (event.key) {
			case 'ArrowLeft': panBy(-step, 0); break;
			case 'ArrowRight': panBy(step, 0); break;
			case 'ArrowUp': panBy(0, -step); break;
			case 'ArrowDown': panBy(0, step); break;
			case '+':
			case '=': zoomBy(1); break;
			case '-':
			case '_': zoomBy(-1); break;
			default: handled = false;
		}
		if (handled) {
			event.preventDefault();
			element.classList.add('is-used');
		}
	});

	document.getElementById('zoom-in').addEventListener('click', () => zoomBy(1));
	document.getElementById('zoom-out').addEventListener('click', () => zoomBy(-1));

	const resize = () => {
		width = element.clientWidth;
		height = element.clientHeight;
		render();
	};

	if (typeof ResizeObserver === 'function') {
		new ResizeObserver(resize).observe(element);
	} else {
		window.addEventListener('resize', resize);
	}

	return {
		centre: () => ({ latitude: centre.latitude, longitude: centre.longitude }),
		/** Draws the cell a code covers, and marks its centre. */
		show: (next) => {
			area = next;
			shape = null;
			pin = next ? cellCentre(next) : null;
			schedule();
		},
		/** Draws an H3 cell's boundary, and marks its centre. */
		showH3: (boundary, nextCentre) => {
			area = null;
			shape = boundary && nextCentre ? { ring: boundary, centre: nextCentre } : null;
			pin = nextCentre || null;
			schedule();
		},
		/** Keeps the centre of the view in the part of the element a sheet does not cover. */
		setAnchorShift: (pixels) => {
			anchorShift = Math.max(0, pixels);
			schedule();
		},
		moveTo: (target, level) => {
			centre = {
				latitude: clamp(target.latitude, -MAX_LATITUDE, MAX_LATITUDE),
				longitude: target.longitude,
			};
			if (typeof level === 'number') {
				zoom = clamp(Math.round(level), MIN_ZOOM, MAX_ZOOM);
				targetZoom = zoom;
				zoomAnchor = null;
			}
			schedule();
		},
		/** The level at which a cell covers about a quarter of the view. */
		levelFor: (cell) => {
			const metres = cellMetres(cell);
			const size = Math.max(metres.latitude, metres.longitude);
			if (!(size > 0)) return MAX_ZOOM;
			const centreLatitude = cellCentre(cell).latitude;
			// Metres per pixel at the equator and this level, narrowed by the latitude.
			const equator = 156543.03392 * Math.cos((centreLatitude * Math.PI) / 180);
			return clamp(Math.round(Math.log((equator * 160) / size) / Math.LN2), MIN_ZOOM, MAX_ZOOM);
		},
		visible: (cell) => {
			if (!width || !height) return true;
			const size = worldSize();
			const origin = centrePixels();
			const centreOfCell = cellCentre(cell);
			const point = project(centreOfCell.latitude, centreOfCell.longitude);
			const x = point.x * size - (origin.x - width / 2);
			const y = point.y * size - (origin.y - anchorY());
			const margin = 40;
			const visibleHeight = Math.max(0, 2 * anchorY());
			return x >= margin && x <= width - margin && y >= margin && y <= visibleHeight - margin;
		},
		measure: () => {
			width = element.clientWidth;
			height = element.clientHeight;
			render();
		},
	};
};
