const fs = require('fs');
const path = require('path');


function generate_combined_data() {
    // Lese die erste JSON-Datei ein
    const inputPath = path.resolve(__dirname, 'gosper_curve_testdata_hexmap_ger_scaled.json');
    const data = fs.readFileSync(inputPath, 'utf8');
    // Wandle das JSON in ein Array um
    const hexmap_array = JSON.parse(data);

    // Lese die zweite JSON-Datei ein
    const inputPath2 = path.resolve(__dirname, 'gosper_curve_data_4.json');
    const data2 = fs.readFileSync(inputPath2, 'utf8');
    // Wandle das JSON in ein Array um
    const gosper_curve_data_array = JSON.parse(data2);

    // Stellen Sie sicher, dass beide Arrays die gleiche Länge haben
    if (hexmap_array.length !== gosper_curve_data_array.length) {
        console.error('Die Arrays haben unterschiedliche Längen!');
    } else {
        // Kombiniere die Arrays
        const combinedArray = gosper_curve_data_array.map((position, index) => {
            return [position, hexmap_array[index][1]];
        });

        console.log(combinedArray);
        // Speichern der kombinierten Daten in eine neue JSON-Datei
        const outputPath = path.resolve(__dirname, 'gosper_curve_combined_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(combinedArray, null, 2));
    }
}

function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function calculate_distances_and_scaling_factors() {
    // Beispielpunkte
    const x1 = 0.026997462357801937, y1 = -0.04676097647914121;
    const x2 = -0.026997462357801937, y2 = -0.04676097647914121;

    // Berechnung des Abstands
    const distance_gosper_curve_nodes = calculateDistance(x1, y1, x2, y2);

    console.log("Der Abstand zwischen den Punkten ist:", distance_gosper_curve_nodes);

    const filePath = path.resolve(__dirname, 'hexmap_centers_scaled.geojson');

    // Lese die Datei ein
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            return;
        }

        // Parse die JSON-Daten
        const geojson = JSON.parse(data);

        // Extrahiere die Koordinaten aus den Features
        const coordinatesArray = geojson.features.map(feature => feature.geometry.coordinates);

        console.log("Koordinaten:", coordinatesArray);

        // Beispiel: Wähle den ersten Punkt als Referenz
        const referencePoint = coordinatesArray[0];

        // Überprüfe, ob referencePoint ein Array ist
        if (!Array.isArray(referencePoint)) {
            console.error('referencePoint ist kein gültiges Array:', referencePoint);
            return;
        }

        // Berechne die Distanzen zu allen anderen Punkten
        const distances = coordinatesArray.map(coord => {
            // Überprüfe, ob coord ein Array ist
            if (!Array.isArray(coord)) {
                console.error('coord ist kein gültiges Array:', coord);
                return Infinity; // Rückgabe eines sehr großen Werts, um diesen Eintrag zu ignorieren
            }
            return calculateDistance(referencePoint, coord);
        });

        // Finde die kürzeste Distanz (ohne den Punkt selbst)
        const minDistance = Math.min(...distances.slice(1)); // Ausschließen der Distanz zu sich selbst
        console.log("Kürzeste Distanz:", minDistance);
        scaling_factor_hexmap_centers = minDistance / 0.053994924715603874;

        console.log(scaling_factor_hexmap_centers);

    });
}

// Funktion zur Berechnung der euklidischen Distanz zwischen zwei Punkten
function calculateDistance(coord1, coord2) {
    if (!Array.isArray(coord1) || !Array.isArray(coord2)) {
        console.error('Einer der Koordinatenpunkte ist kein Array:', coord1, coord2);
        return Infinity; // Rückgabe eines sehr großen Werts, um diesen Eintrag zu ignorieren
    }

    const [x1, y1] = coord1;
    const [x2, y2] = coord2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function generate_hexmap_centers_scaled() {
    // Pfad zur Eingabedatei
    const inputFilePath = path.resolve(__dirname, 'hexmap_centers.geojson');

    // Pfad zur Ausgabedatei
    const outputFilePath = path.resolve(__dirname, 'hexmap_centers_scaled.geojson');

    // Lese die Eingabedatei ein
    fs.readFile(inputFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            return;
        }

        // Parse die JSON-Daten
        const geojson = JSON.parse(data);

        // Definiere den Skalierungsfaktor
        const scalingFactor = 883284.3335730652; // Beispiel: Faktor 0.5, anpassen wie benötigt

        // Iteriere über die Features und skaliere die Koordinaten
        geojson.features.forEach(feature => {
            const [x, y] = feature.geometry.coordinates;

            // Skalierung der Koordinaten
            const newX = x / scalingFactor;
            const newY = y / scalingFactor;

            // Setze die neuen Koordinaten
            feature.geometry.coordinates = [newX, newY];
        });

        // Konvertiere die Daten zurück zu JSON
        const updatedGeojson = JSON.stringify(geojson, null, 2);

        // Schreibe die aktualisierten Daten in die neue Datei
        fs.writeFile(outputFilePath, updatedGeojson, 'utf8', err => {
            if (err) {
                console.error('Fehler beim Schreiben der Datei:', err);
                return;
            }
            console.log('Die Datei wurde erfolgreich als hexmap_centers_scaled.geojson gespeichert.');
        });
    });
}

generate_combined_data();
