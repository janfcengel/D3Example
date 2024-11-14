// Set the hexagon radius (scalable)
const hexRadius = 10; // Adjust radius as needed

// Load the GeoJSON data
d3.json('combined_landkreise_hexmap.geojson').then(function(data) {
    // Set up the SVG canvas dimensions with extra padding for hexagons
    const padding = 40;
    const width = 800 + padding * 2;
    const height = 600 + padding * 2;
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    // Set up the hexbin generator
    const hexbin = d3.hexbin()
        .radius(hexRadius)
        .extent([[0, 0], [width, height]]);

    // Create a projection to fit the map
    const projection = d3.geoMercator()
        .fitExtent([[padding, padding], [width - padding, height - padding]], data);

    const path = d3.geoPath().projection(projection);

    // Generate hexagon centers based on the projection
    const hexCenters = data.features.map(d => {
        const centroid = path.centroid(d);
        return [centroid[0], centroid[1]];
    });

    // Create the hexagonal grid
    const hexGrid = hexbin(hexCenters);

    // Draw hexagons
    svg.append("g")
        .selectAll(".hexagon")
        .data(hexGrid)
        .enter().append("path")
        .attr("class", "hexagon")
        .attr("d", hexbin.hexagon())
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .on("mouseover", function(event, d) {
            const i = hexGrid.indexOf(d);
            d3.select(`#label-${i}`).classed("show", true);
        })
        .on("mouseout", function(event, d) {
            const i = hexGrid.indexOf(d);
            d3.select(`#label-${i}`).classed("show", false);
        });

    // Add labels
    svg.append("g")
        .selectAll("text")
        .data(hexGrid)
        .enter().append("text")
        .attr("class", "hex-label")
        .attr("id", (d, i) => `label-${i}`)
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .text((d, i) => data.features[i].properties.GEN)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em");
});