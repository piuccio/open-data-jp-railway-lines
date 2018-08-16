const util = require('util');
const fs = require('fs');
const generateInputData = require('./lib/data');
const flatten = require('array-flatten');

async function generate() {
  const {
    ekiLines,
    ekiStations,
    listOfLogos,
    mapLineCodeToPrefectures,
    mapLineCodeToOpendata,
    mapLineCodeToWikipedia,
    mapOpendataCodeToDetails,
    mapWikipediaTitleToDetails,
  } = await generateInputData();

  const data = flatten(ekiLines.map((line) => {
    if (line.e_status !== '0') return;
    const altNames = [];
    const wikiTitle = mapLineCodeToWikipedia[line.line_cd] || '';
    const wikiLine = wikiTitle ? mapWikipediaTitleToDetails[wikiTitle] || {} : {};
    const officialName = wikiLine.title || line.line_name;
    if (line.line_name !== officialName) altNames.push(line.line_name);
    if (line.line_name_h !== officialName) altNames.push(line.line_name_h);
    if (line.line_name_k !== officialName) altNames.push(line.line_name_k);

    // One ekidata code can map to multiple opendata lines
    const openLines = mapLineCodeToOpendata[line.line_cd] || [''];

    // TODO check which existing logos don't get assigned to a line or maybe merge the logo to wikipedia repo
    const logoResults = listOfLogos.filter((logo) => logo.text.includes(officialName) || logo.text.includes(line.line_name) || logo.text.includes(line.line_name_h));

    return openLines.map((openLine) => ({
      code: openLine || '',
      ekidata_id: line.line_cd,
      name_kanji: officialName,
      name_kana: wikiLine.hiragana || '',
      name_romaji: wikiLine.english || '',
      alternative_names: [...new Set(altNames)],
      prefectures: mapLineCodeToPrefectures[line.line_cd] || [],
      logo: logoResults.length === 1 ? logoResults[0].image : '',
    }));
  }).filter(Boolean));

  return util.promisify(fs.writeFile)('./lines.json', JSON.stringify(data, null, '  '));
}

if (require.main === module) {
  generate();
}
