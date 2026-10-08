# Barcodelabels voor Zebra-labelprinter

Statische website die een PDF met Code 128-barcodelabels maakt — volledig in de browser, geen server nodig.

- Formaat: PostNL-label, 150×102 mm liggend, één label per pagina
- Barcode: Code 128, 125 mm breed (incl. stille zones van 10 modules) × 50 mm hoog, gecentreerd bovenin
- Nummer eronder in Helvetica Bold 60 pt
- Voorloopnullen in het startnummer blijven behouden (bijv. `0001` t/m `0050`)
- Maximaal 5000 labels per keer

## Hosten op Cloudflare

**Pages (via GitHub):** Workers & Pages → Create → Pages → koppel deze repo.
- Framework preset: *None*
- Build command: *(leeg)*
- Build output directory: `public`

**Workers (static assets):** `npx wrangler deploy` (gebruikt `wrangler.jsonc`).

## Lokaal testen

```bash
npx serve public     # of: python3 -m http.server -d public
```

## Zonder website (Python/reportlab)

```bash
pip install reportlab
python labels.py 1000 1050
```

## Afdrukken op de Zebra

Druk af op **werkelijke grootte / 100%** (niet "passend maken"), papierformaat 150×102 mm.
