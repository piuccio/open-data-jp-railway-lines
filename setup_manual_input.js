const util = require('util');
const fs = require('fs');
const querystring = require('querystring');
const csv = require('csv-parse');
const got = require('got');
const tokyoOperators = require('open-data-jp-tokyo-railway-operators/operators.json');
const listOfLines = require('./input/wikipedia/List_of_lines.json');
const splitArray = require('split-array');

const WIKIPEDIA_API = 'https://ja.wikipedia.org/w/api.php?' + [
  'format=json',
  'formatversion=2',
  'action=query',
  'prop=extracts|langlinks',
  'lllang=en',
  'exintro=',
  'explaintext='
].join('&');

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
  const openDataLines = tokyoOperators.reduce((all, operator) => all.concat(operator.railways), []);

  const data = lines.map((line) => {
    if (line.e_status !== '0') return;
    const searchableName = cleanName(line.line_name);
    const wikipediaResults = mergeDuplicates(listOfLines.filter((l) => l.line.includes(searchableName) || l.title.includes(searchableName)));
    const wikiLink = wikipediaResults.length === 1 ? wikipediaResults[0].link : '';
    const wikiTitle = wikiLink ? querystring.unescape(wikiLink.substring(wikiLink.lastIndexOf('/') + 1)) : '';
    const operatorResults = openDataLines.filter((l) => searchableName.includes(l.name_kanji));
    const openData = operatorResults.length === 1 ? operatorResults[0] : {};
    return {
      id: line.line_cd,
      line_name: line.line_name,
      wikiTitle,
      od_kanji: openData.kanji,
      od_en: openData.name_romaji,
      code: openData.code,
    };
  }).filter(Boolean);

  for (const chunk of splitArray(data.filter((i) => i.wikiTitle), 10)) {
    const { body } = await got(`${WIKIPEDIA_API}&titles=${chunk.map((c) => querystring.escape(c.wikiTitle)).join('|')}`);
    const { query } = JSON.parse(body);
    query.pages.forEach((page) => {
      const { title, extract, langlinks = [] } = page;
      const enLangLink = langlinks.find((lang) => lang.lang === 'en') || {};
      const englishName = cleanRomaji(enLangLink.title || '');
      const hiraganaMatch = extract.match(/([^（]+)（([^）]+)）/); // format is always line name, japanese brackets with hiragana
      const lineData = data.find((api) => api.wikiTitle === title);
      lineData.wikiTitle = title;
      lineData.en = englishName;
      lineData.kana = hiraganaMatch ? hiraganaMatch[2] : '';
    });
  }
  const CSV_HEADER = 'id,line_name,alt_name,en,kana,code';
  const csfFile = [CSV_HEADER, ...data.map(toCSV)].join('\n');
  return util.promisify(fs.writeFile)('./input/template_manual_corrections.csv', csfFile);
}

function cleanName(name) {
  return name
    .replace('JR', '')
    .replace(/\(.+～.+\)$/, '');
}

function cleanRomaji(name) {
  return name.replace(/ō/g, 'o').replace(/Ō/g, 'O').replace(/ū/g, 'u').split('#').pop();
}

function toCSV(object) {
  return [object.id, object.line_name, object.wikiTitle, object.en, object.kana, object.code].join(',');
}

function mergeDuplicates(list) {
  if (list.length < 2) return list;
  return list.filter((item, index) => list.findIndex((clone) => clone.link === item.link) === index);
}

if (require.main === module) {
  generate();
}
