function generateData() {
    const data = {
        "1.1.2000": [],
        "2.1.2000": [],
        "3.1.2000": [],
        "4.1.2000": []
    };

    Object.keys(data).forEach(date => {
        for (let i = 0; i < 400; i++) {
            const entry = {
                id: i + 1,
                value: Math.floor(Math.random() * 1001) // Zufälliger Wert zwischen 0 und 1000
            };
            data[date].push(entry);
        }
    });

    return data;
}

// Daten generieren
const generatedData = generateData();

// JSON-Daten als String
const jsonData = JSON.stringify(generatedData, null, 4);

console.log(jsonData);

// Optional: Speichern der Daten in einer Datei (wenn in einer Node.js-Umgebung ausgeführt)
 const fs = require('fs');
 fs.writeFileSync('multivariate_test_data2.json', jsonData);

