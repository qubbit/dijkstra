function init() {

	var findSP = document.getElementById("computeShortestPath");

	findSP.onclick = function() {
		m_Graph = {
			Vertices: nodes,
			Edges: links
		};
		Dijkstra(m_Graph);
	}
}

// Get source vertex of the graph
function getSourceVertex(Graph) {

	for (var i in Graph.Vertices) {
		if (Graph.Vertices[i].isSourceNode) {
			return Graph.Vertices[i];
		}
	}

	return null;
}

// Get vertex with minimum distance value
function getMinVertex(dist) {

	var minVertex = dist[0].v;
	var minDistance = Infinity;

	for (var i in dist) {

		var elem = dist[i];

		if (elem.d < minDistance && !elem.v.visited) {
			minVertex = elem.v;
			minDistance = elem.d;
		}
	}

	return minVertex;
}

function getDistanceFromSource(dist, u) {

	for (var i in dist) {

		var elem = dist[i];

		if (elem.v == u) {
			return elem.d;
		}
	}
}

function getVertexIndex(table, u) {

	for (var i in table) {

		var elem = dist[i];

		if (elem.v == u) {
			return i;
		}
	}
}


function getInQIndex(Q, u) {
	for (var i in Q) {
		if (Q[i].text == u.text) {
			return i;
		}
	}
}


function getNeighbors(Graph, u) {

	var edges = Graph.Edges;
	var neighbors = [];

	for (var i in edges) {
		var edge = edges[i];
		if (edge.nodeA == u) {
			neighbors.push(edge.nodeB);
		}
	}

	console.log(u);
	return neighbors;
}

function getDistanceBetween(Graph, u, v) {

	var edges = Graph.Edges;

	for (var i in edges) {
		var edge = edges[i];
		if (edge.nodeA == u && edge.nodeB == v) {
			// since we are storing the weights as string gotta
			// parse it to get the integer value
			return +edge.text;
		}
	}

	return Infinity;
}


function Dijkstra(Graph) {

	var source = getSourceVertex(Graph);

	if (source == null) {
		// Show error to the user that they need to choose a source vertex
		return;
	}

	dist = [];
	prev = [];

	// Initialize SSSP
	var vertices = Graph.Vertices;

	for (var i in vertices) {

		var vertex = vertices[i];
		if (vertex != source) {
			dist.push({
				v: vertex,
				d: Infinity
			});
		}
		prev.push({
			v: vertex,
			p: undefined
		});
	}

	dist.push({
		v: source,
		d: 0
	});

	var Q = deepClone(vertices);

	while (Q.length > 0) {

		var u = getMinVertex(dist);
		u.visited = true;

		// remove u from Q
		var index = getInQIndex(Q, u);
		Q.splice(index, 1);


		if (getDistanceFromSource(dist, u) == Infinity) {
			break;
		}

		var neighbors = getNeighbors(Graph, u);

		for (var i in neighbors) {

			//Relax
			var v = neighbors[i];
			var alt = getDistanceFromSource(dist, u) + getDistanceBetween(Graph, u, v);
			if (alt < getDistanceFromSource(dist, v)) {

				var di = getVertexIndex(dist, v);
				var pi = getVertexIndex(prev, v);
				dist[di] = {
					v: v,
					d: alt
				};
				prev[pi] = {
					v: v,
					p: u
				};
			}
		}
	}

	console.log(dist, prev);
}

window.onload = init();