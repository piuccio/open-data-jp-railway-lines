const util = require('util');
const fs = require('fs');
const csv = require('csv-parse');
const listOfLogos = require('open-data-jp-railway-lines-logo/logos.json');
const wikipediaData = require('wikipedia-jp-railway-lines');
const tokyoOperators = require('open-data-jp-tokyo-railway-operators/operators.json');

async function readCsv(filePath, transform = (x) => x) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(csv({ columns: true }, (err, data) => {
      if (err) reject(err);
      else resolve(transform(data));
    }));
  });
}

async function generateInputData() {
  const lines = await readCsv('./input/line20180424free.csv');
  const stations = await readCsv('./input/station20180330free.csv');
  const linkOpendataCsv = await readCsv('./input/link_code_to_opendata.csv');
  const linkWikipediaCsv = await readCsv('./input/link_code_to_wikipedia.csv');

  const linesPrefectures = {};
  stations.forEach((s) => {
    if (!linesPrefectures[s.line_cd]) {
      linesPrefectures[s.line_cd] = [];
    }
    const prefCode = s.pref_cd.padStart(2, '0');
    if (!linesPrefectures[s.line_cd].includes(prefCode)) {
      linesPrefectures[s.line_cd].push(prefCode);
    }
  });
  const opendata = linkOpendataCsv.reduce((all, link) => {
    // One opendata code can be linked to multiple ekidata lines
    const codes = link.code.split('|');
    codes.forEach((code) => {
      const key = code || '_missing';
      Object.assign(all, {
        [key]: (all[key] || []).concat(link.opendata),
      })
    });
    return all;
  }, {});
  const wikipedia = linkWikipediaCsv.reduce((all, link) => Object.assign(all, {
    [link.code || '_missing']: link.wikipedia,
  }), {});
  const openDataLines = tokyoOperators.reduce((map, operator) => {
    return operator.railways.reduce((all, line) => {
      return Object.assign(all, { [line.code]: line });
    }, map);
  }, {});
  const wikipediaMap = wikipediaData.reduce((all, wiki) => Object.assign(all, {
    [wiki.title]: wiki,
  }), {});

  return {
    ekiLines: lines,
    ekiStations: stations,
    listOfLogos,
    mapLineCodeToPrefectures: linesPrefectures,
    mapLineCodeToOpendata: opendata,
    mapLineCodeToWikipedia: wikipedia,
    mapOpendataCodeToDetails: openDataLines,
    mapWikipediaTitleToDetails: wikipediaMap,
  };
}

module.exports = generateInputData;
