# Stickerbouwer

Gratis online stickerontwerper van **Thomas-IT** voor labelprinters. Volledig statisch: de PDF wordt in de browser gemaakt, er is geen server nodig.
Vragen: [info@thomas-it.nl](mailto:info@thomas-it.nl)

## Mogelijkheden

- **Zelf ontwerpen**: zet onderdelen vrij op het label, versleep ze en verander de grootte met de muis (of touch).
  - Tekstvakken (meerdere), barcodes (Code 128, Code 39, EAN-13), QR-codes, kaders, lijnen en afbeeldingen/logo's.
  - Per onderdeel: positie en grootte in mm, uitlijnen op het label (links/midden/rechts, boven/midden/onder, volle breedte).
  - Tekst: lettertype, grootte, vet, wit-op-zwart, uitlijning in het vak, regels laten teruglopen, automatisch verkleinen.
  - Raster en hulplijnen (randen, midden, andere onderdelen), ongedaan maken/opnieuw, dupliceren, lagen.
- **Drie modi voor de inhoud**
  - *Reeks*: oplopende nummers met voorvoegsel, achtervoegsel en stap. Voorloopnullen blijven behouden.
  - *Lijst*: één sticker per regel (ook te plakken uit Excel).
  - *Vast*: één ontwerp, N keer — ook zonder barcode.
- **Variabelen** in tekst en barcodes: `{waarde}`, `{nr}`, `{n}`, `{totaal}`, `{datum}`, `{barcode}`.
- **Labelformaten**: PostNL 150×102 (standaard), 102×150, 4×6 inch, 102×76, 100×50, 57×32 of eigen maat; draaien en meeschalen.
- **Sjablonen**: vier voorbeeldontwerpen, eigen sjablonen opslaan in de browser, exporteren/importeren als `.json`.
- Instellingen uit de vorige versie worden automatisch omgezet naar het nieuwe ontwerp.

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

## Afdrukken

Druk af op **werkelijke grootte / 100%** (niet "passend maken"), met het papierformaat van je label.

Bibliotheken (in `public/vendor`): jsPDF, JsBarcode, qrcode-generator — alle MIT-licentie.
