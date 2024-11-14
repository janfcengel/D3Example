const hagrid = require('@saehrimnir/hagrid');
const fs = require('fs');
const path = require('path');

// Deine ursprünglichen Einstellungen und die Logik, um die Gosper-Kurve zu generieren
const intial_pos = [1, 1];
const gosper_level = 4;

function gosper_data_level(gosper_level) {
    const data_map = new Map();
    const entries = Math.pow(7, gosper_level);

    for (let index = 0; index < entries; index++) {
        data_map.set(index, intial_pos);
    }
    return data_map;
}

// Erstelle das D-Array und wende die Gosper-Gridify-Logik an
const D = gosper_data_level(gosper_level);
const Y = hagrid.gridify_gosper(D, { level: gosper_level, scale_factor: 0.8 });
undefined_value = Y.shift();
console.log(Y);
// Speichere das Ergebnis in einer JSON-Datei
const outputPath = path.resolve(__dirname, 'gosper_curve_data_' + gosper_level.toString() + '.json');
fs.writeFileSync(outputPath, JSON.stringify(Y, null, 2));

console.log(`Gosper-Kurve-Daten wurden in ${outputPath} gespeichert.`);
