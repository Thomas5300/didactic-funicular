// Stickerbouwer-engine.
// Een ontwerp is een lijst onderdelen (tekst, barcode/QR, kader, afbeelding, locatievak) met elk een
// eigen positie en grootte in mm. Per sticker worden daar tekenopdrachten van gemaakt; die
// gaan zowel naar de PDF (jsPDF) als naar het voorbeeld (SVG), zodat beide precies gelijk zijn.
// Werkt in de browser (window.Labels) en in Node (module.exports) voor tests.
(function (root) {
  const PT = 25.4 / 72;                    // mm per punt
  const CAP = 0.72, LH = 1.2, DESC = 0.21; // hoofdletterhoogte, regelafstand, onderstok (× korps)
  const MAX_PAGINAS = 5000;
  const MAX_PER_STICKER = 24;

  const FORMATEN = {
    postnl: { naam: "PostNL 150 × 102 mm (liggend)", b: 150, h: 102 },
    postnlStaand: { naam: "102 × 150 mm (staand)", b: 102, h: 150 },
    inch4x6: { naam: "4 × 6 inch (102 × 152 mm)", b: 101.6, h: 152.4 },
    l102x76: { naam: "102 × 76 mm", b: 102, h: 76 },
    l100x50: { naam: "100 × 50 mm", b: 100, h: 50 },
    l57x32: { naam: "57 × 32 mm", b: 57, h: 32 },
    st200x50: { naam: "Stellinglabel 200 × 50 mm", b: 200, h: 50 },
    st150x40: { naam: "Stellinglabel 150 × 40 mm", b: 150, h: 40 },
    st80x220: { naam: "Niveaulabel 80 × 220 mm (staand)", b: 80, h: 220 },
    a5: { naam: "A5 liggend (210 × 148 mm)", b: 210, h: 148 },
    a4: { naam: "A4 liggend (297 × 210 mm)", b: 297, h: 210 },
  };

  const LETTERTYPEN = {
    helvetica: { naam: "Helvetica", css: "Helvetica, Arial, sans-serif" },
    courier: { naam: "Courier", css: '"Courier New", Courier, monospace' },
    times: { naam: "Times", css: '"Times New Roman", Times, serif' },
  };

  // Standaardkleuren voor locaties (veelgebruikt bij stellingetiketten).
  const PALET = ["#e53935", "#1e88e5", "#fdd835", "#43a047", "#fb8c00", "#8e24aa", "#6d4c41", "#00acc1", "#d81b60", "#757575"];

  const TYPE_STANDAARD = {
    tekst: { naam: "Tekst", w: 60, h: 14, tekst: "Tekst", lettertype: "helvetica", grootte: 24, vet: false,
      kleur: "#000000", uitlijning: "center", verticaal: "middle", terugloop: true, passend: true },
    barcode: { naam: "Barcode", w: 80, h: 30, inhoud: "{waarde}", symbologie: "CODE128", stilleZones: true },
    kader: { naam: "Kader", w: 60, h: 30, dikte: 0.5, gevuld: false, kleur: "#000000" },
    afbeelding: { naam: "Afbeelding", w: 30, h: 30, data: "", imgB: 1, imgH: 1 },
    locaties: { naam: "Locaties", w: 190, h: 44, richting: "naast", tussenruimte: 3, stijl: "balk", pijl: "geen",
      barcode: "CODE128", barcodeDeel: 45, koppen: true, rand: true },
  };

  const LOCATIE_STANDAARD = {
    segmenten: [
      { naam: "Gang", van: "AA", tot: "AA" },
      { naam: "Stelling", van: "01", tot: "05" },
      { naam: "Niveau", van: "00", tot: "00" },
      { naam: "Positie", van: "00", tot: "01" },
    ],
    groep: 3,            // segment waarvan alle waarden op één sticker komen (-1 = één locatie per sticker)
    scheiding: " ",      // tussen segmenten in de leesbare code
    bcScheiding: "",     // tussen segmenten in de barcode
    kleurSeg: 2,         // segment dat de kleur bepaalt (-1 = één kleur)
    kleur: "#1e88e5",
    kleuren: {},
  };

  const INHOUD_STANDAARD = {
    modus: "reeks", start: "1000", eind: "1025", stap: 1, prefix: "", suffix: "",
    lijst: "", vasteWaarde: "", kopieen: 1, marge: 4, afloop: 0, snijtekens: false,
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
        { type: "tekst", naam: "Kop", x: 3, y: 3, w: 144, h: 28, tekst: "LET OP", grootte: 48, vet: true, kleur: "#ffffff", terugloop: false },
        { type: "tekst", naam: "Hoofdtekst", x: 8, y: 36, w: 134, h: 36, tekst: "BREEKBAAR", grootte: 80, vet: true, terugloop: false },
        { type: "tekst", naam: "Toelichting", x: 8, y: 76, w: 134, h: 18, tekst: "Voorzichtig behandelen · Deze kant boven", grootte: 18 },
      ],
    },
    magazijn: {
      naam: "Magazijn — posities naast elkaar (200 × 50 mm)", breedte: 200, hoogte: 50, modus: "locaties",
      elementen: [
        { type: "locaties", naam: "Locaties", x: 2, y: 2, w: 196, h: 46, richting: "naast", tussenruimte: 3, stijl: "balk", pijl: "omhoog" },
      ],
    },
    magazijnNiveaus: {
      naam: "Magazijn — niveaus onder elkaar (80 × 220 mm)", breedte: 80, hoogte: 220, modus: "locaties",
      locatie: {
        segmenten: [
          { naam: "Gang", van: "AA", tot: "AA" }, { naam: "Stelling", van: "01", tot: "05" },
          { naam: "Niveau", van: "04", tot: "00" }, { naam: "Positie", van: "00", tot: "00" },
        ],
        groep: 2, kleurSeg: 2,
      },
      elementen: [
        { type: "locaties", naam: "Locaties", x: 2, y: 2, w: 76, h: 216, richting: "onder", tussenruimte: 2, stijl: "vol", pijl: "links", barcodeDeel: 42 },
      ],
    },
  };

  // ---------- Kleur ----------

  function hexRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function geldigeKleur(hex, std) { return /^#[0-9a-f]{6}$/i.test(String(hex || "")) ? hex.toLowerCase() : std; }
  function contrast(hex) {
    const [r, g, b] = hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
  }

  // ---------- Ontwerp normaliseren ----------

  let teller = 0;
  function nieuwId() { return "e" + Date.now().toString(36) + (teller++).toString(36); }

  function element(e) {
    const type = TYPE_STANDAARD[e.type] ? e.type : "tekst";
    const uit = Object.assign({ x: 0, y: 0 }, TYPE_STANDAARD[type], e, { type, id: e.id || nieuwId() });
    if (uit.kleur === "zwart") uit.kleur = "#000000";
    if (uit.kleur === "wit") uit.kleur = "#ffffff";
    if (type === "tekst" || type === "kader") uit.kleur = geldigeKleur(uit.kleur, "#000000");
    return uit;
  }

  function locatieInstellingen(l) {
    l = l || {};
    const uit = Object.assign({}, LOCATIE_STANDAARD, l);
    uit.segmenten = (Array.isArray(l.segmenten) ? l.segmenten : LOCATIE_STANDAARD.segmenten).map((s) => ({ naam: "", van: "", tot: "", ...s }));
    uit.kleuren = Object.assign({}, l.kleuren || {});
    uit.groep = Number.isInteger(+uit.groep) && +uit.groep < uit.segmenten.length ? +uit.groep : -1;
    uit.kleurSeg = Number.isInteger(+uit.kleurSeg) && +uit.kleurSeg < uit.segmenten.length ? +uit.kleurSeg : -1;
    uit.kleur = geldigeKleur(uit.kleur, LOCATIE_STANDAARD.kleur);
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
    uit.elementen = cfg.elementen.map(element);
    uit.locatie = locatieInstellingen(cfg.locatie);
    return uit;
  }

  // Zet instellingen van de eerste stickerbouwer-versie (kop-/voettekst, één barcode) om naar losse onderdelen.
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

  // ---------- Locaties ----------

  const letterNaarGetal = (s) => [...s].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 65), 0);
  function getalNaarLetters(n, len) {
    let s = "";
    for (let i = 0; i < len; i++) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s;
  }

  // Alle waarden van één segment: cijferbereik (01–12, ook aflopend), letterbereik (AA–AD) of een lijst (A,B,D).
  function segmentWaarden(s) {
    const naam = s.naam || "segment";
    const van = String(s.van ?? "").trim().toUpperCase();
    const tot = String(s.tot ?? "").trim().toUpperCase() || van;
    if (van.includes(",")) {
      const lijst = van.split(",").map((x) => x.trim()).filter(Boolean);
      if (!lijst.length) throw new Error(`Segment “${naam}”: de lijst is leeg.`);
      return lijst;
    }
    if (!van) throw new Error(`Segment “${naam}”: vul een beginwaarde in.`);
    let uit = [];
    if (/^\d+$/.test(van) && /^\d+$/.test(tot)) {
      const a = parseInt(van, 10), b = parseInt(tot, 10), w = Math.max(van.length, tot.length), stap = a <= b ? 1 : -1;
      if (Math.abs(b - a) >= 1000) throw new Error(`Segment “${naam}”: maximaal 1000 waarden.`);
      for (let n = a; stap > 0 ? n <= b : n >= b; n += stap) uit.push(String(n).padStart(w, "0"));
    } else if (/^[A-Z]+$/.test(van) && /^[A-Z]+$/.test(tot) && van.length === tot.length) {
      const a = letterNaarGetal(van), b = letterNaarGetal(tot), stap = a <= b ? 1 : -1;
      if (Math.abs(b - a) >= 1000) throw new Error(`Segment “${naam}”: maximaal 1000 waarden.`);
      for (let n = a; stap > 0 ? n <= b : n >= b; n += stap) uit.push(getalNaarLetters(n, van.length));
    } else if (van === tot) {
      uit = [van];
    } else {
      throw new Error(`Segment “${naam}”: ${van} t/m ${tot} is geen geldig bereik. Gebruik cijfers (01–12), letters van gelijke lengte (AA–AD) of een lijst met komma's (A,B,D).`);
    }
    return uit;
  }

  // Kleur hangt aan de waarde zelf (gesorteerd), zodat 00 altijd dezelfde kleur heeft, ook bij een aflopend bereik.
  function standaardKleuren(waarden) {
    const uit = {};
    [...new Set(waarden)].sort().forEach((v, i) => { uit[v] = PALET[i % PALET.length]; });
    return uit;
  }

  function locatieStickers(cfg, kopieen) {
    const l = locatieInstellingen(cfg.locatie);
    if (!l.segmenten.length) throw new Error("Voeg minstens één segment toe.");
    const waarden = l.segmenten.map(segmentWaarden);
    const g = l.groep;
    const buiten = l.segmenten.map((_, i) => i).filter((i) => i !== g);
    const aantal = buiten.reduce((t, i) => t * waarden[i].length, 1);
    if (aantal * kopieen > MAX_PAGINAS) throw new Error(`Dit zijn ${aantal * kopieen} stickers; maximaal ${MAX_PAGINAS} per keer.`);
    if (g >= 0 && waarden[g].length > MAX_PER_STICKER) throw new Error(`Maximaal ${MAX_PER_STICKER} locaties per sticker (nu ${waarden[g].length}).`);
    const std = l.kleurSeg >= 0 ? standaardKleuren(waarden[l.kleurSeg]) : {};
    const namen = l.segmenten.map((s) => s.naam);
    const maak = (segs) => ({
      segs: segs.slice(), namen,
      code: segs.join(l.scheiding), bc: segs.join(l.bcScheiding),
      kleur: l.kleurSeg < 0 ? l.kleur : geldigeKleur(l.kleuren[segs[l.kleurSeg]], std[segs[l.kleurSeg]]),
    });
    const uit = [];
    const loop = (d, cur) => {
      if (d === buiten.length) {
        const binnen = g >= 0 ? waarden[g] : [null];
        const locaties = binnen.map((v) => { const s = cur.slice(); if (g >= 0) s[g] = v; return maak(s); });
        uit.push({ waarde: locaties[0].code, nr: locaties[0].code, locaties });
        return;
      }
      const i = buiten[d];
      for (const v of waarden[i]) { cur[i] = v; loop(d + 1, cur); }
    };
    loop(0, new Array(l.segmenten.length));
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
    } else if (cfg.modus === "locaties") {
      lijst = locatieStickers(cfg, k);
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
    return { waarde: item.waarde, nr: item.nr, n, totaal, datum: new Date().toLocaleDateString("nl-NL"), locaties: item.locaties };
  }

  function vulIn(tekst, ctx) {
    return String(tekst ?? "")
      .replace(/\{loc(\d{1,2})\}/g, (_, i) => { const l = ctx.locaties && ctx.locaties[+i - 1]; return l ? l.code : ""; })
      .replace(/\{(waarde|nr|n|totaal|datum|barcode)\}/g, (_, k) => String(ctx[k] ?? ""));
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

  // Tekent een gecodeerde barcode of QR in een vak.
  function tekenCode(r, c, x, y, w, h, stilleZones, naam) {
    if (c.soort === "1d") {
      const q = stilleZones ? c.stil : 0, bw = w / (c.bits.length + 2 * q), x0 = x + q * bw;
      if (bw < 0.25) r.waarschuwingen.push(`“${naam}”: streepjes erg dun (${bw.toFixed(2)} mm). Maak de barcode breder of de waarde korter.`);
      for (let j = 0; j < c.bits.length;) {
        if (c.bits[j] === "1") {
          let k = j;
          while (k < c.bits.length && c.bits[k] === "1") k++;
          r.ops.push({ t: "rect", x: x0 + j * bw, y, w: (k - j) * bw, h });
          j = k;
        } else j++;
      }
    } else {
      const z = Math.min(w, h), n = c.matrix.length, q = stilleZones ? 2 : 0, cel = z / (n + 2 * q);
      if (cel < 0.3) r.waarschuwingen.push(`“${naam}”: QR-code is erg klein. Maak hem groter of de inhoud korter.`);
      const x0 = x + (w - z) / 2 + q * cel, y0 = y + (h - z) / 2 + q * cel;
      c.matrix.forEach((rij, ri) => {
        for (let k = 0; k < n;) {
          if (rij[k]) {
            let e = k;
            while (e < n && rij[e]) e++;
            r.ops.push({ t: "rect", x: x0 + k * cel, y: y0 + ri * cel, w: (e - k) * cel, h: cel });
            k = e;
          } else k++;
        }
      });
    }
  }

  // ---------- Tekst ----------

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

  // Grootste korps (pt) waarbij één regel binnen w × h past.
  function pasKorps(tekst, w, h, vet, meet) {
    if (!tekst || w <= 0 || h <= 0) return 0;
    const b100 = meet(tekst, 100, { vet, lettertype: "helvetica" });
    return Math.max(0, Math.min(b100 > 0 ? (100 * w) / b100 : Infinity, h / ((CAP + 0.06) * PT)));
  }
  function eenRegel(r, tekst, x, y, w, h, s, vet, kleur, uitlijning = "center") {
    if (!tekst || s <= 0) return;
    const tx = uitlijning === "left" ? x : uitlijning === "right" ? x + w : x + w / 2;
    r.ops.push({ t: "tekst", x: tx, y: y + (h - CAP * s * PT) / 2 + CAP * s * PT, tekst, s, vet, lettertype: "helvetica", uitlijning, kleur });
  }

  // ---------- Locatievak ----------

  function pijl(r, richting, x, y, w, h, kleur) {
    const s = Math.min(w, h) * 0.62, cx = x + w / 2, cy = y + h / 2;
    const basis = [[0, -0.5], [0.5, 0], [0.18, 0], [0.18, 0.5], [-0.18, 0.5], [-0.18, 0], [-0.5, 0]];
    const draai = { omhoog: ([a, b]) => [a, b], omlaag: ([a, b]) => [a, -b], links: ([a, b]) => [b, -a], rechts: ([a, b]) => [-b, a] }[richting];
    if (!draai) return;
    r.ops.push({ t: "poly", kleur, pts: basis.map(draai).map(([a, b]) => [cx + a * s, cy + b * s]) });
  }

  function locatieCel(r, el, loc, x, y, w, h, libs, meet) {
    const kleur = loc.kleur || "#000000", tk = contrast(kleur);
    const p = Math.min(w, h) * 0.05;
    let cx = x, cw = w;
    if (el.pijl && el.pijl !== "geen") {
      const aw = Math.min(h * 0.5, w * 0.25);
      r.ops.push({ t: "rect", x, y, w: aw, h, kleur, achtergrond: true });
      pijl(r, el.pijl, x, y, aw, h, tk);
      cx += aw; cw -= aw;
    }
    const metBc = el.barcode && el.barcode !== "GEEN";
    const deel = Math.min(Math.max(+el.barcodeDeel || 45, 15), 75) / 100;
    const bandH = metBc ? h * (1 - deel) : h;
    let tekstKleur = tk;
    if (el.stijl === "vol") r.ops.push({ t: "rect", x: cx, y, w: cw, h, kleur, achtergrond: true });
    else if (el.stijl === "streep") {
      const sw = Math.max(Math.min(cw * 0.05, 6), 2);
      r.ops.push({ t: "rect", x: cx, y, w: sw, h, kleur, achtergrond: true });
      cx += sw; cw -= sw; tekstKleur = "#000000";
    } else r.ops.push({ t: "rect", x: cx, y, w: cw, h: bandH, kleur, achtergrond: true });

    // Code (eventueel per segment met kopje)
    const tx = cx + p, ty = y + p * 0.8, tw = cw - 2 * p, th = bandH - 1.6 * p;
    if (el.koppen && loc.segs.length > 1) {
      const n = loc.segs.length, kw = tw / n, kopH = th * 0.27, waardeH = th - kopH;
      const sKop = Math.min(...loc.namen.map((nm) => pasKorps(String(nm || "").toUpperCase() || " ", kw * 0.9, kopH * 0.8, true, meet)));
      const sWaarde = Math.min(...loc.segs.map((v) => pasKorps(v, kw * 0.88, waardeH * 0.92, true, meet)));
      loc.segs.forEach((v, i) => {
        eenRegel(r, String(loc.namen[i] || "").toUpperCase(), tx + i * kw, ty, kw, kopH, sKop, true, tekstKleur);
        eenRegel(r, v, tx + i * kw, ty + kopH, kw, waardeH, sWaarde, true, tekstKleur);
      });
    } else {
      eenRegel(r, loc.code, tx, ty, tw, th, pasKorps(loc.code, tw * 0.95, th * 0.9, true, meet), true, tekstKleur);
    }

    if (metBc) {
      const by = y + bandH + p * 0.7, bh = h - bandH - p * 1.4;
      if (el.stijl === "vol") r.ops.push({ t: "rect", x: cx + p * 0.6, y: by - p * 0.35, w: cw - 1.2 * p, h: bh + p * 0.7, kleur: "#ffffff" });
      if (bh > 1 && loc.bc) {
        try { tekenCode(r, codeer(el.barcode, loc.bc, libs), cx + p, by, cw - 2 * p, bh, true, el.naam); }
        catch (e) { r.fouten.push(`${el.naam}: ${e.message}`); r.ops.push({ t: "fout", x: cx + p, y: by, w: cw - 2 * p, h: bh }); }
      }
    }
    if (el.rand) r.ops.push({ t: "kader", x, y, w, h, dikte: 0.3, gevuld: false, kleur: "#000000" });
  }

  function tekenLocaties(r, el, ctx, libs, meet) {
    const locs = ctx.locaties && ctx.locaties.length ? ctx.locaties
      : (ctx.waarde ? [{ code: ctx.waarde, bc: ctx.waarde, segs: [ctx.waarde], namen: [""], kleur: "#1e88e5" }] : []);
    const n = locs.length;
    if (!n) return;
    const gap = Math.max(+el.tussenruimte || 0, 0), naast = el.richting !== "onder";
    const cw = naast ? (el.w - gap * (n - 1)) / n : el.w, ch = naast ? el.h : (el.h - gap * (n - 1)) / n;
    if (cw < 5 || ch < 5) { r.waarschuwingen.push(`“${el.naam}”: te weinig ruimte voor ${n} locaties. Maak het vak groter of zet ze ${naast ? "onder" : "naast"} elkaar.`); return; }
    locs.forEach((loc, i) => locatieCel(r, el, loc, naast ? el.x + i * (cw + gap) : el.x, naast ? el.y : el.y + i * (ch + gap), cw, ch, libs, meet));
  }

  // ---------- Eén sticker naar tekenopdrachten ----------

  function render(cfg, item, ctx, libs, meet, cache) {
    const B = +cfg.breedte, H = +cfg.hoogte;
    const r = { ops: [], waarschuwingen: [], fouten: [] };

    // Eerst alle losse barcodes coderen, zodat {barcode} in teksten bekend is.
    const codes = new Map();
    for (const el of cfg.elementen) {
      if (el.type !== "barcode") continue;
      const inhoud = vulIn(el.inhoud, ctx).trim();
      if (!inhoud) { codes.set(el.id, null); continue; }
      try { codes.set(el.id, codeer(el.symbologie, inhoud, libs)); }
      catch (e) { codes.set(el.id, { fout: e.message }); r.fouten.push(`${el.naam}: ${e.message}`); }
    }
    const eerste = [...codes.values()].find((c) => c && !c.fout);
    const ctx2 = Object.assign({}, ctx, { barcode: eerste ? eerste.tekst : ctx.waarde });

    for (const el of cfg.elementen) {
      const x = +el.x, y = +el.y, w = +el.w, h = +el.h;
      if (x < -0.05 || y < -0.05 || x + w > B + 0.05 || y + h > H + 0.05) r.waarschuwingen.push(`“${el.naam}” valt (deels) buiten het label.`);

      if (el.type === "kader") {
        r.ops.push({ t: "kader", x, y, w, h, dikte: Math.max(+el.dikte || 0.3, 0.05), gevuld: !!el.gevuld, kleur: el.kleur, achtergrond: !!el.gevuld });
      } else if (el.type === "afbeelding") {
        if (!el.data) continue;
        const s = Math.min(w / el.imgB, h / el.imgH), dw = el.imgB * s, dh = el.imgH * s;
        r.ops.push({ t: "img", data: el.data, alias: el.id + "-" + el.data.length, x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh });
      } else if (el.type === "barcode") {
        const c = codes.get(el.id);
        if (!c) continue;
        if (c.fout) { r.ops.push({ t: "fout", x, y, w, h }); continue; }
        tekenCode(r, c, x, y, w, h, el.stilleZones, el.naam);
      } else if (el.type === "locaties") {
        tekenLocaties(r, { ...el, x, y, w, h }, ctx, libs, meet);
      } else {
        const tekst = vulIn(el.tekst, ctx2);
        if (!tekst.trim()) continue;
        const sleutel = [el.id, tekst, w, h, el.grootte, el.lettertype, el.vet, el.terugloop, el.passend].join("\u0001");
        let p = cache && cache.get(sleutel);
        if (!p) { p = plaatsTekst(el, tekst, meet); if (cache) cache.set(sleutel, p); }
        if (!p.past) r.waarschuwingen.push(`Tekst in “${el.naam}” past niet in het vak.`);
        else if (p.s < 5) r.waarschuwingen.push(`Tekst in “${el.naam}” wordt erg klein (${p.s.toFixed(1)} pt). Maak het vak groter.`);
        const sp = p.s * PT, n = p.regels.length;
        const b0 = el.verticaal === "top" ? y + CAP * sp
          : el.verticaal === "bottom" ? y + h - DESC * sp - (n - 1) * LH * sp
          : y + (h - (CAP + (n - 1) * LH) * sp) / 2 + CAP * sp;
        const tx = el.uitlijning === "left" ? x : el.uitlijning === "right" ? x + w : x + w / 2;
        p.regels.forEach((rg, i) => r.ops.push({ t: "tekst", x: tx, y: b0 + i * LH * sp, tekst: rg, s: p.s, vet: !!el.vet,
          lettertype: LETTERTYPEN[el.lettertype] ? el.lettertype : "helvetica", uitlijning: el.uitlijning || "center", kleur: el.kleur }));
      }
    }
    return { ops: r.ops, waarschuwingen: [...new Set(r.waarschuwingen)], fouten: [...new Set(r.fouten)] };
  }

  // ---------- PDF ----------

  function meetMet(doc) {
    return (tekst, s, el) => {
      doc.setFont(LETTERTYPEN[el.lettertype] ? el.lettertype : "helvetica", el.vet ? "bold" : "normal");
      doc.setFontSize(s);
      return doc.getTextWidth(tekst);
    };
  }

  // Vlakken die tegen de rand liggen lopen door in de afloop (voor de drukkerij).
  function metAfloop(ops, B, H, a) {
    if (!(a > 0)) return ops;
    const e = 0.05;
    return ops.map((o) => {
      if (!o.achtergrond) return o;
      let { x, y, w, h } = o;
      if (x <= e) { w += x + a; x = -a; }
      if (y <= e) { h += y + a; y = -a; }
      if (x + w >= B - e) w = B + a - x;
      if (y + h >= H - e) h = H + a - y;
      return { ...o, x, y, w, h };
    });
  }

  function tekenPdf(doc, ops, dx = 0, dy = 0) {
    const vul = (k) => { const [r, g, b] = hexRgb(k || "#000000"); doc.setFillColor(r, g, b); };
    for (const o of ops) {
      if (o.t === "rect") { vul(o.kleur); doc.rect(o.x + dx, o.y + dy, o.w, o.h, "F"); }
      else if (o.t === "kader") {
        if (o.gevuld) { vul(o.kleur); doc.rect(o.x + dx, o.y + dy, o.w, o.h, "F"); }
        else {
          const d = Math.min(o.dikte, o.w / 2, o.h / 2), [r, g, b] = hexRgb(o.kleur);
          doc.setDrawColor(r, g, b); doc.setLineWidth(d);
          doc.rect(o.x + dx + d / 2, o.y + dy + d / 2, o.w - d, o.h - d, "S");
        }
      } else if (o.t === "poly") {
        vul(o.kleur);
        const [x0, y0] = o.pts[0];
        const delta = o.pts.slice(1).map(([x, y], i) => [x - o.pts[i][0], y - o.pts[i][1]]);
        doc.lines(delta, x0 + dx, y0 + dy, [1, 1], "F", true);
      } else if (o.t === "img") {
        doc.addImage(o.data, o.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG", o.x + dx, o.y + dy, o.w, o.h, o.alias, "FAST");
      } else if (o.t === "tekst") {
        doc.setFont(o.lettertype, o.vet ? "bold" : "normal");
        doc.setFontSize(o.s);
        const [r, g, b] = hexRgb(o.kleur || "#000000");
        doc.setTextColor(r, g, b);
        doc.text(o.tekst, o.x + dx, o.y + dy, { align: o.uitlijning, baseline: "alphabetic" });
      }
    }
  }

  function snijtekens(doc, B, H, off, a) {
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25 * PT);
    const van = a + 1.5, tot = a + 7;
    for (const [x, sx] of [[off, -1], [off + B, 1]]) for (const [y, sy] of [[off, -1], [off + H, 1]]) {
      doc.line(x + sx * van, y, x + sx * tot, y);
      doc.line(x, y + sy * van, x, y + sy * tot);
    }
  }

  function maakPdf(cfgIn, libs) {
    const cfg = normaliseer(cfgIn);
    const items = waarden(cfg);
    const B = +cfg.breedte, H = +cfg.hoogte;
    if (!(B >= 10 && H >= 10)) throw new Error("Labelformaat moet minstens 10 × 10 mm zijn.");
    const a = Math.max(+cfg.afloop || 0, 0), rand = cfg.snijtekens ? 10 : 0, off = a + rand;
    const PB = B + 2 * off, PH = H + 2 * off;
    const liggend = PB >= PH, formaat = [Math.min(PB, PH), Math.max(PB, PH)];
    const doc = new libs.jsPDF({ orientation: liggend ? "landscape" : "portrait", unit: "mm", format: formaat });
    doc.setProperties({ title: "Stickers" });
    const meet = meetMet(doc), cache = new Map();
    items.forEach((item, i) => {
      if (i > 0) doc.addPage(formaat, liggend ? "landscape" : "portrait");
      const r = render(cfg, item, context(item, i + 1, items.length), libs, meet, cache);
      if (r.fouten.length) throw new Error(`Sticker ${i + 1}: ${r.fouten[0]}`);
      tekenPdf(doc, metAfloop(r.ops, B, H, a), off, off);
      if (rand) snijtekens(doc, B, H, off, a);
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
        return `<rect x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" fill="${o.kleur || "#000"}" shape-rendering="crispEdges"/>`;
      if (o.t === "kader") {
        const d = Math.min(o.dikte, o.w / 2, o.h / 2);
        return `<rect x="${f(o.x + d / 2)}" y="${f(o.y + d / 2)}" width="${f(Math.max(o.w - d, 0))}" height="${f(Math.max(o.h - d, 0))}" fill="none" stroke="${o.kleur || "#000"}" stroke-width="${f(d)}"/>`;
      }
      if (o.t === "poly") return `<polygon points="${o.pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="${o.kleur}"/>`;
      if (o.t === "img")
        return `<image href="${o.data}" x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" preserveAspectRatio="none"/>`;
      if (o.t === "fout")
        return `<g pointer-events="none"><rect x="${f(o.x)}" y="${f(o.y)}" width="${f(o.w)}" height="${f(o.h)}" fill="#fee2e2" stroke="#dc2626" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>` +
          `<text x="${f(o.x + o.w / 2)}" y="${f(o.y + o.h / 2)}" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${f(Math.min(o.h * 0.5, 10))}" fill="#dc2626">!</text></g>`;
      return `<text x="${f(o.x)}" y="${f(o.y)}" font-size="${f(o.s * PT)}" font-family='${LETTERTYPEN[o.lettertype].css}' font-weight="${o.vet ? 700 : 400}" fill="${o.kleur || "#000"}" text-anchor="${ANKER[o.uitlijning] || "middle"}" xml:space="preserve">${esc(o.tekst)}</text>`;
    }).join("");
  }

  const api = { PT, MAX_PAGINAS, FORMATEN, LETTERTYPEN, PALET, TYPE_STANDAARD, STARTERS, INHOUD_STANDAARD, LOCATIE_STANDAARD,
    nieuwId, element, standaard, normaliseer, migreer, locatieInstellingen, segmentWaarden, standaardKleuren, waarden, context, render,
    meetMet, maakPdf, opsNaarSvg, esc, contrast };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Labels = api;
})(typeof window !== "undefined" ? window : globalThis);
