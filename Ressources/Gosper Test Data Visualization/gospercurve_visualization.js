// Definiere die SVG-Abmessungen
const width = 800;
const height = 800;
const start_width = width - (width/10)
const start_height = height - (height/10)

// Lade die JSON-Datei mit den `Y`-Daten und visualisiere sie
d3.json('gosper_curve_combined_data copy.json').then(Y => {
    // Überprüfe die geladenen Daten
    console.log(Y);

    // Bestimme die minimalen und maximalen Werte für x und y
    const xExtent = d3.extent(Y, d => d[0][0]);
    const yExtent = d3.extent(Y, d => d[0][1]);

    // Erstelle Skalierungsfunktionen für x und y
    const xScale = d3.scaleLinear()
        .domain(xExtent)
        .range([width/10, start_width]);

    const yScale = d3.scaleLinear()
        .domain(yExtent)
        .range([height/10, start_height]);

    // Erzeuge die Knoten (nodes) und Kanten (links) basierend auf der skalierten Datenstruktur Y
    const nodes = Y.map((d, i) => ({ 
        id: i, 
        x: xScale(d[0][0]), 
        y: yScale(d[0][1]),
        value: d[1]
     }));
    const links = nodes.map((node, i) => 
        i < nodes.length - 1 ? { source: i, target: i + 1 } : null)
    .filter(d => d !== null);

    console.log(nodes)

    // Erstelle eine SVG-Zeichenfläche
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    // Erstelle die Kanten (links)
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "link");

    // Erstelle die Knoten (nodes)
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 3)
        .style("fill", d => d.value === -1 ? "red" : "blue");
        //.style("fill", d => d.id === 2399 ? "red" : "blue");

    // Aktualisiere die Positionen der Knoten und Kanten bei jedem Tick der Simulation

    function ticked() {
        link
            .attr("x1", d => nodes[d.source.index].x)
            .attr("y1", d => nodes[d.source.index].y)
            .attr("x2", d => nodes[d.target.index].x)
            .attr("y2", d => nodes[d.target.index].y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    // Füge optional eine Simulation hinzu, oder setze die Positionen der Knoten direkt
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).distance(30).strength(1).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .on("tick", ticked);

    simulation.stop(); // Stoppe die Simulation, um die statischen Positionen aus Y zu nutzen

    svg.selectAll(".node")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

    svg.selectAll(".link")
        .attr("x1", d => nodes[d.source.index].x)
        .attr("y1", d => nodes[d.source.index].y)
        .attr("x2", d => nodes[d.target.index].x)
        .attr("y2", d => nodes[d.target.index].y);
});