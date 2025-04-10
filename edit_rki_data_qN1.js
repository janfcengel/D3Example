const fs = require('fs');
const path = require('path');

// === BASISDATEN ===

const inputFile = path.join(__dirname, 'rki_data/2023-12-14_rki_data_default.json');

// Ziel-Daten
const outputDate1 = '2020-01-27';
const outputDate2 = '2020-04-27';
const outputDate3 = '2020-07-27';

const outputFile1 = 'rki_data/rki_custom_' + outputDate1 + '_qN1.json';
const outputFile2 = 'rki_data/rki_custom_' + outputDate2 + '_qN1.json';
const outputFile3 = 'rki_data/rki_custom_' + outputDate3 + '_qN1.json';

const globalScalingFactor = 0.25; // Alle Originalwerte zunächst verkleinern

// === Bundeslandspezifische Basiswerte und Streuungen ===

const blConfig = {
    "01": { base: 350, spread: 50 },   // Schleswig-Holstein
    "02": { base: 800, spread: 100 },  // Hamburg (klein, dicht besiedelt)
    "03": { base: 300, spread: 80 },   // Niedersachsen
    "04": { base: 480, spread: 50 },   // Bremen
    "05": { base: 400, spread: 100 },  // NRW
    "06": { base: 350, spread: 90 },   // Hessen
    "07": { base: 390, spread: 60 },   // Rheinland-Pfalz
    "08": { base: 450, spread: 120 },  // Baden-Württemberg
    "09": { base: 430, spread: 100 },  // Bayern
    "10": { base: 380, spread: 40 },   // Saarland
    "11": { base: 800, spread: 150 },  // Berlin
    "12": { base: 320, spread: 60 },   // Brandenburg
    "13": { base: 380, spread: 40 },   // Mecklenburg-Vorpommern
    "14": { base: 300, spread: 80 },   // Sachsen
    "15": { base: 350, spread: 70 },   // Sachsen-Anhalt
    "16": { base: 330, spread: 60 }    // Thüringen
};

// === Overrides für gezielte RS-Werte ===
const overrides = [
    { rs: "11000", value: getCustomBaseValue("11") }, // Berlin
    { rs: "12070", value: getCustomBaseValue("12") }, // Potsdam
    // weitere RS-Werte ggf. ergänzen …
];

// === Hilfsfunktionen ===

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

    // === Datei 1 ===
    let data1 = JSON.parse(JSON.stringify(inputData));
    data1.results.forEach(entry => {
        entry.compartments.MildInfections *= globalScalingFactor;

        const override = overrides.find(o => o.rs === entry.name);
        if (override) {
            entry.compartments.MildInfections = override.value;
        } else {
            const rsPrefix = entry.name.substring(0, 2);
            const config = blConfig[rsPrefix] || { base: 250, spread: 50 };
            entry.compartments.MildInfections = getRandomValueNearBase(config.base, config.spread);
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
