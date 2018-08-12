const util = require('util');
const fs = require('fs');
const csv = require('csv-parse');
const listOfLogos = require('open-data-jp-railway-lines-logo/logos.json');
const wikipediaData = require('wikipedia-jp-railway-lines');
const tokyoOperators = require('open-data-jp-tokyo-railway-operators/operators.json');
const openDataLines = tokyoOperators.reduce((all, operator) => all.concat(operator.railways), []);

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
  const linkOpendataCsv = await readCsv('./input/link_code_to_opendata.csv');
  const linkWikipediaCsv = await readCsv('./input/link_code_to_wikipedia.csv');

  const linesPrefectures = {};
  stations.forEach((s) => {
    if (!linesPrefectures[s.line_cd]) {
      linesPrefectures[s.line_cd] = [];
    }
    linesPrefectures[s.line_cd].push(s.pref_cd.padStart(2, '0'));
  });
  const opendata = linkOpendataCsv.reduce((all, link) => Object.assign(all, {
    [link.code || '_missing']: link.opendata,
  }), {});
  const wikipedia = linkWikipediaCsv.reduce((all, link) => Object.assign(all, {
    [link.code || '_missing']: link.wikipedia,
  }), {});

  const data = lines.map((line) => {
    if (line.e_status !== '0') return;
    const altNames = [];
    const wikiTitle = wikipedia[line.code] || '';
    const wikiLine = wikipediaData.find((l) => wikiTitle && l.title === wikiTitle) || {};
    const officialName = wikiLine.title || line.line_name;
    if (line.line_name !== officialName) altNames.push(line.line_name);
    if (line.line_name_h !== officialName) altNames.push(line.line_name_h);
    if (line.line_name_k !== officialName) altNames.push(line.line_name_k);

    const openLine = openDataLines.find((l) => l.code === opendata[line.code]) || {};

    // TODO check which existing logos don't get assigned to a line or maybe merge the logo to wikipedia repo
    const logoResults = listOfLogos.filter((logo) => logo.text.includes(officialName) || logo.text.includes(line.line_name) || logo.text.includes(line.line_name_h));

    return {
      code: openLine.code || '',
      ekidata_id: line.line_cd,
      name_kanji: officialName,
      name_kana: wikiLine.hiragana || '',
      name_romaji: wikiLine.english || '',
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
