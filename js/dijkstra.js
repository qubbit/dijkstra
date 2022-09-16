class Graph {
  #Vertices;
  #Edges;

  constructor(V, E) {
    this.Vertices = V || nodes;
    this.Edges = E || links;
    this.dist = [];
    this.pred = [];
  }

  reset() {
    if (!this.Vertices || !this.Edges) {
      return false;
    }

    this.Vertices.forEach((v) => {
      v.visited = false;
    });

    this.dist = [];
    this.pred = [];

    return true;
  }

  getSourceVertex() {
    for (const i in this.Vertices) {
      if (this.Vertices[i].isSourceNode) {
        return this.Vertices[i];
      }
    }

    return null;
  }

  getMinVertex() {
    let minVertex = this.dist ? this.dist[0].v : null;
    let minDistance = Infinity;

    for (const i in this.dist) {
      const elem = this.dist[i];

      if (elem.d < minDistance && !elem.v.visited) {
        minVertex = elem.v;
        minDistance = elem.d;
      }
    }

    return minVertex;
  }

  getDistanceFromSource(u) {
    for (const i in this.dist) {
      const elem = this.dist[i];

      if (elem.v == u) {
        return elem.d;
      }
    }
  }

  getVertexIndex(table, u) {
    for (const i in table) {
      const elem = this.dist[i];

      if (elem.v == u) {
        return i;
      }
    }
  }

  getInQIndex(Q, u) {
    for (const i in Q) {
      if (Q[i].text == u.text) {
        return i;
      }
    }
  }

  getNeighbors(u) {
    const edges = this.Edges;
    const neighbors = [];

    for (const i in edges) {
      const edge = edges[i];
      if (edge.nodeA == u) {
        neighbors.push(edge.nodeB);
      }
    }

    return neighbors;
  }

  getDistanceBetween(u, v) {
    const edges = this.Edges;

    for (const i in edges) {
      const edge = edges[i];
      if (edge.nodeA == u && edge.nodeB == v) {
        return +edge.text;
      }
    }

    return Infinity;
  }

  computeShortestPath() {
    const source = this.getSourceVertex();

    // Initialize SSSP
    const vertices = this.Vertices;

    for (const i in vertices) {
      const vertex = vertices[i];
      if (vertex != source) {
        this.dist.push({
          v: vertex,
          d: Infinity,
        });
      }

      this.pred.push({
        v: vertex,
        p: undefined,
      });
    }

    this.dist.push({
      v: source,
      d: 0,
    });

    const Q = deepClone(vertices);

    while (Q.length > 0) {
      const u = this.getMinVertex(this.dist);
      u.visited = true;

      // Remove u from Q
      const index = this.getInQIndex(Q, u);
      Q.splice(index, 1);

      if (this.getDistanceFromSource(u) == Infinity) {
        break;
      }

      const neighbors = this.getNeighbors(u);

      for (const i in neighbors) {
        // Relax
        const v = neighbors[i];
        const alt =
          this.getDistanceFromSource(u) + this.getDistanceBetween(u, v);
        if (alt < this.getDistanceFromSource(v)) {
          const di = this.getVertexIndex(this.dist, v);
          const pi = this.getVertexIndex(this.pred, v);

          this.dist[di] = {
            v: v,
            d: alt,
          };

          this.pred[pi] = {
            v: v,
            p: u,
          };
        }
      }
    }
  }

  drawPath(ctx) {
    const links = [];
    const e = this.Edges;
    const pred = this.pred;

    // ctx.canvas.height = ctx.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(0.5, 0.5);

    for (const i in e) {
      for (const j in pred) {
        if (e[i].nodeA == pred[j].p && e[i].nodeB == pred[j].v) {
          links.push(e[i]);
        }
      }
    }

    const color = '#33a51c';

    for (const k in links) {
      links[k].nodeA.draw(ctx, color);
      links[k].nodeB.draw(ctx, color);
      links[k].draw(ctx, color);
    }

    ctx.restore();
  }
}

function init() {
  $.on('#computeShortestPath', 'click', () => {
    const g = new Graph();

    if (g.reset()) {
      g.computeShortestPath();

      const resultElem = $.select('#result');

      resultElem.innerHTML = '';

      const pathElem = $.create('h3', {
        text: 'Path: ',
      });

      let k;

      const pred = g.pred;

      if (pred.length > 1) {
        for (k = 0; k < pred.length - 2; k++) {
          const p = g.pred[k].p;
          const v = g.pred[k].v;

          if (p && v) {
            pathElem.append(g.pred[k].p.text + ' ' + g.pred[k].v.text + ' → ');
          }
        }

        pathElem.append(g.pred[k].p.text + ' ' + g.pred[k].v.text);
      }

      resultElem.append(pathElem);

      const dValues = $.create('table', {
        class: 'content-table',
      });
      dValues.append(
        $.create('thead', {
          html: '<tr><th>Vertex</th><th>Distance from source</th></tr>',
        })
      );

      const tableBody = $.create('tbody');

      for (const i in g.dist) {
        const row = $.create('tr');
        const vertexLabelCell = $.create('td', {
          text: g.dist[i].v.text,
        });
        const dValueCell = $.create('td', {
          text: g.dist[i].d,
        });
        row.append(vertexLabelCell);
        row.append(dValueCell);
        tableBody.append(row);
      }

      dValues.append(tableBody);
      const ctx = $.select('#canvas').getContext('2d');
      g.drawPath(ctx);

      resultElem.append(dValues);
    }
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
  });

  $.on('#clearCanvas', 'click', () => {
    localStorage['fsm'] = '';
    clearGraph();
    draw();
    const resultElem = $.select('#result');
    resultElem.innerHTML = '';
  });
}

window.onload = init();
