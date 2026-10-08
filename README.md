# Barcodelabels voor Zebra-labelprinter

Simpele website die een PDF met Code 128-barcodelabels maakt.

- Formaat: PostNL-label, 150×102 mm liggend, één label per pagina
- Barcode: Code 128, ±125 mm breed (incl. stille zones) × 50 mm hoog, gecentreerd bovenin
- Nummer eronder in Helvetica Bold 60 pt
- Voorloopnullen in het startnummer blijven behouden (bijv. `0001` t/m `0050`)

## Starten

```bash
pip install -r requirements.txt
python app.py
```

Open daarna http://localhost:5000, vul start- en eindnummer in en klik **Maak PDF**.

## Zonder website

```bash
python labels.py 1000 1050
```

## Afdrukken op de Zebra

Druk af op **werkelijke grootte / 100%** (niet "passend maken"), papierformaat 150×102 mm.
