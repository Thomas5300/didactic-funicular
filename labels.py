"""Barcodelabels (Code 128) als PDF voor een labelprinter.

Elke pagina is één PostNL-label van 150 x 102 mm (liggend).
"""
from io import BytesIO

from reportlab.graphics.barcode import code128
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

PAGE_W, PAGE_H = 150 * mm, 102 * mm
BARCODE_W = 125 * mm          # totale breedte incl. stille zones
BARCODE_H = 50 * mm
BARCODE_TOP_MARGIN = 8 * mm
FONT = "Helvetica-Bold"
FONT_SIZE = 60
MAX_LABELS = 5000


def nummers(start: str, eind: str) -> list[str]:
    """Oplopende nummers van start t/m eind. Voorloopnullen van start blijven behouden."""
    s, e = int(start), int(eind)
    if s < 0 or e < 0:
        raise ValueError("Nummers mogen niet negatief zijn.")
    if e < s:
        raise ValueError("Het eindnummer moet groter of gelijk zijn aan het startnummer.")
    if e - s + 1 > MAX_LABELS:
        raise ValueError(f"Maximaal {MAX_LABELS} labels per keer.")
    breedte = len(start.strip()) if start.strip().startswith("0") else 0
    return [str(n).zfill(breedte) for n in range(s, e + 1)]


def _barcode(waarde: str) -> code128.Code128:
    # Aantal modules meten (barWidth=1, zonder stille zones), dan schalen zodat
    # streepjes + 2 stille zones van 10 modules samen 125 mm breed zijn.
    modules = code128.Code128(waarde, barWidth=1, quiet=False).width
    bw = BARCODE_W / (modules + 20)
    return code128.Code128(waarde, barWidth=bw, barHeight=BARCODE_H,
                           quiet=True, lquiet=10 * bw, rquiet=10 * bw)


def maak_pdf(start: str, eind: str) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    c.setTitle(f"Barcodelabels {start}-{eind}")
    for nr in nummers(start, eind):
        bc = _barcode(nr)
        x = (PAGE_W - bc.width) / 2
        y = PAGE_H - BARCODE_TOP_MARGIN - BARCODE_H
        bc.drawOn(c, x, y)

        c.setFont(FONT, FONT_SIZE)
        # Tekst gecentreerd in de ruimte onder de barcode.
        tekst_y = (y - FONT_SIZE * 0.72) / 2
        c.drawCentredString(PAGE_W / 2, tekst_y, nr)
        c.showPage()
    c.save()
    return buf.getvalue()


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        sys.exit("Gebruik: python labels.py STARTNUMMER EINDNUMMER")
    a, b = sys.argv[1], sys.argv[2]
    pad = f"labels_{a}-{b}.pdf"
    with open(pad, "wb") as f:
        f.write(maak_pdf(a, b))
    print(f"Opgeslagen: {pad}")
