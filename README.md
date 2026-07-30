# Neulearn

**[neulearn.welldun.ai](https://neulearn.welldun.ai)**

A publication of long, interactive tutorials on how machine learning actually
works. The first is *Neural networks, explained by building one*.

Invent an alphabet that has never existed, draw it by hand, and train a neural
network to read your handwriting — entirely in the browser, with every number
visible at every step.

It is built for people who have never trained a model. There is no calculus,
nothing is hidden behind a library, and every term is demonstrated before it is
named.

## Neural networks — the ten parts

| # | Part | What happens |
|---|-------|--------------|
| 01 | The problem | Five handwritten `a`s. Why comparing pictures fails, why writing rules fails, and what a network does instead. |
| 02 | Your alphabet | Invent characters and draw a dataset. No mention yet of what the network receives. |
| 03 | Into numbers | A grid over the drawing turns it into 256 numbers. `reshape` gets its own step. |
| 04 | The network | Every character gets a scorecard — one number per square. Weights shown as pictures. |
| 05 | How wrong is it? | Softmax as "shares of 100%", cross-entropy as *surprise*, loss as one number. |
| 06 | Learning | Gradient descent with no calculus, and why averaging over drawings turns memorising into understanding. |
| 07 | The whole loop | Six stations of training as one circuit you can step around. |
| 08 | Read my writing | Draw something new and watch it read your handwriting. |
| 09 | Break it | Starve it, lie to it, move a weight by hand. What failure looks like. |
| 10 | More layers | A real two-layer network, and backpropagation as blame travelling backwards. |

Most parts carry an editable notebook running real CPython and NumPy in the
browser, plus the equivalent PyTorch alongside.

## Design decisions worth knowing

**A single linear layer.** Chosen so each character's weights map one-to-one
onto squares of the drawing, and can therefore be *looked at* — static when
untrained, resembling the character after training. That visual is the spine of
the whole site.

**Which means it cannot teach backpropagation**, since with one layer blame
goes straight to the numbers. Rather than pretend, stage 10 builds a genuine
two-layer network and says so plainly.

**One source of truth for every number.** The network is generated in
TypeScript and *handed to* Python, never generated twice. What the page draws
and what the notebook prints are the same numbers, to the digit.

**Honest when experiments fail.** Two of the three sabotage experiments on
stage 09 do not work as textbooks promise — a learning rate of ten million
still trains fine, because cross-entropy on separable data throttles itself.
The page explains why instead of faking the result.

**Nothing leaves your browser.** Drawings live in `localStorage`. There is no
account, no server, no analytics.

## Running it

```
pnpm install
pnpm dev
```

- `pnpm typecheck` — `astro check`
- `pnpm build` — check, then prerender every page to `dist/`
- `pnpm start` — serve the built site (used in deployment)

Requires Node 20.19+.

## How it is built

Astro with React islands, and Tailwind, with no backend. Every part is
prerendered to static HTML at build time and each interactive figure hydrates
on its own, so the teaching text is readable without JavaScript and the ten
parts are ten real URLs. Python runs client-side through
[Pyodide](https://pyodide.org) (CPython compiled to WebAssembly), loaded lazily
so the text stages do not pay for it. Code cells are CodeMirror 6 with a
palette-matched theme.

Pyodide's bridge back into the browser (`js`, `pyodide_js`) is switched off
before any learner code runs, so a pasted snippet cannot reach `localStorage`
or the network. Known limitation: Pyodide runs on the main thread, so a runaway
loop will freeze the tab until reload. Moving it to a Web Worker is the fix.

```
src/
  content/
    tutorials/    one YAML record per tutorial
    parts/        one MDX file per part — the prose
  pages/          routes: /, /<tutorial>/, /<tutorial>/<part>/
  layouts/        the shell: rail, reading column, on-this-page
  components/
    site/         navigation, plate marks, the figure registry
    <figures>     canvas, grids, notebook cells, animations
  labs/           the Python cells, shared by prose and figure
  lib/
    network.ts    the single-layer network, loss and gradients
    deep.ts       the two-layer network and backpropagation
    raster.ts     drawing -> 16x16 grid, and back again
    pyodide.ts    Python in the browser
    sample.ts     the ready-made alphabet, drawn procedurally
```

## Contributing

Issues and pull requests are welcome, particularly:

- moving Pyodide into a Web Worker
- mobile layout, which is untested
- a second tutorial: add `src/content/tutorials/<slug>.yaml` and parts beside it
- a numerical gradient check guarding `nudgeFor` and `blameFor`
- corrections to any explanation that is wrong or misleading

That last one most of all. If something here taught you the wrong thing, that
is a bug.

## Licence

MIT — see [LICENSE](LICENSE).
