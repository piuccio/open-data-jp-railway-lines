const util = require('util');
const fs = require('fs');
const csv = require('csv-parse');
const tokyoOperators = require('open-data-jp-tokyo-railway-operators/operators.json');
const openDataLines = tokyoOperators.reduce((all, operator) => all.concat(operator.railways), []);
const wikipediaData = require('wikipedia-jp-railway-lines');

async function readCsv(filePath, transform = (x) => x) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(csv({ columns: true }, (err, data) => {
      if (err) reject(err);
      else resolve(transform(data));
    }));
  });
}

async function connectWikipediaLines(lines) {
  let found = 0;
  const data = lines.map((line) => {
    const code = line.line_cd;
    const name = line.line_name;
    const title = wikipediaTitle(code, name);
    if (title) found +=1;

    return `${code},${name},${title || ''}`;
  }).filter(Boolean);
  console.log(`Found ${found} lines on wikipedia, out of ${lines.length}`);

  const csvFile = ['code,ekidata,wikipedia'].concat(data).join('\n');
  return util.promisify(fs.writeFile)('./input/link_code_to_wikipedia.csv', csvFile);
}

function wikipediaTitle(code, name) {
  // Try to match on the exact name
  const exact = wikipediaData.filter((l) => l.title === name);
  if (exact.length === 1) return exact[0].title;
  if (exact.length > 1) console.log('wikipedia duplicates with exact name', code, name, exact);

  const MANUAL = {
    11212: '花輪線',
    11220: '陸羽西線',
    11221: '陸羽東線',
    11319: '宇都宮線 （愛称 : 東日本旅客鉄道）',
    11401: '小海線',
    11409: '大糸線',
    11421: '越美北線',
    11602: 'JR京都線',
    11617: '片町線',
    11625: 'JR東西線',
    31014: '四日市あすなろう鉄道八王子線',
    99633: '神戸電鉄三田線',
    99801: '牟岐線',
    11629: '福知山線',
    11624: '桜島線',
  };
  const manual = wikipediaData.filter((l) => l.title === MANUAL[code]);
  if (manual.length === 1) return manual[0].title;
  if (manual.length > 1) console.log('wikipedia duplicates with manual name', code, name, manual);

  // JR lines won't have the `JR` denomination in wikipedia title
  if (name.startsWith('JR')) {
    const shortName = name.substring(2);
    const jrline = wikipediaData.filter((l) => l.title === shortName && l.extract.includes('JR'));
    if (jrline.length === 1) return jrline[0].title;
    if (jrline.length > 1) console.log('wikipedia duplicates with jr name', code, name, jrline);
  }

  // Osaka metro is called differently
  if (name.startsWith('大阪メトロ')) {
    const differentName = name.replace('大阪メトロ', '大阪市高速電気軌道');
    const osaka = wikipediaData.filter((l) => l.title === differentName);
    if (osaka.length === 1) return osaka[0].title;
    if (osaka.length > 1) console.log('wikipedia duplicates with osaka name', code, name, osaka);
  }

  // Sometimes the name has a longer name
  const partial = wikipediaData.filter((l) => l.title.endsWith(name) || l.title.startsWith(name));
  if (partial.length === 1) return partial[0].title;
  if (partial.length > 1) console.log('wikipedia duplicates with partial name', code, name, partial);

  // Try more loose results from the extract
  const description = wikipediaData.filter((l) => l.extract.includes(name));
  if (description.length === 1) return description[0].title;
  if (description.length > 1) console.log('wikipedia duplicates with description name', code, name, description);
}

async function connectOpenDataLines(lines) {
  let found = 0;
  const data = openDataLines.map((line) => {
    const code = line.code;
    const name = line.name_kanji;
    const ekicodes = ekidataCodes(code, name, lines);
    if (ekicodes) found += 1;
    const codesToCsv = (ekicodes || ['']).join('|');

    return `${code},${name},${codesToCsv}`;
  });
  console.log(`Found ${found} open data lines out of ${openDataLines.length}`);

  const csvFile = ['opendata,ekidata,code'].concat(data.sort()).join('\n');
  return util.promisify(fs.writeFile)('./input/link_code_to_opendata.csv', csvFile);
}

function ekidataCodes(code, name, lines) {
  // Manual map
  const MANUAL = {
    'JR-Central.Tokaido': ['11301'],
    'JR-East.Tokaido': ['11501', '11502', '11503'],
    'Tobu.TobuUrbanPark': ['21004'],
    'JR-East.Chuo': ['11311'],
    // trains on the Joban have different directions but all 3 have local / rapoid trains
    'JR-East.Joban': ['11229', '11230', '11320'],
    'JR-East.JobanLocal': ['11229', '11230', '11320'],
    'JR-East.JobanRapid': ['11229', '11230', '11320'],
    'JR-East.KeihinTohokuNegishi': ['11332', '11307'],
    'JR-East.NambuBranch': ['11303'],
    'JR-East.Kawagoe': ['11322'],
    'JR-East.ChuoRapid': ['11312'],
    'JR-East.ChuoSobuLocal': ['11313'],
    'JR-East.NaritaAbikoBranch': ['11327'],
    'JR-East.NaritaAirportBranch': ['11327'],
    'JR-East.SaikyoKawagoe': ['11321', '11322'],
    'JR-East.SobuRapid': ['11314'],
    'JR-East.Ou': ['11202', '11216'],
    'Keisei.HigashiNarita': ['23001'], // marked together as continuation of the sky access
    'Yagan.AizuKinugawa': ['99341'],
    'HakoneTozan.HakoneTozan': ['99339'],
    'Aizu.Aizu': ['99216'],
    'Chichibu.Chichibu': ['99306'],
    'Hokuso.Hokuso': ['99340'],
    'IzuHakone.Sunzu': ['99502'],
    'Keisei.NaritaSkyAccess': ['23006'],
    'Tobu.KoizumiBranch': ['21012'],
    'TokyoMetro.MarunouchiBranch': ['28002'],
    'JR-East.Hachiko': ['11317', '11318'],
    'KashimaRinkai.OaraiKashima': ['99323'],
    'Ryutetsu.Nagareyama': ['99333'],
    'Tobu.TobuSkytree': ['21002'],
    'Tobu.TobuSkytreeBranch': ['21002'],
    'Toei.Arakawa': ['99305'],
    'TokyoMonorail.HanedaAirport': ['99336'],
  };
  if (MANUAL[code]) return MANUAL[code];

  // Some operators don't have a prefix
  const operatorPrefix = {
    'TokyoMetro.': '東京メトロ',
    'Keio.': '京王',
    'Seibu.': '西武',
    'Keikyu.': '京急',
    'JR-East.': 'JR',
    'JR-Central.': 'JR',
    'Tobu.': '東武',
    'Keisei.': '京成',
    'Odakyu.': '小田急',
    'Toei': '都営',
  };
  for (const [operator, prefix] of Object.entries(operatorPrefix)) {
    if (code.startsWith(operator)) {
      const differentName = `${prefix}${name}`;
      const withPrefix = lines.filter((l) => l.line_name === differentName || l.line_name_h === differentName);
      if (withPrefix.length === 1) return [withPrefix[0].line_cd];
      if (withPrefix.length > 1) console.log('opendata duplicates with withPrefix name', code, name, withPrefix);
    }
  }

  // Try to match on the exact name
  const exact = lines.filter((l) => l.line_name === name || l.line_name_h === name);
  if (exact.length === 1) return [exact[0].line_cd];
  if (exact.length > 1) console.log('opendata duplicates with exact name', code, name, exact);
}

async function generate() {
  const lines = await readCsv('./input/line20180424free.csv');
  const interesting = lines.filter((l) => l.e_status === '0');

  await connectWikipediaLines(interesting);
  await connectOpenDataLines(interesting);
}

if (require.main === module) {
  generate();
}
