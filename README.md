# Stickerbouwer voor Zebra-labelprinters

Statische website die PDF's met (barcode)stickers maakt — volledig in de browser, geen server nodig.

## Mogelijkheden

- **Drie modi**
  - *Reeks*: oplopende nummers van start t/m eind, met optioneel voorvoegsel, achtervoegsel en stap. Voorloopnullen blijven behouden (`0001` → `0002`).
  - *Lijst*: één sticker per regel (ook te plakken uit Excel).
  - *Vaste sticker*: één ontwerp, N keer — ook zonder barcode, bijvoorbeeld “BREEKBAAR”.
- **Vaste tekst** boven en onder op elke sticker, meerdere regels, eigen grootte/uitlijning/vet. Variabelen: `{waarde}`, `{nr}`, `{n}`, `{totaal}`, `{datum}`.
- **Barcodes**: Code 128, Code 39, EAN-13 (controlecijfer automatisch), QR-code of geen.
- **Labelformaten**: PostNL 150×102 (standaard), 102×150, 4×6 inch, 102×76, 100×50, 57×32 of eigen maat; label draaien.
- Kopieën per sticker, live voorbeeld per sticker, waarschuwing als iets niet past of te dun wordt.
- **Sjablonen** opslaan in de browser, en exporteren/importeren als `.json`.

Standaardinstelling: PostNL-label 150×102 mm, Code 128 van 125 mm breed (incl. stille zones) × 50 mm hoog, nummer in Helvetica Bold 60 pt.

## Hosten op Cloudflare

**Pages (via GitHub):** Workers & Pages → Create → Pages → koppel deze repo.
- Framework preset: *None*
- Build command: *(leeg)*
- Build output directory: `public`

**Workers (static assets):** `npx wrangler deploy` (gebruikt `wrangler.jsonc`).

## Lokaal testen

```bash
python3 -m http.server -d public 8000
```

## Zonder website (Python/reportlab, alleen de basisreeks)

```bash
pip install reportlab
python labels.py 1000 1050
```

## Afdrukken op de Zebra

Druk af op **werkelijke grootte / 100%** (niet "passend maken"), met het papierformaat van je label.

Bibliotheken (in `public/vendor`): jsPDF, JsBarcode, qrcode-generator — alle MIT-licentie.
