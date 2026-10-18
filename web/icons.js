// The PNG icons, drawn from the one SVG the page is marked with.
//
// They are not kept in the repository: a build draws them, so the icons that ship are made
// from the mark as it stands, down to the last edit of it. That takes librsvg, whose
// `rsvg-convert` is the tool for the job and the one this repository already asks for.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const SIZES = [192, 512];

/**
 * Draws the icons into a directory that already holds `icon.svg`, and answers how many were
 * drawn.
 */
export async function drawIcons(directory) {
	const rsvg = Bun.which('rsvg-convert');
	if (!rsvg) {
		throw new Error('rsvg-convert is missing: install librsvg (librsvg2-bin on Debian)');
	}

	await mkdir(directory, { recursive: true });
	const svg = join(directory, 'icon.svg');
	for (const size of SIZES) {
		const out = join(directory, `icon-${size}.png`);
		const drawn = Bun.spawnSync({
			cmd: [rsvg, '-w', String(size), '-h', String(size), svg, '-o', out],
			stdout: 'pipe',
			stderr: 'pipe',
		});
		if (drawn.exitCode !== 0) {
			throw new Error(
				`rsvg-convert failed for ${size}px: ${drawn.stderr.toString().trim()}`
			);
		}
	}
	return SIZES.length;
}
