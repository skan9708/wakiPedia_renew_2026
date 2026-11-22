"""Excel downloads for staff-only admin lists."""

from io import BytesIO

from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter


EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def admin_excel_response(filename, sheet_name, headers, rows):
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet(sheet_name)
    sheet.freeze_panes = "A2"
    for index, (header, width) in enumerate(headers, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width

    header_cells = []
    for header, _ in headers:
        cell = WriteOnlyCell(sheet, value=header)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="788915")
        header_cells.append(cell)
    sheet.append(header_cells)

    count = 0
    for row in rows:
        cells = []
        for value in row:
            if isinstance(value, str):
                cell = WriteOnlyCell(sheet, value=ILLEGAL_CHARACTERS_RE.sub("", value)[:32767])
                cell.data_type = "s"  # Names and review text must never become formulas.
                cells.append(cell)
            else:
                cells.append(value)
        sheet.append(cells)
        count += 1
    sheet.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{count + 1}"

    output = BytesIO()
    workbook.save(output)
    response = HttpResponse(output.getvalue(), content_type=EXCEL_CONTENT_TYPE)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Cache-Control"] = "no-store"
    return response
