import json
import posixpath
import sys
from io import BytesIO
from xml.etree import ElementTree
from zipfile import ZipFile


def workbook_rows(payload, sheet_name):
    with ZipFile(BytesIO(payload)) as workbook:
        def read_xml(name):
            member = workbook.getinfo(name)
            if member.file_size > 32 * 1024 * 1024:
                raise ValueError(f"Oversized XLSX member: {name}")
            return ElementTree.fromstring(workbook.read(member))

        def plain_text(element):
            return "".join(run.text or "" for run in element.findall("{*}t") + element.findall("{*}r/{*}t"))

        sheets = read_xml("xl/workbook.xml").findall("{*}sheets/{*}sheet")
        sheet = next(entry for entry in sheets if entry.get("name") == sheet_name)
        relationship_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        relationships = read_xml("xl/_rels/workbook.xml.rels").findall("{*}Relationship")
        relationship = next(entry for entry in relationships if entry.get("Id") == relationship_id)
        target = relationship.attrib["Target"]
        sheet_path = posixpath.normpath(target.lstrip("/") if target.startswith("/") else f"xl/{target}")
        if not sheet_path.startswith("xl/worksheets/") or not sheet_path.endswith(".xml"):
            raise ValueError(f"Unexpected XLSX worksheet path: {sheet_path}")
        strings = [plain_text(item) for item in read_xml("xl/sharedStrings.xml").findall("{*}si")]

        def cell_value(cell):
            kind = cell.get("t")
            value = cell.findtext("{*}v", "")
            if kind == "s":
                return strings[int(value)]
            if kind == "inlineStr":
                return plain_text(cell.find("{*}is"))
            return value

        def row_values(row):
            return {cell.attrib["r"].rstrip("0123456789"): cell_value(cell) for cell in row.findall("{*}c")}

        header, *rows = map(row_values, read_xml(sheet_path).findall("{*}sheetData/{*}row"))
        return [{name.strip(): row.get(column, "") for column, name in header.items() if name.strip()}
                for row in rows if any(value.strip() for value in row.values())]


json.dump(workbook_rows(sys.stdin.buffer.read(), sys.argv[1]), sys.stdout, ensure_ascii=False)
