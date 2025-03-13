// Erstelle eine Farbskala für die Layer (z.B. von weiß bis blau)
colorScale = d3.scaleLinear()
    .domain([0, 1000])  // Anpassen je nach Wertebereich
    .range(["white", "blue"]);

const SHOW_BAR_CHART = false; 

let barChartInital = 0
let dataFiles = [];
let datesGlobal = [];
let date1, date2, date3

let selectedPolygonId = null; 
// Lade beide JSON-Dateien
Promise.all([
    d3.json('lk_germany_reduced.geojson'), // GeoJSON für die Karte
    d3.json('multivariate_test_data2.json'),  // Multivariate Testdaten
    d3.json('2023-12-07_rki_data.json'),
    d3.json('2023-12-14_rki_data.json'),
    d3.json('2023-12-21_rki_data.json')
]).then(([geoData, multivariateData, rki231207, rki231214, rki231221]) => {
//]).then(([geoData, multivariateData]) => {

    dataFiles = [rki231207, rki231214, rki231221];
    rkiDates = [];
    dataFiles.forEach(dataFile => {
        rkiDates.push(dataFile.results[1].day) // Hole aus Eintrag "1" den Key für den Tag
        dataFile.results = dataFile.results.filter(entry => entry.name !== "00000"); // Filter die Aufsummierung von Deutschland heraus
    });
    datesGlobal = rkiDates;
    
    const elementDate1 = d3.select("#date1");
    const elementDate2 = d3.select("#date2");
    const elementDate3 = d3.select("#date3");
    elementDate1.text(formatDate(datesGlobal[0]))
    elementDate2.text(formatDate(datesGlobal[1]))
    elementDate3.text(formatDate(datesGlobal[2]))
    date1 = datesGlobal[0]
    date2 = datesGlobal[1]
    date3 = datesGlobal[2]
    
    const mapContainer = document.getElementById('mockup2-leftContainer');
    const availableWidth = mapContainer.clientWidth;
    const availableHeight = mapContainer.clientHeight;

    barChartInital = document.getElementById("mockup2-chart-container").clientHeight;
    console.log(barChartInital)
    // Definiere die Margins
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = availableWidth - margin.left - margin.right;
    const height = availableHeight - margin.top - margin.bottom;

    // Erstelle das SVG und setze eine Transformationsgruppe mit Margin
    const svg = d3.select("#map")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Definiere die Zoom-Funktion
    const zoom = d3.zoom()
    .scaleExtent([1, 8])  // Begrenze den Zoomfaktor auf 1x bis 8x
    .on('zoom', zoomed);

    // Füge die Zoom-Funktion zum SVG hinzu
    svg.call(zoom);

    // Funktion, die das Zoom- und Pan-Verhalten steuert
    function zoomed(event) {
    svg.attr('transform', event.transform);  // Wende die Zoom-Transformation auf die gesamte SVG-Gruppe an
    }

    // Tooltip erstellen
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("padding", "5px")
        .style("border", "1px solid black")
        .style("border-radius", "5px")
        .style("visibility", "hidden"); // Standardmäßig unsichtbar

    // Erstelle eine Projektionsfunktion
    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(projection);

    // Füge Layer 1 hinzu (lightgray)
    const mapLayer1 = svg.append("g").attr("class", "layer1");
    mapLayer1.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("data-id", d => d.properties.id)
        .style("fill", "lightgray")
        .style("stroke", "black")
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        // Aktualisiere den mouseout-Handler für Layer 1, 2 und 3:
        .on("mouseout", function(event, d) {
            tooltip.style("visibility", "hidden"); // Tooltip verstecken
            resetPolygonColors.call(this, d); // Korrekt die Farbe auf Basis der Dropdowns wiederherstellen
        })
        .on("click", function(event, d) {
            const data = {
                data: d,
                date1: dataFiles[datesGlobal.findIndex(entry => entry === date1)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date2: dataFiles[datesGlobal.findIndex(entry => entry === date2)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date3: dataFiles[datesGlobal.findIndex(entry => entry === date3)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                selectedDate1: date1,
                selectedDate2: date2,
                selectedDate3: date3,
            };
            selectedPolygonId = d.properties.id;
            highlightSelectedPolygon(selectedPolygonId);
            updateInfoBox(data.data);
            updateBarChartForRegion(data);
        });

    // Füge Layer 2 hinzu (steelblue)
    const mapLayer2 = svg.append("g").attr("class", "layer2");
    mapLayer2.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("data-id", d => d.properties.id)
        .style("fill", "steelblue")
        .style("stroke", "black")
        .on("mouseover", function(event, d) {
            //d3.select(this).style("fill", "orange"); // Highlight beim Hover
            tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        // Aktualisiere den mouseout-Handler für Layer 1, 2 und 3:
        .on("mouseout", function(event, d) {
            tooltip.style("visibility", "hidden"); // Tooltip verstecken
            resetPolygonColors.call(this, d); // Korrekt die Farbe auf Basis der Dropdowns wiederherstellen
        })
        .on("click", function(event, d) {
            const data = {
                data: d,
                date1: dataFiles[datesGlobal.findIndex(entry => entry === date1)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date2: dataFiles[datesGlobal.findIndex(entry => entry === date2)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date3: dataFiles[datesGlobal.findIndex(entry => entry === date3)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                selectedDate1: date1,
                selectedDate2: date2,
                selectedDate3: date3,
            };
            selectedPolygonId = d.properties.id;
            highlightSelectedPolygon(selectedPolygonId);
            updateInfoBox(data.data);
            updateBarChartForRegion(data);
        });

    // Füge Layer 3 hinzu (lightgreen)
    const mapLayer3 = svg.append("g").attr("class", "layer3");
    mapLayer3.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("data-id", d => d.properties.id)
        .style("fill", "lightgreen")
        .style("stroke", "black")
        .on("mouseover", function(event, d) {
            //d3.select(this).style("fill", "orange"); // Highlight beim Hover
            tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        // Aktualisiere den mouseout-Handler für Layer 1, 2 und 3:
        .on("mouseout", function(event, d) {
            tooltip.style("visibility", "hidden"); // Tooltip verstecken
            resetPolygonColors.call(this, d); // Korrekt die Farbe auf Basis der Dropdowns wiederherstellen
        })
        .on("click", function(event, d) {
            const data = {
                data: d,
                date1: dataFiles[datesGlobal.findIndex(entry => entry === date1)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date2: dataFiles[datesGlobal.findIndex(entry => entry === date2)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                date3: dataFiles[datesGlobal.findIndex(entry => entry === date3)].results.find(x => x.name === d.properties.RS)?.compartments.MildInfections || 0,
                selectedDate1: date1,
                selectedDate2: date2,
                selectedDate3: date3,
            };
            selectedPolygonId = d.properties.id;
            highlightSelectedPolygon(selectedPolygonId);
            updateInfoBox(data.data);
            updateBarChartForRegion(data);

        });

    // Definiere die Clip-Pfade für drei Bereiche
    const clipPath1 = svg.append("clipPath").attr("id", "clipArea1");
    const clipPath2 = svg.append("clipPath").attr("id", "clipArea2");
    const clipPath3 = svg.append("clipPath").attr("id", "clipArea3");

    // Weise die Clip-Pfade den Layern zu
    mapLayer1.attr("clip-path", "url(#clipArea1)");
    mapLayer2.attr("clip-path", "url(#clipArea2)");
    mapLayer3.attr("clip-path", "url(#clipArea3)");

    // Füge die Trennlinien hinzu
    const line1 = svg.append("line").attr("stroke", "black").attr("stroke-width", 3).attr("vector-effect", "non-scaling-stroke");
    const line2 = svg.append("line").attr("stroke", "black").attr("stroke-width", 3).attr("vector-effect", "non-scaling-stroke");
    const line3 = svg.append("line").attr("stroke", "black").attr("stroke-width", 3).attr("vector-effect", "non-scaling-stroke");

    // Startpunkt für den interaktiven Punkt in der Mitte der Karte
    let centerX = width / 2;
    let centerY = height / 2;

    // Interaktiver Punkt, der die Trennlinien steuert
    const dragPoint = svg.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", 10)
        .attr("fill", "transparent")
        .attr("stroke", "red") // Roter Rand
        .attr("stroke-width", 3)  // Dicke des Randes
        .attr("vector-effect", "non-scaling-stroke")
        .style("cursor", "move")
        .call(d3.drag()
            .on("drag", function(event) {
                const newX = Math.max(0, Math.min(width, event.x));
                const newY = Math.max(0, Math.min(height, event.y));

                // Aktualisiere die Position des Punkts
                dragPoint.attr("cx", newX).attr("cy", newY);

                // Aktualisiere die Trennlinien und Kartenbereiche
                updateLinesAndAreas(newX, newY);
            })
        );

        const { minValue: min1, maxValue: max1 } = getMinMaxValues(date1);
        const { minValue: min2, maxValue: max2 } = getMinMaxValues(date2);
        const { minValue: min3, maxValue: max3 } = getMinMaxValues(date3);
    // Finde den kleineren Min-Wert und den größeren Max-Wert
        const overallMinValue = Math.min(min1, min2, min3);
        const overallMaxValue = Math.max(max1, max2, max3);

        colorScale = d3.scaleLinear()
            .domain([overallMinValue, overallMaxValue])  // Anpassen je nach Wertebereich
            .range(["white", "blue"]);

       updateAll(date1, date2, date3, overallMinValue, overallMaxValue);
       // Setze die Trennlinien und Bereiche initial
       updateLinesAndAreas(centerX, centerY);
       // Setze Legende initial
       //updateLegend(overallMinValue, overallMaxValue);
       
    function updateAll(date1, date2, date3, overallMinValue, overallMaxValue) {
        // Die Funktionen, die die Daten aktualisieren
        updateLegend(overallMinValue, overallMaxValue);
        updateLayerColors(date1, date2, date3);
    }   

    function highlightSelectedPolygon(selectedId) {
        // Entferne vorherige Hervorhebung
        d3.selectAll(".polygon-selected").classed("polygon-selected", false)
            .style("stroke", "black") // Standardfarbe zurücksetzen
            .style("stroke-width", 1); // Standard-Stärke zurücksetzen
    
        // Falls ein Hexagon ausgewählt wurde, markiere es rot
        if (selectedId !== null) {
            d3.selectAll(`[data-id='${selectedId}']`)
                .classed("polygon-selected", true)
                .style("stroke", "red")
                .style("stroke-width", 3);
        }
    }
    
    // Funktion zur Aktualisierung der Polygonfarben im mouseout-Event
    function resetPolygonColors(d) {
        // Daten für die Layer
        const datum1Data = dataFiles[datesGlobal.findIndex(entry => entry === date1)];
        const datum2Data = dataFiles[datesGlobal.findIndex(entry => entry === date2)];
        const datum3Data = dataFiles[datesGlobal.findIndex(entry => entry === date3)];

        // Überprüfe, zu welchem Layer das aktuelle Element gehört, und setze die Farbe basierend auf den ausgewählten Daten
        if (d3.select(this).classed('layer1')) {
            const value = datum1Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
            d3.select(this).style("fill", colorScale(value)); // Aktualisiere die Farbe für Layer 1
        } else if (d3.select(this).classed('layer2')) {
            const value = datum2Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
            d3.select(this).style("fill", colorScale(value)); // Aktualisiere die Farbe für Layer 2
        } else if (d3.select(this).classed('layer3')) {
            const value = datum3Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
            d3.select(this).style("fill", colorScale(value)); // Aktualisiere die Farbe für Layer 3
        }
    }

    function updateLayerColors(selectedDatum1, selectedDatum2, selectedDatum3) {
            // Daten für die einzelnen Layer basierend auf den Dropdown-Auswahlen extrahieren
            const datum1Data = dataFiles[datesGlobal.findIndex(entry => entry === selectedDatum1)]
            const datum2Data = dataFiles[datesGlobal.findIndex(entry => entry === selectedDatum2)]
            const datum3Data = dataFiles[datesGlobal.findIndex(entry => entry === selectedDatum3)]
        
            // Update Layer 1 basierend auf Datum 1
            mapLayer1.selectAll("path")
                .data(geoData.features)
                .style("fill", d => {
                    const value = datum1Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
                    return colorScale(value);
                });
        
            // Update Layer 2 basierend auf Datum 2
            mapLayer2.selectAll("path")
                .data(geoData.features)
                .style("fill", d => {
                    const value = datum2Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
                    return colorScale(value);
                });
        
            // Update Layer 3 basierend auf Datum 3
            mapLayer3.selectAll("path")
                .data(geoData.features)
                .style("fill", d => {
                    const value = datum3Data.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
                    return colorScale(value);
                });
    }

    // Funktion zur Aktualisierung der Trennlinien und Bereiche
    function updateLinesAndAreas(newX, newY) {
        centerX = newX;
        centerY = newY;

        // Linie 1: Vom Punkt zur oberen linken Ecke
        line1.attr("x1", centerX)
            .attr("y1", centerY)
            .attr("x2", 0)
            .attr("y2", 0);

        // Linie 2: Vom Punkt zur oberen rechten Ecke
        line2.attr("x1", centerX)
            .attr("y1", centerY)
            .attr("x2", width)
            .attr("y2", 0);

        // Linie 3: Vom Punkt zur Mitte des unteren Rands
        line3.attr("x1", centerX)
            .attr("y1", centerY)
            .attr("x2", width / 2)
            .attr("y2", height);

        // Aktualisiere die Clip-Pfade basierend auf der neuen Position
        updateClipPaths(centerX, centerY);
        // Aktualisiere die Farben der Layer erneut basierend auf den Dropdown-Auswahlen
        updateLayerColors(date1, date2, date3); // Farben erneut anwenden
    }

    // Funktion zur Aktualisierung der Clip-Pfade für die drei Layer
    function updateClipPaths(centerX, centerY) {
        // Berechne die Polygone für die drei Bereiche
        const area1 = `M0,0 L${centerX},${centerY} L${width / 2},${height} L0,${height} Z`;
        const area2 = `M${centerX},${centerY} L${width},0 L${width},${height} L${width / 2},${height} Z`;
        const area3 = `M${centerX},${centerY} L0,0 L${width},0 Z`;

        // Setze die Clip-Pfade
        clipPath1.selectAll("path").remove(); // Lösche den alten Pfad
        clipPath1.append("path").attr("d", area1);

        clipPath2.selectAll("path").remove(); // Lösche den alten Pfad
        clipPath2.append("path").attr("d", area2);

        clipPath3.selectAll("path").remove(); // Lösche den alten Pfad
        clipPath3.append("path").attr("d", area3);
    }

    // Funktion zur Anzeige des Info-Textes
    function updateInfoBox(data) {
        const value1 = getValueForRegion(data.properties.RS, date1);
        const value2 = getValueForRegion(data.properties.RS, date2);
        const value3 = getValueForRegion(data.properties.RS, date3);
        // Zeige die Informationen im Info-Bereich an
        d3.select("#mockup2-info-content-box").html(`
            <p><strong>Region:</strong> ${data.properties.GEN}</p>
            <p><strong>${formatDate(date1)} Wert:</strong> ${Math.round(value1)}</p>
            <p><strong>${formatDate(date2)} Wert:</strong> ${Math.round(value2)}</p>
            <p><strong>${formatDate(date3)} Wert:</strong> ${Math.round(value3)}</p>
        `);
    }

    // Funktion, um den Wert eines Hexagons (ID) für ein bestimmtes Datum zu holen
    function getValueForRegion(id, date) {
        const dateData = dataFiles[datesGlobal.findIndex(entry => entry === date)]; // Hole die Daten für das ausgewählte Datum
        const foundData = dateData.results.find(d => d.name === id); // Finde das Hexagon mit der passenden ID
        return foundData ? foundData.compartments.MildInfections : 'Keine Daten'; // Gib den Wert zurück, oder "Keine Daten", falls nicht gefunden
    }

    // Funktion zur Anzeige der Legende (farblich abgestufte Skala)
    function updateLegend(minValue, maxValue) {
        const legendContainer = d3.select("#mockup2-legend-container");
        legendContainer.selectAll("*").remove();

        // SVG für die Legende
        const svg = legendContainer.append("svg").attr("width", 100).attr("height", 200);

        // Farbverlauf erstellen
        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "legendGradient")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", "blue");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "white");

        // Rechteck für den Farbverlauf
        svg.append("rect")
            .attr("width", 20)
            .attr("height", 180)
            .style("fill", "url(#legendGradient)")
            .attr("transform", "translate(30,10)");
        
        // Legendenwerte
        svg.append("text").attr("x", 60).attr("y", 20).text(Math.round(maxValue));
        svg.append("text").attr("x", 60).attr("y", 190).text(Math.round(minValue));
    }

// Funktion zum Erstellen eines Balkendiagramms für das ausgewählte Hexagon
    function updateBarChartForRegion(data) {
        if(!SHOW_BAR_CHART)
            {
                return; 
            }

        const chartData = [
            { date: data.selectedDate1, value: data.date1 },
            { date: data.selectedDate3, value: data.date2 },
            { date: data.selectedDate2, value: data.date3 }
        ];

    // Finde den kleineren Min-Wert und den größeren Max-Wert
    
        const chartContainer = d3.select("#mockup2-chart-container");
        chartContainer.selectAll("*").remove();

        const width = chartContainer.node().clientWidth - 80;
        const height = chartContainer.node().clientHeight - 60;
        
        // Skalen
        const x = d3.scaleBand()
            .domain(chartData.map(d => formatDate(d.date)))
            .range([0, width])
            .padding(0.2);
        const y = d3.scaleLinear()
            //.domain([overallMinValue, overallMaxValue])
            .domain([0, d3.max(chartData, d => d.value)])
            .range([height, 0]);


        const svg = chartContainer.append("svg")
            .attr("width", width + 80)
            .attr("height", height + 60)
            .append("g")
            .attr("transform", `translate(40,20)`);

        
        // X- und Y-Achsen
        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
        svg.append("g").call(d3.axisLeft(y));

        // Balken
        svg.selectAll(".bar")
            .data(chartData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(formatDate(d.date)))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => colorScale(d.value))
            .attr("stroke", "black")  // **Schwarze Umrandung**
            .attr("stroke-width", 1); // **Dicke der Umrandung**
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

        function getMinMaxValues(date) {
            const dateData = getDataFileByDate(date);
            const values = dateData.results.map(d => d.compartments.MildInfections);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            return { minValue, maxValue };
        }

        
        function formatDate(dateString) {
            const [year, month, day] = dateString.split("-");
            return `${day}.${month}.${year}`;
        }
});
