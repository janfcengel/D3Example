import * as hagrid from "@saehrimnir/hagrid";

export function drawHexMap(data) {
    const parameters = {
       precision: 6, // Precision level for the Gosper algorithm
        area: 400,    // Target area for hexagons
        bounds: [[5.5, 47.2], [15.0, 55.0]] // Bounds for Germany
    };
    const geojsonWithCentroid = require('./output_lk_metadata2.geojson');
    const centroids = geojsonWithCentroid.features.map((feature) => {
        return feature.geometry.coordinates;
      });

    //console.log(hagrid.gridify_gosper);
    let gridified_data = hagrid.gridify_gosper(centroids, {pluslevel:0});
    console.log("abc hagrid is da");

    // Set up the SVG canvas dimensions
    const width = 800;
    const height = 600;
    const svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a projection to fit the map
    const projection = d3.geoMercator()
        .fitSize([width, height], { type: "FeatureCollection", features: gridified_data });

    const path = d3.geoPath().projection(projection);

    // Draw hexagons
    svg.append("g")
        .selectAll("path")
        .data(gridified_data)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "lightblue")
        .attr("stroke", "green")
        .attr("stroke-width", 1);

    // Optionally, add labels or other elements
    svg.append("g")
        .selectAll("text")
        .data(gridified_data)
        .enter().append("text")
        .attr("x", d => path.centroid(d)[0])
        .attr("y", d => path.centroid(d)[1])
        .text(d => d.properties.GEN)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .on("mouseover", function(event, d) {
            d3.select(this).classed("show", true);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).classed("show", false);
        });
}
function gridify_gosper$1(D, {level, scale_factor = 0.8}) {
    const N = D.length;
    const P = new Map();
    const Y = new Array(N).fill(0);
    const V = gosper_curve(level);
    // distance between grid cells (grid cell size)
    distance$2(V[0], V[1]); // Math.sqrt(3);

    const grid_extent = [extent$1(V, d => d[0] * scale_factor), extent$1(V, d => d[1]* scale_factor)]; 
    const scales = get_scales(D, grid_extent, {round: false});

    D.forEach((d, i) => {
        let [x, y] = scales.map(s => s(d));
        let p = find_nearest([x, y], V);
        if (P.has(p)) {
            gosper_collision(P, p, [x, y], i, V);
        } else {
            P.set(p, i);
        }
    });

    for (const [p, i] of P.entries()) {
        Y[i] = V[p];
    }

    return Y;
}

// Lade die GeoJSON-Daten und rufe die drawHexMap-Funktion auf
//d3.json('output_lk_metadata2.geojson').then(drawHexMap);
