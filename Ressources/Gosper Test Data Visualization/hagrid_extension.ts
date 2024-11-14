const hagrid = require('@saehrimnir/hagrid');

interface GridifyGosperOptions {
    level: number;
    scale_factor?: number;
}

const lk_number = 400;

function calculate_level(lk_number: number): number {
    const log7 = Math.log(7);
    const log_lk_number = Math.log(lk_number);
    const level = Math.ceil(log_lk_number / log7);
    return level;
}

const gosper_level = calculate_level(lk_number);
const gosper_level_max_index = Math.pow(7, gosper_level);

function gridify_gosper$1(D: any, {level, scale_factor = 0.8}: GridifyGosperOptions) {
    const N = D.length;
    const P = new Map();
    const Y = new Array(N).fill(0);
    const V = hagrid.gosper_curve(level);
    // distance between grid cells (grid cell size)
    hagrid.distance$2(V[0], V[1]); // Math.sqrt(3);

    const grid_extent = [hagrid.extent$1(V, (d: number[]) => d[0] * scale_factor), hagrid.extent$1(V, (d: number[]) => d[1]* scale_factor)]; 
    const scales = hagrid.get_scales(D, grid_extent, {round: false});

    D.forEach((d: any, i: any) => {
        let [x, y] = scales.map((s: (arg0: any) => any) => s(d));
        let p = hagrid.find_nearest([x, y], V);
        if (P.has(p)) {
            hagrid.gosper_collision(P, p, [x, y], i, V);
        } else {
            P.set(p, i);
        }
    });

    for (const entry of P.entries()) {
        const [p, i] = entry;
        Y[i] = V[p];
    }

    return {Y, P};
}

function invert_P_map_entries(P: any) {
    const invertedP = new Map<number, number>();

    for (let i = 0; i < gosper_level_max_index-1; i++) {
        if (!P.has(i)) {
            invertedP.set(i, -1); // -1 oder ein anderer Wert, der anzeigt, dass der Eintrag jetzt belegt ist
        }
    }

    return invertedP;
}

const fs = require('fs');
const path = require('path');
const filePathHexmap = path.resolve(__dirname, 'hexmap_centers.json');
fs.readFile(filePathHexmap, 'utf8', (err: any, data: string) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }
  try {
    const geojsonHexmap = JSON.parse(data);

    // Verarbeite die GeoJSON-Daten
    const hexmap_p = geojsonHexmap.features.map((feature: { properties: { coordinates: any; }; }) => {
      return feature.properties.coordinates;
    });
    const gosper_step1 = gridify_gosper$1(hexmap_p, {level: gosper_level, scale_factor: 47692.87109375 });
    console.log(gosper_step1.P);
    const gosper_step1_inverted = invert_P_map_entries(gosper_step1);  
    console.log(gosper_step1_inverted);
}catch (err) {
    console.error('Error parsing JSON:', err);
  }});

//export {gridify_gosper$1}
