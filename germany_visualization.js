// Erstelle eine Farbskala für die Hexagone (Weiß bis Blau)
const colorScale = d3.scaleLinear()
    .domain([0, 1000]) // Wertebereich
    .range(["white", "blue"]); // Farbverlauf von Weiß bis Blau

chartContainerHeight = 0;
// Lade beide JSON-Dateien (Landkreisdaten und multivariate Daten)
Promise.all([
    d3.json('landkreis_data.json'), // Landkreisdaten (Koordinaten und IDs)
    d3.json('multivariate_test_data2.json'), // Multivariate Daten (Werte für verschiedene Tage)
    d3.json('2023-12-07_rki_data.json'),
    d3.json('2023-12-14_rki_data.json'),
    d3.json('2023-12-21_rki_data.json')
]).then(([geoData, multivariateData, rki231207, rki231214, rki231221]) => {
//]).then(([landkreisData, multivariateData]) => {
    // Extrahiere die Tage als Schlüssel aus den multivariaten Daten
    const dates = Object.keys(multivariateData);

    // Fülle die Dropdowns mit den extrahierten Tagen
    const date1Select = document.getElementById('date1Selection');
    const date2Select = document.getElementById('date2Selection');
    const date3Select = document.getElementById('date3Selection');

    dates.forEach(date => {
        const option1 = document.createElement('option');
        option1.value = date;
        option1.text = date;
        date1Select.add(option1);
    
        const option2 = document.createElement('option');
        option2.value = date;
        option2.text = date;
        date2Select.add(option2);
    
        const option3 = document.createElement('option');
        option3.value = date;
        option3.text = date;
        date3Select.add(option3);
    });

        // Event-Listener für den Selektieren-Button
    document.getElementById('selectButton').addEventListener('click', function () {
        const date1 = document.getElementById('date1Selection').value;
        const date2 = document.getElementById('date2Selection').value;
        const date3 = document.getElementById('date3Selection').value;
    
        // Die Funktionen, die die Daten aktualisieren
        updateLegend(date1, date2, date3, multivariateData);
        updateHexagonColors(date1, date2, date3, multivariateData, landkreisData);
        // Falls nötig: updateBarChartForHexagon(...) anpassen, falls die Balkendiagramme auch aktualisiert werden sollen
    });
    
    // Initialisiere die Karte mit den Landkreisdaten
    chartContainerHeight = document.getElementById("chart-container").clientHeight;
    initializeHexagonMap(landkreisData, multivariateData);
    
    // Hexagone neben den Dropdowns anzeigen
    renderSingleHexagon('hex-date1', 'first');
    renderSingleHexagon('hex-date2', 'second');
    renderSingleHexagon('hex-date3', 'third');
});

// Funktion zum Erstellen eines Balkendiagramms für das ausgewählte Hexagon
function updateBarChartForHexagon(hexagonId, date1, date2, date3, multivariateData) {
    // Versuche, die Daten für das Hexagon basierend auf den Datenpunkten zu finden
    const date1Data = multivariateData[date1] ? multivariateData[date1].find(d => d.id === hexagonId) : null;
    const date2Data = multivariateData[date2] ? multivariateData[date2].find(d => d.id === hexagonId) : null;
    const date3Data = multivariateData[date3] ? multivariateData[date3].find(d => d.id === hexagonId) : null;

    // Wenn es keine Daten gibt, setze Standardwerte
    const chartData = [
        { date: date1, value: date1Data ? date1Data.value : 0 }, // Wert für Datum 1
        { date: date2, value: date2Data ? date2Data.value : 0 }, // Wert für Datum 2
        { date: date3, value: date3Data ? date3Data.value : 0 }  // Wert für Datum 3
    ];

    // Ermittle die verfügbare Höhe der Box dynamisch
    const chartContainer = document.getElementById("chart-container");
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = chartContainer.clientWidth - margin.left - margin.right; // Verfügbare Breite der Box
    const height = chartContainerHeight - margin.top - margin.bottom; // Verfügbare Höhe der Box

    // Lösche das alte Diagramm, falls es existiert
    d3.select("#chart-container").selectAll("*").remove();

    // Erstelle das SVG
    const svg = d3.select("#chart-container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X-Skala für die Daten (Datum 1, Datum 2 und Datum 3)
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.date))
        .range([0, width])
        .padding(0.2);

    // Y-Skala für die Werte
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.value)])
        .range([height, 0]);

    // X-Achse hinzufügen
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Y-Achse hinzufügen
    svg.append("g")
        .call(d3.axisLeft(y));

    // Feste maximale Balkenbreite (z.B. maximal 50 Pixel)
    const maxBarWidth = 50;

    // Balken hinzufügen und die Breite begrenzen
    svg.selectAll(".bar")
        .data(chartData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.date))
        .attr("y", d => y(d.value))
        .attr("width", Math.min(x.bandwidth(), maxBarWidth)) // Begrenze die Breite
        .attr("height", d => height - y(d.value))
        .attr("fill", d => colorScale(d.value)); // Farbe basierend auf der Farbskala
}

// Funktion zur Anzeige der vertikalen Legende in der neuen Box (Grüne Box)
function updateLegend(date1, date2, date3, multivariateData) {
    const { minValue: min1, maxValue: max1 } = getMinMaxValues(date1, multivariateData);
    const { minValue: min2, maxValue: max2 } = getMinMaxValues(date2, multivariateData);
    const { minValue: min3, maxValue: max3 } = getMinMaxValues(date3, multivariateData);

    // Finde den kleineren Min-Wert und den größeren Max-Wert
    const overallMinValue = Math.min(min1, min2, min3);
    const overallMaxValue = Math.max(max1, max2, max3);

    // Lösche die vorherige Legende
    d3.select("#legend-container").selectAll("*").remove();

    // Ermittle die verfügbare Höhe des Legend-Containers dynamisch
    const legendContainer = document.getElementById("legend-container");
    const availableHeight = legendContainer.clientHeight; // Verfügbare Höhe der Legende
    const svgWidth = 80;
    const svgHeight = availableHeight - 20; // Verfügbare Höhe für die SVG

    // Erstelle ein SVG für die Legende
    const legendSvg = d3.select("#legend-container").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // Farbverlauf erstellen (blau bis weiß) von oben nach unten
    const gradient = legendSvg.append("defs")
      .append("linearGradient")
      .attr("id", "legendGradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%"); // Vertikaler Farbverlauf

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "blue");  // Blau oben

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "white");  // Weiß unten

    // Rechteck für den Farbverlauf hinzufügen (vertikal)
    legendSvg.append("rect")
      .attr("x", 10)
      .attr("y", 10)
      .attr("width", 20)
      .attr("height", svgHeight - 40)  // Passe die Höhe des Rechtecks an die verfügbare SVG-Höhe an
      .style("fill", "url(#legendGradient)");

    // Max-Wert (oben) anzeigen
    legendSvg.append("text")
      .attr("x", 40)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .text(`${overallMaxValue}`);

    // Min-Wert (unten) anzeigen
    legendSvg.append("text")
      .attr("x", 40)
      .attr("y", svgHeight - 20)
      .attr("text-anchor", "start")
      .text(`${overallMinValue}`);
}

// Funktion zur Berechnung der Min- und Max-Werte eines bestimmten Datums
function getMinMaxValues(date, multivariateData) {
    const dateData = multivariateData[date];
    const values = dateData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return { minValue, maxValue };
}

const hexRadius = 14; // Größe des Hexagons
const outerHexRadius = 16; // Größe für die äußere Umrandung (etwas größer)

// Funktion zur Initialisierung der Hexagon-Karte
function initializeHexagonMap(landkreisData, multivariateData) {
    const svg = d3.select("#leftContainer svg");

    // Skaliere die Positionen basierend auf den geographischen Koordinaten
    const xExtent = d3.extent(landkreisData.features, d => d.geometry.coordinates[0]);
    const yExtent = d3.extent(landkreisData.features, d => d.geometry.coordinates[1]);

    const xScale = d3.scaleLinear().domain(xExtent).range([50, 750]);
    const yScale = d3.scaleLinear().domain(yExtent).range([750, 50]); // Spiegelung der Y-Achse

    // Aktualisiere die Positionen der Hexagone basierend auf den geographischen Daten
    const nodes = landkreisData.features.map((d, i) => ({
        id: d.properties.id, // Verwende die ID aus den Landkreisdaten
        x: xScale(d.geometry.coordinates[0]),
        y: yScale(d.geometry.coordinates[1]),
        properties: d.properties
    }));

    
    // Sortiere die Liste `nodes` zunächst nach den X-Koordinaten
    nodes.sort((a, b) => a.x - b.x);

    // Weises jedem eindeutigen X-Wert einen aufsteigenden `Hex_x`-Wert zu
    let currentHexX = 1;
    let previousX = Math.round(nodes[0].x*10)/10;

    nodes.forEach((node, index) => {
        if (Math.round(node.x*10)/10 !== previousX) {
            currentHexX++;  // Erhöhe `Hex_x` nur bei einem neuen X-Wert
            previousX = Math.round(node.x*10)/10;
        }
        node.Hex_x = currentHexX;
    });

    // Sortiere die Liste `nodes` jetzt nach den Y-Koordinaten
    nodes.sort((a, b) => a.y - b.y);

    // Weises jedem eindeutigen Y-Wert einen aufsteigenden `Hex_y`-Wert zu
    let currentHexY = 1;
    let previousY = Math.round(nodes[0].y*10)/10;

    nodes.forEach((node, index) => {
        if (Math.round(node.y*10)/10 !== previousY) {
            currentHexY++;  // Erhöhe `Hex_y` nur bei einem neuen Y-Wert
            previousY = Math.round(node.y*10)/10;
        }
        node.Hex_y = currentHexY;
    });

    // Funktion zur Berechnung der Hexagon-Punkte für drei gleich große Segmente
    function calculateThreeSegmentHexagonPoints(x, y, radius, segment) {
        const hexagonPoints = [];
        
        // Berechne die sechs Punkte eines Hexagons
        for (let i = 0; i < 12; i++) {
            const angle = 2 * Math.PI / 12 * i; // 30 Grad Schritte
            const x_i = x + radius * Math.cos(angle);
            const y_i = y + radius * Math.sin(angle);
            hexagonPoints.push([x_i, y_i]);
        }

        // Wähle die Punkte für das gewünschte Segment aus
        let points = [];
        points.push([x, y]); // Mittelpunkt des Hexagons

        if (segment === 'first') {
            // Segment von 300 bis 60 Grad
            points.push([(hexagonPoints[9][0] + hexagonPoints[11][0])/2, (hexagonPoints[9][1] + hexagonPoints[11][1])/2 ]);
            points.push(hexagonPoints[11]); // 300 Grad
            points.push([(hexagonPoints[11][0] + hexagonPoints[1][0])/2, (hexagonPoints[11][1] + hexagonPoints[1][1])/2 ]);
            points.push(hexagonPoints[1]);  // 60 Grad
            points.push([(hexagonPoints[1][0] + hexagonPoints[3][0])/2, (hexagonPoints[1][1] + hexagonPoints[3][1])/2 ]);
        } else if (segment === 'second') {
            // Segment von 60 bis 180 Grad
            points.push([(hexagonPoints[1][0] + hexagonPoints[3][0])/2, (hexagonPoints[1][1] + hexagonPoints[3][1])/2 ]);
            points.push(hexagonPoints[3]); 
            points.push([(hexagonPoints[3][0] + hexagonPoints[5][0])/2, (hexagonPoints[3][1] + hexagonPoints[5][1])/2 ]);
            points.push(hexagonPoints[5]); 
            points.push([(hexagonPoints[5][0] + hexagonPoints[7][0])/2, (hexagonPoints[5][1] + hexagonPoints[7][1])/2 ]);
              // 180 Grad
        } else if (segment === 'third') {
            // Segment von 180 bis 300 Grad
            points.push([(hexagonPoints[5][0] + hexagonPoints[7][0])/2, (hexagonPoints[5][1] + hexagonPoints[7][1])/2 ]);
            points.push(hexagonPoints[7]);
            points.push([(hexagonPoints[7][0] + hexagonPoints[9][0])/2, (hexagonPoints[7][1] + hexagonPoints[9][1])/2 ]);
            points.push(hexagonPoints[9]);  // 240 Grad
            points.push([(hexagonPoints[9][0] + hexagonPoints[11][0])/2, (hexagonPoints[9][1] + hexagonPoints[11][1])/2]);
        }

        // Rückgabe als String, um sie als Polygonpunkte zu verwenden
        return points.map(point => point.join(',')).join(' ');
    }
    // Funktion zur Berechnung der vollständigen Hexagon-Punkte
    function calculateFullHexagonPoints(x, y, radius) {
        const angle = Math.PI / 3; // 60 Grad für jedes Segment
        const points = [];

        // Berechne die sechs Ecken des Hexagons
        for (let i = 0; i < 6; i++) {
            const x_i = x + radius * Math.cos(angle * i);
            const y_i = y + radius * Math.sin(angle * i);
            points.push(`${x_i},${y_i}`);
        }

        return points.join(" "); // Die Punkte zu einem String verbinden
    }

    // Zeichne jede Seite eines Hexagons als separate Linie
    svg.append("g")
    .attr("class", "hexagons-outer")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "hexagon-outer")
    .each(function (d) {
        drawOuterHexagon(d, this);
        colorHexagonSides(d, getNodeNeighbours(d, nodes), this)   
    });
    /*/ Zeichne die äußeren Hexagone (Umrandungen)
    svg.append("g")
        .attr("class", "hexagons-outer")
        .selectAll("polygon")
        .data(nodes)
        .enter().append("polygon")
        .attr("class", "hexagon-outer")
        .attr("points", d => calculateFullHexagonPoints(d.x, d.y, outerHexRadius)) // Äußere Hexagone
        .style("fill", "none") // Keine Füllung
        .style("stroke", d => getColorByBL(d.properties.BL)) // Färbung basierend auf dem Bundesland
        .style("stroke-width", 2) // Umrandung etwas dicker
        .attr("transform", d => `rotate(30, ${d.x}, ${d.y})`); // Rotation um 30 Grad
    */
    // Zeichne das erste Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-first")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-first")
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'first')) // Erstes Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        d3.select(`#label-${d.id}`).style("visibility", "visible"); // Label sichtbar machen
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        d3.select(`#label-${d.id}`).style("visibility", "hidden"); // Label verstecken
    })
    .on("click", function(event, d) {
        // Hole die Werte für das erste Datum aus den Dropdown-Daten
        const date1 = d3.select("#date1Selection").property("value");
        const date2 = d3.select("#date2Selection").property("value");
        const date3 = d3.select("#date3Selection").property("value");
        const value1 = getValueForHexagon(d.id, date1, multivariateData);
        const value2 = getValueForHexagon(d.id, date2, multivariateData);
        const value3 = getValueForHexagon(d.id, date3, multivariateData);

        // Zeige die Informationen im Info-Bereich an
        d3.select("#info-content-box").html(`
            <p><strong>Region:</strong> ${d.properties.GEN}</p>
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>${date1} Wert:</strong> ${value1}</p>
            <p><strong>${date2} Wert:</strong> ${value2}</p>
            <p><strong>${date3} Wert:</strong> ${value3}</p>
        `);

        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3, multivariateData);
    });

    // Zeichne das zweite Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-second")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-second")
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'second')) // Zweites Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        d3.select(`#label-${d.id}`).style("visibility", "visible"); // Label sichtbar machen
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        d3.select(`#label-${d.id}`).style("visibility", "hidden"); // Label verstecken
    })
    .on("click", function(event, d) {
        // Hole die Werte für das erste Datum aus den Dropdown-Daten
        const date1 = d3.select("#date1Selection").property("value");
        const date2 = d3.select("#date2Selection").property("value");
        const date3 = d3.select("#date3Selection").property("value");
        const value1 = getValueForHexagon(d.id, date1, multivariateData);
        const value2 = getValueForHexagon(d.id, date2, multivariateData);
        const value3 = getValueForHexagon(d.id, date3, multivariateData);

        // Zeige die Informationen im Info-Bereich an
        d3.select("#info-content-box").html(`
            <p><strong>Region:</strong> ${d.properties.GEN}</p>
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>${date1} Wert:</strong> ${value1}</p>
            <p><strong>${date2} Wert:</strong> ${value2}</p>
            <p><strong>${date3} Wert:</strong> ${value3}</p>
        `);

        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3, multivariateData);
    });
    // Zeichne das dritte Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-third")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-third")
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'third')) // Drittes Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        d3.select(`#label-${d.id}`).style("visibility", "visible"); // Label sichtbar machen
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        d3.select(`#label-${d.id}`).style("visibility", "hidden"); // Label verstecken
    })
    .on("click", function(event, d) {
        // Hole die Werte für das erste Datum aus den Dropdown-Daten
        const date1 = d3.select("#date1Selection").property("value");
        const date2 = d3.select("#date2Selection").property("value");
        const date3 = d3.select("#date3Selection").property("value");
        const value1 = getValueForHexagon(d.id, date1, multivariateData);
        const value2 = getValueForHexagon(d.id, date2, multivariateData);
        const value3 = getValueForHexagon(d.id, date3, multivariateData);

        // Zeige die Informationen im Info-Bereich an
        d3.select("#info-content-box").html(`
            <p><strong>Region:</strong> ${d.properties.GEN}</p>
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>${date1} Wert:</strong> ${value1}</p>
            <p><strong>${date2} Wert:</strong> ${value2}</p>
            <p><strong>${date3} Wert:</strong> ${value3}</p>
        `);

        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3, multivariateData);
    });

    // Füge die unsichtbaren Labels hinzu
    svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("id", d => `label-${d.id}`)
        .attr("x", d => d.x + hexRadius + 2)
        .attr("y", d => d.y + 3) // Leichte Vertikale Verschiebung zur Zentrierung
        .text(d => d.properties.GEN)
        .style("font-size", "10px")
        .style("fill", "black")
        .style("visibility", "hidden"); // Standardmäßig verstecken
    
}

// Funktion, um den Wert eines Hexagons (ID) für ein bestimmtes Datum zu holen
function getValueForHexagon(id, date, multivariateData) {
    const dateData = multivariateData[date]; // Hole die Daten für das ausgewählte Datum
    const hexData = dateData.find(d => d.id === id); // Finde das Hexagon mit der passenden ID
    return hexData ? hexData.value : 'Keine Daten'; // Gib den Wert zurück, oder "Keine Daten", falls nicht gefunden
}

// Funktion zur Aktualisierung der Hexagon-Farben basierend auf den ausgewählten Tagesdaten
function updateHexagonColors(date1, date2, date3, multivariateData, landkreisData) {
    const date1Data = multivariateData[date1]; // Daten für Datum 1
    const date2Data = multivariateData[date2]; // Daten für Datum 2
    const date3Data = multivariateData[date3]; // Daten für Datum 3
    const valueByIdDate1 = {};
    const valueByIdDate2 = {};
    const valueByIdDate3 = {};

    // Mappe die Werte nach den IDs der Hexagone
    date1Data.forEach(d => {
        valueByIdDate1[d.id] = d.value; // Beispiel: ID 1 hat den Wert 527 für Datum 1
    });

    date2Data.forEach(d => {
        valueByIdDate2[d.id] = d.value; // Beispiel: ID 1 hat den Wert 300 für Datum 2
    });

    date3Data.forEach(d => {
        valueByIdDate3[d.id] = d.value; // Beispiel: ID 1 hat den Wert 400 für Datum 3
    });

    // Erstelle eine Farbskala für die Hexagone (Weiß bis Blau)
    const colorScale = d3.scaleLinear()
        .domain([0, 1000]) // Wertebereich
        .range(["white", "blue"]); // Farbverlauf von Weiß bis Blau

    // Aktualisiere das erste Segment der Hexagon-Füllfarben basierend auf den Daten von Datum 1
    d3.selectAll(".hexagon-first")
        .transition().duration(500)
        .style("fill", d => {
            const value = valueByIdDate1[d.id] || 0; // Hol den Wert für die aktuelle ID (Fallback auf 0)
            return colorScale(value); // Nutze die Farbskala für den Farbverlauf
        });

    // Aktualisiere das zweite Segment der Hexagon-Füllfarben basierend auf den Daten von Datum 2
    d3.selectAll(".hexagon-second")
        .transition().duration(500)
        .style("fill", d => {
            const value = valueByIdDate2[d.id] || 0; // Hol den Wert für die aktuelle ID (Fallback auf 0)
            return colorScale(value); // Nutze die Farbskala für den Farbverlauf
        });

    // Aktualisiere das dritte Segment der Hexagon-Füllfarben basierend auf den Daten von Datum 3
    d3.selectAll(".hexagon-third")
        .transition().duration(500)
        .style("fill", d => {
            const value = valueByIdDate3[d.id] || 0; // Hol den Wert für die aktuelle ID (Fallback auf 0)
            return colorScale(value); // Nutze die Farbskala für den Farbverlauf
        });
}

// Funktion zur Rückgabe der Farbe basierend auf dem Bundesland
function getColorByBL(bl) {
    switch (bl) {
        case "B": return "red";
        case "HB": return "blue";
        case "HH": return "green";
        case "NI": return "orange";
        case "ST": return "purple";
        case "SH": return "yellow";
        case "NW": return "pink";
        case "MV": return "brown";
        case "SL": return "cyan";
        case "TH": return "magenta";
        case "BY": return "lime";
        case "BW": return "gold";
        case "SN": return "coral";
        case "RP": return "teal";
        case "BB": return "navy";
        case "HE": return "lightblue";
        default: return "gray"; // Standardfarbe, falls kein BL passt
    }
}

// Funktion, um ein einzelnes Hexagon mit drei markierten Segmenten zu rendern
function renderSingleHexagon(svgId, segment) {
    const svg = d3.select(`#${svgId}`);
    const width = 30;
    const height = 30;
    const hexRadius = 14;
    
    const hexagonPoints = [];
    const x = width / 2;
    const y = height / 2;
    
    // Berechne die 12 Punkte für das Hexagon
    for (let i = 0; i < 12; i++) {
        const angle = 2 * Math.PI / 12 * i;
        const x_i = x + hexRadius * Math.cos(angle);
        const y_i = y + hexRadius * Math.sin(angle);
        hexagonPoints.push([x_i, y_i]);
    }

    // Zeichne alle drei Segmente, aber fülle nur das übergebene
    const segments = ['first', 'second', 'third'];

    segments.forEach((seg, index) => {
        let points = [];
        points.push([x, y]); // Mittelpunkt des Hexagons

        if (seg === 'first') {
            // Segment von 300 bis 60 Grad
            points.push([(hexagonPoints[9][0] + hexagonPoints[11][0]) / 2, (hexagonPoints[9][1] + hexagonPoints[11][1]) / 2]);
            points.push(hexagonPoints[11]); // 300 Grad
            points.push([(hexagonPoints[11][0] + hexagonPoints[1][0]) / 2, (hexagonPoints[11][1] + hexagonPoints[1][1]) / 2]);
            points.push(hexagonPoints[1]); // 60 Grad
            points.push([(hexagonPoints[1][0] + hexagonPoints[3][0]) / 2, (hexagonPoints[1][1] + hexagonPoints[3][1]) / 2]);
        } else if (seg === 'second') {
            // Segment von 60 bis 180 Grad
            points.push([(hexagonPoints[1][0] + hexagonPoints[3][0]) / 2, (hexagonPoints[1][1] + hexagonPoints[3][1]) / 2]);
            points.push(hexagonPoints[3]);
            points.push([(hexagonPoints[3][0] + hexagonPoints[5][0]) / 2, (hexagonPoints[3][1] + hexagonPoints[5][1]) / 2]);
            points.push(hexagonPoints[5]);
            points.push([(hexagonPoints[5][0] + hexagonPoints[7][0]) / 2, (hexagonPoints[5][1] + hexagonPoints[7][1]) / 2]);
        } else if (seg === 'third') {
            // Segment von 180 bis 300 Grad
            points.push([(hexagonPoints[5][0] + hexagonPoints[7][0]) / 2, (hexagonPoints[5][1] + hexagonPoints[7][1]) / 2]);
            points.push(hexagonPoints[7]);
            points.push([(hexagonPoints[7][0] + hexagonPoints[9][0]) / 2, (hexagonPoints[7][1] + hexagonPoints[9][1]) / 2]);
            points.push(hexagonPoints[9]); // 240 Grad
            points.push([(hexagonPoints[9][0] + hexagonPoints[11][0]) / 2, (hexagonPoints[9][1] + hexagonPoints[11][1]) / 2]);
        }

        // Zeichne das Segment
        svg.append("polygon")
            .attr("points", points.map(point => point.join(",")).join(" "))
            .style("fill", seg === segment ? "lightgray" : "none")
            .style("stroke", "black");
    });
}

function colorHexagonSides(node, neighbours, dom) {
    const hexGroup = d3.select(dom);
    // Definiere die relativen Positionen der sechs Nachbarn udn der Seiten
    neighbours.forEach((nb, iteration) => {
        if(nb === "NoNeighbour")
        {
            side = getSideByIndex(iteration)
            hexGroup.select(`.side-${side}`)
                    .style("stroke", getColorByBL(node.properties.BL));
        }
        else if(nb.properties.BL != node.properties.BL)
            {
                //side = getSideByOffset(node.Hex_x-nb.Hex_x, node.Hex_y-nb.Hex_y)
                side = getSideByOffset(nb.Hex_x-node.Hex_x, nb.Hex_y-node.Hex_y)
                hexGroup.select(`.side-${side}`)
                    .style("stroke", getColorByBL(node.properties.BL)); // Verwende die Farbe für die entsprechende Seite
            }
        
    });
}

// Funktion zur Abfrage des Seitenindex 's' basierend auf dx und dy
function getSideByOffset(dx, dy) {
    // Suche in der neighbourOffsets-Liste nach dem passenden Eintrag
    const neighbourOffsets = [
        { dx: -2, dy: 0, s: 3 },   // Linker Nachbar
        { dx: 2, dy: 0, s: 0 },    // Rechter Nachbar
        { dx: -1, dy: -1, s: 4},   // Oben links
        { dx: -1, dy: 1, s: 2 },   // Unten links
        { dx: 1, dy: -1, s: 5 },   // Oben rechts
        { dx: 1, dy: 1, s: 1 }     // Unten rechts
    ];
    const match = neighbourOffsets.find(offset => offset.dx === dx && offset.dy === dy);
    
    // Wenn ein Eintrag gefunden wurde, gib 's' zurück, ansonsten null (falls kein Match)
    return match ? match.s : null;
}

function getSideByIndex(side) {
    // Suche in der neighbourOffsets-Liste nach dem passenden Eintrag
    const neighbourOffsets = [
        { dx: -2, dy: 0, s: 3 },   // Linker Nachbar
        { dx: 2, dy: 0, s: 0 },    // Rechter Nachbar
        { dx: -1, dy: -1, s: 4},   // Oben links
        { dx: -1, dy: 1, s: 2 },   // Unten links
        { dx: 1, dy: -1, s: 5 },   // Oben rechts
        { dx: 1, dy: 1, s: 1 }     // Unten rechts
    ];
    return neighbourOffsets[side].s;
}


// Funktion zur Ermittlung der Nachbarn eines Hexagons
function getNodeNeighbours(node, nodes) {
    neighbours = []
    // Definiere die relativen Positionen der sechs Nachbarn
    const neighbourOffsets = [
        { dx: -2, dy: 0},   // Linker Nachbar
        { dx: 2, dy: 0},    // Rechter Nachbar
        { dx: -1, dy: -1},   // Oben links
        { dx: -1, dy: 1},   // Unten links
        { dx: 1, dy: -1},   // Oben rechts
        { dx: 1, dy: 1}     // Unten rechts
    ];
    
    // Nachbarn anhand der Offsets suchen
    neighbourOffsets.forEach(nO => {
        neighbourFound = false
        dx = nO.dx
        dy = nO.dy
        node_neighbour_x = node.Hex_x + dx
        node_neighbour_y = node.Hex_y + dy
        nodes.forEach(n => {
            if(n.Hex_x === node_neighbour_x && n.Hex_y === node_neighbour_y)
                {
                    neighbours.push(n);
                    neighbourFound = true
                }
        });
        if(neighbourFound == false)
        {
            neighbours.push("NoNeighbour")
        }
    });
    return neighbours;
}

function calculateHexagonPoints(x, y, radius) {
    const angleOffset = Math.PI / 6; // 30 Grad Offset für pointy-top
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (2 * Math.PI / 6) * i - angleOffset;
        const x_i = x + radius * Math.cos(angle);
        const y_i = y + radius * Math.sin(angle);
        points.push([x_i, y_i]);
    }
    return points;
}

function drawOuterHexagon(d, hexgroupelement) {
    const points = calculateHexagonPoints(d.x, d.y, outerHexRadius);
    const hexGroup = d3.select(hexgroupelement);

    for (let i = 0; i < 6; i++) {
        const start = points[i];
        const end = points[(i + 1) % 6];
        hexGroup.append("line")
            .attr("x1", start[0])
            .attr("y1", start[1])
            .attr("x2", end[0])
            .attr("y2", end[1])
            .style("stroke", "none") // Standardfarbe für alle Seiten
            .style("stroke-width", 2)
            .attr("class", `side-${i}`);
    }
}