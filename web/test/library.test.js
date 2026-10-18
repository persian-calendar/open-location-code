// What the page assumes of the library it runs.
//
// The page is plain script with no build of its own, so these are the few things it leans on:
// that a code decodes to a cell with corners and a length, that a short code recovers against
// a reference nearby, and that validity is answered rather than thrown. If the JavaScript
// implementation changes shape, this is where it shows.
import { describe, expect, test } from 'bun:test';
import OpenLocationCode from '../../js/src/openlocationcode.js';

describe('OpenLocationCode', () => {
	test('encodes the Googleplex the way the format introduces itself', () => {
		expect(OpenLocationCode.encode(37.4219999, -122.0840575, 8)).toBe('849VCWC8+');
		expect(OpenLocationCode.encode(37.4219999, -122.0840575, 10)).toBe('849VCWC8+Q9');
	});

	test('decodes a code to the cell the page draws', () => {
		const area = OpenLocationCode.decode('849VCWC8+Q9');
		// The corners are degrees, and the length is the letters of the code.
		expect(area.codeLength).toBe(10);
		expect(area.latitudeLo).toBeCloseTo(37.421875, 9);
		expect(area.longitudeLo).toBeCloseTo(-122.084125, 9);
		expect(area.latitudeHi).toBeGreaterThan(area.latitudeLo);
		expect(area.longitudeHi).toBeGreaterThan(area.longitudeLo);
		// Ten letters are about fourteen metres across, which is what the page claims.
		const metres = (area.latitudeHi - area.latitudeLo) * 111132;
		expect(metres).toBeGreaterThan(10);
		expect(metres).toBeLessThan(20);
	});

	test('answers whether a code is full, short, or neither', () => {
		expect(OpenLocationCode.isFull('849VCWC8+R9')).toBe(true);
		expect(OpenLocationCode.isShort('849VCWC8+R9')).toBe(false);
		// A short code loses its beginning, so its separator sits early. `C8+R9` is a real
		// one; `WC8+R9` is not, because a separator after an odd number of letters is not
		// a code at all.
		expect(OpenLocationCode.isFull('C8+R9')).toBe(false);
		expect(OpenLocationCode.isShort('C8+R9')).toBe(true);
		expect(OpenLocationCode.isValid('WC8+R9')).toBe(false);
		expect(OpenLocationCode.isValid('not a code')).toBe(false);
		expect(OpenLocationCode.isValid('')).toBe(false);
	});

	test('recovers a short code against a reference point', () => {
		expect(OpenLocationCode.recoverNearest('C8+R9', 37.422, -122.084)).toBe('849VCWC8+R9');
		expect(OpenLocationCode.recoverNearest('+R9', 37.422, -122.084)).toBe('849VCWC8+R9');
	});

	test('throws on input the page has already refused', () => {
		// The page checks validity first, so a throw means it let something through.
		expect(() => OpenLocationCode.decode('C8+R9')).toThrow();
		expect(() => OpenLocationCode.recoverNearest('nonsense', 0, 0)).toThrow();
	});
});
