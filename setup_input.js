const util = require('util');
const fs = require('fs');
const got = require('got');
const convert = require('html-to-json-data');
const { text, attr, href, group } = require('html-to-json-data/definitions');

async function generateWikipediaList() {
  const wikipediaMainPage = await Promise.all([
    got('https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%81%AE%E9%89%84%E9%81%93%E8%B7%AF%E7%B7%9A%E4%B8%80%E8%A6%A7_%E3%81%82-%E3%81%8B%E8%A1%8C'),
    got('https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%81%AE%E9%89%84%E9%81%93%E8%B7%AF%E7%B7%9A%E4%B8%80%E8%A6%A7_%E3%81%95-%E3%81%AA%E8%A1%8C'),
    got('https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%81%AE%E9%89%84%E9%81%93%E8%B7%AF%E7%B7%9A%E4%B8%80%E8%A6%A7_%E3%81%AF-%E3%82%8F%E8%A1%8C'),
  ]);
  const data = wikipediaMainPage.map((content) => convert(content.body, group('.mw-parser-output li', {
    text: text('a:first-child'),
    title: attr('a:first-child', 'title'),
    line: text(':self'),
    link: href('a:first-child', 'https://ja.wikipedia.org/wiki/'),
  })))
  .reduce((all, page) => all.concat(page), [])
  .filter((line) => line.text);
  return util.promisify(fs.writeFile)('./input/wikipedia/List_of_lines.json', JSON.stringify(data, null, '  '));
}

async function generate() {
  await generateWikipediaList();
}

if (require.main === module) {
  generate();
}
