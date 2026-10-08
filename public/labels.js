// Barcodelabels (Code 128) voor een Zebra-labelprinter.
// Elke pagina is één PostNL-label van 150 x 102 mm (liggend).
// Werkt in de browser (window.maakLabelsPdf) en in Node (module.exports) voor tests.
(function (root) {
  const PAGE_W = 150, PAGE_H = 102;      // mm
  const BARCODE_W = 125;                 // mm, incl. stille zones
  const BARCODE_H = 50;                  // mm
  const BARCODE_TOP = 8;                 // mm
  const QUIET = 10;                      // modules per stille zone
  const FONT_SIZE = 60;                  // pt
  const PT = 25.4 / 72;                  // mm per pt
  const MAX_LABELS = 5000;

  function nummers(start, eind) {
    start = String(start).trim();
    eind = String(eind).trim();
    if (!/^\d+$/.test(start) || !/^\d+$/.test(eind)) throw new Error("Vul alleen cijfers in.");
    const s = BigInt(start), e = BigInt(eind);
    if (e < s) throw new Error("Het eindnummer moet groter of gelijk zijn aan het startnummer.");
    if (e - s + 1n > BigInt(MAX_LABELS)) throw new Error(`Maximaal ${MAX_LABELS} labels per keer.`);
    const breedte = start.startsWith("0") ? start.length : 0; // voorloopnullen behouden
    const lijst = [];
    for (let n = s; n <= e; n++) lijst.push(n.toString().padStart(breedte, "0"));
    return lijst;
  }

  function code128Modules(JsBarcode, waarde) {
    const doel = {};
    JsBarcode(doel, waarde, { format: "CODE128" });
    return doel.encodings.map((enc) => enc.data).join(""); // "1101001..."
  }

  function maakLabelsPdf(start, eind, libs) {
    const { jsPDF, JsBarcode } = libs || root;
    const lijst = nummers(start, eind);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_H, PAGE_W] });
    doc.setProperties({ title: `Barcodelabels ${start}-${eind}` });

    lijst.forEach((nr, i) => {
      if (i > 0) doc.addPage([PAGE_H, PAGE_W], "landscape");
      const bits = code128Modules(JsBarcode, nr);
      const bw = BARCODE_W / (bits.length + 2 * QUIET);   // breedte per module
      let x = (PAGE_W - BARCODE_W) / 2 + QUIET * bw;
      const y = BARCODE_TOP;
      doc.setFillColor(0, 0, 0);
      // Opeenvolgende 1-en samenvoegen tot één balk.
      for (let j = 0; j < bits.length; ) {
        if (bits[j] === "1") {
          let k = j;
          while (k < bits.length && bits[k] === "1") k++;
          doc.rect(x + j * bw, y, (k - j) * bw, BARCODE_H, "F");
          j = k;
        } else j++;
      }
      // Nummer gecentreerd in de ruimte onder de barcode.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(FONT_SIZE);
      const onder = PAGE_H - (BARCODE_TOP + BARCODE_H);           // ruimte onder barcode
      const basislijn = PAGE_H - (onder - FONT_SIZE * PT * 0.72) / 2;
      doc.text(nr, PAGE_W / 2, basislijn, { align: "center", baseline: "alphabetic" });
    });
    return doc;
  }

  const api = { maakLabelsPdf, nummers, MAX_LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
