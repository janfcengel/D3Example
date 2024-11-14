const hagrid = require('@saehrimnir/hagrid');
const fs = require('fs');
const path = require('path');

/**
 * Berechnet die Gosper-Kurven-Ebene basierend auf einer gegebenen LK-Nummer.
 * @param {number} lk_number - Die zu verwendende LK-Nummer.
 * @returns {number} Die berechnete Ebene.
 */
function calculate_level(lk_number) {
    const log7 = Math.log(7);
    const log_lk_number = Math.log(lk_number);
    const level = Math.ceil(log_lk_number / log7);
    return level;
}

const lk_number = 400;
const gosper_level = calculate_level(lk_number);
const gosper_level_max_index = Math.pow(7, gosper_level);
//const scaling = 47692.87109375;
const scaling = 0.8;

/**
 * Verarbeitet eine Menge von Punkten und ordnet sie den Positionen auf der Gosper-Kurve zu.
 * @param {Array} D - Die Eingabepunkte (Koordinaten).
 * @param {Object} options - Optionen für die Verarbeitung, inkl. Gosper-Kurven-Ebene, Skalierungsfaktor und einer Punktzuordnung.
 * @returns {Object} Ein Objekt, das die zugeordneten Punkte und deren Positionen enthält.
 */
function gridify_gosper$1(D, { level, scale_factor = scaling, P = new Map() }) {
    const N = D.length;
    const Y = new Array(N).fill(0);
    const V = hagrid.gosper_curve(level); // Generiert die Gosper-Kurve für die gegebene Ebene.

    // Bestimmt die Ausdehnung (extent) der Kurve und skaliert die Eingabepunkte entsprechend.
    const grid_extent = [hagrid.utils.extent(V, (d) => d[0] * scale_factor), hagrid.utils.extent(V, (d) => d[1] * scale_factor)];
    const scales = hagrid.utils.get_scales(D, grid_extent, { round: false });

    // Ordnet jeden Punkt in D der nächsten Position auf der Gosper-Kurve zu.
    D.forEach((d, i) => {
        let [x, y] = scales.map((s) => s(d));
        let p = find_nearest([x, y], V);
        if (P.has(p)) {
            gosper_collision(P, p, [x, y], i, V); // Behandelt Kollisionen, wenn mehrere Punkte nahe beieinander liegen.
        } else {
            P.set(p, i);
        }
    });

    // Setzt die Positionen in der Ergebnisliste Y basierend auf der Zuordnung P.
    for (const entry of P.entries()) {
        const [p, i] = entry;
        Y[i] = V[p];
    }

    return { Y, P };
}

/**
 * Findet den nächstgelegenen Punkt in einer Liste zu einem gegebenen Punkt.
 * @param {Array} p - Der zu prüfende Punkt.
 * @param {Array} list - Die Liste der Punkte, durch die gesucht werden soll.
 * @returns {number} Der Index des nächstgelegenen Punktes.
 */
function find_nearest(p, list) {
    let nearest_index = -1;
    let nearest_distance = Infinity;

    // Durchläuft alle Punkte in der Liste und findet den Punkt mit der geringsten Entfernung zu p.
    list.forEach((q, i) => {
        const dist = hagrid.utils.distance(p, q);
        if (dist < nearest_distance) {
            nearest_index = i;
            nearest_distance = dist;
        }
    });

    return nearest_index;
}

/**
 * Behandelt Kollisionen, wenn mehrere Punkte nahe beieinander liegen, und sucht nach einer alternativen Position.
 * @param {Map} P - Die Punktzuordnung.
 * @param {number} p - Der ursprüngliche Punkt, der eine Kollision verursacht.
 * @param {Array} d - Die Koordinaten des aktuellen Punktes.
 * @param {number} i - Der Index des aktuellen Punktes.
 * @param {Array} V - Die Gosper-Kurven-Punkte.
 */
function gosper_collision(P, p, d, i, V) {
    const e = V.length - 1;
    const valid = (p) => p >= 0 && p <= e;
    let pl = p;
    let pr = p;

    // Sucht nach einer freien Position links oder rechts von p.
    while (true) {
        ++pl; --pr;
        const el = !P.has(pl);
        const er = !P.has(pr);
        const vl = valid(pl);
        const vr = valid(pr);
        if (vl && el && !er) {
            P.set(pl, i);
            return;
        } else if (!el && vr && er) {
            P.set(pr, i);
            return;
        } else if (el && er) {
            if (vl && vr) {
                const dl = hagrid.utils.distance(d, V[pl]);
                const dr = hagrid.utils.distance(d, V[pr]);
                P.set(dl < dr ? pl : pr, i);
                return;
            } else if (vl) {
                P.set(pl, i);
                return;
            } else if (vr) {
                P.set(pr, i);
                return;
            }
        }
    } 
}

/**
 * Invertiert die Zuordnung der Punkte, um die freien Positionen auf der Gosper-Kurve zu identifizieren.
 * @param {Map} P - Die Punktzuordnung.
 * @returns {Map} Eine invertierte Punktzuordnung, die freie Positionen kennzeichnet.
 */
function invert_P_map_entries(P) {
    const invertedP = new Map();

    for (let i = 0; i < gosper_level_max_index - 1; i++) {
        if (!P.has(i)) {
            invertedP.set(i, -1); // Kennzeichnet eine freie Position mit -1.
        }
        else {
            invertedP.set(i, P.get(i));
        }
    }

    return invertedP;
}

/**
 * Zeigt nur die gültigen Einträge in der Punktzuordnung an.
 * @param {Map} P - Die Punktzuordnung.
 */
function show_only_valid_entries(P) {
    for (let i = 0; i < gosper_level_max_index - 1; i++) {
        if (!P.has(i)) {
            console.log(`Schlüssel ${i} ist nicht existend`, i);
        }
        else {
            if (P.get(i) !== -1) {
                const value = P.get(i);
                console.log(`Schlüssel: ${i}, Wert: ${value}`, i, value);
            }
        }
    }
}

/**
 * Findet die fehlenden Werte in einer gegebenen Zuordnung.
 * @param {Map} map - Die Zuordnung der Werte.
 * @param {number} rangeStart - Der Anfangsbereich der zu prüfenden Werte.
 * @param {number} rangeEnd - Der Endbereich der zu prüfenden Werte.
 * @returns {Array} Eine Liste der fehlenden Werte.
 */
function findMissingValues(map, rangeStart, rangeEnd) {
    const missingValues = [];
    const valueSet = new Set(map.values());

    for (let i = rangeStart; i <= rangeEnd; i++) {
        if (!valueSet.has(i)) {
            missingValues.push(i);
        }
    }

    return missingValues;
}

// Pfade zu den JSON-Dateien
const filePathHexmap = path.resolve(__dirname, 'hexmap_centers_scaled.geojson');
const filePathLkData = path.resolve(__dirname, 'output_lk_metadata2.geojson');

// Liest die GeoJSON-Dateien synchron ein.
const geojsonHexmap = JSON.parse(fs.readFileSync(filePathHexmap, 'utf8'));
const hexmap_p = geojsonHexmap.features.map((feature) => feature.geometry.coordinates);
const gosper_step1 = gridify_gosper$1(hexmap_p, { level: gosper_level, scale_factor: scaling });
const gosper_step1_inverted = invert_P_map_entries(gosper_step1.P); // hier ist noch ein Fehler alle Felder werden -1 gesetzt?

const invertedPArray = Array.from(gosper_step1_inverted.entries());
const outputPath = path.resolve(__dirname, 'gosper_curve_testdata_hexmap_ger_scaled.json');
fs.writeFileSync(outputPath, JSON.stringify(invertedPArray, null, 2)); //Test Output for visualization

const geojsonLkData = JSON.parse(fs.readFileSync(filePathLkData, 'utf8'));
const lk_map = geojsonLkData.features.map((feature) => feature.geometry.coordinates);
const gosper_lk_data = gridify_gosper$1(lk_map, { level: gosper_level, scale_factor: scaling, P: gosper_step1_inverted });

// Speichert die Zuordnung der Landkreisdaten als JSON-Datei
printJson(gosper_lk_data.Y, geojsonLkData, "geojson_lk");

/**
 * Erstellt eine JSON-Datei mit den zugeordneten Positionen und speichert sie.
 * @param {Array} data - Die Positionen der Landkreisdaten.
 * @param {Object} geoJson - Das ursprüngliche GeoJSON-Objekt der Landkreise.
 * @param {string} filename - Der Name der Ausgabedatei.
 */
function printJson(data, geoJson, filename) {
    const width = Math.sqrt(data.length / scaling); // Bestimmt die Breite der Ausgabe basierend auf der Skalierung.
    const result = [];
    const temp = [];

    // Kombiniert die Positionsdaten mit den zugehörigen Eigenschaften.
    data.forEach((v, i) => {
        const p = geoJson.features[i].properties;
        temp.push({ position: v, RS: p.RS, GEN: p.GEN, BEZ: p.BEZ });
    });
    temp.sort((a, b) => b.position[1] - a.position[1]);

    // Sortiert die Ergebnisse und formatiert sie in eine Ausgabeform.
    for (let i = 0; i < data.length; i += width) {
        result.push(
            temp.slice(i, i + width).sort((a, b) => a.position[0] - b.position[0])
        );
    }

    console.log(result);
    const filteredResult = result.filter(entry => entry.length !== 0);
    console.log(filteredResult);

    // Speichert das Ergebnis als JSON-Datei.
    fs.writeFileSync(filename + '.json', JSON.stringify(filteredResult));
}

/**
 * Kombiniert die Gosper-Daten mit den Hexmap-Daten und erstellt ein neues GeoJSON-Objekt.
 * @param {Object} gosper_data - Die zugeordneten Landkreisdaten.
 * @param {Object} gosper_hexmap - Die Hexmap-Daten.
 * @returns {Array} Die kombinierten Daten im GeoJSON-Format.
 */
function combine_data(gosper_data, gosper_hexmap) {
    const combinedData = [];
    const lk_map_properties = geojsonLkData.features.map((feature) => feature.properties);
    for (let i = 0; i < gosper_data.P.size; i++) {
        const positionIndex = gosper_data.P.get(i);
        if (positionIndex !== undefined && positionIndex !== -1) {
            combinedData.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: hexmap_p[gosper_hexmap.P.get(i)]
                },
                properties: lk_map_properties[gosper_hexmap.P.get(i)]
            });
        }
    }
    console.log(combinedData.length);
    return combinedData;
}
