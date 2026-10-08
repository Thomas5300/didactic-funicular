// Stickerbouwer-engine: berekent per sticker een lijst tekenopdrachten (rechthoeken
// en tekst, in mm). Dezelfde opdrachten worden gebruikt voor de PDF (jsPDF) en
// voor het live voorbeeld (SVG), zodat het voorbeeld precies klopt.
// Werkt in de browser (window.Labels) en in Node (module.exports) voor tests.
(function (root) {
  const PT = 25.4 / 72;           // mm per punt
  const MAX_PAGINAS = 5000;
  const TEKST_GAP = 4;            // mm tussen blokken bij automatische barcodehoogte

  const FORMATEN = {
    postnl: { naam: "PostNL 150 × 102 mm (liggend)", b: 150, h: 102 },
    postnlStaand: { naam: "102 × 150 mm (staand)", b: 102, h: 150 },
    inch4x6: { naam: "4 × 6 inch (102 × 152 mm)", b: 101.6, h: 152.4 },
    l102x76: { naam: "102 × 76 mm", b: 102, h: 76 },
    l100x50: { naam: "100 × 50 mm", b: 100, h: 50 },
    l57x32: { naam: "57 × 32 mm", b: 57, h: 32 },
  };

  const STANDAARD = {
    modus: "reeks",               // reeks | lijst | vast
    start: "1000", eind: "1025", stap: 1, prefix: "", suffix: "",
    lijst: "", vasteWaarde: "",
    kopieen: 1,
    breedte: 150, hoogte: 102, marge: 5,
    barcodeType: "CODE128",       // CODE128 | CODE39 | EAN13 | QR | GEEN
    barcodeBreedte: 125, barcodeHoogte: 50, // hoogte 0 = automatisch
    toonWaarde: true, waardeGrootte: 60, waardeVet: true,
    kopTekst: "", kopGrootte: 22, kopVet: true, kopUitlijning: "center",
    voetTekst: "", voetGrootte: 14, voetVet: false, voetUitlijning: "center",
  };

  // ---------- Waarden per sticker ----------

  function waarden(cfg) {
    let lijst;
    if (cfg.modus === "reeks") {
      const start = String(cfg.start).trim(), eind = String(cfg.eind).trim();
      if (!/^\d+$/.test(start) || !/^\d+$/.test(eind)) throw new Error("Start- en eindnummer: alleen cijfers.");
      const s = BigInt(start), e = BigInt(eind), stap = BigInt(Math.max(1, Math.floor(Number(cfg.stap) || 1)));
      if (e < s) throw new Error("Het eindnummer moet groter of gelijk zijn aan het startnummer.");
      const aantal = (e - s) / stap + 1n;
      if (aantal * BigInt(kopieen(cfg)) > BigInt(MAX_PAGINAS)) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
      const breedte = start.startsWith("0") ? start.length : 0; // voorloopnullen behouden
      lijst = [];
      for (let n = s; n <= e; n += stap) {
        const nr = n.toString().padStart(breedte, "0");
        lijst.push({ waarde: (cfg.prefix || "") + nr + (cfg.suffix || ""), nr });
      }
    } else if (cfg.modus === "lijst") {
      lijst = String(cfg.lijst || "").split(/\r?\n/).map((r) => r.trim()).filter(Boolean)
        .map((w) => ({ waarde: w, nr: w }));
      if (!lijst.length) throw new Error("Vul minstens één regel in de lijst in.");
    } else {
      const w = String(cfg.vasteWaarde || "").trim();
      lijst = [{ waarde: w, nr: w }];
    }
    const k = kopieen(cfg);
    if (lijst.length * k > MAX_PAGINAS) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
    const uit = [];
    for (const item of lijst) for (let i = 0; i < k; i++) uit.push(item);
    return uit;
  }

  function kopieen(cfg) {
    return Math.max(1, Math.floor(Number(cfg.kopieen) || 1));
  }

  function vulIn(tekst, ctx) {
    return String(tekst || "").replace(/\{(waarde|nr|n|totaal|datum)\}/g, (_, k) => String(ctx[k] ?? ""));
  }

  // ---------- Barcodes ----------

  function barcode(type, waarde, libs) {
    if (type === "GEEN" || !waarde) return null;
    if (type === "QR") {
      const qrcode = libs.qrcode;
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
      const qr = qrcode(0, "M");
      qr.addData(waarde, "Byte");
      qr.make();
      const n = qr.getModuleCount();
      const matrix = [];
      for (let r = 0; r < n; r++) {
        const rij = [];
        for (let c = 0; c < n; c++) rij.push(qr.isDark(r, c));
        matrix.push(rij);
      }
      return { soort: "2d", matrix };
    }
    const doel = {};
    try {
      libs.JsBarcode(doel, waarde, { format: type, displayValue: false });
    } catch (e) {
      const uitleg = { EAN13: "EAN-13 vraagt 12 of 13 cijfers (met geldig controlecijfer).",
        CODE39: "Code 39 kent alleen hoofdletters, cijfers en - . $ / + % spatie." }[type] || "";
      throw new Error(`"${waarde}" past niet in ${type}. ${uitleg}`.trim());
    }
    const bits = doel.encodings.map((e) => e.data).join("");
    let tekst = waarde;
    if (type === "EAN13" && /^\d{12}$/.test(waarde)) {   // controlecijfer tonen
      const som = [...waarde].reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0);
      tekst = waarde + ((10 - (som % 10)) % 10);
    }
    return { soort: "1d", bits, stil: type === "EAN13" ? 11 : 10, tekst };
  }

  // ---------- Layout ----------

  function tekstBlok(regels, grootte, vet, uitlijning, maxB, meet) {
    regels = regels.filter((r, i, a) => r.length || i < a.length - 1);
    if (!regels.length) return null;
    let s = Number(grootte) || 12;
    const breedst = Math.max(...regels.map((r) => meet(r, s, vet)));
    if (breedst > maxB) s = s * maxB / breedst;       // automatisch verkleinen tot het past
    const hoogte = (0.72 + (regels.length - 1) * 1.2) * s * PT;
    return { type: "tekst", regels, s, vet, uitlijning, hoogte };
  }

  function layout(cfg, item, ctx, libs, meet) {
    const B = Number(cfg.breedte), H = Number(cfg.hoogte), m = Number(cfg.marge) || 0;
    const binnenB = B - 2 * m, binnenH = H - 2 * m;
    const waarschuwingen = [];
    const blokken = [];

    const kop = tekstBlok(vulIn(cfg.kopTekst, ctx).split("\n"), cfg.kopGrootte, cfg.kopVet, cfg.kopUitlijning, binnenB, meet);
    if (kop && cfg.kopTekst.trim()) blokken.push(kop);

    const bc = barcode(cfg.barcodeType, item.waarde, libs);
    let bcBlok = null;
    if (bc) {
      const auto = !(Number(cfg.barcodeHoogte) > 0);
      bcBlok = { type: "barcode", bc, auto, hoogte: auto ? 0 : Number(cfg.barcodeHoogte) };
      blokken.push(bcBlok);
    }
    if (cfg.toonWaarde && item.waarde) {
      const w = tekstBlok([(bc && bc.tekst) || item.waarde], cfg.waardeGrootte, cfg.waardeVet, "center", binnenB, meet);
      if (w) blokken.push(w);
    }
    const voet = tekstBlok(vulIn(cfg.voetTekst, ctx).split("\n"), cfg.voetGrootte, cfg.voetVet, cfg.voetUitlijning, binnenB, meet);
    if (voet && cfg.voetTekst.trim()) blokken.push(voet);

    // Verticale verdeling
    const vast = blokken.reduce((t, b) => t + b.hoogte, 0);
    let y, gap;
    if (bcBlok && bcBlok.auto) {
      gap = blokken.length > 1 ? TEKST_GAP : 0;
      bcBlok.hoogte = binnenH - vast - gap * (blokken.length - 1);
      if (bcBlok.hoogte < 8) waarschuwingen.push("Weinig ruimte voor de barcode: verklein de tekst of kies een groter label.");
      bcBlok.hoogte = Math.max(bcBlok.hoogte, 2);
      y = m;
    } else {
      const vrij = binnenH - vast;
      if (vrij < 0) waarschuwingen.push("De inhoud past niet op het label: verklein tekst of barcode.");
      gap = Math.max(vrij, 0) / (blokken.length + 1);
      y = m + gap;
    }

    const ops = [];
    for (const b of blokken) {
      if (b.type === "tekst") {
        const x = b.uitlijning === "left" ? m : b.uitlijning === "right" ? B - m : B / 2;
        b.regels.forEach((r, i) => ops.push({ t: "tekst", x, y: y + (0.72 + i * 1.2) * b.s * PT,
          tekst: r, s: b.s, vet: !!b.vet, uitlijning: b.uitlijning }));
      } else if (b.bc.soort === "1d") {
        const totaal = Math.min(Number(cfg.barcodeBreedte) || binnenB, binnenB);
        const { bits, stil } = b.bc;
        const bw = totaal / (bits.length + 2 * stil);
        if (bw < 0.25) waarschuwingen.push("De streepjes worden erg dun (< 0,25 mm): maak de barcode breder of de waarde korter.");
        const x0 = (B - totaal) / 2 + stil * bw;
        for (let j = 0; j < bits.length;) {
          if (bits[j] === "1") {
            let k = j;
            while (k < bits.length && bits[k] === "1") k++;
            ops.push({ t: "rect", x: x0 + j * bw, y, w: (k - j) * bw, h: b.hoogte });
            j = k;
          } else j++;
        }
      } else {
        const zijde = Math.min(b.hoogte, binnenB, Number(cfg.barcodeBreedte) || binnenB);
        const n = b.bc.matrix.length, cel = zijde / (n + 4);  // 2 modules stille zone rondom
        const x0 = (B - zijde) / 2 + 2 * cel, y0 = y + (b.hoogte - zijde) / 2 + 2 * cel;
        b.bc.matrix.forEach((rij, r) => {
          for (let c = 0; c < n;) {
            if (rij[c]) {
              let k = c;
              while (k < n && rij[k]) k++;
              ops.push({ t: "rect", x: x0 + c * cel, y: y0 + r * cel, w: (k - c) * cel, h: cel });
              c = k;
            } else c++;
          }
        });
      }
      y += b.hoogte + gap;
    }
    return { ops, waarschuwingen, breedte: B, hoogte: H };
  }

  // ---------- Renderers ----------

  function meetMet(doc) {
    return (tekst, s, vet) => {
      doc.setFont("helvetica", vet ? "bold" : "normal");
      doc.setFontSize(s);
      return doc.getTextWidth(tekst);
    };
  }

  function nieuwDoc(jsPDF, B, H) {
    return new jsPDF({ orientation: B >= H ? "landscape" : "portrait", unit: "mm",
      format: [Math.min(B, H), Math.max(B, H)] });
  }

  function context(item, n, totaal) {
    return { waarde: item.waarde, nr: item.nr, n, totaal, datum: new Date().toLocaleDateString("nl-NL") };
  }

  function tekenPdf(doc, ops) {
    doc.setFillColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    for (const o of ops) {
      if (o.t === "rect") doc.rect(o.x, o.y, o.w, o.h, "F");
      else {
        doc.setFont("helvetica", o.vet ? "bold" : "normal");
        doc.setFontSize(o.s);
        doc.text(o.tekst, o.x, o.y, { align: o.uitlijning, baseline: "alphabetic" });
      }
    }
  }

  function maakPdf(cfg, libs) {
    cfg = Object.assign({}, STANDAARD, cfg);
    const items = waarden(cfg);
    const B = Number(cfg.breedte), H = Number(cfg.hoogte);
    if (!(B >= 10 && H >= 10)) throw new Error("Labelformaat moet minstens 10 × 10 mm zijn.");
    const doc = nieuwDoc(libs.jsPDF, B, H);
    doc.setProperties({ title: "Stickers" });
    const meet = meetMet(doc);
    items.forEach((item, i) => {
      if (i > 0) doc.addPage([Math.min(B, H), Math.max(B, H)], B >= H ? "landscape" : "portrait");
      tekenPdf(doc, layout(cfg, item, context(item, i + 1, items.length), libs, meet).ops);
    });
    return { doc, aantal: items.length };
  }

  // Voorbeeld van sticker nummer `index` (0-based) als SVG-string.
  function voorbeeldSvg(cfg, index, libs, meetDoc) {
    cfg = Object.assign({}, STANDAARD, cfg);
    const items = waarden(cfg);
    const i = Math.min(Math.max(index, 0), items.length - 1);
    const item = items[i];
    const res = layout(cfg, item, context(item, i + 1, items.length), libs, meetMet(meetDoc));
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const anker = { left: "start", center: "middle", right: "end" };
    const delen = res.ops.map((o) => o.t === "rect"
      ? `<rect x="${o.x.toFixed(3)}" y="${o.y.toFixed(3)}" width="${o.w.toFixed(3)}" height="${o.h.toFixed(3)}"/>`
      : `<text x="${o.x.toFixed(2)}" y="${o.y.toFixed(2)}" font-size="${(o.s * PT).toFixed(3)}" font-weight="${o.vet ? 700 : 400}" text-anchor="${anker[o.uitlijning]}">${esc(o.tekst)}</text>`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${res.breedte} ${res.hoogte}" font-family="Helvetica, Arial, sans-serif" shape-rendering="crispEdges">` +
      `<rect width="100%" height="100%" fill="#fff"/><g fill="#000">${delen.join("")}</g></svg>`;
    return { svg, index: i, totaal: items.length, waarschuwingen: res.waarschuwingen };
  }

  const api = { STANDAARD, FORMATEN, MAX_PAGINAS, waarden, maakPdf, voorbeeldSvg };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Labels = api;
})(typeof window !== "undefined" ? window : globalThis);
