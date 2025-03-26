let dates = [];
let date1, date2, date3

const SHOW_BAR_CHART = false; 
    // Lade beide JSON-Dateien
Promise.all([
    d3.json('lk_germany_reduced.geojson'), // GeoJSON für die Karte
    d3.json('multivariate_test_data2.json'),  // Multivariate Testdaten
    d3.json('2023-12-07_rki_data.json'),
    d3.json('2023-12-14_rki_data.json'),
    d3.json('2023-12-21_rki_data.json')
]).then(([geoData, multivariateData, rki231207, rki231214, rki231221]) => {

    dataFiles = [rki231207, rki231214, rki231221];
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

    const infoContainer = document.getElementById('mockup3-info-content-box');
    const fixedHeight = infoContainer.clientHeight;
    infoContainer.style.height = `${fixedHeight}px`;
    // SVGs und Zoom initialisieren
    const svgElements = [
        { svg: d3.select("#mockup3-top-left svg"), layer: "layer1" },
        { svg: d3.select("#mockup3-top-right svg"), layer: "layer2" },
        { svg: d3.select("#mockup3-bottom-left svg"), layer: "layer3" }
    ];

    let selectedPolygonId = null;
    let tooltip;

    // Gemeinsame Zoom-Funktion erstellen
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Zoombereich von 1x bis 8x
        .on("zoom", zoomed);

        svgElements.forEach(({ svg }) => {
            svg.call(zoom);
        });

    // Funktion zum synchronen Zoomen
    function zoomed(event) {
        svgElements.forEach(({ svg }) => {
            svg.select("g").attr("transform", event.transform);
        });
    }

    svgElements.forEach(({ svg, layer }) => {
        const mapLayer = svg.append("g").attr("class", layer);
        createMap(svg, mapLayer);
    });

    function updateMap(svg, selectedDate, mapLayer, colorScale) {
        const dateData = getDataFileByDate(selectedDate);

        mapLayer.selectAll("path")
            .data(geoData.features)
            .style("fill", d => {
                const value = dateData.results.find(item => item.name === d.properties.RS)?.compartments.MildInfections || 0;
                return colorScale(value);
            });
    }

    function createMap(svg, mapLayer) {
        // Entferne vorherige Pfade, um Duplikate zu vermeiden
        mapLayer.selectAll("path").remove();
    
        const containerWidth = svg.node().parentNode.clientWidth;
        const containerHeight = svg.node().parentNode.clientHeight;
    
        svg.attr("width", containerWidth).attr("height", containerHeight);
    
        const projection = d3.geoMercator().fitSize([containerWidth, containerHeight], geoData);
        const path = d3.geoPath().projection(projection);
    
        // Hinzufügen der Polygone für die Landkreise mit initialer grauer Füllung
        mapLayer.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "black")
            .style("fill", "lightgray"); // Standardmäßige graue Füllung

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

        // Füge das Klick-Event für jedes Polygon hinzu
        addPolygonClickEvent(mapLayer);
        addPolygonMouseEvents(mapLayer);
    }

    // Funktion zum Hervorheben des ausgewählten Polygons
    function highlightSelectedPolygon(polygonId) {
        svgElements.forEach(({ svg }) => {
            svg.selectAll("path")
                .style("stroke-width", d => (d.properties.id === polygonId ? 3 : 1)) // Randstärke 3 für das ausgewählte Polygon
                .style("stroke", d => (d.properties.id === polygonId ? "red" : "black")); // Randfarbe rot für das ausgewählte Polygon
        });
    }

    // Klick-Event für Polygone in allen Karten
    function addPolygonClickEvent(mapLayer) {
        mapLayer.selectAll("path").on("click", function (event, d) {
            // Setze das ausgewählte Polygon auf das aktuell angeklickte
            selectedPolygonId = d.properties.id;
            
            // Aktualisiere die Hervorhebung in allen SVGs
            highlightSelectedPolygon(selectedPolygonId);

            // Aktualisiere die Infobox und das Balkendiagramm mit den aktuellen Daten
            updateInfoBox(d.properties);  // Update InfoBox mit Polygon-Properties
            updateBarChart(d.properties, [date1, date2, date3]); 
        });
    }

    function addPolygonMouseEvents(mapLayer) {
        mapLayer.selectAll("path")
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible") // Tooltip sichtbar machen
                .html(`${d.properties.GEN}`) // GEN anzeigen
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        // Aktualisiere den mouseout-Handler für Layer 1, 2 und 3:
        .on("mouseout", function(event, d) {
            tooltip.style("visibility", "hidden"); // Tooltip verstecken
        })
    }

    function updateInfoBox(regionData) {
        const infoContainer = document.getElementById('mockup3-info-content-box');
        infoContainer.innerHTML = `
            <a><strong>GEN:</strong> ${regionData.GEN}</a>
            <p><strong>Bundesland:</strong> ${getBundeslandName(regionData)}</p>
        `;
    }

    function getValueForPolygon(id, dateData) {
        const hexData = dateData.results.find(d => d.name === id); // Finde das Hexagon mit der passenden ID
        return hexData ? hexData.compartments.MildInfections : 'Keine Daten'; // Gib den Wert zurück, oder "Keine Daten", falls nicht gefunden
    }

    function updateLegend(minValue, maxValue) {
        const legendContainer = d3.select("#mockup3-legend-container");
        legendContainer.selectAll("*").remove();

        const svgWidth = 80;
        const svgHeight = legendContainer.node().clientHeight;
        const legendSvg = legendContainer.append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        const gradient = legendSvg.append("defs")
            .append("linearGradient")
            .attr("id", "legendGradient")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "blue");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "white");

        legendSvg.append("rect")
            .attr("x", 10)
            .attr("y", 10)
            .attr("width", 20)
            .attr("height", svgHeight - 40)
            .style("fill", "url(#legendGradient)");

        legendSvg.append("text").attr("x", 40).attr("y", 15).text(`${Math.round(maxValue)}`);
        legendSvg.append("text").attr("x", 40).attr("y", svgHeight - 20).text(`${Math.round(minValue)}`);
    }

    function updateBarChart(regionData, selectedDates) {
        if(!SHOW_BAR_CHART)
        {
            return; 
        }
        const chartContainer = d3.select("#mockup3-chart-container");
        chartContainer.selectAll("*").remove();

        const data = selectedDates.map(date => ({
            date,
            value: getDataFileByDate(date).results.find(d => d.name === regionData.RS)?.compartments.MildInfections || 0
        }));

        const width = chartContainer.node().clientWidth - 80;
        const height = chartContainer.node().clientHeight - 60;

        const x = d3.scaleBand()
            .domain(data.map(d => formatDate(d.date)))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([height, 0]);

        const svg = chartContainer.append("svg")
            .attr("width", width + 80)
            .attr("height", height + 60)
            .append("g")
            .attr("transform", `translate(40,20)`);

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
        svg.append("g").call(d3.axisLeft(y));

        svg.selectAll(".bar")
            .data(data)
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

    const { minValue: min1, maxValue: max1 } = getMinMaxValues(date1);
    const { minValue: min2, maxValue: max2 } = getMinMaxValues(date2);
    const { minValue: min3, maxValue: max3 } = getMinMaxValues(date3);
 
    // Finde den kleineren Min-Wert und den größeren Max-Wert
    const overallMinValue = Math.min(min1, min2, min3);
    const overallMaxValue = Math.max(max1, max2, max3);
    
    // Erstelle eine Farbskala (z.B. von weiß bis blau)
    const colorScale = d3.scaleLinear()
        .domain([overallMinValue, overallMaxValue]) // Beispielhafte Werte für min/max (anpassen je nach Daten)
        .range(["white", "blue"]);

    updateMap(svgElements[0].svg, date1, svgElements[0].svg.select(`.${svgElements[0].layer}`), colorScale);
    updateMap(svgElements[1].svg, date2, svgElements[1].svg.select(`.${svgElements[1].layer}`), colorScale);
    updateMap(svgElements[2].svg, date3, svgElements[2].svg.select(`.${svgElements[2].layer}`), colorScale);

    updateLegend(overallMinValue, overallMaxValue);

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
    
});