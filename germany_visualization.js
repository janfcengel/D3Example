// Erstelle eine Farbskala für die Hexagone (Weiß bis Blau)
let colorScale = d3.scaleLinear()
    .domain([0, 1000]) // Wertebereich
    .range(["white", "blue"]); // Farbverlauf von Weiß bis Blau

const SHOW_BAR_CHART = false;

let chartContainerHeight = 0;
let dataFiles = [];

let hexRadius = 14; // Größe des Hexagons (Standardwert)
let outerHexRadius = 16; // Größe für die äußere Umrandung (Standardwert)
let xScale, yScale; 
let nodes;
let scaleFactor;
let date1, date2, date3

let selectedHexagonId = null; 

function getQuestionNumberFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('questionNumber'); // Gibt z. B. "1", "2" oder "3" zurück
}

const questionNumber = getQuestionNumberFromUrl(); // z. B. "2"

// Du definierst hier die Pfade je nach Task
const dataConfig = {
    "1": [
        "rki_data/rki_custom_2020-01-27_qN1.json",
        "rki_data/rki_custom_2020-04-27_qN1.json",
        "rki_data/rki_custom_2020-07-27_qN1.json"
    ],
    "2": [
        "rki_data/rki_custom_2024-07-09_qN2.json",
        "rki_data/rki_custom_2024-07-16_qN2.json",
        "rki_data/rki_custom_2024-07-23_qN2.json"
    ],
    "3": [
        "rki_data/rki_custom_2023-12-07_qN3.json",
        "rki_data/rki_custom_2023-12-14_qN3.json",
        "rki_data/rki_custom_2023-12-21_qN3.json"
    ]
};

// Fallback für ungültige oder fehlende Task-Parameter
const selectedFiles = dataConfig[questionNumber] || dataConfig["1"];


Promise.all([
    d3.json('landkreis_data.json'),
    d3.json(selectedFiles[0]),
    d3.json(selectedFiles[1]),
    d3.json(selectedFiles[2])
]).then(([landkreisData, rki_data_1, rki_data_2, rki_data_3]) => {
// Lade beide JSON-Dateien (Landkreisdaten und multivariate Daten)
/*Promise.all([
    d3.json('landkreis_data.json'), // Landkreisdaten (Koordinaten und IDs)
    //d3.json('multivariate_test_data2.json'), // Multivariate Daten (Werte für verschiedene Tage)
    //d3.json('2023-12-07_rki_data.json'),
    //d3.json('2023-12-14_rki_data.json'),
    d3.json('rki_data/rki_custom_2023-12-07.json'),
    d3.json('rki_data/rki_custom_2023-12-14.json'),
    d3.json('rki_data/rki_custom_2023-12-21.json')
    //d3.json('2023-12-21_rki_data.json')
]).then(([landkreisData, rki231207, rki231214, rki231221]) => {*/
    // Extrahiere die Tage als Schlüssel aus den multivariaten Daten

    dataFiles = [rki_data_1, rki_data_2, rki_data_3];
    dates = []
    dataFiles.forEach(dataFile => {
        dates.push(dataFile.results[1].day) // Hole aus Eintrag "1" den Key für den Tag
        dataFile.results = dataFile.results.filter(entry => entry.name !== "00000");
    });

    const elementDate1 = d3.select("#date1");
    const elementDate2 = d3.select("#date2");
    const elementDate3 = d3.select("#date3");
    elementDate1.text(formatDate(dates[0]))
    elementDate2.text(formatDate(dates[1]))
    elementDate3.text(formatDate(dates[2]))
    date1 = dates[0]
    date2 = dates[1]
    date3 = dates[2]

    // Initialisiere die Karte mit den Landkreisdaten
    chartContainerHeight = document.getElementById("chart-container").clientHeight;
    createNodeList(landkreisData)
    hexMapContainer = document.getElementById("leftContainer");
    scaleFactor = getScaleFactor(nodes, hexMapContainer.clientWidth, hexMapContainer.clientHeight);
    nodes.forEach(node => {
        node.x *= scaleFactor;
        node.y *= scaleFactor;
    });
    hexRadius *= scaleFactor;
    outerHexRadius *= scaleFactor;
    initializeHexagonMap();

    // Hexagone neben den Dropdowns anzeigen
    renderSingleHexagon('hex-date1', 'first');
    renderSingleHexagon('hex-date2', 'second');
    renderSingleHexagon('hex-date3', 'third');

    //Event Listener für Größenveränderung
    window.addEventListener("resize", () => {
        newWidth = container.clientWidth;
        newHeight = container.clientHeight;
        newScaleFactor = getScaleFactor(nodes, newWidth, newHeight);
    
        nodes.forEach(node => {
            node.x *= newScaleFactor;
            node.y *= newScaleFactor;
        });
    
        hexRadius *= newScaleFactor;
        outerHexRadius *= newScaleFactor;
    
        d3.select("#leftContainer svg").selectAll("*").remove();
        initializeHexagonMap();
        updateAll(date1, date2, date3);
    })
    updateAll(date1, date2, date3);
});

function updateAll(date1, date2, date3) {
    // Die Funktionen, die die Daten aktualisieren
    updateLegend(date1, date2, date3, dataFiles);
    updateHexagonColors(date1, date2, date3);
}

function getScaleFactor(landkreisData, containerWidth, containerHeight) {
    // Bestimme den min/max-Wert der X- und Y-Koordinaten in den Nodes
    const xExtent = d3.extent(nodes, d => d.x);
    const yExtent = d3.extent(nodes, d => d.y);

    // Berechne die Breite und Höhe der Datenverteilung (Spannweite)
    const dataWidth = xExtent[1] - xExtent[0];
    const dataHeight = yExtent[1] - yExtent[0];

    // Berechne den Skalierungsfaktor für beide Achsen
    const scaleX = containerWidth / dataWidth;
    const scaleY = containerHeight / dataHeight;
    // Verwende den kleineren der beiden Faktoren, um Verzerrungen zu vermeiden
    return Math.min(scaleX, scaleY) * 0.9; // 90% des Containers nutzen, damit Abstand bleibt
}


function getDataFileByDate(date) {
    dataFile = null
    dataFiles.forEach(dF => {
        if (date === dF.results[1].day)
            {
                dataFile = dF;
            } 
    });
    return dataFile;
}

// Funktion zum Erstellen eines Balkendiagramms für das ausgewählte Hexagon
function updateBarChartForHexagon(hexagonId, date1, date2, date3) {

    if(!SHOW_BAR_CHART)
    {
        return; 
    }
    // Versuche, die Daten für das Hexagon basierend auf den Datenpunkten zu finden
    const date1Data = getDataFileByDate(date1) ? getDataFileByDate(date1).results.find(d => d.name === hexagonId) : null;
    const date2Data = getDataFileByDate(date2) ? getDataFileByDate(date2).results.find(d => d.name === hexagonId) : null;
    const date3Data = getDataFileByDate(date3) ? getDataFileByDate(date3).results.find(d => d.name === hexagonId) : null;
    //const date3Data = multivariateData[date3] ? multivariateData[date3].find(d => d.id === hexagonId) : null;

    // Wenn es keine Daten gibt, setze Standardwerte
    const chartData = [
        { date: date1, value: date1Data ? date1Data.compartments.MildInfections : 0 }, // Wert für Datum 1
        { date: date2, value: date2Data ? date2Data.compartments.MildInfections : 0 }, // Wert für Datum 2
        { date: date3, value: date3Data ? date3Data.compartments.MildInfections : 0 }  // Wert für Datum 3
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
        .domain(chartData.map(d => formatDate(d.date)))
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

    // Balken hinzufügen und die Breite begrenzen
    svg.selectAll(".bar")
        .data(chartData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(formatDate(d.date)))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => colorScale(d.value)) // Farbe basierend auf der Farbskala
        .attr("stroke", "black")  // **Schwarze Umrandung**
        .attr("stroke-width", 1); // **Dicke der Umrandung**
}

function updateInfoBox(d, dates, values) {
    const params = new URLSearchParams(window.location.search);
    const randQ = params.get("randQ");
        // Zeige die Informationen im Info-Bereich an
        d3.select("#info-content-box").html(`
            <p><strong>Region:</strong> ${d.properties.GEN}</p>
            <p><strong>Bundesland:</strong> ${getBundeslandName(d)}</p>
        `);
}

// Funktion zur Anzeige der vertikalen Legende in der neuen Box (Grüne Box)
function updateLegend(date1, date2, date3) {
    const { minValue: min1, maxValue: max1 } = getMinMaxValues(date1);
    const { minValue: min2, maxValue: max2 } = getMinMaxValues(date2);
    const { minValue: min3, maxValue: max3 } = getMinMaxValues(date3);

    // Finde den kleineren Min-Wert und den größeren Max-Wert
    const overallMinValue = Math.min(min1, min2, min3);
    const overallMaxValue = Math.max(max1, max2, max3);

    colorScale = d3.scaleLinear()
        .domain([overallMinValue, overallMaxValue]) // Wertebereich
        .range(["white", "blue"]);

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
      .text(`${Math.round(overallMaxValue)}`);

    // Min-Wert (unten) anzeigen
    legendSvg.append("text")
      .attr("x", 40)
      .attr("y", svgHeight - 20)
      .attr("text-anchor", "start")
      .text(`${Math.round(overallMinValue)}`);
}

// Funktion zur Berechnung der Min- und Max-Werte eines bestimmten Datums
function getMinMaxValues(date) {
    const dateData = getDataFileByDate(date);
    const values = dateData.results.map(d => d.compartments.MildInfections);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return { minValue, maxValue };
}

function createNodeList(landkreisData) {
    // Skaliere die Positionen basierend auf den geographischen Koordinaten
    const xExtent = d3.extent(landkreisData.features, d => d.geometry.coordinates[0]);
    const yExtent = d3.extent(landkreisData.features, d => d.geometry.coordinates[1]);

    xScale = d3.scaleLinear().domain(xExtent).range([50, 750]);
    yScale = d3.scaleLinear().domain(yExtent).range([750, 50]); // Spiegelung der Y-Achse

    // Aktualisiere die Positionen der Hexagone basierend auf den geographischen Daten
    nodes = landkreisData.features.map((d, i) => ({
        id: d.properties.RS, // Verwende die ID aus den Landkreisdaten
        x: xScale(d.geometry.coordinates[0]),
        y: yScale(d.geometry.coordinates[1]),
        properties: d.properties
    }));

    
    // Sortiere die Liste `nodes` zunächst nach den X-Koordinaten
    nodes.sort((a, b) => a.x - b.x);

    // Weises jedem eindeutigen X-Wert einen aufsteigenden `Hex_x`-Wert zu
    let currentHexX = 1;
    let previousX = Math.round(nodes[0].x*10)/10;

    nodes.forEach((node) => {
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

    nodes.forEach((node) => {
        if (Math.round(node.y*10)/10 !== previousY) {
            currentHexY++;  // Erhöhe `Hex_y` nur bei einem neuen Y-Wert
            previousY = Math.round(node.y*10)/10;
        }
        node.Hex_y = currentHexY;
    });
}

function highlightSelectedHexagon(selectedId) {
    // Entferne vorherige Hervorhebung
    d3.selectAll(".hexagon-selected").classed("hexagon-selected", false)
        .style("stroke", "black") // Standardfarbe zurücksetzen
        .style("stroke-width", 1); // Standard-Stärke zurücksetzen

    // Falls ein Hexagon ausgewählt wurde, markiere es rot
    if (selectedId !== null) {
        d3.selectAll(`[data-id='${selectedId}']`)
            .classed("hexagon-selected", true)
            .style("stroke", "red")
            .style("stroke-width", 1);
    }
}


// Funktion zur Initialisierung der Hexagon-Karte
function initializeHexagonMap() {
    const svg = d3.select("#leftContainer svg");

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

    // Tooltip erstellen
    tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("padding", "5px")
        .style("border", "1px solid black")
        .style("border-radius", "5px")
        .style("visibility", "hidden"); // Standardmäßig unsichtbar

    // Zeichne das erste Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-first")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-first")
    .attr("data-id", d => d.id)  
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'first')) // Erstes Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        tooltip.style("visibility", "hidden"); // Tooltip verstecken
    })
    .on("click", function(event, d) {
        const value1 = getValueForHexagon(d.id, date1, getDataFileByDate(date1));
        const value2 = getValueForHexagon(d.id, date2, getDataFileByDate(date2));
        const value3 = getValueForHexagon(d.id, date3, getDataFileByDate(date3));
        
        selectedHexagonId = d.id;
        highlightSelectedHexagon(selectedHexagonId);
        //Update InfoBox 
        updateInfoBox(d, [date1, date2, date3], [value1, value2, value3]);
        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3);
    });

    // Zeichne das zweite Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-second")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-second")
    .attr("data-id", d => d.id)  
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'second')) // Zweites Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        tooltip.style("visibility", "hidden"); // Tooltip verstecken
    })
    .on("click", function(event, d) {

        const value1 = getValueForHexagon(d.id, date1, getDataFileByDate(date1));
        const value2 = getValueForHexagon(d.id, date2, getDataFileByDate(date2));
        const value3 = getValueForHexagon(d.id, date3, getDataFileByDate(date3));

        selectedHexagonId = d.id;
        highlightSelectedHexagon(selectedHexagonId);
        //Update InfoBox 
        updateInfoBox(d, [date1, date2, date3], [value1, value2, value3]);
        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3);
    });
    // Zeichne das dritte Drittel der Hexagone
    svg.append("g")
    .attr("class", "hexagons-third")
    .selectAll("polygon")
    .data(nodes)
    .enter().append("polygon")
    .attr("class", "hexagon-third")
    .attr("data-id", d => d.id)  
    .attr("points", d => calculateThreeSegmentHexagonPoints(d.x, d.y, hexRadius, 'third')) // Drittes Drittel
    .style("fill", "lightgray")
    .style("stroke", "black")
    //.attr("transform", d => `rotate(30, ${d.x}, ${d.y})`)
    .on("mouseover", function(event, d) {
        // Hexagon hervorheben und Label sichtbar machen
        d3.select(this).style("stroke-width", 2).style("cursor", "pointer");
        tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function(event, d) {
        // Hexagon zurücksetzen und Label verstecken
        d3.select(this).style("stroke-width", 1);
        tooltip.style("visibility", "hidden"); // Tooltip verstecken
    })
    .on("click", function(event, d) {

        const value1 = getValueForHexagon(d.id, date1, getDataFileByDate(date1));
        const value2 = getValueForHexagon(d.id, date2, getDataFileByDate(date2));
        const value3 = getValueForHexagon(d.id, date3, getDataFileByDate(date3));

        selectedHexagonId = d.id;
        highlightSelectedHexagon(selectedHexagonId);
        //Update InfoBox 
        updateInfoBox(d, [date1, date2, date3], [value1, value2, value3]);
        // Aktualisiere das Balkendiagramm basierend auf dem ersten Datum
        updateBarChartForHexagon(d.id, date1, date2, date3);
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

// Funktion, um den Wert eines Hexagons (ID) für ein bestimmtes Datum zu holen
function getValueForHexagon(id, date, dateData) {
    const hexData = dateData.results.find(d => d.name === id); // Finde das Hexagon mit der passenden ID
    return hexData ? hexData.compartments.MildInfections : 'Keine Daten'; // Gib den Wert zurück, oder "Keine Daten", falls nicht gefunden
}

// Funktion zur Aktualisierung der Hexagon-Farben basierend auf den ausgewählten Tagesdaten
function updateHexagonColors(date1, date2, date3) {
    const date1Data = getDataFileByDate(date1); // Daten für Datum 1
    const date2Data = getDataFileByDate(date2); // Daten für Datum 2
    const date3Data = getDataFileByDate(date3); // Daten für Datum 3
    const valueByIdDate1 = {};
    const valueByIdDate2 = {};
    const valueByIdDate3 = {};

    // Mappe die Werte nach den IDs der Hexagone
    date1Data.results.forEach(d => {
        valueByIdDate1[d.name] = d.compartments.MildInfections; // Beispiel: ID 1 hat den Wert 527 für Datum 1
    });

    date2Data.results.forEach(d => {
        valueByIdDate2[d.name] = d.compartments.MildInfections; // Beispiel: ID 1 hat den Wert 300 für Datum 2
    });

    date3Data.results.forEach(d => {
        valueByIdDate3[d.name] = d.compartments.MildInfections; // Beispiel: ID 1 hat den Wert 400 für Datum 3
    });

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
            .style("fill", seg === segment ? "blue" : "white")
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
                    //.style("stroke", getColorByBL(node.properties.BL));
                    .style("stroke", "black");
        }
        else if(nb.properties.BL != node.properties.BL)
            {
                //side = getSideByOffset(node.Hex_x-nb.Hex_x, node.Hex_y-nb.Hex_y)
                side = getSideByOffset(nb.Hex_x-node.Hex_x, nb.Hex_y-node.Hex_y)
                hexGroup.select(`.side-${side}`)
                    //.style("stroke", getColorByBL(node.properties.BL)); // Verwende die Farbe für die entsprechende Seite
                    .style("stroke", "black");
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

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-");
    return `${day}.${month}.${year}`;
}
function getBundeslandName(d) {
    const bundeslandMap = {
        "01": "Schleswig-Holstein",
        "02": "Hamburg",
        "03": "Niedersachsen",
        "04": "Bremen",
        "05": "Nordrhein-Westfalen",
        "06": "Hessen",
        "07": "Rheinland-Pfalz",
        "08": "Baden-Württemberg",
        "09": "Bayern",
        "10": "Saarland",
        "11": "Berlin",
        "12": "Brandenburg",
        "13": "Mecklenburg-Vorpommern",
        "14": "Sachsen",
        "15": "Sachsen-Anhalt",
        "16": "Thüringen"
    };

    const rs = d.properties?.RS || d.RS || d.name || ""; // Fallback für verschiedene Formate
    const key = rs.toString().substring(0, 2); // Extrahiere die ersten zwei Ziffern

    return bundeslandMap[key] || "Unbekanntes Bundesland";
}