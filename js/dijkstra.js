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
};

class Visualizer {
  constructor(graph) {
    this.graph = graph;
    this.steps = graph.trace;
    this.index = 0;
    this.timer = null;
    this.speedMs = 900;
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
      this.render();
    }
    if (this.atEnd) this.pause();
  }

  prev() {
    this.pause();
    if (this.index > 0) {
      this.index--;
      this.render();
    }
  }

  reset() {
    this.pause();
    this.index = 0;
    this.render();
  }

  // Draw the graph for the current step, coloring vertices and edges by role.
  render() {
    const step = this.current;
    const ctx = $.select('#canvas').getContext('2d');

    const visited = new Set(step.visited);
    const frontier = new Set(step.frontier);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0.5, 0.5);
    ctx.lineWidth = 1;

    // Edges first, so vertices sit on top.
    for (const link of this.graph.Edges) {
      let color = COLORS.base;
      if (link === step.relaxedEdge) {
        color = step.improved ? COLORS.relax : COLORS.frontier;
      } else if (step.type === 'complete' && this.isTreeEdge(link)) {
        color = COLORS.tree;
      }
      ctx.fillStyle = ctx.strokeStyle = color;
      link.draw(ctx, color);
    }

    for (const node of this.graph.Vertices) {
      let color = COLORS.base;
      if (node === step.current) color = COLORS.current;
      else if (visited.has(node)) color = COLORS.visited;
      else if (frontier.has(node)) color = COLORS.frontier;
      ctx.fillStyle = ctx.strokeStyle = color;
      node.draw(ctx, color);
    }

    ctx.restore();

    renderNarration(step, this.index, this.steps.length);
    renderDistanceTable(step);
  }

  isTreeEdge(edge) {
    return this.graph.pred.get(edge.nodeB) === edge.nodeA;
  }
}

// The single active visualizer (rebuilt each time "Shortest Path" is pressed).
let viz = null;

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

function renderDistanceTable(step) {
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

function init() {
  $.on('#computeShortestPath', 'click', runVisualization);

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
  updateControls();
}

window.onload = init();
