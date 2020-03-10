const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const json2xls = require('json2xls');

module.exports = function() {
  const targetPath = vscode.workspace.getConfiguration('i18nExport').get('localesPath');
  const i18nDirPath = path.resolve(vscode.workspace.rootPath, targetPath);
  const jsonFileRegex = new RegExp(`${targetPath.replace('/', '\\/')}\/([a-z\-]{2,})\/([a-z]+)\.json$`, 'i');

  console.log(jsonFileRegex.toString());

  /**
   * LangEnum = 'en' | 'zh-cn' | 'zh-tw';
   *
   * type LangMap = {
   *  [lang: LangEnum]: {
   *    [key: string]: string
   *  }
   * }
   */
  const langs = {};

  try {
    const jsonFilesPath = walkFilesSync(i18nDirPath, (fname, dirname) => {
      const fullpath = path.join(dirname, fname);

      return /\.json$/.test(fullpath);
    });

    console.log(jsonFilesPath);

    jsonFilesPath.forEach((jfPath) => {
      const match = jfPath.match(jsonFileRegex);

      if (match) {
        const lang = match[1];
        const fname = match[2];
        langs[lang] = langs[lang] || {};

        let rawdata = fs.readFileSync(jfPath);
        let data = JSON.parse(rawdata.toString());

        const flatData = flattenObject(data);

        Object.keys(flatData).forEach((k) => {
          langs[lang][`${fname}.${k}`] = flatData[k];
        });
      }
    });

    if (Object.keys(langs).length === 0) {
      throw new Error('found nothing.');
    }

    // 轉成 excel 模式

    // const xlsData = [];

    const keymap = {};

    Object.keys(langs).reduce((acc, lang) => {
      Object.keys(langs[lang]).forEach((k) => {
        keymap[k] = keymap[k] || {};
        keymap[k][lang] = langs[lang][k] || '';
      });

      return acc;
    }, []);

    const xlsData = Object.keys(keymap).reduce((acc, key) => {
      const val = keymap[key];

      acc.push({
        key,
        ...val,
      });

      return acc;
    }, []);

    const xls = json2xls(xlsData);

    // const savePath = path.join(i18nDirPath, 'langs.xlsx');
    // fs.writeFileSync(savePath, xls, 'binary');
    // vscode.window.showSaveDialog()
    // Display a message box to the user
    // vscode.window.showInformationMessage(`Done! 輸出至 ${savePath}.`);

    vscode.window
      .showSaveDialog({
        saveLabel: 'save',
      })
      .then((saveUri) => {
        const savePath = `${saveUri.path}.xlsx`;

        fs.writeFileSync(savePath, xls, 'binary');

        vscode.window.showInformationMessage(`Done! please check ${savePath}`);
      });
  } catch (err) {
    vscode.window.showErrorMessage(err.message);
  }
};

function is_dir(path) {
  const stats = fs.statSync(path);
  return stats.isDirectory();
}

function is_file(path) {
  const stats = fs.statSync(path);
  return stats.isFile();
}

// function is_link(path) {
//   const stats = fs.statSync(path);
//   return stats.isSymbolicLink();
// }

function walkFilesSync(dirname, filter = undefined) {
  try {
    let files = [];

    fs.readdirSync(dirname).forEach((fname) => {
      const fpath = path.join(dirname, fname);

      if (is_file(fpath)) {
        if ((filter && filter(fname, dirname)) || true) {
          files.push(fpath);
        }
      } else if (is_dir(fpath)) {
        files = files.concat(walkFilesSync(fpath, filter));
      }
    });

    return files;
  } catch (err) {
    throw err;
  }
}

function flattenObject(ob) {
  var toReturn = {};

  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if (typeof ob[i] == 'object' && ob[i] !== null) {
      var flatObject = flattenObject(ob[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}
