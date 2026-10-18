# Geo Codes web demo

A static page that converts between [Plus Codes](https://plus.codes/) (Open Location Code),
[H3](https://h3geo.org/) cells, and coordinates, and draws the cell a code names on an
OpenStreetMap map. It is published at
<https://persian-calendar.github.io/open-location-code/>.

There is no server for the conversion: it runs in the browser. The page fetches only its own
files and map tiles; the H3 library is installed at build time.

The page runs the [JavaScript implementation](../js/src/openlocationcode.js) of Plus Codes
from this repository and the official [`h3-js`](https://github.com/uber/h3-js) package, both
bundled by [Bun](https://bun.sh).

## What it does

- **One place, two formats.** A segmented switch at the top of the panel moves between Plus
  Codes and H3. Typing a code fills in the coordinates, typing coordinates fills in the code
  or cell, and clicking the map chooses the cell that contains the point. The details sit in a
  translucent panel over a full-screen map: the value, the cell it names, and its centre. The
  panel can be put away to see the whole map, and on a narrow screen it becomes a sheet along
  the bottom.
- **Any precision, either way.** For Plus Codes the selector reaches from a continent (two
  letters) down to six millimetres (fifteen), with the `Cell` readout giving the size; H3 has
  resolutions 0–15, labelled with the average cell edge. Changing either one moves nothing
  but the code: the coordinates stay on the point that was chosen.
- **What it can hand on is written out.** A plus.codes address, a link to the page and an
  OpenStreetMap address sit in fields to read and take rather than behind a copy button; H3
  mode shows the index's link and the same OpenStreetMap address.
- **H3.** The cell is drawn as its hexagon or pentagon on the map, with the centre marked.
  The index, its resolution, area and centre are shown, and the index can be typed, read from
  a link, or picked by clicking the map. H3 is a separate bundle that the browser asks for
  when it is idle, so the first switch is instant and the default Plus Codes page stays light.
- **Short codes still work.** A short code typed on its own is recovered against the middle
  of the map, so `+6X` finds its place.
- **A map.** The whole window is the map. Drag to move, wheel or the buttons to zoom, click
  to read the code of a place, or pick one of the places in the panel. The cell the code
  covers is drawn as a rectangle, with its centre marked. The zoom is a number rather than a
  level, so a touchpad glides instead of stepping, and the tiles of the level either side stay
  on screen until the new ones arrive, so a zoom does not blink through a blank map.
- **Links.** The fragment holds the value in either mode: `#849VCWC8+` for a Plus Code and
  `#89283475087ffff` for an H3 cell. A plus sign means Plus Codes and fifteen hex digits mean
  H3, so a shared link opens in the mode it names. The fragment never leaves the browser:
  opening a link does not tell the server which cell was asked for.
- **A home that is not an ocean away.** A browser on Iran's clock (+03:30) opens on Tehran;
  anywhere else opens on the Googleplex, the address the format is usually introduced with.
- **Light and dark**, following the system. The panel is tinted glass that blurs the map
  underneath it, and turns solid where the system asks for less transparency or the browser
  cannot blur.
- A service worker keeps the page working offline and swaps in a new version when the site
  is redeployed. It precaches the H3 bundle as well as the page shell, so H3 works offline
  after the first visit. Map tiles are not cached: they belong to OpenStreetMap, whose usage
  policy asks that clients do not store them.

## How it is put together

A set of small ES modules, bundled by Bun. There are no classes, prototypes or `this`; state
lives in closures, and the map stays a hand-written renderer rather than a map library.

- [`src/main.js`](src/main.js) is the page: the fields, the facts, the mode switch, the address
  bar, and the state that keeps them agreeing with one another.
- [`src/map.js`](src/map.js) is the slippy map (Web Mercator, 256 px tiles, pointer handling,
  fractional zoom, and the Plus Code rectangle or H3 path drawn in screen space).
- [`src/geo.js`](src/geo.js) holds the projection, units, cell measures and number formatting.
- [`src/plus.js`](src/plus.js) wraps the Plus Code library and holds its examples and
  precision choices.
- [`src/h3-mode.js`](src/h3-mode.js) holds the H3 helpers, resolution labels and the deferred
  loader; [`src/h3.js`](src/h3.js) is the entrypoint that re-exports the `h3-js` functions the
  page uses.
- [`src/fragment.js`](src/fragment.js) reads and writes the fragment and tells a Plus Code
  link from an H3 one.
- [`src/index.html`](src/index.html) is the document, its styles, the deferred H3 preload,
  and the registration of the service worker.
- [`build.js`](build.js) bundles the page into `index.html`, builds `dist/h3.js` separately,
  and draws the PNG icons from `src/icons/icon.svg`.
- [`icons.js`](icons.js) is that drawing: `rsvg-convert` at 192 and 512 px.
- [`test/library.test.js`](test/library.test.js) pins what the page assumes of the Plus Code
  library; [`test/h3-mode.test.js`](test/h3-mode.test.js) covers the H3 formatting helpers.

## Building

```
$ cd web
$ bun install         # h3-js, the only dependency
$ bun run build       # dist/
$ bun run dev         # the same, then serves it at http://localhost:8200/
$ bun test
```

The Plus Code library is a file in this repository; `h3-js` is installed at build time and
bundled into `dist/h3.js`, which the browser asks for with a `modulepreload` hint once it is
idle and the service worker precaches. The tools are Bun itself and librsvg —
`librsvg2-bin` on Debian, `librsvg` on Homebrew — which draws the icons.

`build.js` bundles `src/main.js` — and with it the local modules and
`../js/src/openlocationcode.js` — into one minified script, and writes it into `index.html`.
It leaves `./h3.js` external and builds `src/h3.js` as its own small ES module, so a deploy is
a document plus `h3.js`, its icons, manifest and worker. The worker is stamped with
`OLC_BUILD` when that is set, which is what a deploy does: the browser only looks for a new
service worker when `sw.js` itself has changed, so the commit in the file is what makes a
deploy reach a browser that already has the page. A build of one's own leaves it at `dev`.

The PNG icons are not kept in the repository: the build draws them from
[`src/icons/icon.svg`](src/icons/icon.svg) with `rsvg-convert`, so what ships is always made
from the mark as it stands. A build without librsvg stops there and says so, rather than
publishing a manifest that names icons it does not have.

## Deploying

`.github/workflows/pages.yml` installs the dependencies, runs the tests, installs librsvg,
builds the page with `OLC_BUILD` set to the commit, and publishes `web/dist` to GitHub Pages.
