'use strict';
const path = require('path');
const fs = require('fs');
const glob = require('glob');

const IMPORT_PATTERN = /( *)#import (.+)/;

const cache = {};

function loadSchemaFile(file) {
  const dir = path.dirname(file);
  if (cache[file]) {
    return cache[file];
  }

  const lines = fs.readFileSync(file, { encoding: 'utf8' }).split('\n');
  const mapps = [];

  let index = 0;
  while (index < lines.length) {
    const mattched = IMPORT_PATTERN.exec(lines[index]);
    if (mattched) {
      const [, indent, filePattern] = mattched;
      const files = glob.sync(filePattern, {
        cwd: dir,
      });
      // 删除占位行
      lines.splice(index, 1);
      for (const file of files) {
        const importFile = path.join(dir, file);
        const child = loadSchemaFile(importFile);
        // 插入新行
        lines.splice(index, 0, ...child.lines.map(ln => indent + ln));
        // 行号在索引号的基础 + 1
        const start = index;
        const end = start + child.lines.length - 1;
        mapps.push({
          indent,
          start,
          end,
          import: child,
        });
        index += child.lines.length;
      }
    } else {
      index++;
    }
  }
  const loaded = {
    lines,
    path: file,
    mapps,
  };
  cache[file] = loaded;
  return loaded;
}

/**
 * 解析代码所在文件位置
 * @param {*} loadedFile gql文件
 * @param {*} line 行号
 * @param {*} column 列号
 * @param {*} from? 来源位置
 * @return {*} 返回 { path, line, column, from? } 格式
 */
function resolveLocation(loadedFile, line, column, from) {
  const oriLine = line;
  const { mapps = [], path } = loadedFile;
  // 要路过的子模块总行数
  const importLines = mapps.filter(p => p.end < oriLine)
    .reduce((total, current) => total + (current.end - current.start), 0);
  // 转换行号，当前文件错误所在行号
  line -= importLines;
  const location = {
    path,
    line,
    column,
    from,
  };

  // 查找错误所在的子模块文件
  const subFile = mapps.find(({ start, end }) => oriLine >= start && oriLine <= end);

  if (!subFile) return location;

  let subColumn = column;
  // 转换列号
  if (subFile.ident) {
    subColumn -= subFile.ident.length;
  }
  // 转换子模块行号
  const subLine = oriLine - subFile.start + 1;
  return resolveLocation(subFile, subLine, subColumn, location);
}

function formatLocation({ path, line, column, from }) {
  let txt = `  at ${path || ''}:${line}:${column}\n`;
  if (from && from.path) {
    txt += formatLocation(from);
  }
  return txt;
}

module.exports = {
  formatLocation,
  loadSchemaFile,
  resolveLocation,
};
