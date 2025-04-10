const fs = require('fs');
const path = require('path');

// === PARAMETER & KONFIGURATION ===
const baseValue = 250; // realistischer Mittelwert für MildInfections
const spread = 150;     // maximale Abweichung nach oben/unten (jeweils ±)

const inputFile = path.join(__dirname, 'rki_data/2023-12-14_rki_data_default.json');

const overrides = [
    { rs: "11000", value: getRandomBaseValueForSelectedRS() },
    { rs: "12070", value: getRandomBaseValueForSelectedRS() },
    { rs: "12054", value: getRandomBaseValueForSelectedRS() },
    { rs: "12051", value: getRandomBaseValueForSelectedRS() },
    { rs: "12063", value: getRandomBaseValueForSelectedRS() },
    { rs: "12068", value: getRandomBaseValueForSelectedRS() },
    { rs: "12065", value: getRandomBaseValueForSelectedRS() },
    { rs: "12060", value: getRandomBaseValueForSelectedRS() },
    { rs: "12064", value: getRandomBaseValueForSelectedRS() },
    { rs: "12067", value: getRandomBaseValueForSelectedRS() },
    { rs: "12061", value: getRandomBaseValueForSelectedRS() },
    { rs: "12072", value: getRandomBaseValueForSelectedRS() },
    { rs: "12069", value: getRandomBaseValueForSelectedRS() }
];

const outputDate1 = '2023-12-07';
const outputDate2 = '2023-12-14';
const outputDate3 = '2023-12-21';

const outputFile1 = 'rki_data/rki_custom_' + outputDate1 + '_qN3.json';
const outputFile2 = 'rki_data/rki_custom_' + outputDate2 + '_qN3.json';
const outputFile3 = 'rki_data/rki_custom_' + outputDate3 + '_qN3.json';

const globalScalingFactor = 0.25; // Skaliert alle Werte auf ~25 % ihrer ursprünglichen Größe



function getRandomBaseValueForSelectedRS() {
    const base = baseValue + spread - ((baseValue+spread)/20); 
    const baseIncrease = 0.15; // 15%
    const varianceRange = 0.10; // ±10%

    const randomVariance = (Math.random() * 2 - 1) * varianceRange; // ergibt Wert zwischen -0.10 und +0.10
    const finalValue = base * (1 + baseIncrease + randomVariance);
    return finalValue; 
}

// Hilfsfunktion für pseudo-binomiale Zufallszahlen
function getRandomValueNearBase(base, spread) {
    // Durchschnitt aus mehreren Zufallszahlen → glockenförmige Verteilung
    const samples = 6;
    let total = 0;
    for (let i = 0; i < samples; i++) {
        total += Math.random();
    }
    const avg = total / samples; // [0,1] mit höherer Wahrscheinlichkeit um 0.5
    const offset = (avg - 0.5) * 2 * spread; // [-spread, +spread]
    return Math.max(0, base + offset);
}

// Zufällige Skalierung wie vorher (Basiswert ±X%, zufällige Abweichung ±Y%)
function adjustMildInfectionsWithVariance(direction) {
    const minPercent = 10;
    const maxPercent = 20;
    const basePercent = (Math.random() * (maxPercent - minPercent) + minPercent) / 100;
    const signedBase = direction === 'increase' ? basePercent : -basePercent;

    return function (originalValue) {
        const variance = (Math.random() * 0.1 - 0.05) * Math.abs(signedBase); // ±5% davon
        const finalFactor = 1 + signedBase + variance;
        return originalValue * finalFactor;
    };
}

// === START ===

fs.readFile(inputFile, 'utf8', (err, jsonString) => {
    if (err) {
        console.error('Fehler beim Lesen der Datei:', err);
        return;
    }

    let inputData = JSON.parse(jsonString);

    // === Datei 1: gezielte Werte + realistischer Grundwert für Rest
    let data1 = JSON.parse(JSON.stringify(inputData));
    data1.results.forEach(entry => {
        // Skaliere alle Werte global herunter
        entry.compartments.MildInfections *= globalScalingFactor;
    
        // Falls ein Override existiert, wende ihn an
        const override = overrides.find(o => o.rs === entry.name);
        if (override) {
            entry.compartments.MildInfections = override.value;
        } else {
            // Werte für alle anderen realistisch zufällig setzen
            entry.compartments.MildInfections = getRandomValueNearBase(baseValue, spread);
        }
    
        entry.day = outputDate1;
    });

    // === Datei 2: skalieren
    const adjustFunc2 = adjustMildInfectionsWithVariance(Math.random() < 0.5 ? 'increase' : 'decrease');
    let data2 = JSON.parse(JSON.stringify(data1));
    data2.results.forEach(entry => {
        entry.compartments.MildInfections = adjustFunc2(entry.compartments.MildInfections);
        entry.day = outputDate2;
    });

    // === Datei 3: erneut skalieren
    const adjustFunc3 = adjustMildInfectionsWithVariance(Math.random() < 0.5 ? 'increase' : 'decrease');
    let data3 = JSON.parse(JSON.stringify(data2));
    data3.results.forEach(entry => {
        entry.compartments.MildInfections = adjustFunc3(entry.compartments.MildInfections);
        entry.day = outputDate3;
    });

    fs.writeFileSync(outputFile1, JSON.stringify(data1, null, 2));
    fs.writeFileSync(outputFile2, JSON.stringify(data2, null, 2));
    fs.writeFileSync(outputFile3, JSON.stringify(data3, null, 2));

    console.log("Daten generiert und gespeichert.");
});
