const util = require('util');
const fs = require('fs');
const csv = require('csv-parse');
const listOfLogos = require('open-data-jp-railway-lines-logo/logos.json');

async function readCsv(filePath, transform = (x) => x) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(csv({ columns: true }, (err, data) => {
      if (err) reject(err);
      else resolve(transform(data));
    }));
  });
}

async function generate() {
  const lines = await readCsv('./input/line20180424free.csv');
  const stations = await readCsv('./input/station20180330free.csv');
  const correctionsList = await readCsv('./input/manual_corrections.csv');

  const linesPrefectures = {};
  stations.forEach((s) => {
    if (!linesPrefectures[s.line_cd]) {
      linesPrefectures[s.line_cd] = [];
    }
    linesPrefectures[s.line_cd].push(s.pref_cd.padStart(2, '0'));
  });
  const corrections = correctionsList.reduce((all, line) => Object.assign(all, {
    [line.id]: line,
  }), {});

  const data = lines.map((line) => {
    if (line.e_status !== '0') return;
    const manual = corrections[line.line_cd];
    const altNames = [];
    const officialName = manual.alt_name || line.line_name;
    if (line.line_name !== officialName) altNames.push(line.line_name);
    if (line.line_name_h !== officialName) altNames.push(line.line_name_h);
    if (line.line_name_k !== officialName) altNames.push(line.line_name_k);

    const logoResults = listOfLogos.filter((logo) => logo.text.includes(officialName) || logo.text.includes(line.line_name) || logo.text.includes(line.line_name_h));

    return {
      code: manual.code,
      ekidata_id: line.line_cd,
      name_kanij: officialName,
      name_kana: manual.kana,
      name_romaji: manual.en,
      alternative_names: [...new Set(altNames)],
      prefectures: [...new Set(linesPrefectures[line.line_cd])],
      logo: logoResults.length === 1 ? logoResults[0].image : '',
    };
  }).filter(Boolean);

  return util.promisify(fs.writeFile)('./lines.json', JSON.stringify(data, null, '  '));
}

if (require.main === module) {
  generate();
}
