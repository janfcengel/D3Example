const fs = require('fs');
const path = require('path');

// === BASISDATEN ===

const inputFile = path.join(__dirname, 'rki_data/2023-12-14_rki_data_default.json');

// Ziel-Daten
const outputDate1 = '2024-07-09';
const outputDate2 = '2024-07-16';
const outputDate3 = '2024-07-23';

const outputFile1 = 'rki_data/rki_custom_' + outputDate1 + '_qN2.json';
const outputFile2 = 'rki_data/rki_custom_' + outputDate2 + '_qN2.json';
const outputFile3 = 'rki_data/rki_custom_' + outputDate3 + '_qN2.json';

const globalScalingFactor = 0.25; // Alle Originalwerte zunächst verkleinern

// === Bundeslandspezifische Basiswerte und Streuungen ===

// Konfiguration: Basiswerte pro Bundesland (erste 2 Ziffern des RS)
const blConfig = {
    "09": { base: 370, spread: 20 },   // Bayern → höchste Inzidenz
    "05": { base: 350, spread: 60 },   // NRW
    "02": { base: 350, spread: 60 },   //Hamburg
    "06": { base: 320, spread: 50 },   // Hessen
    "11": { base: 280, spread: 40 },   // Berlin
    "12": { base: 300, spread: 40 },   // Brandenburg
    "14": { base: 310, spread: 50 },   // Sachsen
    "01": { base: 250, spread: 40 },   // SH
    "04": { base: 260, spread: 30 },   // HB
    "03": { base: 290, spread: 50 },   // Niedersachsen
    "07": { base: 300, spread: 50 },   // Rheinland-Pfalz
    "08": { base: 330, spread: 60 },   // BaWü
    "10": { base: 250, spread: 30 },   // Saarland
    "13": { base: 370, spread: 30 },   // MV
    "15": { base: 280, spread: 40 },   // Sachsen-Anhalt
    "16": { base: 300, spread: 40 },   // Thüringen
  };

  const blOutlierScaling = {
    "09": 1.4, // Bayern
    "11": 1.2, // Berlin
    "05": 1.1,  // NRW
    "03": 0.8
};
// === Hilfsfunktionen ===

function getRandomBaseValueByBL(rs) {
    const blId = rs.slice(0, 2); // Erste zwei Ziffern = Bundesland
    const config = blConfig[blId];

    if (!config) {
        console.warn("Unbekanntes Bundesland:", blId);
        return 250; // Fallback
    }

    const { base, spread } = config;

    // Glockenverteilung mit leichter Streuung
    const samples = 6;
    let total = 0;
    for (let i = 0; i < samples; i++) {
        total += Math.random();
    }
    const avg = total / samples;
    const offset = (avg - 0.5) * 2 * spread;
    return Math.max(0, base + offset);
}


// Werte für bestimmte RS gezielt generieren
function getCustomBaseValue(rsPrefix) {
    const config = blConfig[rsPrefix];
    if (!config) return 200; // Fallback
    return getRandomValueNearBase(config.base, config.spread);
}

// Pseudo-binomiale Zufallszahl mit Verteilung um base ± spread
function getRandomValueNearBase(base, spread) {
    const samples = 6;
    let total = 0;
    for (let i = 0; i < samples; i++) total += Math.random();
    const avg = total / samples;
    const offset = (avg - 0.5) * 2 * spread;
    return Math.max(0, base + offset);
}

// Zufällige Veränderung ±10–20% mit ±5% Varianz
function adjustMildInfectionsWithVariance(direction) {
    const minPercent = 10;
    const maxPercent = 20;
    const basePercent = (Math.random() * (maxPercent - minPercent) + minPercent) / 100;
    const signedBase = direction === 'increase' ? basePercent : -basePercent;

    return function (originalValue) {
        const variance = (Math.random() * 0.1 - 0.05) * Math.abs(signedBase);
        const finalFactor = 1 + signedBase + variance;
        return originalValue * finalFactor;
    };
}

// === Hauptlogik ===

fs.readFile(inputFile, 'utf8', (err, jsonString) => {
    if (err) return console.error('Fehler beim Lesen:', err);

    const inputData = JSON.parse(jsonString);

    const baseValueGlobal = 400;
    const spreadGlobal = 50;
    const highValueBase = 450;
    const highValueSpread = 100;
    
    // Gruppiere Landkreise nach Bundesland (erste zwei Ziffern von RS)
    const groupedByBL = {};
    inputData.results.forEach(entry => {
        const bl = entry.name.slice(0, 2);
        if (!groupedByBL[bl]) groupedByBL[bl] = [];
        groupedByBL[bl].push(entry);
    });
    
    // Entscheide für jedes BL zufällig 1–3 Ausreißer
    const outliersPerBL = {};
    Object.entries(groupedByBL).forEach(([bl, entries]) => {
        const numOutliers = Math.min(entries.length, Math.floor(Math.random() * 3) + 1); // 1–3
        const shuffled = entries.sort(() => Math.random() - 0.5);
        outliersPerBL[bl] = shuffled.slice(0, numOutliers).map(e => e.name); // speichere RS
    });

    // === Datei 1 ===
    const data1 = JSON.parse(JSON.stringify(inputData));
    data1.results.forEach(entry => {
        const bl = entry.name.slice(0, 2);
        const isOutlier = outliersPerBL[bl]?.includes(entry.name);

        if (isOutlier) {
            const scale = blOutlierScaling[bl] || 1;
            entry.compartments.MildInfections = getRandomValueNearBase(highValueBase, highValueSpread)*scale;
        } else {
            entry.compartments.MildInfections = getRandomValueNearBase(baseValueGlobal, spreadGlobal);
        }

        entry.day = outputDate1;
    });

    // === Datei 2 ===
    const adjustFunc2 = adjustMildInfectionsWithVariance(Math.random() < 0.5 ? 'increase' : 'decrease');
    const data2 = JSON.parse(JSON.stringify(data1));
    data2.results.forEach(entry => {
        entry.compartments.MildInfections = adjustFunc2(entry.compartments.MildInfections);
        entry.day = outputDate2;
    });

    // === Datei 3 ===
    const adjustFunc3 = adjustMildInfectionsWithVariance(Math.random() < 0.5 ? 'increase' : 'decrease');
    const data3 = JSON.parse(JSON.stringify(data2));
    data3.results.forEach(entry => {
        entry.compartments.MildInfections = adjustFunc3(entry.compartments.MildInfections);
        entry.day = outputDate3;
    });

    // === Dateien schreiben ===
    fs.writeFileSync(outputFile1, JSON.stringify(data1, null, 2));
    fs.writeFileSync(outputFile2, JSON.stringify(data2, null, 2));
    fs.writeFileSync(outputFile3, JSON.stringify(data3, null, 2));

    console.log("Daten für alle drei Zeitpunkte erfolgreich erstellt.");
});