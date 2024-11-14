// Load the GeoJSON data
d3.json('output_lk_metadata2.geojson').then(function(data) {
    // Set up the SVG canvas dimensions with extra padding for hexagons
    const padding = 40;
    const hexRadius = 20;  // Adjust radius as needed
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 2 * hexRadius;
    const width = 800 + padding * 2;
    const height = 600 + padding * 2;
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `-${padding} -${padding} ${width} ${height}`);

    // Set up the hexbin generator
    const hexbin = d3.hexbin()
        .radius(hexRadius)
        .extent([[0, 0], [width, height]]);

    // Create a projection to fit the map
    const projection = d3.geoMercator()
        .fitSize([width - padding * 2, height - padding * 2], data);

    const path = d3.geoPath().projection(projection);

    // Generate hexagon centers based on the projection
    const hexCenters = data.features.map(d => {
        const centroid = path.centroid(d);
        return [centroid[0], centroid[1]];
    });

    // Function to calculate hexagon positions
    function hexPosition(i, numCols) {
        const col = i % numCols;
        const row = Math.floor(i / numCols);
        const x = col * hexWidth + (row % 2 ? hexWidth / 2 : 0);
        const y = row * hexHeight * 3/4;
        return [x, y];
    }

    // Function to create a hexagonal grid
    function createHexGrid(hexCenters) {
        // Sort hexCenters by y then x to create a grid-like structure
        hexCenters.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

        const numCols = Math.ceil(Math.sqrt(hexCenters.length));
        const grid = hexCenters.map((_, i) => hexPosition(i, numCols));
        return grid;
    }

    // Create the hexagonal grid
    const hexGrid = createHexGrid(hexCenters);

    // Draw hexagons
    svg.append("g")
        .selectAll(".hexagon")
        .data(hexGrid)
        .enter().append("path")
        .attr("class", "hexagon")
        .attr("d", hexbin.hexagon())
        .attr("transform", (d) => `translate(${d[0]},${d[1]})`)
        .on("mouseover", function(event, d) {
            const i = hexGrid.indexOf(d);
            d3.select(`#label-${i}`).classed("show", true);
        })
        .on("mouseout", function(event, d) {
            const i = hexGrid.indexOf(d);
            d3.select(`#label-${i}`).classed("show", false);
        });

    // Optionally, add labels or other elements
    svg.append("g")
        .selectAll("text")
        .data(hexGrid)
        .enter().append("text")
        .attr("class", "hex-label")
        .attr("id", (d, i) => `label-${i}`)
        .attr("x", (d) => d[0])
        .attr("y", (d) => d[1])
        .text((d, i) => data.features[i].properties.GEN)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em");
});