function init() {

	"use strict";

	window.Graph = function(V, E) {
		this.Vertices = V || nodes;
		this.Edges = E || links;
		this.dist = [];
		this.pred = [];
	}

	Graph.prototype = {

		constructor: Graph,

		sanitize: function() {

			if (!this.Vertices || !this.Edges) {
				return false;
			}

			$.each(this.Vertices, function(k, v) {
				v.visited = false;
			});

			this.dist = [];
			this.pred = [];

			return true;
		},

		getSourceVertex: function() {

			for (var i in this.Vertices) {
				if (this.Vertices[i].isSourceNode) {
					return this.Vertices[i];
				}
			}

			return null;
		},

		getMinVertex: function() {

			var minVertex = (this.dist) ? this.dist[0].v : null;
			var minDistance = Infinity;

			for (var i in this.dist) {

				var elem = this.dist[i];

				if (elem.d < minDistance && !elem.v.visited) {
					minVertex = elem.v;
					minDistance = elem.d;
				}
			}

			return minVertex;
		},

		getDistanceFromSource: function(u) {

			for (var i in this.dist) {

				var elem = this.dist[i];

				if (elem.v == u) {
					return elem.d;
				}
			}
		},

		getVertexIndex: function(table, u) {

			for (var i in table) {

				var elem = this.dist[i];

				if (elem.v == u) {
					return i;
				}
			}
		},

		getInQIndex: function(Q, u) {

			for (var i in Q) {
				if (Q[i].text == u.text) {
					return i;
				}
			}
		},

		getNeighbors: function(u) {

			var edges = this.Edges;
			var neighbors = [];

			for (var i in edges) {
				var edge = edges[i];
				if (edge.nodeA == u) {
					neighbors.push(edge.nodeB);
				}
			}

			return neighbors;
		},

		getDistanceBetween: function(u, v) {

			var edges = this.Edges;

			for (var i in edges) {
				var edge = edges[i];
				if (edge.nodeA == u && edge.nodeB == v) {
					return +edge.text;
				}
			}

			return Infinity;
		},

		computeShortestPath: function() {

			var source = this.getSourceVertex();

			// Initialize SSSP
			var vertices = this.Vertices;

			for (var i in vertices) {

				var vertex = vertices[i];
				if (vertex != source) {
					this.dist.push({
						v: vertex,
						d: Infinity
					});
				}

				this.pred.push({
					v: vertex,
					p: undefined
				});
			}

			this.dist.push({
				v: source,
				d: 0
			});

			var Q = deepClone(vertices);

			while (Q.length > 0) {

				var u = this.getMinVertex(this.dist);
				u.visited = true;

				// Remove u from Q
				var index = this.getInQIndex(Q, u);
				Q.splice(index, 1);


				if (this.getDistanceFromSource(u) == Infinity) {
					break;
				}

				var neighbors = this.getNeighbors(u);

				for (var i in neighbors) {

					// Relax
					var v = neighbors[i];
					var alt = this.getDistanceFromSource(u) + this.getDistanceBetween(u, v);
					if (alt < this.getDistanceFromSource(v)) {

						var di = this.getVertexIndex(this.dist, v);
						var pi = this.getVertexIndex(this.pred, v);

						this.dist[di] = {
							v: v,
							d: alt
						};

						this.pred[pi] = {
							v: v,
							p: u
						};
					}
				}
			}
		},

		drawPath: function(ctx) {

			var links = [];
			var e = this.Edges;
			var pred = this.pred;

			ctx.canvas.height = ctx.canvas.height;

			for (var i in e) {
				for (var j in pred) {
					if (e[i].nodeA == pred[j].p && e[i].nodeB == pred[j].v) {
						links.push(e[i])
					}
				}
			}

			var color = "#33a51c";

			for (var k in links) {

				links[k].nodeA.draw(ctx, color);
				links[k].nodeB.draw(ctx, color);
				links[k].draw(ctx, color);
			}
		}
	};

	$("#computeShortestPath").on("click", function() {

		var g = new Graph();

		if (g.sanitize()) {

			g.computeShortestPath();

			var resultElem = $("#result");

			resultElem.html("");

			var pathElem = $("<h3>", {
				text: "Path: "
			});

			var k;

			var pred = g.pred;

			if (pred.length > 1) {

				for (k = 0; k < pred.length - 2; k++) {

					var p = g.pred[k].p;
					var v = g.pred[k].v;

					if (p && v) {
						pathElem.append(g.pred[k].p.text + " " + g.pred[k].v.text + " &rarr; ");
					}
				}

				pathElem.append(g.pred[k].p.text + " " + g.pred[k].v.text);

			}

			resultElem.append(pathElem);

			var dValues = $("<table>", {
				class: "table table-striped"
			});
			dValues.append($("<thead>", {
				html: '<tr><th>Vertex</th><th>Distance From Source</th></tr>'
			}));

			for (var i in g.dist) {
				var row = $("<tr>");
				var vertexLabelCell = $("<td>", {
					text: g.dist[i].v.text
				});
				var dValueCell = $("<td>", {
					text: g.dist[i].d
				});
				row.append(vertexLabelCell).append(dValueCell);
				dValues.append(row);
			}

			var ctx = $("#canvas")[0].getContext("2d");
			g.drawPath(ctx);

			resultElem.fadeIn().append(dValues);
		}
	});

	$("#presetSelector").on("change", function() {

		var preset = $(this).val();

		if (preset) {
			$.get(preset, function(data) {
				localStorage["fsm"] = data;
				restoreBackup();
				location.reload();
			}, "text");
		}
	});

	$("#clearCanvas").on("click", function() {
		localStorage["fsm"] = null;
		location.reload();
	});

}


window.onload = init();