// Dijkstra's shortest-path algorithm over the directed, weighted graph
// drawn on the canvas.
//
// The graph state lives in the global `nodes` / `links` arrays defined in
// fsm.js. A `Node` has { x, y, text, isSourceNode }; a `Link` has
// { nodeA, nodeB, text } where `text` is the (numeric) edge weight.
//
// This file does two things:
//   1. Runs Dijkstra correctly and records a *trace* — an ordered list of
//      steps — so the UI can replay the algorithm one step at a time.
//   2. Wires up the toolbox buttons (Shortest Path, presets, clear) and the
//      step-by-step visualizer controls.

class Graph {
  constructor(V, E) {
    this.Vertices = V || nodes;
    this.Edges = E || links;
    // dist[vertex.uid] -> tentative distance from source
    this.dist = new Map();
    // pred[vertex.uid] -> predecessor vertex on the shortest path
    this.pred = new Map();
    // Ordered record of everything the algorithm does, for the visualizer.
    this.trace = [];
  }

  getSourceVertex() {
    return this.Vertices.find((v) => v.isSourceNode) || null;
  }

  // Out-neighbors of u together with the weight of the connecting edge.
  // (The graph is directed: only edges nodeA === u are followed.)
  getNeighbors(u) {
    return this.Edges.filter((edge) => edge.nodeA === u).map((edge) => ({
      vertex: edge.nodeB,
      weight: +edge.text,
      edge,
    }));
  }

  distanceTo(v) {
    return this.dist.has(v) ? this.dist.get(v) : Infinity;
  }

  // Snapshot of every vertex's current tentative distance, used so each
  // trace step can show the distance table as it looked at that moment.
  snapshotDistances() {
    return this.Vertices.map((v) => ({
      vertex: v,
      d: this.distanceTo(v),
    }));
  }

  record(step) {
    this.trace.push(step);
  }

  // Run Dijkstra, populating this.dist / this.pred and this.trace.
  // Returns false (and records nothing) if there is no source vertex.
  computeShortestPath() {
    const source = this.getSourceVertex();
    if (!source) {
      return false;
    }

    // Initialize single-source shortest paths: source at 0, everyone at ∞.
    this.Vertices.forEach((v) => {
      this.dist.set(v, v === source ? 0 : Infinity);
      this.pred.set(v, undefined);
    });

    const visited = new Set();
    // The frontier is simply "every vertex not yet finalized". With the small
    // teaching graphs this tool targets, a linear scan for the minimum is
    // clearer than a binary heap and asymptotics don't matter.
    const unvisited = new Set(this.Vertices);

    this.record({
      type: 'init',
      description: `Initialize: source "${source.text}" has distance 0, every other vertex ∞.`,
      current: null,
      relaxedEdge: null,
      visited: [],
      frontier: [...unvisited],
      distances: this.snapshotDistances(),
    });

    while (unvisited.size > 0) {
      // Pick the unvisited vertex with the smallest tentative distance.
      const u = this.extractMin(unvisited);

      // Everything reachable has been settled; the rest is unreachable (∞).
      if (u === null || this.distanceTo(u) === Infinity) {
        this.record({
          type: 'done-unreachable',
          description:
            'The closest remaining vertex is unreachable (distance ∞). ' +
            'All reachable vertices are finalized — done.',
          current: null,
          relaxedEdge: null,
          visited: [...visited],
          frontier: [...unvisited],
          distances: this.snapshotDistances(),
        });
        break;
      }

      unvisited.delete(u);
      visited.add(u);

      this.record({
        type: 'visit',
        description:
          `Select "${u.text}" — the unvisited vertex with the smallest ` +
          `distance (${this.distanceTo(u)}). Finalize it and relax its edges.`,
        current: u,
        relaxedEdge: null,
        visited: [...visited],
        frontier: [...unvisited],
        distances: this.snapshotDistances(),
      });

      // Relax every outgoing edge of u.
      for (const { vertex: v, weight, edge } of this.getNeighbors(u)) {
        const alt = this.distanceTo(u) + weight;
        const improved = alt < this.distanceTo(v);

        this.record({
          type: 'relax',
          description: improved
            ? `Relax edge ${u.text} → ${v.text} (weight ${weight}): ` +
              `${this.distanceTo(u)} + ${weight} = ${alt} < ${fmt(this.distanceTo(v))}. ` +
              `Update ${v.text}'s distance to ${alt}.`
            : `Check edge ${u.text} → ${v.text} (weight ${weight}): ` +
              `${this.distanceTo(u)} + ${weight} = ${alt} is not better than ` +
              `${fmt(this.distanceTo(v))}. No change.`,
          current: u,
          relaxedEdge: edge,
          improved,
          visited: [...visited],
          frontier: [...unvisited],
          // Snapshot taken *after* applying the update so the table reflects it.
          distances: (() => {
            if (improved) {
              this.dist.set(v, alt);
              this.pred.set(v, u);
            }
            return this.snapshotDistances();
          })(),
        });
      }
    }

    this.record({
      type: 'complete',
      description: 'Algorithm complete. Shortest-path tree highlighted below.',
      current: null,
      relaxedEdge: null,
      visited: [...visited],
      frontier: [...unvisited],
      distances: this.snapshotDistances(),
    });

    return true;
  }

  // Linear scan for the unvisited vertex of minimum tentative distance.
  // Returns null when every remaining vertex is at ∞ (all unreachable).
  extractMin(unvisited) {
    let best = null;
    let bestDist = Infinity;
    for (const v of unvisited) {
      const d = this.distanceTo(v);
      if (d < bestDist) {
        best = v;
        bestDist = d;
      }
    }
    return best;
  }

  // The edges that make up the final shortest-path tree (pred links).
  shortestPathTreeEdges() {
    const treeEdges = [];
    for (const edge of this.Edges) {
      if (this.pred.get(edge.nodeB) === edge.nodeA) {
        treeEdges.push(edge);
      }
    }
    return treeEdges;
  }

  // Reconstruct the shortest path from the source to `target` by walking the
  // predecessor pointers backward, then reversing. This is what the `pred`
  // output is *for* — dist tells you how far, pred tells you the route.
  //
  // Returns { reachable, vertices, edges, distance }:
  //   reachable  — false if target has no path from the source (dist === ∞)
  //   vertices   — ordered source → … → target
  //   edges      — the Link objects connecting consecutive vertices
  //   distance   — total path weight (this.dist.get(target))
  shortestPathTo(target) {
    const distance = this.distanceTo(target);
    if (distance === Infinity) {
      return { reachable: false, vertices: [], edges: [], distance };
    }

    const vertices = [];
    let cur = target;
    // Walk predecessors back to the source. `pred(source)` is undefined, so the
    // loop naturally stops after pushing the source.
    while (cur) {
      vertices.push(cur);
      cur = this.pred.get(cur);
    }
    vertices.reverse();

    const edges = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      const from = vertices[i];
      const to = vertices[i + 1];
      const edge = this.Edges.find((e) => e.nodeA === from && e.nodeB === to);
      if (edge) edges.push(edge);
    }

    return { reachable: true, vertices, edges, distance };
  }
}

function fmt(d) {
  return d === Infinity ? '∞' : String(d);
}

// ---------------------------------------------------------------------------
// Visualizer: replays a Graph's trace on the canvas, step by step.
// ---------------------------------------------------------------------------

// Colors are chosen to read on the light "blueprint" canvas surface and to
// match the legend swatches in index.html / style.css.
const COLORS = {
  base: '#1c4777', // deep blue — idle nodes/edges on the blueprint
  visited: '#0091a3', // cyan (darkened for contrast on light) — finalized
  current: '#dd6e42', // burnt sienna — vertex being processed
  frontier: '#7f8c8d', // muted grey — not yet finalized
  relax: '#12a06a', // green — edge under relaxation
  tree: '#12a06a', // green — final shortest-path tree
  path: '#dd6e42', // burnt sienna — a specific source→target path
};

class Visualizer {
  constructor(graph) {
    this.graph = graph;
    this.steps = graph.trace;
    this.index = 0;
    this.timer = null;
    this.speedMs = 900;
    // A specific source→target path the user picked by clicking a vertex,
    // highlighted on top of the final frame. Cleared while stepping.
    this.highlightedPath = null;
  }

  get atComplete() {
    return this.current && this.current.type === 'complete';
  }

  // Reconstruct and highlight the shortest path to `target` (a Node). Only
  // meaningful once the algorithm has finished. Returns the path result so the
  // caller can render its text, or null if not applicable.
  showPathTo(target) {
    if (!this.atComplete) return null;
    const path = this.graph.shortestPathTo(target);
    this.highlightedPath = path.reachable ? path : { ...path, target };
    this.highlightedPath.target = target;
    this.render();
    return this.highlightedPath;
  }

  clearHighlightedPath() {
    if (this.highlightedPath) {
      this.highlightedPath = null;
      this.render();
    }
  }

  get current() {
    return this.steps[this.index];
  }

  get atEnd() {
    return this.index >= this.steps.length - 1;
  }

  play() {
    if (this.timer) return;
    if (this.atEnd) this.index = 0; // replay from the start
    this.render();
    this.timer = setInterval(() => {
      if (this.atEnd) {
        this.pause();
        return;
      }
      this.next();
    }, this.speedMs);
    updateControls();
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    updateControls();
  }

  get playing() {
    return this.timer != null;
  }

  setSpeed(ms) {
    this.speedMs = ms;
    if (this.playing) {
      this.pause();
      this.play();
    }
  }

  next() {
    if (this.index < this.steps.length - 1) {
      this.index++;
      this.highlightedPath = null;
      this.render();
    }
    if (this.atEnd) this.pause();
  }

  prev() {
    this.pause();
    if (this.index > 0) {
      this.index--;
      this.highlightedPath = null;
      this.render();
    }
  }

  reset() {
    this.pause();
    this.index = 0;
    this.highlightedPath = null;
    this.render();
  }

  // Jump straight to the final frame — the end result in one shot.
  runToEnd() {
    this.pause();
    this.index = this.steps.length - 1;
    this.highlightedPath = null;
    this.render();
  }

  // Role-based color for an edge at the current step.
  edgeColor(link, step) {
    if (link === step.relaxedEdge) {
      return step.improved ? COLORS.relax : COLORS.frontier;
    }
    if (step.type === 'complete' && this.isTreeEdge(link)) {
      return COLORS.tree;
    }
    return COLORS.base;
  }

  // Role-based color for a vertex at the current step.
  nodeColor(node, step, visited, frontier) {
    if (node === step.current) return COLORS.current;
    if (visited.has(node)) return COLORS.visited;
    if (frontier.has(node)) return COLORS.frontier;
    return COLORS.base;
  }

  // Render the colored graph for the current step into any 2D-context-like
  // target — the live canvas, or an SVG/LaTeX/PNG exporter (so exports keep
  // the algorithm's colors). The target must implement the canvas subset that
  // Node/Link.draw use (beginPath, arc, moveTo, lineTo, stroke, fill, etc.).
  drawGraphInto(ctx) {
    const step = this.current;
    const visited = new Set(step.visited);
    const frontier = new Set(step.frontier);

    // Edges first, so vertices sit on top.
    for (const link of this.graph.Edges) {
      const color = this.edgeColor(link, step);
      ctx.fillStyle = ctx.strokeStyle = color;
      link.draw(ctx, color);
    }

    for (const node of this.graph.Vertices) {
      const color = this.nodeColor(node, step, visited, frontier);
      ctx.fillStyle = ctx.strokeStyle = color;
      node.draw(ctx, color);
    }

    // Overlay a user-selected source→target path on top of the final frame,
    // drawn thicker so it stands out from the shortest-path tree beneath it.
    const path = this.highlightedPath;
    if (path && path.reachable) {
      const prevWidth = ctx.lineWidth;
      ctx.lineWidth = 3;
      const pathEdges = new Set(path.edges);
      for (const edge of this.graph.Edges) {
        if (pathEdges.has(edge)) {
          ctx.fillStyle = ctx.strokeStyle = COLORS.path;
          edge.draw(ctx, COLORS.path);
        }
      }
      for (const node of path.vertices) {
        ctx.fillStyle = ctx.strokeStyle = COLORS.path;
        node.draw(ctx, COLORS.path);
      }
      ctx.lineWidth = prevWidth;
    }
  }

  // Draw the graph for the current step, coloring vertices and edges by role.
  render() {
    const ctx = $.select('#canvas').getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0.5, 0.5);
    ctx.lineWidth = 1;

    this.drawGraphInto(ctx);

    ctx.restore();

    const step = this.current;
    renderNarration(step, this.index, this.steps.length);
    renderDistanceTable(step, this.atComplete);
    renderPathResult(this.highlightedPath, this.graph, this.atComplete);
  }

  isTreeEdge(edge) {
    return this.graph.pred.get(edge.nodeB) === edge.nodeA;
  }
}

// The single active visualizer (rebuilt each time "Shortest Path" is pressed).
let viz = null;

// Draw the graph into an export context (SVG/LaTeX exporter or a canvas ctx).
// When a visualization is active, this preserves the algorithm's colors for the
// current step; otherwise it falls back to fsm.js's plain black rendering.
// Called from saveAsPNG/SVG/LaTeX in fsm.js.
function drawGraphForExport(ctx) {
  if (!viz) {
    drawUsing(ctx);
    return;
  }
  // Mirror drawUsing's context setup so exporters get the same coordinate
  // transform, then draw with the visualizer's per-step colors.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(0.5, 0.5);
  ctx.lineWidth = 1;
  viz.drawGraphInto(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Result / narration rendering
// ---------------------------------------------------------------------------

function renderNarration(step, index, total) {
  const el = $.select('#narration');
  if (!el) return;
  el.innerHTML = '';
  el.append(
    $.create('div', {
      class: 'step-counter',
      text: `Step ${index + 1} of ${total}`,
    })
  );
  el.append($.create('p', { class: 'step-text', text: step.description }));
}

function renderDistanceTable(step, complete) {
  const resultElem = $.select('#result');
  resultElem.innerHTML = '';

  const table = $.create('table', { class: 'content-table' });
  table.append(
    $.create('thead', {
      html: '<tr><th>Vertex</th><th>Distance</th><th>Status</th></tr>',
    })
  );

  const visited = new Set(step.visited);
  const tbody = $.create('tbody');

  for (const { vertex, d } of step.distances) {
    const row = $.create('tr');
    if (vertex === step.current) row.className = 'active-row';

    // Once the run is complete, each row is a shortcut to reveal that
    // vertex's shortest path (same as clicking the vertex on the canvas).
    if (complete) {
      row.classList.add('clickable');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `Show shortest path to ${vertex.text}`);
      row.addEventListener('click', () => selectPathTarget(vertex));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectPathTarget(vertex);
        }
      });
    }

    row.append($.create('td', { text: vertex.text || '·' }));
    row.append($.create('td', { text: fmt(d) }));

    let status = 'unvisited';
    if (vertex === step.current) status = 'current';
    else if (visited.has(vertex)) status = 'finalized';
    row.append($.create('td', { text: status }));

    tbody.append(row);
  }

  table.append(tbody);
  resultElem.append(table);
}

// Render the "shortest path to X" panel below the table. Shows a prompt when
// the run is complete but nothing is selected yet, the reconstructed path when
// a target is picked, or nothing while the algorithm is still stepping.
function renderPathResult(path, graph, complete) {
  const el = $.select('#pathResult');
  if (!el) return;
  el.innerHTML = '';

  if (!complete) {
    return;
  }

  if (!path) {
    el.append(
      $.create('p', {
        class: 'path-hint',
        text: 'Click any vertex (on the canvas or in the table) to trace its shortest path from the source.',
      })
    );
    return;
  }

  const source = graph.getSourceVertex();
  el.append(
    $.create('div', {
      class: 'path-title',
      text: `Path · ${source.text} → ${path.target.text}`,
    })
  );

  if (!path.reachable) {
    el.append(
      $.create('p', {
        class: 'path-none',
        text: `${path.target.text} is unreachable from ${source.text} (distance ∞).`,
      })
    );
    return;
  }

  const route = $.create('div', { class: 'path-route' });
  path.vertices.forEach((v, i) => {
    route.append($.create('span', { class: 'path-node', text: v.text }));
    if (i < path.vertices.length - 1) {
      route.append($.create('span', { class: 'path-arrow', text: '→' }));
    }
  });
  el.append(route);

  el.append(
    $.create('div', {
      class: 'path-distance',
      html: `Total distance <strong>${path.distance}</strong>`,
    })
  );
}

// Reflect play/pause state on the toggle button and enable/disable steppers.
function updateControls() {
  const playBtn = $.select('#playPause');
  if (playBtn && viz) {
    playBtn.textContent = viz.playing ? '⏸ Pause' : '▶ Play';
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function runVisualization() {
  const g = new Graph();

  if (!g.getSourceVertex()) {
    const resultElem = $.select('#result');
    resultElem.innerHTML =
      '<p class="hint">Pick a source first: double-click a vertex to mark it as the source.</p>';
    return;
  }

  g.computeShortestPath();
  viz = new Visualizer(g);
  viz.reset();
  updateControls();
}

// Trace and highlight the shortest path to a given target vertex. Advances the
// visualizer to the final frame first, since paths are only defined there.
function selectPathTarget(target) {
  if (!viz) return;
  if (!viz.atComplete) {
    viz.index = viz.steps.length - 1;
  }
  viz.showPathTo(target);
}

// Map a canvas click to graph coordinates and return the vertex under it, or
// null. The drawing context is scaled to CSS pixels (see setupCanvas), so we
// convert the client position into that same space before hit-testing.
function vertexAtCanvasPoint(clientX, clientY) {
  const cv = $.select('#canvas');
  const rect = cv.getBoundingClientRect();
  const scale = cv.width / (window.devicePixelRatio || 1) / rect.width;
  const x = (clientX - rect.left) * scale;
  const y = (clientY - rect.top) * scale;
  for (const node of nodes) {
    const dx = x - node.x;
    const dy = y - node.y;
    if (dx * dx + dy * dy <= nodeRadius * nodeRadius) {
      return node;
    }
  }
  return null;
}

function init() {
  $.on('#computeShortestPath', 'click', runVisualization);

  // Click a vertex on the canvas to trace its shortest path — but only once
  // the run is complete, so we don't interfere with drawing/editing the graph.
  // Uses addEventListener so it composes with fsm.js's own mouse handlers.
  $.select('#canvas').addEventListener('click', (e) => {
    if (!viz || !viz.atComplete) return;
    const target = vertexAtCanvasPoint(e.clientX, e.clientY);
    if (target) {
      selectPathTarget(target);
    } else {
      viz.clearHighlightedPath();
    }
  });

  $.on('#playPause', 'click', () => {
    if (!viz) runVisualization();
    if (!viz) return;
    viz.playing ? viz.pause() : viz.play();
  });

  $.on('#stepNext', 'click', () => {
    if (!viz) runVisualization();
    if (viz) viz.next();
  });

  $.on('#stepPrev', 'click', () => {
    if (viz) viz.prev();
  });

  $.on('#stepReset', 'click', () => {
    if (viz) viz.reset();
  });

  $.on('#runToEnd', 'click', () => {
    if (!viz) runVisualization();
    if (viz) viz.runToEnd();
  });

  // Export buttons — these download the graph as a file (see fsm.js).
  $.on('#exportPNG', 'click', () => saveAsPNG());
  $.on('#exportSVG', 'click', () => saveAsSVG());
  $.on('#exportLaTeX', 'click', () => saveAsLaTeX());

  $.on('#speed', 'input', (e) => {
    // Slider is 1 (slow) .. 10 (fast); map to milliseconds per step.
    const val = +e.target.value;
    if (viz) viz.setSpeed(1900 - val * 170);
  });

  $.on('#presetSelector', 'change', async (e) => {
    const preset = e.target.value;
    localStorage['fsm'] = '';
    clearGraph();
    fixCanvas();
    if (preset) {
      const data = await $.get('presets/' + preset);
      localStorage['fsm'] = data;
      restoreBackup();
      draw();
    }
    resetVisualizer();
  });

  $.on('#clearCanvas', 'click', () => {
    localStorage['fsm'] = '';
    clearGraph();
    draw();
    resetVisualizer();
  });
}

// Tear down any running visualization (called when the graph changes).
function resetVisualizer() {
  if (viz) viz.pause();
  viz = null;
  const resultElem = $.select('#result');
  if (resultElem) resultElem.innerHTML = '';
  const narration = $.select('#narration');
  if (narration) narration.innerHTML = '';
  const pathResult = $.select('#pathResult');
  if (pathResult) pathResult.innerHTML = '';
  updateControls();
}

window.onload = init();
