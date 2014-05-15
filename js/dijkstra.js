function init() {

	var btnFindShortestPath = document.getElementById("computeShortestPath");
	
	btnFindShortestPath.onclick = function(){
		m_Graph = {Vertices: nodes, Edges: links};
		Dijkstra(m_Graph);
	}
}

// Utils

// An ugly way to deep clone objects but it works for 
// objects with primitive keys
function deepClone(o){
	return JSON.parse(JSON.stringify(o));
}

// Get source node
function getSourceVertex(Graph){
	
	for(var i in Graph.Vertices){
		if(Graph.Vertices[i].isSourceNode){
			return Graph.Vertices[i];
		}
	}

	return null;
}

function getMinVertex(Graph, Q, dist){

	var minVertex;
	var min = 0;
	var vertices = Graph.Vertices;

	for(var i in vertices){

		var v = vertices[i];
		var d = dist.get(v);
		
		if(d <= min){
			minVertex = v;
			min = d;
		}
	}

	return minVertex;
}


function getInQIndex(Q, u){
	for(var i in Q){
		if(Q[i].text == u.text){
			return i;
		}
	}
}


function getNeighbors(Graph, u) {

	var edges = Graph.Edges;
	var neighbors = [];
	
	for(var i in edges){
		var edge = edges[i];
		if(edge.nodeA == u ){
			neighbors.push(edge.nodeB);
		}
	}

	return neighbors;
}

function getDistance (Graph, u, v) {

	var edges = Graph.Edges;

	for(var i in edges){
		var edge = edges[i];
		if(edge.nodeA == u && edge.nodeB == v){
			// since we are storing the weights as string gotta
			// parse it to get the integer value
			return +edge.text;
		}
	}

	return Infinity;
}


function Dijkstra(Graph){

	

	var source = getSourceVertex(Graph);

	if(source == null){
		// Show error to the user that they need to choose a source vertex
		return;
	}
	
	dist = new WeakMap();
	prev = new WeakMap();

	// Initialize SSSP
	var vertices = Graph.Vertices;
	for(var i in vertices){
		var vertex = vertices[i];
		dist.put(vertex, Infinity);
		prev.put(vertex, undefined);
	}

	dist.put(source, 0);

	//debugger;
	
	var Q = deepClone(vertices);

	while(Q.length > 0){
		
		var u = getMinVertex(Graph, Q, dist);

		// remove u from Q
		var index = getInQIndex(Q, u);
		Q.splice(index, 1);


		if(dist.get(u) == Infinity){
			break;
		}

		var neighbors = getNeighbors(Graph, u);

		for(var i in neighbors){

			//Relax
			var v = neighbors[i];
			var alt = dist.get(u) + getDistance(Graph, u, v);
			if(alt < dist.get(v)){
				dist.put(v, alt);
				prev.put(v, u);				
			}
		}
	}

	console.log(dist, prev);
}

window.onload = init();