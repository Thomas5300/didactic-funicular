// Stickerbouwer-engine.
// Een ontwerp is een lijst onderdelen (tekst, barcode/QR, kader, afbeelding) met elk een
// eigen positie en grootte in mm. Per sticker worden daar tekenopdrachten van gemaakt; die
// gaan zowel naar de PDF (jsPDF) als naar het voorbeeld (SVG), zodat beide precies gelijk zijn.
// Werkt in de browser (window.Labels) en in Node (module.exports) voor tests.
(function (root) {
  const PT = 25.4 / 72;                 // mm per punt
  const CAP = 0.72, LH = 1.2, DESC = 0.21; // hoofdletterhoogte, regelafstand, onderstok (× korps)
  const MAX_PAGINAS = 5000;

  const FORMATEN = {
    postnl: { naam: "PostNL 150 × 102 mm (liggend)", b: 150, h: 102 },
    postnlStaand: { naam: "102 × 150 mm (staand)", b: 102, h: 150 },
    inch4x6: { naam: "4 × 6 inch (102 × 152 mm)", b: 101.6, h: 152.4 },
    l102x76: { naam: "102 × 76 mm", b: 102, h: 76 },
    l100x50: { naam: "100 × 50 mm", b: 100, h: 50 },
    l57x32: { naam: "57 × 32 mm", b: 57, h: 32 },
  };

  const LETTERTYPEN = {
    helvetica: { naam: "Helvetica", css: "Helvetica, Arial, sans-serif" },
    courier: { naam: "Courier", css: '"Courier New", Courier, monospace' },
    times: { naam: "Times", css: '"Times New Roman", Times, serif' },
  };

  const TYPE_STANDAARD = {
    tekst: { naam: "Tekst", w: 60, h: 14, tekst: "Tekst", lettertype: "helvetica", grootte: 24, vet: false,
      kleur: "zwart", uitlijning: "center", verticaal: "middle", terugloop: true, passend: true },
    barcode: { naam: "Barcode", w: 80, h: 30, inhoud: "{waarde}", symbologie: "CODE128", stilleZones: true },
    kader: { naam: "Kader", w: 60, h: 30, dikte: 0.5, gevuld: false },
    afbeelding: { naam: "Afbeelding", w: 30, h: 30, data: "", imgB: 1, imgH: 1 },
  };

  const INHOUD_STANDAARD = {
    modus: "reeks", start: "1000", eind: "1025", stap: 1, prefix: "", suffix: "",
    lijst: "", vasteWaarde: "", kopieen: 1, marge: 4,
  };

  const STARTERS = {
    nummer: {
      naam: "Nummerlabel — barcode met groot nummer", breedte: 150, hoogte: 102,
      elementen: [
        { type: "barcode", naam: "Barcode", x: 12.5, y: 8, w: 125, h: 50 },
        { type: "tekst", naam: "Nummer", x: 5, y: 58, w: 140, h: 44, tekst: "{waarde}", grootte: 60, vet: true, terugloop: false },
      ],
    },
    logistiek: {
      naam: "Barcode linksboven met informatie", breedte: 150, hoogte: 102,
      elementen: [
        { type: "kader", naam: "Rand", x: 2, y: 2, w: 146, h: 98, dikte: 0.6 },
        { type: "barcode", naam: "Barcode", x: 5, y: 6, w: 85, h: 28 },
        { type: "tekst", naam: "Nummer", x: 5, y: 36, w: 85, h: 14, tekst: "{waarde}", grootte: 28, vet: true, terugloop: false },
        { type: "tekst", naam: "Bedrijfsnaam", x: 94, y: 6, w: 51, h: 12, tekst: "Bedrijfsnaam", grootte: 16, vet: true, uitlijning: "left", verticaal: "top" },
        { type: "tekst", naam: "Info rechts", x: 94, y: 20, w: 51, h: 30, tekst: "Afdeling / locatie\nExtra informatie", grootte: 11, uitlijning: "left", verticaal: "top" },
        { type: "kader", naam: "Scheidingslijn", x: 2, y: 54, w: 146, h: 0.6, gevuld: true },
        { type: "tekst", naam: "Omschrijving", x: 6, y: 58, w: 138, h: 26, tekst: "Omschrijving of opmerking die op elke sticker hetzelfde is", grootte: 16, uitlijning: "left", verticaal: "top" },
        { type: "tekst", naam: "Voettekst", x: 6, y: 88, w: 138, h: 8, tekst: "Sticker {n} van {totaal} · {datum}", grootte: 10, uitlijning: "right", verticaal: "bottom" },
      ],
    },
    qr: {
      naam: "QR-code met tekst (100 × 50 mm)", breedte: 100, hoogte: 50,
      elementen: [
        { type: "barcode", naam: "QR-code", x: 3, y: 3, w: 44, h: 44, symbologie: "QR" },
        { type: "tekst", naam: "Waarde", x: 50, y: 5, w: 47, h: 14, tekst: "{waarde}", grootte: 18, vet: true, uitlijning: "left", verticaal: "top" },
        { type: "tekst", naam: "Info", x: 50, y: 22, w: 47, h: 23, tekst: "Scan de code voor meer informatie", grootte: 11, uitlijning: "left", verticaal: "top" },
      ],
    },
    info: {
      naam: "Info-sticker zonder barcode", breedte: 150, hoogte: 102, modus: "vast",
      elementen: [
        { type: "kader", naam: "Rand", x: 3, y: 3, w: 144, h: 96, dikte: 2 },
        { type: "kader", naam: "Balk", x: 3, y: 3, w: 144, h: 28, gevuld: true },
        { type: "tekst", naam: "Kop", x: 3, y: 3, w: 144, h: 28, tekst: "LET OP", grootte: 48, vet: true, kleur: "wit", terugloop: false },
        { type: "tekst", naam: "Hoofdtekst", x: 8, y: 36, w: 134, h: 36, tekst: "BREEKBAAR", grootte: 80, vet: true, terugloop: false },
        { type: "tekst", naam: "Toelichting", x: 8, y: 76, w: 134, h: 18, tekst: "Voorzichtig behandelen · Deze kant boven", grootte: 18 },
      ],
    },
  };

  // ---------- Ontwerp normaliseren ----------

  let teller = 0;
  function nieuwId() { return "e" + Date.now().toString(36) + (teller++).toString(36); }

  function element(e) {
    const type = TYPE_STANDAARD[e.type] ? e.type : "tekst";
    const uit = Object.assign({ x: 0, y: 0 }, TYPE_STANDAARD[type], e, { type, id: e.id || nieuwId() });
    // Kleuren als hexcode (uit een tussentijdse versie) terugzetten naar zwart/wit.
    if (type === "tekst" && uit.kleur !== "zwart" && uit.kleur !== "wit") uit.kleur = /^#f{6}$/i.test(uit.kleur) ? "wit" : "zwart";
    return uit;
  }

  function standaard() {
    const s = STARTERS.nummer;
    return normaliseer(Object.assign({}, INHOUD_STANDAARD, { breedte: s.breedte, hoogte: s.hoogte, elementen: s.elementen }));
  }

  function normaliseer(cfg) {
    if (!cfg || typeof cfg !== "object") return standaard();
    if (!Array.isArray(cfg.elementen)) cfg = migreer(cfg);
    const uit = Object.assign({}, INHOUD_STANDAARD, { breedte: 150, hoogte: 102 }, cfg);
    // Onderdelen en modi die deze versie niet kent (bijv. magazijnlocaties) worden overgeslagen.
    uit.elementen = cfg.elementen.filter((e) => e && TYPE_STANDAARD[e.type]).map(element);
    if (!["reeks", "lijst", "vast"].includes(uit.modus)) uit.modus = "reeks";
    return uit;
  }

  // Zet instellingen van de vorige versie (kop-/voettekst, één barcode) om naar losse onderdelen.
  function migreer(oud) {
    const o = Object.assign({ breedte: 150, hoogte: 102, marge: 5, barcodeType: "CODE128", barcodeBreedte: 125,
      barcodeHoogte: 50, toonWaarde: true, waardeGrootte: 60, waardeVet: true, kopTekst: "", kopGrootte: 22,
      kopVet: true, kopUitlijning: "center", voetTekst: "", voetGrootte: 14, voetVet: false, voetUitlijning: "center" }, oud);
    const B = +o.breedte, H = +o.hoogte, m = +o.marge || 0, bi = B - 2 * m;
    const blok = (tekst, s, vet, uitl) => {
      s = +s || 12;
      return { soort: "tekst", tekst, s, vet, uitl, hoogte: (CAP + (String(tekst).split("\n").length - 1) * LH) * s * PT };
    };
    const blokken = [];
    if (String(o.kopTekst).trim()) blokken.push(blok(o.kopTekst, o.kopGrootte, o.kopVet, o.kopUitlijning));
    if (o.barcodeType !== "GEEN") blokken.push({ soort: "barcode", auto: !(+o.barcodeHoogte > 0), hoogte: +o.barcodeHoogte || 0 });
    if (o.toonWaarde) blokken.push(blok(o.barcodeType === "EAN13" ? "{barcode}" : "{waarde}", o.waardeGrootte, o.waardeVet, "center"));
    if (String(o.voetTekst).trim()) blokken.push(blok(o.voetTekst, o.voetGrootte, o.voetVet, o.voetUitlijning));
    const vast = blokken.reduce((t, b) => t + b.hoogte, 0);
    const bc = blokken.find((b) => b.soort === "barcode");
    let y, gap;
    if (bc && bc.auto) { gap = blokken.length > 1 ? 4 : 0; bc.hoogte = Math.max(H - 2 * m - vast - gap * (blokken.length - 1), 5); y = m; }
    else { gap = Math.max(H - 2 * m - vast, 0) / (blokken.length + 1); y = m + gap; }
    const elementen = [];
    for (const b of blokken) {
      if (b.soort === "barcode") {
        const bw = Math.min(+o.barcodeBreedte || bi, bi);
        if (o.barcodeType === "QR") {
          const z = Math.min(b.hoogte, bw);
          elementen.push({ type: "barcode", naam: "QR-code", x: (B - z) / 2, y: y + (b.hoogte - z) / 2, w: z, h: z, symbologie: "QR" });
        } else {
          elementen.push({ type: "barcode", naam: "Barcode", x: (B - bw) / 2, y, w: bw, h: b.hoogte, symbologie: o.barcodeType });
        }
      } else {
        elementen.push({ type: "tekst", naam: "Tekst", x: m, y, w: bi, h: b.hoogte + DESC * b.s * PT, tekst: b.tekst,
          grootte: b.s, vet: !!b.vet, uitlijning: b.uitl, verticaal: "top", terugloop: false, passend: true });
      }
      y += b.hoogte + gap;
    }
    const uit = { breedte: B, hoogte: H, marge: 4, elementen };
    for (const k of ["modus", "start", "eind", "stap", "prefix", "suffix", "lijst", "vasteWaarde", "kopieen"]) if (k in oud) uit[k] = oud[k];
    return uit;
  }

  // ---------- Waarden per sticker ----------

  function kopieen(cfg) { return Math.max(1, Math.floor(Number(cfg.kopieen) || 1)); }

  function waarden(cfg) {
    let lijst;
    const k = kopieen(cfg);
    if (cfg.modus === "reeks") {
      const start = String(cfg.start).trim(), eind = String(cfg.eind).trim();
      if (!/^\d+$/.test(start) || !/^\d+$/.test(eind)) throw new Error("Start- en eindnummer: alleen cijfers.");
      const s = BigInt(start), e = BigInt(eind), stap = BigInt(Math.max(1, Math.floor(Number(cfg.stap) || 1)));
      if (e < s) throw new Error("Het eindnummer moet groter of gelijk zijn aan het startnummer.");
      if (((e - s) / stap + 1n) * BigInt(k) > BigInt(MAX_PAGINAS)) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
      const breedte = start.startsWith("0") ? start.length : 0; // voorloopnullen behouden
      lijst = [];
      for (let n = s; n <= e; n += stap) {
        const nr = n.toString().padStart(breedte, "0");
        lijst.push({ waarde: (cfg.prefix || "") + nr + (cfg.suffix || ""), nr });
      }
    } else if (cfg.modus === "lijst") {
      lijst = String(cfg.lijst || "").split(/\r?\n/).map((r) => r.trim()).filter(Boolean).map((w) => ({ waarde: w, nr: w }));
      if (!lijst.length) throw new Error("Vul minstens één regel in de lijst in.");
    } else {
      const w = String(cfg.vasteWaarde || "").trim();
      lijst = [{ waarde: w, nr: w }];
    }
    if (lijst.length * k > MAX_PAGINAS) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
    const uit = [];
    for (const item of lijst) for (let i = 0; i < k; i++) uit.push(item);
    return uit;
  }

  function context(item, n, totaal) {
    return { waarde: item.waarde, nr: item.nr, n, totaal, datum: new Date().toLocaleDateString("nl-NL") };
  }

  function vulIn(tekst, ctx) {
    return String(tekst ?? "").replace(/\{(waarde|nr|n|totaal|datum|barcode)\}/g, (_, k) => String(ctx[k] ?? ""));
  }

  // ---------- Barcodes ----------

  function codeer(type, waarde, libs) {
    if (type === "QR") {
      const qrcode = libs.qrcode;
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
      const qr = qrcode(0, "M");
      qr.addData(waarde, "Byte");
      qr.make();
      const n = qr.getModuleCount(), matrix = [];
      for (let r = 0; r < n; r++) { const rij = []; for (let c = 0; c < n; c++) rij.push(qr.isDark(r, c)); matrix.push(rij); }
      return { soort: "2d", matrix, tekst: waarde };
    }
    const doel = {};
    try {
      libs.JsBarcode(doel, waarde, { format: type, displayValue: false });
    } catch (e) {
      const uitleg = { EAN13: "EAN-13 vraagt 12 of 13 cijfers (met geldig controlecijfer).",
        CODE39: "Code 39 kent alleen hoofdletters, cijfers en - . $ / + % spatie." }[type] || "";
      throw new Error(`“${waarde}” past niet in ${type === "EAN13" ? "EAN-13" : type === "CODE39" ? "Code 39" : "Code 128"}. ${uitleg}`.trim());
    }
    let tekst = waarde;
    if (type === "EAN13" && /^\d{12}$/.test(waarde)) {
      const som = [...waarde].reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0);
      tekst = waarde + ((10 - (som % 10)) % 10);
    }
    return { soort: "1d", bits: doel.encodings.map((e) => e.data).join(""), stil: type === "EAN13" ? 11 : 10, tekst };
  }

  // ---------- Tekst in een vak ----------

  function regels(tekst, s, el, meet) {
    const paras = tekst.split("\n");
    if (!el.terugloop) return paras;
    const uit = [];
    for (const p of paras) {
      let regel = "";
      for (const w of p.split(" ")) {
        const test = regel ? regel + " " + w : w;
        if (regel && meet(test, s, el) > el.w) { uit.push(regel); regel = w; } else regel = test;
      }
      uit.push(regel);
    }
    return uit;
  }

  function plaatsTekst(el, tekst, meet) {
    const past = (rg, s) => Math.max(0, ...rg.map((r) => meet(r, s, el))) <= el.w + 0.01
      && (CAP + (rg.length - 1) * LH + DESC) * s * PT <= el.h + 0.01;
    let s = Math.max(Number(el.grootte) || 12, 1);
    let rg = regels(tekst, s, el, meet);
    if (el.passend) while (!past(rg, s) && s > 3) { s *= 0.94; rg = regels(tekst, s, el, meet); }
    return { s, regels: rg, past: past(rg, s) };
  }

  // ---------- Eén sticker naar tekenopdrachten ----------

  function render(cfg, item, ctx, libs, meet, cache) {
    const B = +cfg.breedte, H = +cfg.hoogte;
    const ops = [], waarschuwingen = [], fouten = [];

    // Eerst alle barcodes coderen, zodat {barcode} in teksten bekend is.
    const codes = new Map();
    for (const el of cfg.elementen) {
      if (el.type !== "barcode") continue;
      const inhoud = vulIn(el.inhoud, ctx).trim();
      if (!inhoud) { codes.set(el.id, null); continue; }
      try { codes.set(el.id, codeer(el.symbologie, inhoud, libs)); }
      catch (e) { codes.set(el.id, { fout: e.message }); fouten.push(`${el.naam}: ${e.message}`); }
    }
    const eerste = [...codes.values()].find((c) => c && !c.fout);
    const ctx2 = Object.assign({}, ctx, { barcode: eerste ? eerste.tekst : ctx.waarde });

    for (const el of cfg.elementen) {
      const x = +el.x, y = +el.y, w = +el.w, h = +el.h;
      if (x < -0.05 || y < -0.05 || x + w > B + 0.05 || y + h > H + 0.05) waarschuwingen.push(`“${el.naam}” valt (deels) buiten het label.`);

      if (el.type === "kader") {
        ops.push({ t: "kader", x, y, w, h, dikte: Math.max(+el.dikte || 0.3, 0.05), gevuld: !!el.gevuld });
      } else if (el.type === "afbeelding") {
        if (!el.data) continue;
        const r = Math.min(w / el.imgB, h / el.imgH), dw = el.imgB * r, dh = el.imgH * r;
        ops.push({ t: "img", data: el.data, alias: el.id + "-" + el.data.length, x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh });
      } else if (el.type === "barcode") {
        const c = codes.get(el.id);
        if (!c) continue;
        if (c.fout) { ops.push({ t: "fout", x, y, w, h }); continue; }
        if (c.soort === "1d") {
          const q = el.stilleZones ? c.stil : 0, bw = w / (c.bits.length + 2 * q), x0 = x + q * bw;
          if (bw < 0.25) waarschuwingen.push(`“${el.naam}”: streepjes erg dun (${bw.toFixed(2)} mm). Maak de barcode breder of de waarde korter.`);
          for (let j = 0; j < c.bits.length;) {
            if (c.bits[j] === "1") {
              let k = j;
              while (k < c.bits.length && c.bits[k] === "1") k++;
              ops.push({ t: "rect", x: x0 + j * bw, y, w: (k - j) * bw, h });
              j = k;
            } else j++;
          }
        } else {
          const z = Math.min(w, h), n = c.matrix.length, q = el.stilleZones ? 2 : 0, cel = z / (n + 2 * q);
          if (cel < 0.3) waarschuwingen.push(`“${el.naam}”: QR-code is erg klein. Maak hem groter of de inhoud korter.`);
          const x0 = x + (w - z) / 2 + q * cel, y0 = y + (h - z) / 2 + q * cel;
          c.matrix.forEach((rij, r) => {
            for (let k = 0; k < n;) {
              if (rij[k]) {
                let e = k;
                while (e < n && rij[e]) e++;
                ops.push({ t: "rect", x: x0 + k * cel, y: y0 + r * cel, w: (e - k) * cel, h: cel });
                k = e;
              } else k++;
            }
          });
        }
      } else {
        const tekst = vulIn(el.tekst, ctx2);
        if (!tekst.trim()) continue;
        const sleutel = [el.id, tekst, w, h, el.grootte, el.lettertype, el.vet, el.terugloop, el.passend].join("\u0001");
        let p = cache && cache.get(sleutel);
        if (!p) { p = plaatsTekst(el, tekst, meet); if (cache) cache.set(sleutel, p); }
        if (!p.past) waarschuwingen.push(`Tekst in “${el.naam}” past niet in het vak.`);
        else if (p.s < 5) waarschuwingen.push(`Tekst in “${el.naam}” wordt erg klein (${p.s.toFixed(1)} pt). Maak het vak groter.`);
        const sp = p.s * PT, n = p.regels.length;
        const b0 = el.verticaal === "top" ? y + CAP * sp
          : el.verticaal === "bottom" ? y + h - DESC * sp - (n - 1) * LH * sp
          : y + (h - (CAP + (n - 1) * LH) * sp) / 2 + CAP * sp;
        const tx = el.uitlijning === "left" ? x : el.uitlijning === "right" ? x + w : x + w / 2;
        p.regels.forEach((r, i) => ops.push({ t: "tekst", x: tx, y: b0 + i * LH * sp, tekst: r, s: p.s, vet: !!el.vet,
          lettertype: LETTERTYPEN[el.lettertype] ? el.lettertype : "helvetica", uitlijning: el.uitlijning || "center", wit: el.kleur === "wit" }));
      }
    }
    return { ops, waarschuwingen: [...new Set(waarschuwingen)], fouten };
  }

  // ---------- PDF ----------

  function meetMet(doc) {
    return (tekst, s, el) => {
      doc.setFont(LETTERTYPEN[el.lettertype] ? el.lettertype : "helvetica", el.vet ? "bold" : "normal");
      doc.setFontSize(s);
      return doc.getTextWidth(tekst);
    };
  }

  function tekenPdf(doc, ops) {
    for (const o of ops) {
      if (o.t === "rect") { doc.setFillColor(0, 0, 0); doc.rect(o.x, o.y, o.w, o.h, "F"); }
      else if (o.t === "kader") {
        if (o.gevuld) { doc.setFillColor(0, 0, 0); doc.rect(o.x, o.y, o.w, o.h, "F"); }
        else {
          const d = Math.min(o.dikte, o.w / 2, o.h / 2);
          doc.setDrawColor(0, 0, 0); doc.setLineWidth(d);
          doc.rect(o.x + d / 2, o.y + d / 2, o.w - d, o.h - d, "S");
        }
      } else if (o.t === "img") {
        doc.addImage(o.data, o.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG", o.x, o.y, o.w, o.h, o.alias, "FAST");
      } else if (o.t === "tekst") {
        doc.setFont(o.lettertype, o.vet ? "bold" : "normal");
        doc.setFontSize(o.s);
        if (o.wit) doc.setTextColor(255, 255, 255); else doc.setTextColor(0, 0, 0);
        doc.text(o.tekst, o.x, o.y, { align: o.uitlijning, baseline: "alphabetic" });
      }
    }
  }

  function maakPdf(cfgIn, libs) {
    const cfg = normaliseer(cfgIn);
    const items = waarden(cfg);
    const B = +cfg.breedte, H = +cfg.hoogte;
    if (!(B >= 10 && H >= 10)) throw new Error("Labelformaat moet minstens 10 × 10 mm zijn.");
    const liggend = B >= H, formaat = [Math.min(B, H), Math.max(B, H)];
    const doc = new libs.jsPDF({ orientation: liggend ? "landscape" : "portrait", unit: "mm", format: formaat });
    doc.setProperties({ title: "Stickers" });
    const meet = meetMet(doc), cache = new Map();
    items.forEach((item, i) => {
      if (i > 0) doc.addPage(formaat, liggend ? "landscape" : "portrait");
      const r = render(cfg, item, context(item, i + 1, items.length), libs, meet, cache);
      if (r.fouten.length) throw new Error(`Sticker ${i + 1}: ${r.fouten[0]}`);
      tekenPdf(doc, r.ops);
    });
    return { doc, aantal: items.length };
  }

  // ---------- SVG (voorbeeld) ----------

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  const f = (n) => Math.round(n * 1000) / 1000;
  const ANKER = { left: "start", center: "middle", right: "end" };

  function opsNaarSvg(ops) {
    return ops.map((o) => {
      if (o.t === "rect" || (o.t === "kader" && o.gevuld))
        return `<rect x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" fill="#000" shape-rendering="crispEdges"/>`;
      if (o.t === "kader") {
        const d = Math.min(o.dikte, o.w / 2, o.h / 2);
        return `<rect x="${f(o.x + d / 2)}" y="${f(o.y + d / 2)}" width="${f(Math.max(o.w - d, 0))}" height="${f(Math.max(o.h - d, 0))}" fill="none" stroke="#000" stroke-width="${f(d)}"/>`;
      }
      if (o.t === "img")
        return `<image href="${o.data}" x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" preserveAspectRatio="none"/>`;
      if (o.t === "fout")
        return `<g pointer-events="none"><rect x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" fill="#fee2e2" stroke="#dc2626" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>` +
          `<text x="${f(o.x + o.w / 2)}" y="${f(o.y + o.h / 2)}" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${f(Math.min(o.h * 0.5, 10))}" fill="#dc2626">!</text></g>`;
      return `<text x="${f(o.x)}" y="${f(o.y)}" font-size="${f(o.s * PT)}" font-family='${LETTERTYPEN[o.lettertype].css}' font-weight="${o.vet ? 700 : 400}" fill="${o.wit ? "#fff" : "#000"}" text-anchor="${ANKER[o.uitlijning] || "middle"}" xml:space="preserve">${esc(o.tekst)}</text>`;
    }).join("");
  }

  const api = { PT, MAX_PAGINAS, FORMATEN, LETTERTYPEN, TYPE_STANDAARD, STARTERS, INHOUD_STANDAARD,
    nieuwId, element, standaard, normaliseer, migreer, waarden, context, render, meetMet, maakPdf, opsNaarSvg, esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Labels = api;
})(typeof window !== "undefined" ? window : globalThis);
