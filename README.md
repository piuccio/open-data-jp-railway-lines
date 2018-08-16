## List of Japanese railway lines

The list of railways is generated using [ekidata](http://www.ekidata.jp/doc/line.php) data and integrated with information coming from [Wikipedia](
https://ja.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E3%81%AE%E9%89%84%E9%81%93%E8%B7%AF%E7%B7%9A%E4%B8%80%E8%A6%A7_%E3%81%82-%E3%81%8B%E8%A1%8C)

Naming the railways is not consistent across sources, and some manual effort was necessary to link the data, however the dataset is not complete.

### Usage

Just grab the file `lines.json` it has a list of objects with the structure

```json
{
  "code": "JR-East.Sobu",
  "ekidata_id": "11314",
  "name_kanji": "総武本線",
  "name_kana": "そうぶほんせん",
  "name_romaji": "Sobu Main Line",
  "alternative_names": [
    "JR総武本線",
    "ソウブホンセン"
  ],
  "prefectures": [
    "13",
    "12"
  ],
  "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/JR_JO_line_symbol.svg/28px-JR_JO_line_symbol.svg.png"
}
```

Note that two keys are used, `ekidata_id` is the unique ID in the ekidata dataset, `code` is manually generated and matches the [Open Data naming conventions](https://developer-tokyochallenge.odpt.org/en/documents#_naming_rules_for_railway_line_names).
Due to inconsistencies between the two dataseta, the exported file does not enforce uniqueness of either of these keys, however lines are unique considering the tuple `(ekidata_id, code)`.

For example the Marunouchi is considered as a single line in ekidata but it's represented as two separate branches in Open Data (Main and Honancho branch). `lines.json` contains two elements with different `code` but same `ekidata_id`.

## Contributing

The manual data is inside `./input/link_code_to_opendata.csv` and `./input/link_code_to_wikipedia`, you can send pull requests changing that file.

If you want to generate the data locally, run `npm start`. If you instead want to help translating lines to English have a look at the repository https://github.com/piuccio/wikipedia-jp-railway-lines


## Related links

More [open data repositories](https://github.com/piuccio?utf8=%E2%9C%93&tab=repositories&q=open-data-jp&type=&language=).
