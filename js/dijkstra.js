function init() {

	Graph = function(V, E) {
		this.Vertices = V || nodes;
		this.Edges = E || links;
		this.dist = [];
		this.prev = [];
	}

	Graph.prototype = {

		constructor: Graph,

		sanitize: function(){
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
				
				this.prev.push({
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
						var pi = this.getVertexIndex(this.prev, v);
						
						this.dist[di] = {
							v: v,
							d: alt
						};

						this.prev[pi] = {
							v: v,
							p: u
						};
					}
				}
			}
		}
	};

	$("#computeShortestPath").on("click", function() {

		var g = new Graph();

		if (g.sanitize()) {
			g.computeShortestPath();
			console.log(g.dist);
		}
	});

	$("#presetSelector").on("change", function() {
		
		var preset = $(this).val();
		if(preset){
			$.get(preset, function(data){
				localStorage["fsm"] = data;
				restoreBackup();
			}, "text");
		}
	});
}


window.onload = init();