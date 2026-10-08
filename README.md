# Stickerbouwer

Gratis online stickerontwerper van **Thomas-IT** voor labelprinters. Volledig statisch: de PDF wordt in de browser gemaakt, er is geen server nodig.
Vragen: [info@thomas-it.nl](mailto:info@thomas-it.nl)

## Mogelijkheden

- **Zelf ontwerpen**: zet onderdelen vrij op het label, versleep ze en verander de grootte met de muis (of touch).
  - Tekstvakken (meerdere), barcodes (Code 128, Code 39, EAN-13), QR-codes, kaders, lijnen en afbeeldingen/logo's.
  - Per onderdeel: positie en grootte in mm, uitlijnen op het label (links/midden/rechts, boven/midden/onder, volle breedte).
  - Tekst: lettertype, grootte, vet, wit-op-zwart, uitlijning in het vak, regels laten teruglopen, automatisch verkleinen.
  - Raster en hulplijnen (randen, midden, andere onderdelen), ongedaan maken/opnieuw, dupliceren, lagen.
- **Vier modi voor de inhoud**
  - *Reeks*: oplopende nummers met voorvoegsel, achtervoegsel en stap. Voorloopnullen blijven behouden.
  - *Lijst*: één sticker per regel (ook te plakken uit Excel), met optioneel meerdere kolommen (tab of `;`) en een kopregel.
    Gebruik kolommen in tekst én barcodes als `{1}`, `{2}` of `{Kolomnaam}` — bijv. scannercommando's
    (`e;Stoppen / terug`, `/;Stoppen / afsluiten`, `Z001;Crossdock zone`) of gebruikers (`Naam;Gebruiker;Wachtwoord`).
  - *Vast*: één ontwerp, N keer — ook zonder barcode.
  - *Locaties*: magazijnlocaties opgebouwd uit segmenten (bijv. Gang `AA`, Stelling `01–05`, Niveau `00`, Positie `00–01`).
    Kies welk segment samen op één sticker komt (bijv. `AA 01 00 00` + `AA 01 00 01`, volgende sticker `AA 02 00 00` + `AA 02 00 01`),
    of juist één locatie per sticker (bijv. alleen `07 LL 01 0`), het scheidingsteken in de tekst, de opbouw van de barcode (bijv. `{1}  {2}{3} {4}` → `07  LL01 0`, spaties tellen mee),
    en per waarde van een segment (bijv. per niveau) een kleur, pijlrichting (↑ ↓ ← →) en aantal pijlen (1–3).
    Segmenten kunnen cijfers (ook aflopend), letters (`AA–AD`) of een lijst (`A,B,D`) zijn.
- **Locatievak**: verdeelt zich automatisch over de locaties van een sticker (naast of onder elkaar). Stijlen:
  *diagonaal* (schuine barcode in een witte band, code linksboven en rechtsonder — zoals op stellingliggers),
  *kleurbalk*, *vol gekleurd* en *streep*; tekstkleur automatisch/zwart/wit, segmentnamen, pijlen en barcode per locatie.
- **Magazijnontwerpen**: diagonaal met 3 niveaus per ligger, diagonaal losse locatie, losse locatie met grote code,
  compact met kleurstreep, posities naast elkaar en niveaus onder elkaar. Optioneel een logo in elk vak.
- **Locaties op A4 (zwart-wit)**: losse locatie met grote code op een half A4 als vouwkaart (zelfde locatie 2× op A4,
  bovenste helft op z'n kop — dubbelvouwen en aan beide kanten leesbaar), 2 per A4 om door te knippen, of op een heel A4.
  Op grote labels komt de code automatisch op twee regels (bijv. `07 AA` / `01 0`) zodat hij zo groot mogelijk is.
  Het locatievak heeft een zwart-witstand voor zwart-witprinters. In Locaties-modus kun je ook `{code}`, `{bc}` en
  de segmentnamen (bijv. `{Gang}`) in tekstvakken gebruiken.
- **Borden en waarschuwingen**: A4 "LET OP! — CAUTION!" voor losse goederen achter een pallet (NL/EN, liggend en staand, zwart-wit),
  met een uitroepteken, een vallende doos of losse dozen naast een pallet als pictogram.
  Onderdeel *Symbool*: waarschuwingsdriehoek (uitroepteken, vallende doos, losse dozen) of 1–3 pijlen in elke richting, als vectorvorm.
- **Scanner en gebruikers**: commandokaart (raster op A5, zoals op de heftruck), commandoblad A4, commandosticker,
  gebruikerslijst A4 (Naam | RF username | RF password, barcode met tekst eronder) en gebruikerspasje (85,6 × 54 mm).
- **Barcodes**: optioneel de waarde als tekst eronder, en een maximale streepdikte zodat korte codes (`e`, `11`) niet worden uitgerekt.
- **Raster op een vel**: eigen indeling (kolommen × rijen) op A4, A5, A6 (staand/liggend), Letter of een eigen maat, met titel en logo boven elk vel; een onvolledige laatste rij wordt uitgevuld over de hele breedte en de inhoud van elk vak wordt gecentreerd.
- **Voor de drukkerij**: afloop (2/3/5 mm) en snijtekens in de PDF; kleuren voor tekst en kaders.
- **Variabelen** in tekst en barcodes: `{waarde}`, `{nr}`, `{n}`, `{totaal}`, `{datum}`, `{barcode}`.
- **Labelformaten** (75, gegroepeerd): verzendlabels (PostNL, 4×6 inch, 100×150, A6 …), thermische rollen in inch en mm,
  Dymo LabelWriter, Brother DK, stelling-/magazijnlabels en papierformaten — of een eigen maat; draaien en meeschalen.
- **A4-vellen**: Avery (L7160, L7163, L7165, L7173, L7651 …) en Avery Zweckform (3474, 3475, 3424, 3425, 3427, 3483 …),
  of een eigen indeling (kolommen × rijen). Begin bij etiket nr. voor halfgebruikte vellen, randen tonen voor een proefprint;
  elk etiket wordt bijgesneden tot zijn eigen vak.
- **Sjablonen**: voorbeeldontwerpen (algemeen en magazijn), eigen sjablonen opslaan in de browser, exporteren/importeren als `.json`.
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
