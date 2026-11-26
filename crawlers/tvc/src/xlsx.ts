import { inflateRawSync } from 'node:zlib';

/** Files of a ZIP archive by name (stored or deflated entries only, which is all XLSX uses). */
export function unzip(archive: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  // End of central directory: signature 0x06054b50, searched backwards past an optional comment.
  let end = -1;
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65_557); offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('not a ZIP archive');
  const count = archive.readUInt16LE(end + 10);
  let entry = archive.readUInt32LE(end + 16);
  for (let index = 0; index < count; index += 1) {
    if (archive.readUInt32LE(entry) !== 0x02014b50) throw new Error('corrupt ZIP central directory');
    const method = archive.readUInt16LE(entry + 10);
    const compressedSize = archive.readUInt32LE(entry + 20);
    const nameLength = archive.readUInt16LE(entry + 28);
    const extraLength = archive.readUInt16LE(entry + 30);
    const commentLength = archive.readUInt16LE(entry + 32);
    const localHeader = archive.readUInt32LE(entry + 42);
    const name = archive.toString('utf8', entry + 46, entry + 46 + nameLength);
    if (archive.readUInt32LE(localHeader) !== 0x04034b50) throw new Error(`corrupt ZIP entry ${name}`);
    const start = localHeader + 30 + archive.readUInt16LE(localHeader + 26) + archive.readUInt16LE(localHeader + 28);
    const data = archive.subarray(start, start + compressedSize);
    if (method === 0) files.set(name, Buffer.from(data));
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`unsupported ZIP compression ${method} for ${name}`);
    entry += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** XML text: entities, then OOXML `_xHHHH_` escapes (e.g. `_x000D_` for CR). */
export function xmlText(raw: string): string {
  return raw
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, name: string) => {
      if (name[0] === '#') {
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return String.fromCodePoint(code);
      }
      return ENTITIES[name] ?? match;
    })
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Concatenated `<t>` runs of a string item, skipping phonetic `<rPh>` hints. */
function runs(xml: string): string {
  const withoutPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let text = '';
  for (const match of withoutPhonetic.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)) {
    text += xmlText(match[1] ?? '');
  }
  return text;
}

function columnIndex(reference: string): number {
  let index = 0;
  for (const char of /^[A-Z]+/.exec(reference)?.[0] ?? '') index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

/** Every worksheet of an XLSX workbook as rows of cell strings (sheet file order). */
export function readXlsx(archive: Buffer): string[][][] {
  const files = unzip(archive);
  const shared = files.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => runs(match[1]));
  const sheets = [...files.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(/\d+/.exec(a.slice(14))?.[0]) - Number(/\d+/.exec(b.slice(14))?.[0]));
  return sheets.map((name) => {
    const xml = files.get(name)!.toString('utf8');
    const rows: string[][] = [];
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attributes = cell[1];
        const reference = /\br="([A-Z]+)\d+"/.exec(attributes)?.[1];
        const index = reference ? columnIndex(reference) : cells.length;
        const type = /\bt="(\w+)"/.exec(attributes)?.[1];
        const inner = cell[2] ?? '';
        const value = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        let text = '';
        if (type === 's' && value !== undefined) text = strings[Number(value)] ?? '';
        else if (type === 'inlineStr') text = runs(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '');
        else if (value !== undefined) text = xmlText(value);
        while (cells.length < index) cells.push('');
        cells[index] = text;
      }
      rows.push(cells);
    }
    return rows;
  });
}
