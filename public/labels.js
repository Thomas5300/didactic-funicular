// Stickerbouwer-engine.
// Een ontwerp is een lijst onderdelen (tekst, barcode/QR, kader, afbeelding, locatievak) met elk een
// eigen positie en grootte in mm. Per sticker worden daar tekenopdrachten van gemaakt; die
// gaan zowel naar de PDF (jsPDF) als naar het voorbeeld (SVG), zodat beide precies gelijk zijn.
// Werkt in de browser (window.Labels) en in Node (module.exports) voor tests.
(function (root) {
  // Pictogrammen en pijlen staan in pictogrammen.js (in de browser eerder geladen).
  const PIC = typeof module !== "undefined" && module.exports ? require("./pictogrammen.js") : root.Pictogrammen;
  const { pijlen, PIJLRICHTINGEN } = PIC;
  const PT = 25.4 / 72;                    // mm per punt
  const CAP = 0.72, LH = 1.2, DESC = 0.21; // hoofdletterhoogte, regelafstand, onderstok (× korps)
  const MAX_PAGINAS = 5000;
  const MAX_PER_STICKER = 24;

  // Bekende labelformaten (breedte × hoogte zoals het label voor je ligt). Gegroepeerd voor de keuzelijst.
  const FORMAATGROEPEN = ["Verzendlabels", "Thermische labels (inch)", "Thermische labels (mm)", "Dymo LabelWriter",
    "Brother DK", "Stelling- en magazijnlabels", "Kaarten en pasjes", "Papierformaten"];
  const FORMATEN = {
    // Verzendlabels
    postnl: { groep: "Verzendlabels", naam: "PostNL 150 × 102 mm (liggend)", b: 150, h: 102 },
    postnlStaand: { groep: "Verzendlabels", naam: "PostNL 102 × 150 mm (staand)", b: 102, h: 150 },
    inch4x6: { groep: "Verzendlabels", naam: "4 × 6 inch — 102 × 152 mm (DHL, UPS, DPD, GLS)", b: 101.6, h: 152.4 },
    inch6x4: { groep: "Verzendlabels", naam: "6 × 4 inch — 152 × 102 mm (liggend)", b: 152.4, h: 101.6 },
    v100x150: { groep: "Verzendlabels", naam: "100 × 150 mm (DPD, GLS, Sendcloud)", b: 100, h: 150 },
    v150x100: { groep: "Verzendlabels", naam: "150 × 100 mm (liggend)", b: 150, h: 100 },
    v100x200: { groep: "Verzendlabels", naam: "100 × 200 mm", b: 100, h: 200 },
    inch4x8: { groep: "Verzendlabels", naam: "4 × 8 inch — 102 × 203 mm", b: 101.6, h: 203.2 },
    a6: { groep: "Verzendlabels", naam: "A6 — 105 × 148 mm", b: 105, h: 148 },
    // Thermische labels (inch)
    inch4x4: { groep: "Thermische labels (inch)", naam: "4 × 4 inch — 102 × 102 mm", b: 101.6, h: 101.6 },
    inch4x3: { groep: "Thermische labels (inch)", naam: "4 × 3 inch — 102 × 76 mm", b: 101.6, h: 76.2 },
    inch4x2: { groep: "Thermische labels (inch)", naam: "4 × 2 inch — 102 × 51 mm", b: 101.6, h: 50.8 },
    inch4x1: { groep: "Thermische labels (inch)", naam: "4 × 1 inch — 102 × 25 mm", b: 101.6, h: 25.4 },
    inch3x2: { groep: "Thermische labels (inch)", naam: "3 × 2 inch — 76 × 51 mm", b: 76.2, h: 50.8 },
    inch3x1: { groep: "Thermische labels (inch)", naam: "3 × 1 inch — 76 × 25 mm", b: 76.2, h: 25.4 },
    inch225x125: { groep: "Thermische labels (inch)", naam: "2,25 × 1,25 inch — 57 × 32 mm", b: 57.15, h: 31.75 },
    inch225x075: { groep: "Thermische labels (inch)", naam: "2,25 × 0,75 inch — 57 × 19 mm", b: 57.15, h: 19.05 },
    inch2x1: { groep: "Thermische labels (inch)", naam: "2 × 1 inch — 51 × 25 mm", b: 50.8, h: 25.4 },
    inch15x1: { groep: "Thermische labels (inch)", naam: "1,5 × 1 inch — 38 × 25 mm", b: 38.1, h: 25.4 },
    inch125x1: { groep: "Thermische labels (inch)", naam: "1,25 × 1 inch — 32 × 25 mm", b: 31.75, h: 25.4 },
    // Thermische labels (mm)
    m100x100: { groep: "Thermische labels (mm)", naam: "100 × 100 mm", b: 100, h: 100 },
    m102x76: { groep: "Thermische labels (mm)", naam: "102 × 76 mm", b: 102, h: 76 },
    m100x70: { groep: "Thermische labels (mm)", naam: "100 × 70 mm", b: 100, h: 70 },
    m102x64: { groep: "Thermische labels (mm)", naam: "102 × 64 mm", b: 102, h: 64 },
    m100x50: { groep: "Thermische labels (mm)", naam: "100 × 50 mm", b: 100, h: 50 },
    m100x30: { groep: "Thermische labels (mm)", naam: "100 × 30 mm", b: 100, h: 30 },
    m80x60: { groep: "Thermische labels (mm)", naam: "80 × 60 mm", b: 80, h: 60 },
    m80x50: { groep: "Thermische labels (mm)", naam: "80 × 50 mm", b: 80, h: 50 },
    m80x40: { groep: "Thermische labels (mm)", naam: "80 × 40 mm", b: 80, h: 40 },
    m70x40: { groep: "Thermische labels (mm)", naam: "70 × 40 mm", b: 70, h: 40 },
    m60x40: { groep: "Thermische labels (mm)", naam: "60 × 40 mm", b: 60, h: 40 },
    m58x40: { groep: "Thermische labels (mm)", naam: "58 × 40 mm", b: 58, h: 40 },
    m58x30: { groep: "Thermische labels (mm)", naam: "58 × 30 mm", b: 58, h: 30 },
    m57x32: { groep: "Thermische labels (mm)", naam: "57 × 32 mm", b: 57, h: 32 },
    m50x30: { groep: "Thermische labels (mm)", naam: "50 × 30 mm", b: 50, h: 30 },
    m50x25: { groep: "Thermische labels (mm)", naam: "50 × 25 mm", b: 50, h: 25 },
    m40x30: { groep: "Thermische labels (mm)", naam: "40 × 30 mm", b: 40, h: 30 },
    m40x20: { groep: "Thermische labels (mm)", naam: "40 × 20 mm", b: 40, h: 20 },
    m38x25: { groep: "Thermische labels (mm)", naam: "38 × 25 mm", b: 38, h: 25 },
    m30x20: { groep: "Thermische labels (mm)", naam: "30 × 20 mm", b: 30, h: 20 },
    m25x25: { groep: "Thermische labels (mm)", naam: "25 × 25 mm", b: 25, h: 25 },
    // Dymo LabelWriter
    dymo99010: { groep: "Dymo LabelWriter", naam: "Dymo 99010 — adres 89 × 28 mm", b: 89, h: 28 },
    dymo99012: { groep: "Dymo LabelWriter", naam: "Dymo 99012 — groot adres 89 × 36 mm", b: 89, h: 36 },
    dymo11356: { groep: "Dymo LabelWriter", naam: "Dymo 11356 — naambadge 89 × 41 mm", b: 89, h: 41 },
    dymo99014: { groep: "Dymo LabelWriter", naam: "Dymo 99014 — verzending 101 × 54 mm", b: 101, h: 54 },
    dymoXL: { groep: "Dymo LabelWriter", naam: "Dymo S0904980 — verzending XL 104 × 159 mm", b: 104, h: 159 },
    dymo11354: { groep: "Dymo LabelWriter", naam: "Dymo 11354 — multifunctioneel 57 × 32 mm", b: 57, h: 32 },
    dymo11352: { groep: "Dymo LabelWriter", naam: "Dymo 11352 — retouradres 54 × 25 mm", b: 54, h: 25 },
    dymo11355: { groep: "Dymo LabelWriter", naam: "Dymo 11355 — multifunctioneel 51 × 19 mm", b: 51, h: 19 },
    dymo99017: { groep: "Dymo LabelWriter", naam: "Dymo 99017 — hangmap 50 × 12 mm", b: 50, h: 12 },
    // Brother DK
    dk11201: { groep: "Brother DK", naam: "Brother DK-11201 — adres 90 × 29 mm", b: 90, h: 29 },
    dk11208: { groep: "Brother DK", naam: "Brother DK-11208 — groot adres 90 × 38 mm", b: 90, h: 38 },
    dk11209: { groep: "Brother DK", naam: "Brother DK-11209 — klein adres 62 × 29 mm", b: 62, h: 29 },
    dk11204: { groep: "Brother DK", naam: "Brother DK-11204 — multifunctioneel 54 × 17 mm", b: 54, h: 17 },
    dk11202: { groep: "Brother DK", naam: "Brother DK-11202 — verzending 100 × 62 mm", b: 100, h: 62 },
    dk11240: { groep: "Brother DK", naam: "Brother DK-11240 — 102 × 51 mm", b: 102, h: 51 },
    dk11241: { groep: "Brother DK", naam: "Brother DK-11241 — 102 × 152 mm", b: 102, h: 152 },
    dk11247: { groep: "Brother DK", naam: "Brother DK-11247 — 103 × 164 mm", b: 103, h: 164 },
    // Stelling- en magazijnlabels
    st210x70: { groep: "Stelling- en magazijnlabels", naam: "Ligger 210 × 70 mm (3 vakken van 70 × 70)", b: 210, h: 70 },
    st200x50: { groep: "Stelling- en magazijnlabels", naam: "Ligger 200 × 50 mm", b: 200, h: 50 },
    st150x50: { groep: "Stelling- en magazijnlabels", naam: "Ligger 150 × 50 mm", b: 150, h: 50 },
    st150x40: { groep: "Stelling- en magazijnlabels", naam: "Ligger 150 × 40 mm", b: 150, h: 40 },
    st100x50: { groep: "Stelling- en magazijnlabels", naam: "Ligger 100 × 50 mm", b: 100, h: 50 },
    st100x30: { groep: "Stelling- en magazijnlabels", naam: "Ligger 100 × 30 mm", b: 100, h: 30 },
    st70x70: { groep: "Stelling- en magazijnlabels", naam: "Vak 70 × 70 mm", b: 70, h: 70 },
    st80x220: { groep: "Stelling- en magazijnlabels", naam: "Niveaulabel 80 × 220 mm (staand)", b: 80, h: 220 },
    st200x200: { groep: "Stelling- en magazijnlabels", naam: "Vloerlabel 200 × 200 mm", b: 200, h: 200 },
    // Kaarten en pasjes
    pasje: { groep: "Kaarten en pasjes", naam: "Pasje / creditcard 85,6 × 54 mm", b: 85.6, h: 54 },
    pasjeStaand: { groep: "Kaarten en pasjes", naam: "Pasje staand 54 × 85,6 mm", b: 54, h: 85.6 },
    visitekaartje: { groep: "Kaarten en pasjes", naam: "Visitekaartje 85 × 55 mm", b: 85, h: 55 },
    badge: { groep: "Kaarten en pasjes", naam: "Naambadge 90 × 60 mm", b: 90, h: 60 },
    // Papierformaten
    a4staand: { groep: "Papierformaten", naam: "A4 staand — 210 × 297 mm", b: 210, h: 297 },
    a4: { groep: "Papierformaten", naam: "A4 liggend — 297 × 210 mm", b: 297, h: 210 },
    a5staand: { groep: "Papierformaten", naam: "A5 staand — 148 × 210 mm", b: 148, h: 210 },
    a5: { groep: "Papierformaten", naam: "A5 liggend — 210 × 148 mm", b: 210, h: 148 },
    a6liggend: { groep: "Papierformaten", naam: "A6 liggend — 148 × 105 mm", b: 148, h: 105 },
    a7: { groep: "Papierformaten", naam: "A7 — 74 × 105 mm", b: 74, h: 105 },
    letter: { groep: "Papierformaten", naam: "US Letter — 216 × 279 mm", b: 215.9, h: 279.4 },
  };

  // A4-vellen met meerdere etiketten. De etiketten staan gecentreerd op het vel (zoals bij deze vellen gebruikelijk).
  const VELLEN = {
    L7160: { naam: "Avery L7160 / J8160 — 21 per vel (63,5 × 38,1 mm)", b: 63.5, h: 38.1, kol: 3, rij: 7, gx: 2.54, gy: 0 },
    L7159: { naam: "Avery L7159 — 24 per vel (63,5 × 33,9 mm)", b: 63.5, h: 33.9, kol: 3, rij: 8, gx: 2.54, gy: 0 },
    L7161: { naam: "Avery L7161 — 18 per vel (63,5 × 46,6 mm)", b: 63.5, h: 46.6, kol: 3, rij: 6, gx: 2.54, gy: 0 },
    L7162: { naam: "Avery L7162 — 16 per vel (99,1 × 33,9 mm)", b: 99.1, h: 33.9, kol: 2, rij: 8, gx: 2.5, gy: 0 },
    L7163: { naam: "Avery L7163 / J8163 — 14 per vel (99,1 × 38,1 mm)", b: 99.1, h: 38.1, kol: 2, rij: 7, gx: 2.5, gy: 0 },
    L7173: { naam: "Avery L7173 — 10 per vel (99,1 × 57 mm)", b: 99.1, h: 57, kol: 2, rij: 5, gx: 2.5, gy: 0 },
    L7165: { naam: "Avery L7165 / J8165 — 8 per vel (99,1 × 67,7 mm)", b: 99.1, h: 67.7, kol: 2, rij: 4, gx: 2.5, gy: 0 },
    L7166: { naam: "Avery L7166 — 6 per vel (99,1 × 93,1 mm)", b: 99.1, h: 93.1, kol: 2, rij: 3, gx: 2.5, gy: 0 },
    L7169: { naam: "Avery L7169 — 4 per vel (99,1 × 139 mm)", b: 99.1, h: 139, kol: 2, rij: 2, gx: 2.5, gy: 0 },
    L7168: { naam: "Avery L7168 — 2 per vel (199,6 × 143,5 mm)", b: 199.6, h: 143.5, kol: 1, rij: 2, gx: 0, gy: 0 },
    L7167: { naam: "Avery L7167 — 1 per vel (199,6 × 289,1 mm)", b: 199.6, h: 289.1, kol: 1, rij: 1, gx: 0, gy: 0 },
    L7651: { naam: "Avery L7651 — 65 per vel (38,1 × 21,2 mm)", b: 38.1, h: 21.2, kol: 5, rij: 13, gx: 2.5, gy: 0 },
    L7654: { naam: "Avery L7654 — 40 per vel (45,7 × 25,4 mm)", b: 45.7, h: 25.4, kol: 4, rij: 10, gx: 2.6, gy: 0 },
    Z3475: { naam: "Avery Zweckform 3475 — 24 per vel (70 × 36 mm)", b: 70, h: 36, kol: 3, rij: 8, gx: 0, gy: 0 },
    Z3474: { naam: "Avery Zweckform 3474 — 24 per vel (70 × 37 mm)", b: 70, h: 37, kol: 3, rij: 8, gx: 0, gy: 0 },
    Z3484: { naam: "Avery Zweckform 3484 — 16 per vel (105 × 37 mm)", b: 105, h: 37, kol: 2, rij: 8, gx: 0, gy: 0 },
    Z3424: { naam: "Avery Zweckform 3424 — 12 per vel (105 × 48 mm)", b: 105, h: 48, kol: 2, rij: 6, gx: 0, gy: 0 },
    Z3425: { naam: "Avery Zweckform 3425 — 10 per vel (105 × 57 mm)", b: 105, h: 57, kol: 2, rij: 5, gx: 0, gy: 0 },
    Z3427: { naam: "Avery Zweckform 3427 — 8 per vel (105 × 74 mm)", b: 105, h: 74, kol: 2, rij: 4, gx: 0, gy: 0 },
    Z3483: { naam: "Avery Zweckform 3483 — 4 per vel (105 × 148 mm)", b: 105, h: 148, kol: 2, rij: 2, gx: 0, gy: 0 },
    Z3655: { naam: "Avery Zweckform 3655 — 2 per vel (210 × 148 mm)", b: 210, h: 148, kol: 1, rij: 2, gx: 0, gy: 0 },
    Z3478: { naam: "Avery Zweckform 3478 — 1 per vel (210 × 297 mm)", b: 210, h: 297, kol: 1, rij: 1, gx: 0, gy: 0 },
  };
  // Paginaformaten voor een eigen indeling (raster van labels op één vel).
  const PAGINAS = {
    a4: { naam: "A4 staand", b: 210, h: 297 }, a4l: { naam: "A4 liggend", b: 297, h: 210 },
    a5: { naam: "A5 staand", b: 148, h: 210 }, a5l: { naam: "A5 liggend", b: 210, h: 148 },
    a6: { naam: "A6 staand", b: 105, h: 148 }, a6l: { naam: "A6 liggend", b: 148, h: 105 },
    letter: { naam: "US Letter", b: 215.9, h: 279.4 },
  };
  const TITEL_HOOGTE = 14;   // mm boven aan het vel voor de titel

  function velPagina(cfg) {
    if (cfg.vel !== "eigen") return { naam: "A4", b: 210, h: 297 };
    if (cfg.velPagina === "eigen") return { naam: "Eigen vel", b: Math.max(10, +cfg.velPB || 210), h: Math.max(10, +cfg.velPH || 297) };
    return PAGINAS[cfg.velPagina] || PAGINAS.a4;
  }

  // Indeling van labels op een vel, of null voor losse labels (één label per pagina).
  function velIndeling(cfg) {
    if (!cfg.vel) return null;
    let v;
    if (cfg.vel === "eigen") {
      v = { naam: "Eigen indeling", b: +cfg.breedte, h: +cfg.hoogte, kol: Math.max(1, Math.round(+cfg.velKol || 1)),
        rij: Math.max(1, Math.round(+cfg.velRij || 1)), gx: Math.max(0, +cfg.velGx || 0), gy: Math.max(0, +cfg.velGy || 0) };
    } else {
      v = VELLEN[cfg.vel];
      if (!v) return null;
      if (Math.abs(v.b - cfg.breedte) > 0.05 || Math.abs(v.h - cfg.hoogte) > 0.05)
        throw new Error(`Het labelformaat (${cfg.breedte} × ${cfg.hoogte} mm) past niet bij ${v.naam}. Kies het vel opnieuw.`);
    }
    const pagina = velPagina(cfg);
    const titel = cfg.vel === "eigen" ? String(cfg.velTitel || "").trim() : "";
    // Logo bovenaan het vel (naast de titel)
    let logo = null;
    if (cfg.vel === "eigen" && cfg.velLogo) {
      const lh = Math.min(Math.max(+cfg.velLogoHoogte || 12, 4), 40);
      const lw = Math.min(lh * (+cfg.velLogoB || 1) / (+cfg.velLogoH || 1), 80);
      logo = { data: cfg.velLogo, b: lw, h: lw * (+cfg.velLogoH || 1) / (+cfg.velLogoB || 1), plek: cfg.velLogoPlek === "links" ? "links" : "rechts" };
    }
    const tb = logo ? Math.max(TITEL_HOOGTE, logo.h + 4) : titel ? TITEL_HOOGTE : 0;
    const links = (pagina.b - v.kol * v.b - (v.kol - 1) * v.gx) / 2;
    const boven = tb + (pagina.h - tb - v.rij * v.h - (v.rij - 1) * v.gy) / 2;
    if (links < -0.01 || boven < tb - 0.01)
      throw new Error(`${v.kol} × ${v.rij} labels van ${v.b} × ${v.h} mm passen niet op ${pagina.naam} (${pagina.b} × ${pagina.h} mm)${tb ? " met titel/logo" : ""}.`);
    const perVel = v.kol * v.rij;
    const start = Math.min(Math.max(Math.round(+cfg.velStart || 1), 1), perVel);
    const uitvullen = cfg.vel === "eigen" && cfg.velUitvullen !== false;   // Avery-vellen liggen vast
    const centreren = cfg.vel === "eigen" && cfg.velCentreren !== false;
    return { ...v, links: Math.max(links, 0), boven: Math.max(boven, tb), perVel, start, pagina, titel, logo, kopHoogte: tb, uitvullen, centreren, eigen: cfg.vel === "eigen" };
  }

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
    barcode: { naam: "Barcode", w: 80, h: 30, inhoud: "{waarde}", symbologie: "CODE128", stilleZones: true,
      toonTekst: false, tekstGrootte: 10, maxStreep: 0, bcUitlijning: "center" },
    kader: { naam: "Kader", w: 60, h: 30, dikte: 0.5, gevuld: false, kleur: "#000000" },
    afbeelding: { naam: "Afbeelding", w: 30, h: 30, data: "", imgB: 1, imgH: 1 },
    symbool: { naam: "Pictogram", w: 40, h: 36, vorm: "letop", kleurstijl: "kleur", richting: "omhoog", aantal: 1, kleur: "#000000", vulling: "#ffffff" },
    locaties: { naam: "Locaties", w: 190, h: 44, richting: "naast", tussenruimte: 3, stijl: "balk", pijlen: true,
      barcode: "CODE128", barcodeDeel: 45, koppen: true, rand: true, tekstKleur: "auto", splits: 2,
      logo: "", logoB: 1, logoH: 1, logoPositie: "boven-rechts", logoGrootte: 25, zwartWit: false },
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
    bcScheiding: "",     // (oud) tussen segmenten in de barcode — vervangen door bcSjabloon
    bcSjabloon: "",      // opbouw van de barcode, bijv. "{1}  {2}{3} {4}"; leeg = alle segmenten aan elkaar
    kleurSeg: 2,         // segment dat kleur en pijlen bepaalt (-1 = één kleur/pijl voor alles)
    kleur: "#1e88e5",
    kleuren: {},
    pijl: { r: "omhoog", n: 1 },   // pijl als er één instelling voor alles geldt
    pijlen: {},                    // pijl per waarde: { "0": { r: "omlaag", n: 1 }, ... }
  };

  // Indeling zoals op veel stellingliggers: magazijn, gang, stelling, niveau.
  const SEGMENTEN_MAGAZIJN = [
    { naam: "Magazijn", van: "07", tot: "07" },
    { naam: "Gang", van: "LL", tot: "LL" },
    { naam: "Stelling", van: "01", tot: "10" },
    { naam: "Niveau", van: "0", tot: "2" },
  ];
  // Barcode zoals in veel magazijnsystemen: magazijn, 2 spaties, gang+stelling, spatie, niveau → "07  LL01 0"
  const BC_MAGAZIJN = "{1}  {2}{3} {4}";

  const INHOUD_STANDAARD = {
    modus: "reeks", start: "1000", eind: "1025", stap: 1, prefix: "", suffix: "",
    lijst: "", vasteWaarde: "", kopieen: 1, marge: 4, afloop: 0, snijtekens: false,
    vel: "", velStart: 1, velKaders: false, velKol: 2, velRij: 7, velGx: 0, velGy: 0,
    velPagina: "a4", velPB: 210, velPH: 297, velTitel: "", velUitvullen: true, velCentreren: true,
    velLogo: "", velLogoB: 1, velLogoH: 1, velLogoPlek: "rechts", velLogoHoogte: 12,
    lijstKop: false,
    // Zending: pallet- en collistickers (1/10, 2/10 …)
    colliOrder: "2026-001234", colliBestemming: "", colliAantal: 10, colliSoort: "PALLET", colliSoortEigen: "",
    afdrukken: "alle", afdrukNummers: "",
  };
  const COLLI_SOORTEN = [["PALLET", "Pallet"], ["DOOS", "Doos"], ["CARTON", "Carton"], ["COLLI", "Colli"], ["ROLCONTAINER", "Rolcontainer"],
    ["KRAT", "Krat"], ["STUK", "Stuk"], ["ANDERS", "Anders…"]];
  const COLLI_VELDEN = ["order", "colli", "soort", "aantal", "bestemming"];

  const COMMANDO_LIJST = "Code;Omschrijving\nZ001;Crossdock zone (07)\n/;Stoppen / afsluiten\ne;Stoppen / terug\n07  X;\n07  JJ00 0;";
  const GEBRUIKERS_LIJST = "Naam;Username;Password\nJan Jansen;jan;11\nPiet de Vries;piet;11\nKees Bakker;kees;11\nAnna Smit;anna;11";
  // Kopregels van de voorbeeldlijsten: bij wisselen tussen ontwerpen met dezelfde kolommen blijft je eigen lijst staan.
  const VOORBEELD_LIJSTEN = [COMMANDO_LIJST, GEBRUIKERS_LIJST];

  // ---------- Borden: pictogram, kop en tekst in het Nederlands en Engels ----------

  const BORD_FORMATEN = {
    a4l: { naam: "A4 liggend", b: 297, h: 210 }, a4: { naam: "A4 staand", b: 210, h: 297 },
    a5l: { naam: "A5 liggend", b: 210, h: 148 }, a5: { naam: "A5 staand", b: 148, h: 210 },
    a3l: { naam: "A3 liggend", b: 420, h: 297 }, a3: { naam: "A3 staand", b: 297, h: 420 },
    l150: { naam: "Label 150 × 102 mm", b: 150, h: 102 }, l102: { naam: "Label 102 × 150 mm", b: 102, h: 150 },
  };
  const BORD_KOP = { waarschuwing: "LET OP!  —  CAUTION!", verbod: "VERBODEN  —  PROHIBITED", gebod: "VERPLICHT  —  MANDATORY",
    nood: "NOOD  —  EMERGENCY", brand: "BRAND  —  FIRE", verzending: "VOORZICHTIG  —  HANDLE WITH CARE", pijl: "LET OP  —  ATTENTION" };
  const BORD_VELDEN = ["kop", "nl1", "nl2", "en1", "en2", "onder"];

  // Standaardteksten van een bord bij een pictogram.
  function bordTeksten(vorm) {
    const d = PIC.PICTOGRAMMEN[vorm] || PIC.PICTOGRAMMEN.letop;
    return { kop: d.kop || BORD_KOP[d.groep], nl1: d.nl[0] || "", nl2: d.nl[1] || "", en1: d.en[0] || "", en2: d.en[1] || "", onder: d.onder || "" };
  }

  // Een bord als ontwerp. o = { vorm, formaat, kleurstijl ("kleur" | "zw"), kop, nl1, nl2, en1, en2, onder, richting }.
  // De indeling is die van een A4 (liggend of staand) en schaalt mee; rand, balk en onderregel lopen over de hele breedte.
  function bordOntwerp(o = {}) {
    const vorm = PIC.PICTOGRAMMEN[o.vorm] ? o.vorm : "letop", def = PIC.PICTOGRAMMEN[vorm];
    const t = bordTeksten(vorm);
    for (const k of BORD_VELDEN) if (typeof o[k] === "string") t[k] = o[k];
    const F = BORD_FORMATEN[o.formaat] || BORD_FORMATEN.a4l, liggend = F.b >= F.h;
    const driehoek = def.groep === "waarschuwing" && def.kader !== "paneel", paneel = def.kader === "paneel";
    const L = liggend
      ? { B: 297, H: 210, balk: 42, kop: 64, picto: paneel ? [12, 56, 97, 97] : driehoek ? [10, 62, 98, 90] : [15, 63, 88, 88],
          tx: 112, tw: 172, midden: 109, uitl: "left", uitleg: 20, sep: [112, 172], onder: [14, 185, 12, 14] }
      : { B: 210, H: 297, balk: 40, kop: 48, picto: paneel ? [46, 52, 118, 118] : driehoek ? [50, 56, 110, 96] : [57, 56, 96, 96],
          tx: 14, tw: 182, midden: 209, uitl: "center", uitleg: 17, sep: [45, 120], onder: [16, 276, 10, 12] };
    const k = Math.min(F.b / L.B, F.h / L.H), ox = (F.b - L.B * k) / 2, oy = (F.h - L.H * k) / 2;
    const m = (v) => Math.round(v * k * 10) / 10, X = (v) => Math.round((ox + v * k) * 10) / 10, Y = (v) => Math.round((oy + v * k) * 10) / 10;
    const zw = o.kleurstijl !== "kleur";
    const accent = zw ? "#000000" : PIC.accentKleur(def.groep);
    const el = [];
    const tekst = (naam, x, y, w, h, tk, grootte, extra) => el.push(Object.assign({ type: "tekst", naam, x, y, w, h, tekst: tk,
      grootte: Math.round(grootte * k * 2) / 2, terugloop: false }, extra));
    const vak = (naam, x, y, w, h, extra) => el.push(Object.assign({ type: "kader", naam, x, y, w, h }, extra));

    const r6 = m(6);
    vak("Rand", r6, r6, F.b - 2 * r6, F.h - 2 * r6, { dikte: m(3), kleur: !zw && def.groep === "waarschuwing" ? "#000000" : accent });
    vak("Balk", r6, r6, F.b - 2 * r6, m(L.balk), { gevuld: true, kleur: accent });
    tekst("Kop", m(10), r6, F.b - m(20), m(L.balk), t.kop, L.kop, { vet: true, kleur: contrast(accent) });
    const [px, py, pw, ph] = L.picto;
    el.push({ type: "symbool", naam: "Pictogram", x: X(px), y: Y(py), w: m(pw), h: m(ph), vorm, kleurstijl: zw ? "zw" : "kleur",
      richting: o.richting || "rechts", aantal: 1 });

    // Teksten: Nederlands en Engels (elk titel + uitleg), samen verticaal gecentreerd naast/onder het pictogram
    const blok = (titel, uitleg, naam) => [titel && { naam, tekst: titel, h: 12, s: 28, vet: true },
      uitleg && { naam: naam + " uitleg", tekst: uitleg, h: 9, s: L.uitleg, vet: false }].filter(Boolean);
    const nl = blok(t.nl1, t.nl2, "Nederlands"), en = blok(t.en1, t.en2, "Engels"), beide = nl.length && en.length;
    const hoogte = (b) => b.reduce((s, r, i) => s + r.h + (i ? 3 : 0), 0);
    let y = L.midden - (hoogte(nl) + hoogte(en) + (beide ? 14 : 0)) / 2;
    const zet = (b) => b.forEach((r, i) => {
      if (i) y += 3;
      tekst(r.naam, X(L.tx), Y(y), m(L.tw), m(r.h), r.tekst, r.s, { vet: r.vet, uitlijning: L.uitl, verticaal: "top" });
      y += r.h;
    });
    zet(nl);
    if (beide) { y += 7; vak("Scheidingslijn", X(L.sep[0]), Y(y), m(L.sep[1]), m(0.8), { gevuld: true }); y += 7; }
    zet(en);
    if (t.onder) {
      const [ox0, oy0, oh, os] = L.onder;
      tekst("Onderregel", m(ox0), F.h - m(L.H - oy0), F.b - 2 * m(ox0), m(oh), t.onder, os, { vet: true });
    }
    return { groep: "borden", naam: `${t.nl1 || def.naam}`, sub: `${F.naam} · ${zw ? "zwart-wit" : "kleur"}`, breedte: F.b, hoogte: F.h,
      modus: "vast", inhoud: { vasteWaarde: "", kopieen: 1 }, elementen: el };
  }

  // De borden "losse goederen achter deze pallet" met drie pictogrammen.
  function losseGoederen(vorm, formaat, beeld) {
    const t = bordTeksten("vallen");
    if (formaat === "a4") t.onder = "Eerst zekeren of weghalen  ·  Secure or remove first";
    return Object.assign(bordOntwerp({ ...t, vorm, formaat, kleurstijl: "zw" }), { naam: `Losse goederen achter pallet — ${beeld}` });
  }

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
      naam: "QR-code met tekst", breedte: 100, hoogte: 50,
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
    verzend: {
      groep: "zending", naam: "Verzendsticker met symbolen", breedte: 150, hoogte: 102, modus: "vast", inhoud: { vasteWaarde: "", kopieen: 1 },
      elementen: [
        { type: "kader", naam: "Rand", x: 2, y: 2, w: 146, h: 98, dikte: 0.8 },
        { type: "kader", naam: "Balk", x: 2, y: 2, w: 146, h: 20, gevuld: true },
        { type: "tekst", naam: "Kop", x: 5, y: 2, w: 140, h: 20, tekst: "VOORZICHTIG  —  HANDLE WITH CARE", grootte: 20, vet: true, kleur: "#ffffff", terugloop: false },
        { type: "symbool", naam: "Breekbaar", x: 9, y: 29, w: 36, h: 40, vorm: "breekbaar", kleurstijl: "zw" },
        { type: "symbool", naam: "Deze kant boven", x: 57, y: 29, w: 36, h: 40, vorm: "dezeKantBoven", kleurstijl: "zw" },
        { type: "symbool", naam: "Droog houden", x: 105, y: 29, w: 36, h: 40, vorm: "droogHouden", kleurstijl: "zw" },
        { type: "tekst", naam: "Tekst breekbaar", x: 4, y: 74, w: 46, h: 18, tekst: "BREEKBAAR\nFragile", grootte: 13, vet: true },
        { type: "tekst", naam: "Tekst deze kant boven", x: 52, y: 74, w: 46, h: 18, tekst: "DEZE KANT BOVEN\nThis way up", grootte: 13, vet: true },
        { type: "tekst", naam: "Tekst droog houden", x: 100, y: 74, w: 46, h: 18, tekst: "DROOG HOUDEN\nKeep dry", grootte: 13, vet: true },
      ],
    },
    // ----- Pallets en verzending (modus Zending) -----
    palletsticker: {
      groep: "zending", naam: "Palletsticker — ordernummer en 1/10", sub: "150 × 102 mm · plaats optioneel", breedte: 150, hoogte: 102, modus: "zending",
      elementen: [
        { type: "kader", naam: "Rand", x: 2, y: 2, w: 146, h: 98, dikte: 0.8 },
        { type: "tekst", naam: "Kop order", x: 6, y: 5, w: 138, h: 5, tekst: "ORDERNUMMER", grootte: 10, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "tekst", naam: "Ordernummer", x: 5, y: 11, w: 140, h: 36, tekst: "{order}", grootte: 72, vet: true, terugloop: false },
        { type: "kader", naam: "Lijn", x: 2, y: 50, w: 146, h: 0.8, gevuld: true },
        // zonder plaats: het palletnummer over de hele breedte
        { type: "tekst", naam: "Soort", x: 6, y: 54, w: 138, h: 5, tekst: "{soort}", grootte: 10, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false, toonAls: "!{bestemming}" },
        { type: "tekst", naam: "Palletnummer", x: 5, y: 60, w: 140, h: 37, tekst: "{colli}", grootte: 80, vet: true, terugloop: false, toonAls: "!{bestemming}" },
        // met plaats: palletnummer links, plaats rechts
        { type: "kader", naam: "Lijn plaats", x: 74.6, y: 50.8, w: 0.8, h: 49.2, gevuld: true, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Soort (met plaats)", x: 6, y: 54, w: 66, h: 5, tekst: "{soort}", grootte: 10, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Palletnummer (met plaats)", x: 5, y: 60, w: 67, h: 37, tekst: "{colli}", grootte: 64, vet: true, terugloop: false, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Kop plaats", x: 79, y: 54, w: 66, h: 5, tekst: "PLAATS", grootte: 10, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Plaats", x: 78, y: 60, w: 67, h: 37, tekst: "{bestemming}", grootte: 34, vet: true, toonAls: "{bestemming}" },
      ],
    },
    palletA4: {
      groep: "zending", naam: "Palletsticker A4 — groot", sub: "A4 staand · gewone printer · plaats optioneel", breedte: 210, hoogte: 297, modus: "zending",
      elementen: [
        { type: "kader", naam: "Rand", x: 6, y: 6, w: 198, h: 285, dikte: 2 },
        { type: "tekst", naam: "Kop order", x: 14, y: 14, w: 182, h: 8, tekst: "ORDERNUMMER", grootte: 18, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "tekst", naam: "Ordernummer", x: 12, y: 24, w: 186, h: 62, tekst: "{order}", grootte: 120, vet: true, terugloop: false },
        { type: "kader", naam: "Lijn", x: 6, y: 93, w: 198, h: 1.5, gevuld: true },
        { type: "tekst", naam: "Soort", x: 14, y: 101, w: 182, h: 8, tekst: "{soort}", grootte: 18, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "tekst", naam: "Palletnummer", x: 12, y: 112, w: 186, h: 172, tekst: "{colli}", grootte: 250, vet: true, terugloop: false, toonAls: "!{bestemming}" },
        { type: "tekst", naam: "Palletnummer (met plaats)", x: 12, y: 112, w: 186, h: 100, tekst: "{colli}", grootte: 220, vet: true, terugloop: false, toonAls: "{bestemming}" },
        { type: "kader", naam: "Lijn plaats", x: 6, y: 219, w: 198, h: 1.5, gevuld: true, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Kop plaats", x: 14, y: 227, w: 182, h: 8, tekst: "PLAATS", grootte: 18, vet: true, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false, toonAls: "{bestemming}" },
        { type: "tekst", naam: "Plaats", x: 12, y: 238, w: 186, h: 46, tekst: "{bestemming}", grootte: 90, vet: true, terugloop: false, toonAls: "{bestemming}" },
      ],
    },

    // ----- Magazijn -----
    diagonaal3: {
      groep: "magazijn", naam: "Diagonaal — 3 niveaus per ligger", breedte: 210, hoogte: 70, modus: "locaties",
      locatie: { segmenten: SEGMENTEN_MAGAZIJN, groep: 3, kleurSeg: 3, scheiding: " ", bcSjabloon: BC_MAGAZIJN },
      elementen: [
        { type: "locaties", naam: "Locaties", x: 0, y: 0, w: 210, h: 70, richting: "naast", tussenruimte: 0, stijl: "diagonaal", tekstKleur: "zwart", splits: 2 },
      ],
    },
    diagonaal1: {
      groep: "magazijn", naam: "Diagonaal — losse locatie", breedte: 70, hoogte: 70, modus: "locaties",
      locatie: { segmenten: SEGMENTEN_MAGAZIJN, groep: -1, kleurSeg: 3, scheiding: " ", bcSjabloon: BC_MAGAZIJN },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 0, y: 0, w: 70, h: 70, tussenruimte: 0, stijl: "diagonaal", tekstKleur: "zwart", splits: 2 },
      ],
    },
    losGroot: {
      groep: "magazijn", naam: "Losse locatie — grote code", breedte: 150, hoogte: 50, modus: "locaties",
      locatie: { groep: -1 },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 1, y: 1, w: 148, h: 48, tussenruimte: 0, stijl: "balk", koppen: false, barcodeDeel: 42 },
      ],
    },
    losStreep: {
      groep: "magazijn", naam: "Losse locatie — compact met kleurstreep", breedte: 100, hoogte: 30, modus: "locaties",
      locatie: { groep: -1 },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 1, y: 1, w: 98, h: 28, tussenruimte: 0, stijl: "streep", koppen: false, barcodeDeel: 48 },
      ],
    },
    magazijn: {
      groep: "magazijn", naam: "Kleurbalk — posities naast elkaar", breedte: 200, hoogte: 50, modus: "locaties",
      elementen: [
        { type: "locaties", naam: "Locaties", x: 2, y: 2, w: 196, h: 46, richting: "naast", tussenruimte: 3, stijl: "balk" },
      ],
    },
    magazijnNiveaus: {
      groep: "magazijn", naam: "Vol gekleurd — niveaus onder elkaar", breedte: 80, hoogte: 220, modus: "locaties",
      locatie: {
        segmenten: [
          { naam: "Magazijn", van: "07", tot: "07" }, { naam: "Gang", van: "LL", tot: "LL" },
          { naam: "Stelling", van: "01", tot: "10" }, { naam: "Niveau", van: "4", tot: "0" },
        ],
        groep: 3, kleurSeg: 3, bcSjabloon: BC_MAGAZIJN,
      },
      elementen: [
        { type: "locaties", naam: "Locaties", x: 2, y: 2, w: 76, h: 216, richting: "onder", tussenruimte: 2, stijl: "vol", barcodeDeel: 42 },
      ],
    },

    halfA4vouw: {
      groep: "magazijn", naam: "Half A4 vouwkaart — grote code", sub: "zwart-wit · 2× op A4, dubbelvouwen", breedte: 200, hoogte: 138, modus: "locaties",
      locatie: { groep: -1 }, inhoud: { vel: "vouw" },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 0, y: 0, w: 200, h: 138, stijl: "balk", zwartWit: true, koppen: false, barcodeDeel: 42, tussenruimte: 0 },
      ],
    },
    halfA4twee: {
      groep: "magazijn", naam: "Half A4 — grote code, 2 per vel", sub: "zwart-wit · doorknippen", breedte: 200, hoogte: 130, modus: "locaties",
      locatie: { groep: -1 },
      inhoud: { vel: "eigen", velPagina: "a4", velKol: 1, velRij: 2, velGx: 0, velGy: 18.5, velStart: 1, velKaders: false, velTitel: "", velUitvullen: false, velCentreren: false },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 0, y: 0, w: 200, h: 130, stijl: "balk", zwartWit: true, koppen: false, barcodeDeel: 42, tussenruimte: 0 },
      ],
    },
    a4bord: {
      groep: "magazijn", naam: "Heel A4 — grote code", sub: "A4 liggend · zwart-wit", breedte: 297, hoogte: 210, modus: "locaties",
      locatie: { groep: -1 },
      elementen: [
        { type: "locaties", naam: "Locatie", x: 6, y: 6, w: 285, h: 198, stijl: "balk", zwartWit: true, koppen: false, barcodeDeel: 42, tussenruimte: 0 },
      ],
    },

    // ----- Borden en waarschuwingen (gemaakt met bordOntwerp) -----
    letopLiggend: losseGoederen("letop", "a4l", "uitroepteken"),
    vallenLiggend: losseGoederen("vallen", "a4l", "vallende doos"),
    losseLiggend: losseGoederen("losse", "a4l", "losse dozen naast pallet"),
    muurLiggend: losseGoederen("dozenmuur", "a4l", "gestapelde losse dozen"),
    letopStaand: losseGoederen("letop", "a4", "uitroepteken"),
    vallenStaand: losseGoederen("vallen", "a4", "vallende doos"),
    losseStaand: losseGoederen("losse", "a4", "losse dozen naast pallet"),
    muurStaand: losseGoederen("dozenmuur", "a4", "gestapelde losse dozen"),
    heftruckBord: bordOntwerp({ vorm: "heftruck", formaat: "a4l", kleurstijl: "kleur" }),
    voetgangersBord: bordOntwerp({ vorm: "geenVoetgangers", formaat: "a4l", kleurstijl: "kleur" }),
    schoenenBord: bordOntwerp({ vorm: "schoenen", formaat: "a4", kleurstijl: "kleur" }),
    laadperronBord: bordOntwerp({ vorm: "laadperron", formaat: "a4l", kleurstijl: "kleur" }),
    nooduitgangBord: bordOntwerp({ vorm: "nooduitgang", formaat: "a4l", kleurstijl: "kleur" }),
    verzamelplaatsBord: bordOntwerp({ vorm: "verzamelplaats", formaat: "a4l", kleurstijl: "kleur" }),
    nietRokenBord: bordOntwerp({ vorm: "nietRoken", formaat: "a5l", kleurstijl: "kleur" }),

    // ----- Scanner en gebruikers (WMS) -----
    commandokaart: {
      groep: "wms", naam: "Commandokaart (heftruck)", sub: "A5 liggend · raster 3 × 2", breedte: 64, hoogte: 58, modus: "lijst",
      inhoud: { lijstKop: true, lijst: COMMANDO_LIJST, vel: "eigen", velPagina: "a5l", velKol: 3, velRij: 2, velGx: 4, velGy: 6, velStart: 1, velKaders: false, velTitel: "" },
      elementen: [
        { type: "barcode", naam: "Barcode", x: 2, y: 4, w: 60, h: 30, inhoud: "{Code}", toonTekst: true, tekstGrootte: 14, maxStreep: 0.55 },
        { type: "tekst", naam: "Omschrijving", x: 2, y: 37, w: 60, h: 14, tekst: "{Omschrijving}", grootte: 10, vet: true, verticaal: "top" },
      ],
    },
    commandoA4: {
      groep: "wms", naam: "Commandoblad A4", sub: "raster 3 × 6 met titel", breedte: 62, hoogte: 42, modus: "lijst",
      inhoud: { lijstKop: true, lijst: COMMANDO_LIJST, vel: "eigen", velPagina: "a4", velKol: 3, velRij: 6, velGx: 2, velGy: 2, velStart: 1, velKaders: true, velTitel: "Scannercommando's" },
      elementen: [
        { type: "barcode", naam: "Barcode", x: 3, y: 3, w: 56, h: 24, inhoud: "{Code}", toonTekst: true, tekstGrootte: 12, maxStreep: 0.5 },
        { type: "tekst", naam: "Omschrijving", x: 2, y: 29, w: 58, h: 11, tekst: "{Omschrijving}", grootte: 10, vet: true, verticaal: "top" },
      ],
    },
    commando: {
      groep: "wms", naam: "Commandosticker", sub: "één per label · 100 × 50 mm", breedte: 100, hoogte: 50, modus: "lijst",
      inhoud: { lijstKop: true, lijst: COMMANDO_LIJST },
      elementen: [
        { type: "tekst", naam: "Omschrijving", x: 4, y: 3, w: 92, h: 11, tekst: "{Omschrijving}", grootte: 20, vet: true, terugloop: false },
        { type: "barcode", naam: "Barcode", x: 6, y: 15, w: 88, h: 31, inhoud: "{Code}", toonTekst: true, tekstGrootte: 14, maxStreep: 0.8 },
      ],
    },
    gebruikerslijst: {
      groep: "wms", naam: "Gebruikerslijst A4", sub: "naam, RF username en password · 8 per vel", breedte: 190, hoogte: 32, modus: "lijst",
      inhoud: { lijstKop: true, lijst: GEBRUIKERS_LIJST, vel: "eigen", velPagina: "a4", velKol: 1, velRij: 8, velGx: 0, velGy: 0, velStart: 1, velKaders: false, velTitel: "Gebruikers RF-scanners" },
      elementen: [
        { type: "kader", naam: "Vak naam", x: 0, y: 0, w: 60, h: 32, dikte: 0.3 },
        { type: "tekst", naam: "Kop naam", x: 2.5, y: 1.5, w: 55, h: 3.5, tekst: "Naam", grootte: 7, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "tekst", naam: "Naam", x: 3, y: 6, w: 54, h: 23, tekst: "{Naam}", grootte: 16, vet: true, uitlijning: "left" },
        { type: "kader", naam: "Vak username", x: 60, y: 0, w: 65, h: 32, dikte: 0.3 },
        { type: "tekst", naam: "Kop username", x: 62.5, y: 1.5, w: 60, h: 3.5, tekst: "RF username", grootte: 7, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "barcode", naam: "Barcode username", x: 63, y: 6, w: 59, h: 24, inhoud: "{Username}", toonTekst: true, tekstGrootte: 10, maxStreep: 0.5 },
        { type: "kader", naam: "Vak password", x: 125, y: 0, w: 65, h: 32, dikte: 0.3 },
        { type: "tekst", naam: "Kop password", x: 127.5, y: 1.5, w: 60, h: 3.5, tekst: "RF password", grootte: 7, kleur: "#555555", uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "barcode", naam: "Barcode password", x: 128, y: 6, w: 59, h: 24, inhoud: "{Password}", toonTekst: true, tekstGrootte: 10, maxStreep: 0.5 },
      ],
    },
    gebruikerspasje: {
      groep: "wms", naam: "Gebruikerspasje", sub: "RF username en password · 85,6 × 54 mm", breedte: 85.6, hoogte: 54, modus: "lijst",
      inhoud: { lijstKop: true, lijst: GEBRUIKERS_LIJST },
      elementen: [
        { type: "kader", naam: "Balk", x: 0, y: 0, w: 85.6, h: 10, gevuld: true, kleur: "#111111" },
        { type: "tekst", naam: "Naam", x: 3, y: 0, w: 79.6, h: 10, tekst: "{Naam}", grootte: 15, vet: true, kleur: "#ffffff", uitlijning: "left", terugloop: false },
        { type: "tekst", naam: "Kop username", x: 3, y: 11.5, w: 40, h: 3.6, tekst: "RF USERNAME", grootte: 6.5, vet: true, uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "barcode", naam: "Barcode username", x: 3, y: 15.5, w: 79.6, h: 15.5, inhoud: "{Username}", toonTekst: true, tekstGrootte: 8, maxStreep: 0.6 },
        { type: "tekst", naam: "Kop password", x: 3, y: 33, w: 40, h: 3.6, tekst: "RF PASSWORD", grootte: 6.5, vet: true, uitlijning: "left", verticaal: "top", terugloop: false },
        { type: "barcode", naam: "Barcode password", x: 3, y: 37, w: 79.6, h: 15.5, inhoud: "{Password}", toonTekst: true, tekstGrootte: 8, maxStreep: 0.6 },
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
    uit.toonAls = typeof uit.toonAls === "string" ? uit.toonAls : "";
    if (type === "locaties" && !("pijlen" in e) && "pijl" in e) uit.pijlen = e.pijl !== "geen";   // vorige versie
    if (type === "symbool") {
      if (!PIC.PICTOGRAMMEN[uit.vorm]) uit.vorm = "letop";
      uit.kleur = geldigeKleur(uit.kleur, "#000000"); uit.vulling = geldigeKleur(uit.vulling, "#ffffff");
      // Ontwerpen van voor de kleurstijl: zwart op wit blijft zwart-wit, een eigen kleur blijft eigen.
      if (!("kleurstijl" in e)) uit.kleurstijl = uit.vorm !== "pijl" && uit.kleur === "#000000" && uit.vulling === "#ffffff" ? "zw" : "eigen";
      if (!["kleur", "zw", "eigen"].includes(uit.kleurstijl)) uit.kleurstijl = "kleur";
    }
    return uit;
  }

  function geldigePijl(p, std) {
    if (!p || !PIJLRICHTINGEN.includes(p.r)) return std;
    return { r: p.r, n: Math.min(Math.max(Math.round(+p.n || 1), 1), 3) };
  }

  function locatieInstellingen(l) {
    l = l || {};
    const uit = Object.assign({}, LOCATIE_STANDAARD, l);
    uit.segmenten = (Array.isArray(l.segmenten) ? l.segmenten : LOCATIE_STANDAARD.segmenten).map((s) => ({ naam: "", van: "", tot: "", ...s }));
    uit.kleuren = Object.assign({}, l.kleuren || {});
    uit.groep = Number.isInteger(+uit.groep) && +uit.groep < uit.segmenten.length ? +uit.groep : -1;
    uit.kleurSeg = Number.isInteger(+uit.kleurSeg) && +uit.kleurSeg < uit.segmenten.length ? +uit.kleurSeg : -1;
    uit.kleur = geldigeKleur(uit.kleur, LOCATIE_STANDAARD.kleur);
    if (typeof l.bcSjabloon !== "string")   // oude instelling met één scheidingsteken omzetten
      uit.bcSjabloon = l.bcScheiding ? uit.segmenten.map((_, i) => `{${i + 1}}`).join(l.bcScheiding) : "";
    uit.pijl = geldigePijl(uit.pijl, LOCATIE_STANDAARD.pijl);
    uit.pijlen = {};
    for (const [k, p] of Object.entries(l.pijlen || {})) { const g = geldigePijl(p, null); if (g) uit.pijlen[k] = g; }
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
    if (uit.colliBestemming === "Bakker Logistiek BV\nIndustrieweg 12\n1234 AB  Amsterdam") uit.colliBestemming = "";   // oud voorbeeld
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
  // Standaardpijlen: laagste waarde (bijv. niveau 0, onder de ligger) ↓, daarboven ↑, ↑↑, ↑↑↑.
  function standaardPijlen(waarden) {
    const uit = {}, lijst = [...new Set(waarden)].sort();
    lijst.forEach((v, i) => { uit[v] = lijst.length === 1 ? { r: "omhoog", n: 1 } : i === 0 ? { r: "omlaag", n: 1 } : { r: "omhoog", n: Math.min(i, 3) }; });
    return uit;
  }

  // Barcode volgens de opbouw: {1}..{n} of {Segmentnaam}; spaties en andere tekens blijven staan.
  // Leeg = alle segmenten direct aan elkaar.
  function barcodeTekst(l, segs) {
    const sjabloon = l.bcSjabloon ?? "";
    if (!sjabloon.trim()) return segs.join("");
    return sjabloon.replace(/\{([^{}]+)\}/g, (m, k) => {
      if (/^\d+$/.test(k)) return segs[+k - 1] ?? "";
      const i = l.segmenten.findIndex((s) => String(s.naam || "").trim().toLowerCase() === k.trim().toLowerCase());
      return i >= 0 ? segs[i] : m;
    });
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
    const stdPijl = l.kleurSeg >= 0 ? standaardPijlen(waarden[l.kleurSeg]) : {};
    const namen = l.segmenten.map((s) => s.naam);
    const maak = (segs) => {
      const v = l.kleurSeg >= 0 ? segs[l.kleurSeg] : null;
      return {
        segs: segs.slice(), namen, scheiding: l.scheiding,
        code: segs.join(l.scheiding), bc: barcodeTekst(l, segs),
        kleur: v == null ? l.kleur : geldigeKleur(l.kleuren[v], std[v]),
        pijl: v == null ? l.pijl : (l.pijlen[v] || stdPijl[v]),
      };
    };
    const uit = [];
    const loop = (d, cur) => {
      if (d === buiten.length) {
        const binnen = g >= 0 ? waarden[g] : [null];
        const locaties = binnen.map((v) => { const s = cur.slice(); if (g >= 0) s[g] = v; return maak(s); });
        const eerste = locaties[0], kolommen = { code: eerste.code, bc: eerste.bc };
        eerste.segs.forEach((v, i) => { kolommen[String(i + 1)] = v; if (namen[i]) kolommen[String(namen[i]).trim().toLowerCase()] = v; });
        uit.push({ waarde: eerste.code, nr: eerste.code, locaties, kolommen });
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
      const { kop, rijen } = lijstTabel(cfg);
      if (!rijen.length) throw new Error(cfg.lijstKop ? "Vul onder de kopregel minstens één regel in." : "Vul minstens één regel in de lijst in.");
      lijst = rijen.map((cellen) => {
        const kolommen = {};
        cellen.forEach((c, i) => {
          kolommen[String(i + 1)] = c;
          if (kop && kop[i]) kolommen[kop[i].toLowerCase()] = c;
        });
        return { waarde: cellen[0] || "", nr: cellen[0] || "", kolommen };
      });
    } else if (cfg.modus === "locaties") {
      lijst = locatieStickers(cfg, k);
    } else if (cfg.modus === "zending") {
      // Per pallet/doos één sticker: {colli} = 1/10, 2/10 …; {nr} = 1, 2 …; waarde (barcode) = ordernummer
      const n = Math.floor(Number(cfg.colliAantal));
      if (!(n >= 1)) throw new Error("Vul bij Aantal in hoeveel pallets of colli het zijn (minstens 1).");
      if (n * k > MAX_PAGINAS) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
      const order = String(cfg.colliOrder || "").trim(), bestemming = String(cfg.colliBestemming || "").replace(/\s*\n\s*/g, " ").trim();
      const soort = (cfg.colliSoort === "ANDERS" ? String(cfg.colliSoortEigen || "") : String(cfg.colliSoort || "")).trim();
      lijst = [];
      for (let i = 1; i <= n; i++)
        lijst.push({ waarde: order, nr: String(i), kolommen: { order, bestemming, plaats: bestemming, soort, colli: `${i}/${n}`, aantal: String(n) } });
    } else {
      const w = String(cfg.vasteWaarde || "").trim();
      lijst = [{ waarde: w, nr: w }];
    }
    if (lijst.length * k > MAX_PAGINAS) throw new Error(`Maximaal ${MAX_PAGINAS} stickers per keer.`);
    const uit = [];
    for (const item of lijst) for (let i = 0; i < k; i++) uit.push(item);
    return uit;
  }

  // Lijst als tabel: kolommen gescheiden door tab (plakken uit Excel) of puntkomma; optioneel een kopregel.
  function lijstTabel(cfg) {
    const regels = String(cfg.lijst || "").split(/\r?\n/).filter((r) => r.trim());
    const cellen = (r) => (r.includes("\t") ? r.split("\t") : r.includes(";") ? r.split(";") : [r]).map((c) => c.trim());
    const rijen = regels.map(cellen);
    const kop = cfg.lijstKop && rijen.length ? rijen.shift() : null;
    return { kop, rijen };
  }

  // Invoegbare kolommen voor de editor: {Naam}… bij een kopregel, anders {1}, {2}… (alleen bij meer kolommen).
  function lijstKolommen(cfg) {
    if (cfg.modus === "zending") return COLLI_VELDEN.map((v) => `{${v}}`);
    if (cfg.modus === "locaties") {
      const segs = (cfg.locatie && cfg.locatie.segmenten) || [];
      return ["{code}", "{bc}", ...segs.map((x) => String(x.naam || "").trim()).filter(Boolean).map((n) => `{${n}}`)];
    }
    if (cfg.modus !== "lijst") return [];
    const { kop, rijen } = lijstTabel(cfg);
    if (kop) return kop.filter(Boolean).map((k) => `{${k}}`);
    const n = Math.max(0, ...rijen.map((r) => r.length));
    return n > 1 ? Array.from({ length: n }, (_, i) => `{${i + 1}}`) : [];
  }

  function context(item, n, totaal) {
    return { waarde: item.waarde, nr: item.nr, n, totaal, datum: new Date().toLocaleDateString("nl-NL"),
      locaties: item.locaties, kolommen: item.kolommen };
  }

  const VAST = ["waarde", "nr", "n", "totaal", "datum", "barcode"];
  function vulIn(tekst, ctx) {
    return String(tekst ?? "").replace(/\{([^{}\n]+)\}/g, (m, k) => {
      const s = k.trim();
      if (VAST.includes(s)) return String(ctx[s] ?? "");
      const loc = /^loc(\d{1,2})$/.exec(s);
      if (loc) { const l = ctx.locaties && ctx.locaties[+loc[1] - 1]; return l ? l.code : ""; }
      if (ctx.kolommen) {
        const v = ctx.kolommen[s.toLowerCase()];
        if (v !== undefined) return v;
        if (/^\d+$/.test(s)) return "";       // kolom bestaat niet in deze regel
      }
      return m;
    });
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

  // Tekent een gecodeerde barcode of QR in een vak. Met opties.maxStreep (mm) wordt een korte code niet
  // uitgerekt maar op natuurlijke breedte getekend en uitgelijnd (links/midden/rechts). Geeft de getekende
  // horizontale grenzen terug, zodat er tekst onder kan.
  function tekenCode(r, c, x, y, w, h, stilleZones, naam, opties = {}) {
    const uitl = opties.uitlijning || "center";
    const plaats = (breed) => (uitl === "left" ? x : uitl === "right" ? x + w - breed : x + (w - breed) / 2);
    if (c.soort === "1d") {
      const q = stilleZones ? c.stil : 0;
      let bw = w / (c.bits.length + 2 * q);
      if (opties.maxStreep > 0 && bw > opties.maxStreep) bw = opties.maxStreep;
      const totaal = bw * (c.bits.length + 2 * q), x0 = plaats(totaal) + q * bw;
      if (bw < 0.25) r.waarschuwingen.push(`“${naam}”: streepjes erg dun (${bw.toFixed(2)} mm). Maak de barcode breder of de waarde korter.`);
      r.grens = { x0, x1: x0 + c.bits.length * bw };
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
      const x0 = plaats(z) + q * cel, y0 = y + (h - z) / 2 + q * cel;
      r.grens = { x0, x1: x0 + n * cel };
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

  // Logo in een hoek van een locatievak (zelfde logo in elk vak).
  function celLogo(r, el, x, y, w, h) {
    if (!el.logo) return;
    const m = Math.min(w, h), p = m * 0.05;
    const z = m * Math.min(Math.max(+el.logoGrootte || 25, 5), 90) / 100;
    const s = Math.min(z / el.logoB, z / el.logoH), lw = el.logoB * s, lh = el.logoH * s;
    const pos = el.logoPositie || "boven-rechts";
    const lx = pos.endsWith("links") ? x + p : pos.endsWith("rechts") ? x + w - p - lw : x + (w - lw) / 2;
    const ly = pos.startsWith("boven") ? y + p : pos.startsWith("onder") ? y + h - p - lh : y + (h - lh) / 2;
    r.ops.push({ t: "img", data: el.logo, alias: el.id + "-logo-" + el.logo.length, x: lx, y: ly, w: lw, h: lh });
  }

  function tekstKleurVoor(el, achtergrond) {
    if (el.zwartWit) return "#ffffff";
    return el.tekstKleur === "zwart" ? "#000000" : el.tekstKleur === "wit" ? "#ffffff" : contrast(achtergrond);
  }

  // Sutherland–Hodgman: houd het deel van een veelhoek waar f(punt) <= 0.
  function knip(pts, f) {
    const uit = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
      if (fa <= 0) uit.push(a);
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); uit.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    return uit;
  }

  function splitsCode(loc, k) {
    const n = loc.segs.length;
    k = Math.min(Math.max(Math.round(+k || 0), 0), n);
    const sep = loc.scheiding ?? " ";
    return [loc.segs.slice(0, k).join(sep), loc.segs.slice(k).join(sep)];
  }

  // Stijl “diagonaal”: gekleurd vak met een witte diagonale band (linksonder → rechtsboven) waarin
  // de barcode schuin staat; code linksboven en rechtsonder, pijlen rechts boven de onderste code.
  function diagonaleCel(r, el, loc, x, y, w, h, libs, meet) {
    const kleur = el.zwartWit ? "#000000" : loc.kleur || "#000000", tk = tekstKleurVoor(el, kleur);
    const D = Math.hypot(w, h), U = [w / D, -h / D], N = [h / D, w / D];
    const C = [x + w / 2, y + h / 2];
    const d = (P) => (P[0] - C[0]) * N[0] + (P[1] - C[1]) * N[1];
    const m = Math.min(w, h), t = m * 0.36, p = m * 0.05, marge = m * 0.025;
    const punt = (u, v) => [C[0] + u * U[0] + v * N[0], C[1] + u * U[1] + v * N[1]];

    r.ops.push({ t: "rect", x, y, w, h, kleur, achtergrond: true });
    const band = knip(knip([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], (P) => d(P) - t / 2), (P) => -t / 2 - d(P));
    if (band.length > 2) r.ops.push({ t: "poly", pts: band, kleur: "#ffffff" });

    // Barcode schuin in de band
    if (el.barcode && el.barcode !== "GEEN" && loc.bc) {
      const hb = t * 0.78;
      const lx = (w / 2 - p * 0.5 - (hb / 2) * Math.abs(N[0])) / Math.abs(U[0]);
      const ly = (h / 2 - p * 0.5 - (hb / 2) * Math.abs(N[1])) / Math.abs(U[1]);
      const Lb = Math.min(lx, ly) * 2 * 0.97;
      try {
        const c = codeer(el.barcode, loc.bc, libs);
        if (c.soort === "1d") {
          const q = c.stil, bw = Lb / (c.bits.length + 2 * q);
          if (bw < 0.25) r.waarschuwingen.push(`“${el.naam}”: streepjes erg dun (${bw.toFixed(2)} mm). Maak het label groter of de code korter.`);
          for (let j = 0; j < c.bits.length;) {
            if (c.bits[j] === "1") {
              let k = j;
              while (k < c.bits.length && c.bits[k] === "1") k++;
              const u0 = -Lb / 2 + (q + j) * bw, u1 = -Lb / 2 + (q + k) * bw;
              r.ops.push({ t: "poly", kleur: "#000000", pts: [punt(u0, -hb / 2), punt(u1, -hb / 2), punt(u1, hb / 2), punt(u0, hb / 2)] });
              j = k;
            } else j++;
          }
        } else {
          const z = hb / (Math.abs(N[0]) + Math.abs(N[1]));   // rechtopstaand vierkant dat in de band past
          tekenCode(r, c, C[0] - z / 2, C[1] - z / 2, z, z, true, el.naam);
        }
      } catch (e) {
        r.fouten.push(`${el.naam}: ${e.message}`);
        r.ops.push({ t: "fout", x: C[0] - t / 2, y: C[1] - t / 2, w: t, h: t });
      }
    }

    // Teksten: linksboven en rechtsonder, buiten de band
    const [boven, onder] = splitsCode(loc, el.splits);
    const th = h * 0.22;
    const xMaxBoven = C[0] + (-t / 2 - marge - (y + p + th - C[1]) * N[1]) / N[0];
    const yOnder = y + h - p - th;
    const xMinOnder = C[0] + (t / 2 + marge - (yOnder - C[1]) * N[1]) / N[0];
    const bwBoven = xMaxBoven - (x + p), bwOnder = x + w - p - xMinOnder;
    const sB = boven ? pasKorps(boven, bwBoven, th, true, meet) : Infinity;
    const sO = onder ? pasKorps(onder, bwOnder, th, true, meet) : Infinity;
    const s = Math.min(sB, sO);
    if (isFinite(s)) {
      if (s < 6) r.waarschuwingen.push(`“${el.naam}”: de code wordt erg klein. Maak het label groter of verdeel de segmenten anders.`);
      if (boven) eenRegel(r, boven, x + p, y + p, bwBoven, th, s, true, tk, "left");
      if (onder) eenRegel(r, onder, xMinOnder, yOnder, bwOnder, th, s, true, tk, "right");
    }

    // Pijlen rechts, boven de onderste code
    if (el.pijlen && loc.pijl && loc.pijl.r !== "geen") {
      const ah = h * 0.27, ay = yOnder - p * 0.4 - ah;
      const xMin = C[0] + (t / 2 + marge - (ay - C[1]) * N[1]) / N[0];
      const n = loc.pijl.n || 1, verticaal = loc.pijl.r === "omhoog" || loc.pijl.r === "omlaag";
      const aw = Math.min(x + w - p - xMin, verticaal ? ah * 0.55 * n : ah * 1.1);
      if (aw > 1) pijlen(r, loc.pijl, x + w - p - aw, ay, aw, ah, tk);
    }
    celLogo(r, el, x, y, w, h);
    if (el.rand) r.ops.push({ t: "kader", x, y, w, h, dikte: 0.3, gevuld: false, kleur: "#000000" });
  }

  function locatieCel(r, el, loc, x, y, w, h, libs, meet, maxPijlen) {
    if (el.stijl === "diagonaal") return diagonaleCel(r, el, loc, x, y, w, h, libs, meet);
    const kleur = el.zwartWit ? "#000000" : loc.kleur || "#000000";
    const p = Math.min(w, h) * 0.05;
    let cx = x, cw = w;
    if (el.pijlen && maxPijlen > 0) {
      const aw = Math.min(h * (0.42 + 0.2 * (maxPijlen - 1)), w * (maxPijlen > 1 ? 0.3 : 0.24));
      r.ops.push({ t: "rect", x, y, w: aw, h, kleur, achtergrond: true });
      pijlen(r, loc.pijl, x + aw * 0.08, y + h * 0.1, aw * 0.84, h * 0.8, tekstKleurVoor(el, kleur));
      cx += aw; cw -= aw;
    }
    const metBc = el.barcode && el.barcode !== "GEEN";
    const deel = Math.min(Math.max(+el.barcodeDeel || 45, 15), 75) / 100;
    const bandH = metBc ? h * (1 - deel) : h;
    let tekstKleur = tekstKleurVoor(el, kleur);
    if (el.stijl === "vol") r.ops.push({ t: "rect", x: cx, y, w: cw, h, kleur, achtergrond: true });
    else if (el.stijl === "streep") {
      const sw = Math.max(Math.min(cw * 0.05, 6), 2);
      r.ops.push({ t: "rect", x: cx, y, w: sw, h, kleur, achtergrond: true });
      cx += sw; cw -= sw;
      tekstKleur = el.tekstKleur === "wit" && !el.zwartWit ? "#ffffff" : "#000000";
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
      // Eén regel, of twee regels (bijv. "07 AA" / "01 0") als de code dan groter wordt
      const s1 = pasKorps(loc.code, tw * 0.95, th * 0.9, true, meet);
      const [r1, r2] = splitsCode(loc, el.splits ?? 2);
      let s2 = 0;
      if (r1 && r2) s2 = Math.min(pasKorps(r1, tw * 0.95, Infinity, true, meet), pasKorps(r2, tw * 0.95, Infinity, true, meet),
        (th * 0.92) / ((CAP + LH) * PT));
      if (s2 > s1 * 1.12) {
        const blok = (CAP + LH) * s2 * PT, b1 = ty + (th - blok) / 2 + CAP * s2 * PT;
        [r1, r2].forEach((regel, i) => r.ops.push({ t: "tekst", x: tx + tw / 2, y: b1 + i * LH * s2 * PT, tekst: regel, s: s2, vet: true,
          lettertype: "helvetica", uitlijning: "center", kleur: tekstKleur }));
      } else eenRegel(r, loc.code, tx, ty, tw, th, s1, true, tekstKleur);
    }

    if (metBc) {
      const by = y + bandH + p * 0.7, bh = h - bandH - p * 1.4;
      if (el.stijl === "vol") r.ops.push({ t: "rect", x: cx + p * 0.6, y: by - p * 0.35, w: cw - 1.2 * p, h: bh + p * 0.7, kleur: "#ffffff" });
      if (bh > 1 && loc.bc) {
        try { tekenCode(r, codeer(el.barcode, loc.bc, libs), cx + p, by, cw - 2 * p, bh, true, el.naam); }
        catch (e) { r.fouten.push(`${el.naam}: ${e.message}`); r.ops.push({ t: "fout", x: cx + p, y: by, w: cw - 2 * p, h: bh }); }
      }
    }
    celLogo(r, el, x, y, w, h);
    if (el.rand) r.ops.push({ t: "kader", x, y, w, h, dikte: 0.3, gevuld: false, kleur: "#000000" });
  }

  function tekenLocaties(r, el, ctx, libs, meet) {
    const locs = ctx.locaties && ctx.locaties.length ? ctx.locaties
      : (ctx.waarde ? [{ code: ctx.waarde, bc: ctx.waarde, segs: [ctx.waarde], namen: [""], scheiding: " ", kleur: "#1e88e5", pijl: { r: "omhoog", n: 1 } }] : []);
    const n = locs.length;
    if (!n) return;
    const gap = Math.max(+el.tussenruimte || 0, 0), naast = el.richting !== "onder";
    const cw = naast ? (el.w - gap * (n - 1)) / n : el.w, ch = naast ? el.h : (el.h - gap * (n - 1)) / n;
    if (cw < 5 || ch < 5) { r.waarschuwingen.push(`“${el.naam}”: te weinig ruimte voor ${n} locaties. Maak het vak groter of zet ze ${naast ? "onder" : "naast"} elkaar.`); return; }
    const maxPijlen = Math.max(0, ...locs.map((l) => (l.pijl && l.pijl.r !== "geen" ? l.pijl.n || 1 : 0)));
    locs.forEach((loc, i) => locatieCel(r, el, loc, naast ? el.x + i * (cw + gap) : el.x, naast ? el.y : el.y + i * (ch + gap), cw, ch, libs, meet, maxPijlen));
  }

  // ---------- Eén sticker naar tekenopdrachten ----------

  // "Alleen tonen als": {bestemming} = alleen als die is ingevuld, !{bestemming} = alleen als die leeg is.
  function zichtbaar(el, ctx) {
    const t = String(el.toonAls || "").trim();
    if (!t) return true;
    const neg = t.startsWith("!"), sjabloon = neg ? t.slice(1).trim() : t, v = vulIn(sjabloon, ctx).trim();
    const leeg = !v || v === sjabloon;   // een onbekende variabele blijft staan en telt als leeg
    return neg ? leeg : !leeg;
  }

  function render(cfg, item, ctx, libs, meet, cache) {
    const B = +cfg.breedte, H = +cfg.hoogte;
    const r = { ops: [], waarschuwingen: [], fouten: [] };

    // Eerst alle losse barcodes coderen, zodat {barcode} in teksten bekend is.
    const codes = new Map();
    const zien = (el) => zichtbaar(el, ctx);
    for (const el of cfg.elementen) {
      if (el.type !== "barcode" || !zien(el)) continue;
      const inhoud = vulIn(el.inhoud, ctx).trim();
      if (!inhoud) { codes.set(el.id, null); continue; }
      try { codes.set(el.id, codeer(el.symbologie, inhoud, libs)); }
      catch (e) { codes.set(el.id, { fout: e.message }); r.fouten.push(`${el.naam}: ${e.message}`); }
    }
    const eerste = [...codes.values()].find((c) => c && !c.fout);
    const ctx2 = Object.assign({}, ctx, { barcode: eerste ? eerste.tekst : ctx.waarde });

    for (const el of cfg.elementen) {
      if (!zien(el)) continue;
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
        // Optioneel de waarde als leesbare tekst onder de barcode (spaties blijven staan)
        const s = Math.max(+el.tekstGrootte || 10, 3), th = el.toonTekst ? (CAP + DESC) * s * PT : 0, gap = el.toonTekst ? Math.min(h * 0.04, 1) : 0;
        const bh = Math.max(h - th - gap, 1);
        tekenCode(r, c, x, y, w, bh, el.stilleZones, el.naam, { maxStreep: +el.maxStreep || 0, uitlijning: el.bcUitlijning });
        if (el.toonTekst && r.grens) {
          const uitl = el.bcUitlijning || "center", { x0, x1 } = r.grens;
          const tx = uitl === "left" ? x0 : uitl === "right" ? x1 : (x0 + x1) / 2;
          r.ops.push({ t: "tekst", x: tx, y: y + bh + gap + CAP * s * PT, tekst: c.tekst, s, vet: false, lettertype: "helvetica", uitlijning: uitl, kleur: "#000000" });
        }
      } else if (el.type === "locaties") {
        tekenLocaties(r, { ...el, x, y, w, h }, ctx, libs, meet);
      } else if (el.type === "symbool") {
        PIC.tekenPictogram(r, el, x, y, w, h);
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
        const fmt = o.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        // jsPDF draait om de linkeronderhoek; zo komt een 180° gedraaide afbeelding precies in haar vak
        if (o.rot === 180) doc.addImage(o.data, fmt, o.x + dx + o.w, o.y + dy - o.h, o.w, o.h, o.alias, "FAST", 180);
        else doc.addImage(o.data, fmt, o.x + dx, o.y + dy, o.w, o.h, o.alias, "FAST");
      } else if (o.t === "tekst") {
        doc.setFont(o.lettertype, o.vet ? "bold" : "normal");
        doc.setFontSize(o.s);
        const [r, g, b] = hexRgb(o.kleur || "#000000");
        doc.setTextColor(r, g, b);
        doc.text(o.tekst, o.x + dx, o.y + dy, o.hoek ? { angle: o.hoek, baseline: "alphabetic" } : { align: o.uitlijning, baseline: "alphabetic" });
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
    const items = waarden(cfg), totaal = items.length;
    const lijst = afdrukLijst(cfg, items);   // alles, of alleen de gekozen stickers (met hun eigen nummer)
    const B = +cfg.breedte, H = +cfg.hoogte;
    if (!(B >= 10 && H >= 10)) throw new Error("Labelformaat moet minstens 10 × 10 mm zijn.");
    if (cfg.vel === "vouw") return maakVouwPdf(cfg, lijst, totaal, libs);
    const vel = velIndeling(cfg);
    if (vel) return maakVelPdf(cfg, lijst, totaal, vel, libs);
    const a = Math.max(+cfg.afloop || 0, 0), rand = cfg.snijtekens ? 10 : 0, off = a + rand;
    const PB = B + 2 * off, PH = H + 2 * off;
    const liggend = PB >= PH, formaat = [Math.min(PB, PH), Math.max(PB, PH)];
    const doc = new libs.jsPDF({ orientation: liggend ? "landscape" : "portrait", unit: "mm", format: formaat });
    doc.setProperties({ title: "Stickers" });
    const meet = meetMet(doc), cache = new Map();
    lijst.forEach(({ item, n }, j) => {
      if (j > 0) doc.addPage(formaat, liggend ? "landscape" : "portrait");
      const r = render(cfg, item, context(item, n, totaal), libs, meet, cache);
      if (r.fouten.length) throw new Error(`Sticker ${n}: ${r.fouten[0]}`);
      tekenPdf(doc, metAfloop(r.ops, B, H, a), off, off);
      if (rand) snijtekens(doc, B, H, off, a);
    });
    return { doc, aantal: lijst.length };
  }

  // Omvang van alles wat er getekend wordt (voor centreren). Tekst inclusief onderstokken.
  function omvang(ops, meet) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const neem = (a, b, c, d) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
    for (const o of ops) {
      if (o.t === "rect" || o.t === "kader" || o.t === "img" || o.t === "fout") neem(o.x, o.y, o.x + o.w, o.y + o.h);
      else if (o.t === "poly") o.pts.forEach(([x, y]) => neem(x, y, x, y));
      else if (o.t === "tekst") {
        const b = meet(o.tekst, o.s, { vet: o.vet, lettertype: o.lettertype });
        const lx = o.uitlijning === "left" ? o.x : o.uitlijning === "right" ? o.x - b : o.x - b / 2;
        neem(lx, o.y - CAP * o.s * PT, lx + b, o.y + DESC * o.s * PT);
      }
    }
    return isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }

  // Meerdere etiketten per A4-vel. Elk etiket wordt bijgesneden tot zijn eigen vak.
  function maakVelPdf(cfg, lijst, totaal, vel, libs) {
    const items = lijst.map((x) => x.item);
    const P = vel.pagina, liggend = P.b > P.h, formaat = [Math.min(P.b, P.h), Math.max(P.b, P.h)];
    const doc = new libs.jsPDF({ orientation: liggend ? "landscape" : "portrait", unit: "mm", format: formaat });
    doc.setProperties({ title: vel.titel || "Stickers" });
    const meet = meetMet(doc), cache = new Map();
    const totaalVellen = Math.ceil((vel.start - 1 + items.length) / vel.perVel);
    // Kop van elk vel: logo (links of rechts) en titel; paginanummer onderaan als er meer vellen zijn.
    const titel = (nr) => {
      const breed = vel.kol * vel.b + (vel.kol - 1) * vel.gx;
      const kopBoven = vel.boven - vel.kopHoogte, kopH = vel.kopHoogte - 3;   // 3 mm ruimte tot de eerste rij
      let tx = vel.links;
      if (vel.logo) {
        const L = vel.logo, ly = kopBoven + (kopH - L.h) / 2;
        const lx = L.plek === "links" ? vel.links : vel.links + breed - L.b;
        doc.addImage(L.data, L.data.startsWith("data:image/jpeg") ? "JPEG" : "PNG", lx, ly, L.b, L.h, "vellogo-" + L.data.length, "FAST");
        if (L.plek === "links") tx = vel.links + L.b + 5;
      }
      if (vel.titel) {
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold"); doc.setFontSize(15);
        doc.text(vel.titel, tx, kopBoven + kopH / 2 + (CAP * 15 * PT) / 2, { baseline: "alphabetic" });
      }
      if (totaalVellen > 1 && vel.eigen) {
        doc.setTextColor(110, 110, 110);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(`${nr} / ${totaalVellen}`, vel.pagina.b / 2, vel.pagina.h - 4, { align: "center", baseline: "alphabetic" });
      }
    };
    // Posities vooraf bepalen, zodat een onvolledige laatste rij kan worden uitgevuld.
    const plekken = [];
    let pos = vel.start - 1, pagina = 0;
    for (let i = 0; i < items.length; i++) {
      if (pos >= vel.perVel) { pagina++; pos = 0; }
      plekken.push({ pagina, kol: pos % vel.kol, rij: Math.floor(pos / vel.kol), b: vel.b, dxExtra: 0 });
      pos++;
    }
    const rijBreedte = vel.kol * vel.b + (vel.kol - 1) * vel.gx;
    if (vel.uitvullen && plekken.length) {
      const laatste = plekken[plekken.length - 1];
      const opRij = plekken.filter((p) => p.pagina === laatste.pagina && p.rij === laatste.rij);
      // Alleen als de rij links begint (geen overgeslagen etiketten) en niet al vol is
      if (opRij.length < vel.kol && opRij[0].kol === 0) {
        const n = opRij.length, b = (rijBreedte - (n - 1) * vel.gx) / n;
        opRij.forEach((p, j) => { p.b = b; p.vrijX = vel.links + j * (b + vel.gx); });
      }
    }
    // Ontwerp horizontaal uitrekken naar een bredere cel (lettergroottes blijven gelijk)
    const breder = new Map();
    const ontwerpVoor = (b) => {
      if (Math.abs(b - vel.b) < 0.01) return cfg;
      if (!breder.has(b)) {
        const sx = b / vel.b;
        breder.set(b, { ...cfg, breedte: b, elementen: cfg.elementen.map((e) => ({ ...e, x: e.x * sx, w: e.w * sx })) });
      }
      return breder.get(b);
    };

    // Eerst alles opbouwen, zodat we per rij kunnen centreren.
    const getekend = items.map((item, i) => {
      const r = render(ontwerpVoor(plekken[i].b), item, context(item, lijst[i].n, totaal), libs, meet, cache);
      if (r.fouten.length) throw new Error(`Sticker ${lijst[i].n}: ${r.fouten[0]}`);
      return { ops: r.ops, o: vel.centreren ? omvang(r.ops, meet) : null };
    });
    // Verticaal centreren per rij (barcodes naast elkaar blijven op één lijn), horizontaal per vak.
    const rijOmvang = new Map();
    getekend.forEach(({ o }, i) => {
      if (!o) return;
      const k = plekken[i].pagina + ":" + plekken[i].rij, v = rijOmvang.get(k);
      rijOmvang.set(k, v ? { y0: Math.min(v.y0, o.y0), y1: Math.max(v.y1, o.y1) } : { y0: o.y0, y1: o.y1 });
    });

    let huidigePagina = 0;
    titel(1);
    items.forEach((item, i) => {
      const p = plekken[i], { ops, o } = getekend[i];
      if (p.pagina > huidigePagina) { doc.addPage(formaat, liggend ? "landscape" : "portrait"); huidigePagina = p.pagina; titel(p.pagina + 1); }
      const dx = p.vrijX ?? vel.links + p.kol * (vel.b + vel.gx), dy = vel.boven + p.rij * (vel.h + vel.gy);
      let sx = 0, sy = 0;
      if (o) {
        const ry = rijOmvang.get(p.pagina + ":" + p.rij);
        sx = (p.b - (o.x1 - o.x0)) / 2 - o.x0;
        sy = (vel.h - (ry.y1 - ry.y0)) / 2 - ry.y0;
      }
      const r = { ops };
      doc.saveGraphicsState();
      doc.rect(dx, dy, p.b, vel.h, null);
      doc.clip();
      doc.discardPath();
      tekenPdf(doc, r.ops, dx + sx, dy + sy);
      doc.restoreGraphicsState();
      if (cfg.velKaders) {
        doc.setDrawColor(170, 170, 170); doc.setLineWidth(0.15);
        doc.roundedRect(dx, dy, p.b, vel.h, 1.5, 1.5, "S");
      }
    });
    return { doc, aantal: items.length, vellen: doc.getNumberOfPages() };
  }

  // Alles 180° draaien binnen een label van B × H (voor de bovenste helft van een vouwkaart).
  function draai180(ops, B, H, meet) {
    return ops.map((o) => {
      if (o.t === "rect" || o.t === "kader" || o.t === "fout") return { ...o, x: B - o.x - o.w, y: H - o.y - o.h };
      if (o.t === "img") return { ...o, x: B - o.x - o.w, y: H - o.y - o.h, rot: 180 };
      if (o.t === "poly") return { ...o, pts: o.pts.map(([x, y]) => [B - x, H - y]) };
      if (o.t === "tekst") {
        const b = meet(o.tekst, o.s, { vet: o.vet, lettertype: o.lettertype });
        const xl = o.uitlijning === "left" ? o.x : o.uitlijning === "right" ? o.x - b : o.x - b / 2;
        return { ...o, x: B - xl, y: H - o.y, hoek: 180 };
      }
      return o;
    });
  }

  // Vouwkaart: per A4 twee keer hetzelfde label; de bovenste helft staat op z'n kop.
  // Dubbelgevouwen (over een ligger of als tentje) is de locatie aan beide kanten leesbaar.
  const VOUW_HELFT = 148.5;
  function maakVouwPdf(cfg, lijst, totaal, libs) {
    const B = +cfg.breedte, H = +cfg.hoogte;
    if (B > 210.01 || H > VOUW_HELFT + 0.01)
      throw new Error(`Voor een vouwkaart mag het label maximaal 210 × 148 mm zijn (nu ${B} × ${H} mm). Kies bijv. het formaat A5 liggend of 200 × 138 mm.`);
    const doc = new libs.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setProperties({ title: "Vouwkaarten" });
    const meet = meetMet(doc), cache = new Map();
    const dx = (210 - B) / 2, dyOnder = VOUW_HELFT + (VOUW_HELFT - H) / 2, dyBoven = (VOUW_HELFT - H) / 2;
    const vak = (ops, y) => {
      doc.saveGraphicsState();
      doc.rect(dx, y, B, H, null); doc.clip(); doc.discardPath();
      tekenPdf(doc, ops, dx, y);
      doc.restoreGraphicsState();
    };
    lijst.forEach(({ item, n }, j) => {
      if (j > 0) doc.addPage("a4", "portrait");
      const r = render(cfg, item, context(item, n, totaal), libs, meet, cache);
      if (r.fouten.length) throw new Error(`Sticker ${n}: ${r.fouten[0]}`);
      vak(r.ops, dyOnder);
      vak(draai180(r.ops, B, H, meet), dyBoven);
      // Vouwlijn
      doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2);
      doc.setLineDashPattern([3, 2], 0); doc.line(0, VOUW_HELFT, 210, VOUW_HELFT); doc.setLineDashPattern([], 0);
      doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal"); doc.setFontSize(6);
      doc.text("vouwen", 3, VOUW_HELFT - 1.2, { baseline: "alphabetic" });
    });
    return { doc, aantal: lijst.length, vellen: lijst.length };
  }

  // Welke stickers worden afgedrukt: alles, alleen de eerste, of bepaalde nummers (bijv. "1" of "3-5, 8").
  // De nummers gaan over de stickers zonder kopieën (bij Zending: het palletnummer); kopieën gaan mee.
  function afdrukNummers(cfg, aantalItems) {
    if (cfg.afdrukken === "eerste") return [1];
    if (cfg.afdrukken !== "nummers") return null;
    const nrs = new Set();
    for (const deel of String(cfg.afdrukNummers || "").split(/[,;\s]+/).filter(Boolean)) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(deel);
      if (!m) throw new Error(`Afdrukken: “${deel}” is geen nummer. Gebruik bijv. 1 of 3-5, 8.`);
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let i = Math.min(a, b); i <= Math.max(a, b) && i <= aantalItems; i++) if (i >= 1) nrs.add(i);
    }
    if (!nrs.size) throw new Error(`Afdrukken: vul nummers in tussen 1 en ${aantalItems}, bijv. 1 of 3-5.`);
    return [...nrs].sort((x, y) => x - y);
  }
  function afdrukLijst(cfg, items) {
    const k = kopieen(cfg), nrs = afdrukNummers(cfg, Math.ceil(items.length / k));
    if (!nrs) return items.map((item, i) => ({ item, n: i + 1 }));
    const uit = [];
    for (const nr of nrs) for (let c = 0; c < k; c++) { const i = (nr - 1) * k + c; if (i < items.length) uit.push({ item: items[i], n: i + 1 }); }
    return uit;
  }
  function afdrukAantal(cfg, totaal) { return afdrukLijst(cfg, new Array(totaal).fill(0)).length; }

  // Aantal A4-vellen voor een aantal etiketten (voor de teller in de editor).
  function aantalVellen(cfg, aantal) {
    if (cfg.vel === "vouw") return aantal;
    const v = velIndeling(cfg);
    return v ? Math.ceil((v.start - 1 + aantal) / v.perVel) : 0;
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

  const api = { afdrukNummers, afdrukAantal, COLLI_SOORTEN, COLLI_VELDEN, BORD_FORMATEN, BORD_VELDEN, bordTeksten, bordOntwerp, PIC, VOORBEELD_LIJSTEN, PT, MAX_PAGINAS, FORMATEN, FORMAATGROEPEN, VELLEN, PAGINAS, velIndeling, aantalVellen, LETTERTYPEN, PALET, TYPE_STANDAARD, STARTERS, INHOUD_STANDAARD, LOCATIE_STANDAARD,
    lijstKolommen, nieuwId, element, standaard, normaliseer, migreer, locatieInstellingen, segmentWaarden, standaardKleuren, standaardPijlen, PIJLRICHTINGEN, waarden, context, render,
    meetMet, maakPdf, opsNaarSvg, esc, contrast };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Labels = api;
})(typeof window !== "undefined" ? window : globalThis);
