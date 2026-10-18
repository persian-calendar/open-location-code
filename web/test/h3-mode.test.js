import { describe, expect, test } from 'bun:test';
import { cellToBoundary, getPentagons, latLngToCell } from 'h3-js';
import { boundsOf, formatArea, normaliseIndex, resolutionChoices } from '../src/h3-mode.js';

describe('H3 mode helpers', () => {
	test('normalises an index the way the fields show it', () => {
		expect(normaliseIndex(' 89283475087FFFF ')).toBe('89283475087ffff');
		expect(normaliseIndex('')).toBe('');
	});

	test('unwraps a boundary that crosses the antimeridian', () => {
		const boundary = [
			[10.1, 179.9],
			[10.1, -179.9],
			[9.9, -179.95],
			[9.9, 179.85],
		];
		const bounds = boundsOf(boundary, 179.95);
		expect(bounds.south).toBeCloseTo(9.9, 9);
		expect(bounds.north).toBeCloseTo(10.1, 9);
		// About a quarter of a degree wide, not nearly the whole world.
		expect(bounds.east - bounds.west).toBeCloseTo(0.25, 9);
		expect(bounds.west).toBeCloseTo(179.85, 9);
		expect(bounds.east).toBeCloseTo(180.1, 9);
	});

	test('formats areas at a readable scale', () => {
		expect(formatArea(110200)).toBe('0.11 km²');
		expect(formatArea(737000)).toBe('0.737 km²');
		expect(formatArea(15000)).toBe('0.015 km²');
		expect(formatArea(2150)).toBe('2150 m²');
		expect(formatArea(43.9)).toBe('44 m²');
		expect(formatArea(0.897)).toBe('0.9 m²');
		expect(formatArea(0)).toBe('—');
	});

	test('labels every resolution with the library average', () => {
		const fake = {
			getHexagonEdgeLengthAvg(resolution) {
				return resolution === 9 ? 200.7861476 : 1000;
			},
		};
		const choices = resolutionChoices(fake, (metres) => Math.round(metres) + ' m');
		expect(choices).toHaveLength(16);
		expect(choices[0].label).toBe('Res 0 — 1000 m edge');
		expect(choices[9].label).toBe('Res 9 — 201 m edge');
	});

	test('the map draws hexagons, and the pentagons H3 also has', () => {
		const hexagon = latLngToCell(37.422, -122.0841, 9);
		expect(cellToBoundary(hexagon)).toHaveLength(6);

		const pentagons = getPentagons(0);
		expect(pentagons).toHaveLength(12);
		expect(cellToBoundary(pentagons[0])).toHaveLength(5);
	});
});
