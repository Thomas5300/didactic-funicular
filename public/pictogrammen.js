// Stickerbouwer — pictogrammen: waarschuwing, verbod, gebod, nood/EHBO, brand, verzendsymbolen en pijlen.
// Alles is vectorwerk: een pictogram wordt een lijst gevulde veelhoeken (tekenopdracht "poly"), zodat het in
// de PDF en in het voorbeeld even scherp is, op elk formaat. Ontwerpen gebeurt in een vak van 0..100.
// Werkt in de browser (window.Pictogrammen) en in Node (module.exports).
(function (root) {
  // Veiligheidskleuren (ongeveer RAL 1003, 3001, 5005 en 6032), gekozen zodat ze ook goed printen.
  const KLEUREN = { geel: "#ffc400", rood: "#d52b1e", blauw: "#1a5ca8", groen: "#138a4b" };

  const GROEPEN = [
    ["waarschuwing", "Waarschuwing"], ["verbod", "Verbod"], ["gebod", "Gebod"], ["nood", "Nood en EHBO"],
    ["brand", "Brand"], ["verzending", "Verzending"], ["pijl", "Pijlen"],
  ];
  const PIJLRICHTINGEN = ["geen", "omhoog", "omlaag", "links", "rechts"];

  const geldig = (hex, std) => (/^#[0-9a-f]{6}$/i.test(String(hex || "")) ? String(hex).toLowerCase() : std);
  function licht(hex) {
    const n = parseInt(String(hex).slice(1), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
  }
  const rad = (g) => (g * Math.PI) / 180;

  // ---------- Pijlen (ook gebruikt door het locatievak) ----------

  // Eén pijl in een vak. Pijlen naar boven/beneden zijn smal en lang, naar links/rechts breed en laag.
  function pijl(r, richting, x, y, w, h, kleur) {
    const basis = [[0, -0.5], [0.5, -0.06], [0.16, -0.06], [0.16, 0.5], [-0.16, 0.5], [-0.16, -0.06], [-0.5, -0.06]];
    const draai = { omhoog: ([a, b]) => [a, b], omlaag: ([a, b]) => [a, -b], links: ([a, b]) => [b, -a], rechts: ([a, b]) => [-b, a] }[richting];
    if (!draai) return;
    const verticaal = richting === "omhoog" || richting === "omlaag";
    const lengte = (verticaal ? h : w) * 0.82, breedte = Math.min((verticaal ? w : h) * 0.85, lengte * 0.62);
    const sx = verticaal ? breedte : lengte, sy = verticaal ? lengte : breedte, cx = x + w / 2, cy = y + h / 2;
    r.ops.push({ t: "poly", kleur, pts: basis.map(draai).map(([a, b]) => [cx + a * sx, cy + b * sy]) });
  }

  // 1 tot 3 pijlen naast (↑↓) of onder (←→) elkaar.
  function pijlen(r, p, x, y, w, h, kleur) {
    if (!p || p.r === "geen") return;
    const n = Math.min(Math.max(p.n || 1, 1), 3), verticaal = p.r === "omhoog" || p.r === "omlaag";
    for (let i = 0; i < n; i++) {
      if (verticaal) pijl(r, p.r, x + (i * w) / n, y, w / n, h, kleur);
      else pijl(r, p.r, x, y + (i * h) / n, w, h / n, kleur);
    }
  }

  // ---------- Pen: tekenen in een vierkant vak van 0..100 ----------

  function ellipsPunten(cu, cv, ru, rv, hoek = 0, n = 0) {
    n = n || Math.max(16, Math.min(72, Math.round(Math.max(ru, rv) * 2.4)));
    const c = Math.cos(rad(hoek)), s = Math.sin(rad(hoek)), uit = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, du = ru * Math.cos(a), dv = rv * Math.sin(a);
      uit.push([cu + du * c - dv * s, cv + du * s + dv * c]);
    }
    return uit;
  }

  // Een SVG-achtig pad (M L H V Q C Z, ook kleine letters) omzetten naar veelhoeken.
  function padPunten(d) {
    const tok = String(d).match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
    const paden = [], N = 14;
    let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = "", i = 0;
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
      const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === "Z") { if (cur && cur.length > 2) paden.push(cur); cur = null; x = sx; y = sy; continue; }
      if (C === "M") {
        if (cur && cur.length > 2) paden.push(cur);
        x = ox + num(); y = oy + num(); sx = x; sy = y; cur = [[x, y]]; cmd = rel ? "l" : "L";
        continue;
      }
      if (!cur) cur = [[x, y]];
      if (C === "L") { x = ox + num(); y = oy + num(); cur.push([x, y]); }
      else if (C === "H") { x = ox + num(); cur.push([x, y]); }
      else if (C === "V") { y = oy + num(); cur.push([x, y]); }
      else if (C === "Q") {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num();
        for (let t = 1; t <= N; t++) { const s = t / N, a = (1 - s) ** 2, b = 2 * (1 - s) * s, c = s * s; cur.push([a * x + b * x1 + c * x2, a * y + b * y1 + c * y2]); }
        x = x2; y = y2;
      } else if (C === "C") {
        const x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), x3 = ox + num(), y3 = oy + num();
        for (let t = 1; t <= N; t++) {
          const s = t / N, a = (1 - s) ** 3, b = 3 * (1 - s) ** 2 * s, c = 3 * (1 - s) * s * s, e = s ** 3;
          cur.push([a * x + b * x1 + c * x2 + e * x3, a * y + b * y1 + c * y2 + e * y3]);
        }
        x = x3; y = y3;
      } else throw new Error("Pictogram: onbekend padcommando " + cmd);
    }
    if (cur && cur.length > 1) paden.push(cur);
    return paden;
  }

  // Dikke lijn met ronde uiteinden tussen twee punten (een "stadion").
  function stadion(a, b, rr) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) return ellipsPunten(a[0], a[1], rr, rr);
    const h0 = Math.atan2(dy, dx), uit = [], n = 10;
    for (let i = 0; i <= n; i++) { const t = h0 - Math.PI / 2 + (i / n) * Math.PI; uit.push([b[0] + rr * Math.cos(t), b[1] + rr * Math.sin(t)]); }
    for (let i = 0; i <= n; i++) { const t = h0 + Math.PI / 2 + (i / n) * Math.PI; uit.push([a[0] + rr * Math.cos(t), a[1] + rr * Math.sin(t)]); }
    return uit;
  }

  // Vloeiende dikke lijn langs veel punten (een gesampelde kromme) als één veelhoek.
  function lintPunten(pts, d) {
    const n = pts.length, h = d / 2, links = [], rechts = [];
    const normaal = (i) => {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    };
    for (let i = 0; i < n; i++) {
      const [nx, ny] = normaal(i);
      links.push([pts[i][0] + nx * h, pts[i][1] + ny * h]);
      rechts.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
    }
    return [...links, ...rechts.reverse()];
  }

  function pen(r, x, y, s, kleur, gat) {
    const P = ([u, v]) => [x + (u * s) / 100, y + (v * s) / 100];
    const vul = (pts, k) => { if (pts.length > 2) r.ops.push({ t: "poly", kleur: k, pts: pts.map(P) }); };
    const p = {
      kleur, gat,
      vlak(pts, k = kleur) { vul(pts, k); return p; },
      rect(u, v, w, h, k = kleur) { vul([[u, v], [u + w, v], [u + w, v + h], [u, v + h]], k); return p; },
      // afgeronde rechthoek
      rrect(u, v, w, h, rr, k = kleur) {
        rr = Math.min(rr, w / 2, h / 2);
        const pts = [], hoek = (cu, cv, a0) => { for (let i = 0; i <= 6; i++) { const a = rad(a0 + i * 15); pts.push([cu + rr * Math.cos(a), cv + rr * Math.sin(a)]); } };
        hoek(u + w - rr, v + rr, -90); hoek(u + w - rr, v + h - rr, 0); hoek(u + rr, v + h - rr, 90); hoek(u + rr, v + rr, 180);
        vul(pts, k); return p;
      },
      cirkel(cu, cv, rr, k = kleur) { vul(ellipsPunten(cu, cv, rr, rr), k); return p; },
      ellips(cu, cv, ru, rv, k = kleur, hoek = 0) { vul(ellipsPunten(cu, cv, ru, rv, hoek), k); return p; },
      // taartpunt (graden, met de klok mee vanaf rechts)
      punt(cu, cv, rr, a0, a1, k = kleur) {
        const pts = [[cu, cv]], n = Math.max(4, Math.round(Math.abs(a1 - a0) / 6));
        for (let i = 0; i <= n; i++) { const a = rad(a0 + ((a1 - a0) * i) / n); pts.push([cu + rr * Math.cos(a), cv + rr * Math.sin(a)]); }
        vul(pts, k); return p;
      },
      // gedraaide rechthoek (breedte w, hoogte h) rond een middelpunt
      blok(cu, cv, w, h, graden = 0, k = kleur) {
        const c = Math.cos(rad(graden)), sn = Math.sin(rad(graden));
        vul([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([a, b]) => [cu + a * c - b * sn, cv + a * sn + b * c]), k); return p;
      },
      // gedraaid vierkant (halve zijde hz) rond een middelpunt
      vierkant(cu, cv, hz, graden, k = kleur) {
        const c = Math.cos(rad(graden)), sn = Math.sin(rad(graden));
        vul([[-hz, -hz], [hz, -hz], [hz, hz], [-hz, hz]].map(([a, b]) => [cu + a * c - b * sn, cv + a * sn + b * c]), k); return p;
      },
      // dikke lijn met ronde uiteinden en hoeken door een reeks punten
      lijn(pts, d, k = kleur) { for (let i = 0; i < pts.length - 1; i++) vul(stadion(pts[i], pts[i + 1], d / 2), k); if (pts.length === 1) vul(stadion(pts[0], pts[0], d / 2), k); return p; },
      // boog als band (graden, met de klok mee vanaf rechts)
      boog(cu, cv, rr, a0, a1, d, k = kleur) {
        const n = Math.max(6, Math.round(Math.abs(a1 - a0) / 5)), buiten = [], binnen = [];
        for (let i = 0; i <= n; i++) {
          const a = rad(a0 + ((a1 - a0) * i) / n);
          buiten.push([cu + (rr + d / 2) * Math.cos(a), cv + (rr + d / 2) * Math.sin(a)]);
          binnen.push([cu + (rr - d / 2) * Math.cos(a), cv + (rr - d / 2) * Math.sin(a)]);
        }
        vul([...buiten, ...binnen.reverse()], k); return p;
      },
      pad(d, k = kleur) { for (const pts of padPunten(d)) vul(pts, k); return p; },
      // een pad als lijn (bijv. rook of een slang), met ronde uiteinden
      streep(d, dikte, k = kleur) {
        for (const pts of padPunten(d)) {
          vul(lintPunten(pts, dikte), k);
          vul(ellipsPunten(pts[0][0], pts[0][1], dikte / 2, dikte / 2), k);
          vul(ellipsPunten(pts[pts.length - 1][0], pts[pts.length - 1][1], dikte / 2, dikte / 2), k);
        }
        return p;
      },
      // 1–3 pijlen in een deelvak
      pijl(richting, n, u, v, w, h, k = kleur) {
        const [x0, y0] = P([u, v]);
        pijlen(r, { r: richting, n }, x0, y0, (w * s) / 100, (h * s) / 100, k); return p;
      },
      // deelvak: (u, v) met zijde `zijde` wordt het nieuwe 0..100
      sub(u, v, zijde) { const [x0, y0] = P([u, v]); return pen(r, x0, y0, (s * zijde) / 100, kleur, gat); },
    };
    return p;
  }

  // ---------- Kaders en kleuren ----------

  // Kleuren per groep en kleurstijl: rand (kader), binnen (vlak), teken (het pictogram) en gat (uitsparingen in het teken).
  function kleurenVoor(groep, stijl, kleur, vulling) {
    kleur = geldig(kleur, "#000000"); vulling = geldig(vulling, "#ffffff");
    if (groep === "verzending" || groep === "pijl") return { rand: kleur, binnen: null, teken: kleur, gat: licht(kleur) ? "#000000" : "#ffffff" };
    const zw = stijl === "zw", eigen = stijl === "eigen";
    if (groep === "waarschuwing") {
      if (eigen) return { rand: kleur, binnen: vulling, teken: kleur, gat: vulling };
      const binnen = zw ? "#ffffff" : KLEUREN.geel;
      return { rand: "#000000", binnen, teken: "#000000", gat: binnen };
    }
    if (groep === "verbod") {
      if (eigen) return { rand: kleur, binnen: vulling, teken: licht(vulling) ? "#000000" : "#ffffff", gat: vulling };
      return { rand: zw ? "#000000" : KLEUREN.rood, binnen: "#ffffff", teken: "#000000", gat: "#ffffff" };
    }
    // gebod, nood, brand: gekleurd vlak met een wit teken
    const vlak = eigen ? kleur : zw ? "#000000" : { gebod: KLEUREN.blauw, nood: KLEUREN.groen, brand: KLEUREN.rood }[groep] || "#000000";
    return { rand: vlak, binnen: vlak, teken: eigen ? vulling : "#ffffff", gat: vlak };
  }

  // Hoofdkleur van een groep (bijv. voor de kopbalk van een bord).
  function accentKleur(groep) {
    return { waarschuwing: KLEUREN.geel, verbod: KLEUREN.rood, gebod: KLEUREN.blauw, nood: KLEUREN.groen, brand: KLEUREN.rood }[groep] || "#000000";
  }
  // Standaardkleuren voor "eigen kleuren" (zodat je begint bij de normkleuren).
  function eigenStart(groep) {
    if (groep === "waarschuwing") return { kleur: "#000000", vulling: KLEUREN.geel };
    if (groep === "verbod") return { kleur: KLEUREN.rood, vulling: "#ffffff" };
    if (groep === "gebod" || groep === "nood" || groep === "brand") return { kleur: accentKleur(groep), vulling: "#ffffff" };
    return { kleur: "#000000", vulling: "#ffffff" };
  }

  // Tekent het kader van een groep en geeft een pen in kadercoördinaten terug, het standaardvak voor het teken
  // en eventueel wat er óver het teken moet (de verbodsbalk).
  // Driehoek: u loopt 0..100 over de zijde, v vanaf de top; de basis ligt op v = 86,6 (binnenrand 17..78).
  function kader(r, groep, x, y, w, h, c) {
    if (groep === "waarschuwing") {
      const zijde = Math.min(w, h / 0.866), th = zijde * 0.866;
      const p = pen(r, x + (w - zijde) / 2, y + (h - th) / 2, zijde, c.teken, c.gat);
      const hoeken = [[50, 0], [0, 86.6], [100, 86.6]];
      p.vlak(hoeken, c.rand);
      // binnenkant: kleiner gemaakt rond het zwaartepunt, zodat een even dikke rand overblijft
      const G = [50, 57.735], k = (28.8675 - 8.5) / 28.8675;
      p.vlak(hoeken.map(([a, b]) => [G[0] + (a - G[0]) * k, G[1] + (b - G[1]) * k]), c.binnen);
      return { p, vak: [28, 35, 43] };
    }
    const z = Math.min(w, h), p = pen(r, x + (w - z) / 2, y + (h - z) / 2, z, c.teken, c.gat);
    if (groep === "paneel") {   // vierkant waarschuwingspaneel: zwarte rand, gele of witte binnenkant
      p.rrect(0, 0, 100, 100, 7, c.rand).rrect(6, 6, 88, 88, 3, c.binnen);
      return { p, vak: [9, 9, 82] };
    }
    if (groep === "verbod") {
      p.cirkel(50, 50, 50, c.rand).cirkel(50, 50, 40, c.binnen);
      const a = Math.SQRT1_2, L = 40.4, W = 4.6;
      const balk = () => p.vlak([[50 - L * a - W * a, 50 - L * a + W * a], [50 + L * a - W * a, 50 + L * a + W * a],
        [50 + L * a + W * a, 50 + L * a - W * a], [50 - L * a + W * a, 50 - L * a - W * a]], c.rand);
      return { p, vak: [20, 20, 60], na: balk };
    }
    if (groep === "gebod") { p.cirkel(50, 50, 50, c.binnen); return { p, vak: [17, 17, 66] }; }
    if (groep === "nood" || groep === "brand") { p.rrect(0, 0, 100, 100, 5, c.binnen); return { p, vak: [13, 13, 74] }; }
    return { p, vak: [0, 0, 100] };
  }

  // ---------- Vormen (in een vak van 0..100) ----------

  const VORM = {
    persoonLopend(q) {   // naar rechts
      q.cirkel(55, 8.5, 8.5);
      q.lijn([[52, 22], [47, 52]], 14);
      q.lijn([[53.5, 25], [61, 38], [69, 46]], 8.5);
      q.lijn([[50, 25], [42, 38], [34, 46]], 8.5);
      q.lijn([[48, 52], [57, 72], [62, 91]], 11);
      q.lijn([[62, 93], [71, 94]], 7);
      q.lijn([[46, 52], [40, 72], [29, 89]], 11);
      q.lijn([[29, 91], [25, 96]], 7);
    },
    persoonRennend(q) {   // naar rechts
      q.cirkel(66, 9, 9);
      q.lijn([[60, 24], [47, 52]], 14.5);
      q.lijn([[61, 28], [74, 39], [87, 33]], 9);
      q.lijn([[57, 28], [42, 32], [30, 23]], 9);
      q.lijn([[48, 52], [67, 63], [69, 84]], 11);
      q.lijn([[69, 87], [79, 89]], 7);
      q.lijn([[46, 52], [35, 72], [16, 77]], 11);
    },
    heftruck(q, mastTop = 8) {   // naar links, met vorken
      const g = q.gat;
      q.rect(0, 84, 25, 5);
      q.rect(17, mastTop, 7, 89 - mastTop);
      q.pad("M28,56 L82,56 Q96,56 96,70 L96,86 L28,86 Z");
      q.lijn([[34, 56], [39, 22], [73, 22], [78, 56]], 5);
      q.cirkel(58, 33, 6.5);
      q.lijn([[58, 42], [63, 55]], 9);
      q.cirkel(40, 86, 14.5, g).cirkel(40, 86, 11.5).cirkel(40, 86, 4.5, g);
      q.cirkel(80, 88, 12, g).cirkel(80, 88, 9).cirkel(80, 88, 3.5, g);
    },
    vlam(q) {
      q.pad("M50,0 C55,14 70,24 76,40 C84,60 77,82 50,84 C24,84 16,64 22,48 C25,38 32,32 33,22 C40,30 41,37 43,43 C45,28 51,16 50,0 Z");
      q.pad("M53,46 C58,56 66,63 62,74 C60,79 55,81 50,81 C43,81 38,76 40,68 C42,61 50,57 53,46 Z", q.gat);
      q.rect(12, 90, 76, 8);
    },
    bliksem(q) { q.pad("M52,0 L78,0 L60,38 L74,38 L30,100 L44,56 L30,56 Z"); },
    sneeuw(q) {
      for (const a of [0, 60, 120]) {
        const dx = 46 * Math.cos(rad(a)), dy = 46 * Math.sin(rad(a));
        q.lijn([[50 - dx, 50 - dy], [50 + dx, 50 + dy]], 7);
      }
      for (let i = 0; i < 6; i++) {
        const a = i * 60, B = [50 + 27 * Math.cos(rad(a)), 50 + 27 * Math.sin(rad(a))];
        for (const z of [-45, 45]) q.lijn([B, [B[0] + 15 * Math.cos(rad(a + z)), B[1] + 15 * Math.sin(rad(a + z))]], 6);
      }
    },
    struikelen(q) {   // valt naar links, voet blijft haken achter een obstakel
      q.rect(24, 81, 19, 17);
      q.lijn([[62, 58], [57, 75], [48, 89]], 10.5);
      q.lijn([[62, 58], [76, 67], [91, 59]], 10.5);
      q.lijn([[62, 58], [39, 41]], 13.5);
      q.cirkel(27, 31, 8.5);
      q.lijn([[43, 43], [31, 55], [20, 63]], 8.5);
      q.lijn([[45, 42], [30, 45], [17, 42]], 8.5);
    },
    glad(q) {   // glijdt uit en valt achterover
      q.rect(2, 94, 96, 5);
      q.lijn([[45, 62], [33, 34]], 13.5);
      q.cirkel(28, 21, 8.5);
      q.lijn([[45, 62], [65, 67], [86, 60]], 10.5);
      q.lijn([[45, 62], [49, 78], [44, 90]], 10.5);
      q.lijn([[36, 38], [51, 31], [62, 22]], 8.5);
      q.lijn([[33, 40], [21, 50], [11, 52]], 8.5);
      q.streep("M66,86 C72,82 78,90 84,86", 3.5);
    },
    sigaret(q) {
      q.rect(6, 60, 64, 13);
      q.rect(73, 60, 21, 13);
      q.streep("M14,52 C4,42 24,36 14,24 C6,14 20,8 16,2", 6);
    },
    telefoon(q) {
      q.rrect(30, 4, 40, 92, 8);
      q.rect(36, 15, 28, 60, q.gat);
      q.rrect(43, 8, 14, 3, 1.5, q.gat);
      q.cirkel(50, 85, 4.5, q.gat);
    },
    pallet(q) {
      q.rect(22, 16, 56, 54);
      q.rect(22, 40, 56, 3, q.gat);
      q.rect(14, 74, 72, 8);
      for (const u of [14, 45, 76]) q.rect(u, 82, 10, 10);
    },
    laars(q) {   // naar rechts
      q.pad("M20,4 L56,4 L56,46 C64,50 80,54 89,60 C95,64 97,71 97,78 L97,92 L18,92 L18,60 C18,40 20,22 20,4 Z");
      q.rect(16, 79, 84, 4, q.gat);
      q.rect(18, 4, 40, 6);
    },
    hesje(q) {
      q.pad("M28,6 L41,6 L50,38 L59,6 L72,6 L75,20 C77,28 87,32 90,40 L90,94 L10,94 L10,40 C13,32 23,28 25,20 Z");
      q.rect(10, 58, 80, 7, q.gat);
      q.rect(10, 75, 80, 7, q.gat);
      q.rect(48.5, 38, 3, 56, q.gat);
    },
    helm(q) {
      q.pad("M14,58 C14,30 30,10 50,10 C70,10 86,30 86,58 Z");
      q.rect(43, 12, 3, 46, q.gat).rect(54, 12, 3, 46, q.gat);
      q.rrect(6, 56, 88, 9, 4.5);
      q.pad("M28,69 L72,69 C72,87 62,98 50,98 C38,98 28,87 28,69 Z");
    },
    gehoor(q) {
      q.ellips(50, 60, 22, 30);
      q.boog(50, 48, 34, 180, 360, 6);
      for (const u of [16, 84]) { q.ellips(u, 60, 13, 20, q.gat); q.ellips(u, 60, 10, 17); }
    },
    handschoen(q) {
      q.rrect(26, 44, 48, 40, 9);
      q.lijn([[32, 50], [32, 17]], 10.5);
      q.lijn([[44, 48], [44, 8]], 10.5);
      q.lijn([[56, 48], [56, 10]], 10.5);
      q.lijn([[68, 50], [68, 20]], 10.5);
      q.lijn([[30, 72], [16, 54], [13, 43]], 11.5);
      q.rect(28, 87, 44, 12);
    },
    bril(q) {
      q.pad("M10,30 L90,30 Q98,30 98,38 L98,62 Q98,72 88,72 L64,72 Q57,72 55,64 L53,57 Q50,51 47,57 L45,64 Q43,72 36,72 L12,72 Q2,72 2,62 L2,38 Q2,30 10,30 Z");
      q.rrect(9, 37, 34, 27, 6, q.gat);
      q.rrect(57, 37, 34, 27, 6, q.gat);
    },
    uitroep(q) {
      q.vlak([[42, 6], [58, 6], [55, 66], [45, 66]]);
      q.cirkel(50, 84, 8.5);
    },
    kruis(q) { q.rect(35, 6, 30, 88).rect(6, 35, 88, 30); },
    deur(q) {
      q.rect(66, 4, 32, 94);
      q.rect(72, 10, 20, 88, q.gat);
      VORM.persoonRennend(q.sub(0, 8, 70));
    },
    laadperron(q) {   // stapt van de rand van een verhoogd perron, pijl omlaag
      q.rect(4, 62, 42, 36);
      q.rect(46, 94, 50, 4);
      q.cirkel(61, 9, 8);
      q.lijn([[58, 22], [50, 44]], 13.5);
      q.lijn([[50, 44], [42, 52], [37, 57]], 10.5);
      q.lijn([[50, 44], [60, 52], [62, 66]], 10.5);
      q.lijn([[59, 25], [68, 22], [74, 13]], 8.5);
      q.lijn([[56, 25], [46, 22], [40, 13]], 8.5);
      q.rect(79.5, 42, 5, 28);
      q.vlak([[72, 68], [92, 68], [82, 86]]);
    },
    verzamelplaats(q) {   // vier pijlen naar het midden en een groepje mensen
      const pijlNaar = (a, b) => {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1], d[0]];
        const h = [b[0] - d[0] * 12, b[1] - d[1] * 12], P = (o, w) => [o[0] + n[0] * w, o[1] + n[1] * w];
        q.vlak([P(a, 3.5), P(h, 3.5), P(h, 10), b, P(h, -10), P(h, -3.5), P(a, -3.5)]);
      };
      pijlNaar([3, 3], [27, 27]); pijlNaar([97, 3], [73, 27]); pijlNaar([3, 97], [27, 73]); pijlNaar([97, 97], [73, 73]);
      const figuur = (cx, top, s, k) => {
        const z = (v) => v * s, rand = k === q.gat ? 2.2 : 0;
        q.cirkel(cx, top + z(5), z(5) + rand, k);
        q.rrect(cx - z(8) - rand, top + z(12) - rand, z(16) + 2 * rand, z(21) + 2 * rand, z(6), k);
        q.lijn([[cx - z(3.6), top + z(30)], [cx - z(3.6), top + z(44)]], z(6) + 2 * rand, k);
        q.lijn([[cx + z(3.6), top + z(30)], [cx + z(3.6), top + z(44)]], z(6) + 2 * rand, k);
      };
      figuur(37, 27, 0.82); figuur(63, 27, 0.82);
      figuur(50, 33, 1, q.gat); figuur(50, 33, 1);
    },
    container(q) {   // zeecontainer schuin van achteren, deur open: pallet in de deuropening, losse dozen erachter, een doos valt eruit
      const g = q.gat, boven = (u) => 10 + ((u - 4) * 12) / 28, onder = (u) => 82 + ((u - 4) * 12) / 28;
      q.vlak([[4, 10], [32, 22], [32, 94], [4, 82]]);                       // zijwand
      q.vlak([[4, 10], [56, 10], [84, 22], [32, 22]]);                      // dak
      for (let u = 8; u <= 28; u += 4) q.vlak([[u, boven(u) + 2.6], [u + 1.5, boven(u + 1.5) + 2.6], [u + 1.5, onder(u + 1.5) - 2.6], [u, onder(u) - 2.6]], g);   // golfplaat
      q.lijn([[5, 10.6], [31.4, 22]], 1.5, g);                               // naad dak / zijwand
      q.rect(32, 22, 52, 72);                                               // achterkant met deuropening
      q.rect(32, 22, 1.4, 72, g);
      q.rect(38, 28.5, 40.5, 61.5, g);
      q.vlak([[84, 24], [96, 29], [96, 97], [84, 92]]);                     // open deur met sluitstangen
      for (const u of [87.6, 91.6]) q.vlak([[u, 24 + (u - 84) * 5 / 12 + 3], [u + 1.5, 24 + (u + 1.5 - 84) * 5 / 12 + 3],
        [u + 1.5, 92 + (u + 1.5 - 84) * 5 / 12 - 3], [u, 92 + (u - 84) * 5 / 12 - 3]], g);
      // pallet in de deuropening
      q.rrect(40.5, 57, 35.5, 24, 2);
      for (const v of [64, 72]) q.rect(40.5, v, 35.5, 1.3, g);
      q.rect(40.5, 81, 35.5, 3.2);
      for (const u of [40.5, 55.5, 70.5]) q.rect(u, 84.2, 5.5, 5.8);
      // losse dozen erachter, scheef gestapeld tot aan het dak
      q.vierkant(46.5, 49.5, 5.2, -5).vierkant(58, 49, 5.5, 4).vierkant(70, 49.5, 5, -3);
      q.vierkant(51.5, 38, 5, 7).vierkant(63.5, 37.5, 5, -6).vierkant(73.3, 38.5, 3.8, 5);
      // doos valt de container uit
      q.vierkant(88, 68, 8.6, 26, g).vierkant(88, 68, 6.5, 26);
    },
    hart(q) {
      q.pad("M50,92 C30,76 4,58 4,34 C4,17 17,6 31,6 C40,6 46,11 50,19 C54,11 60,6 69,6 C83,6 96,17 96,34 C96,58 70,76 50,92 Z");
      q.pad("M55,22 L36,54 L49,54 L41,80 L64,44 L51,44 L60,22 Z", q.gat);
    },
    blusser(q) {
      q.pad("M36,38 C36,29 42,25 50,25 C58,25 64,29 64,38 L64,96 L36,96 Z");
      q.rect(44, 14, 12, 12);
      q.lijn([[47, 14], [70, 7]], 5);
      q.lijn([[53, 20], [72, 18]], 4.5);
      q.streep("M45,19 C30,19 22,27 22,42 L22,62", 5);
      q.vlak([[18, 61], [26, 61], [29, 74], [15, 74]]);
      q.rect(36, 50, 28, 4, q.gat);
    },
    brandslang(q) {
      q.cirkel(42, 44, 38);
      q.cirkel(42, 44, 31, q.gat);
      q.cirkel(42, 44, 25);
      q.cirkel(42, 44, 19, q.gat);
      q.cirkel(42, 44, 8);
      q.streep("M42,82 C58,94 76,92 84,78", 6.5);
      q.vlak([[80, 77], [88, 81], [97, 64], [93, 61]]);
    },
    dezeKantBoven(q) {
      for (const c of [29, 71]) { q.rect(c - 5.5, 30, 11, 54); q.vlak([[c, 4], [c + 18, 36], [c - 18, 36]]); }
      q.rect(6, 90, 88, 7);
    },
    breekbaar(q) {
      q.pad("M24,4 L76,4 C78,30 72,52 50,56 C28,52 22,30 24,4 Z");
      q.lijn([[36, 6], [46, 19], [39, 27], [52, 40]], 4, q.gat);
      q.rect(46.5, 55, 7, 30);
      q.rrect(28, 85, 44, 9, 4);
    },
    paraplu(q) {
      q.pad("M8,56 C8,32 27,16 50,16 C73,16 92,32 92,56 Z");
      for (const u of [18.5, 39.5, 60.5, 81.5]) q.cirkel(u, 60, 10.5, q.gat);
      q.lijn([[50, 16], [50, 8]], 4.5);
      q.lijn([[50, 48], [50, 86]], 5.5);
      q.boog(41, 86, 9, 0, 180, 5.5);
      for (const [u, v] of [[16, 4], [32, 0], [70, 0], [86, 4]]) q.lijn([[u, v], [u - 3, v + 7]], 4);
    },
    nietStapelen(q) {
      q.rect(24, 58, 52, 38);
      q.lijn([[32, 10], [68, 10], [68, 44], [32, 44], [32, 10]], 5);
      q.lijn([[16, 2], [84, 52]], 6.5);
      q.lijn([[84, 2], [16, 52]], 6.5);
    },
    zwaartepunt(q) {
      q.cirkel(50, 50, 30);
      q.punt(50, 50, 24, -90, 0, q.gat);
      q.punt(50, 50, 24, 90, 180, q.gat);
      q.rect(4, 48, 92, 4).rect(48, 4, 4, 92);
    },
  };

  // Driehoekcoördinaten van de eerste ontwerpen: u = deel van de zijde, v = deel van de hoogte.
  const T = (u, v) => [u * 100, v * 86.6];
  const vakT = (p, u0, v0, u1, v1, k) => p.vlak([T(u0, v0), T(u1, v0), T(u1, v1), T(u0, v1)], k);

  // Blok van losse dozen (in driehoekcoördinaten): recht op elkaar gestapeld op de vloer, een paar net scheef,
  // met plakband; de bovenste doos valt eraf.
  function dozenmuur(p) {
    const g = p.gat, { kol, rij, bw, bh, gap } = { kol: 4, rij: 3, bw: 7.6, bh: 7.6, gap: 0.9 };
    p.rect(20, 74.3, 60, 1.4);                                              // vloer
    const x0 = 50 - (kol * bw + (kol - 1) * gap) / 2;
    const scheef = { "0:3": -2.5, "1:0": 3, "1:2": -2, "2:1": 3.5, "3:3": -3 };   // rij:doos → graden
    const doos = (cx, cy, w, h, a) => {
      p.blok(cx, cy, w, h, a);
      p.blok(cx + Math.sin(rad(a)) * h * 0.29, cy - Math.cos(rad(a)) * h * 0.29, 1, h * 0.42, a, g);   // plakband
    };
    for (let ri = 0; ri < rij; ri++) for (let i = 0; i < kol; i++) {
      const y = 74.3 - (ri + 1) * bh - ri * gap;
      doos(x0 + i * (bw + gap) + bw / 2, y + bh / 2, bw, bh, scheef[`${ri}:${i}`] || 0);
    }
    const top = 74.3 - rij * bh - (rij - 1) * gap;
    doos(55.2, top - bh * 0.95, bw * 0.95, bh * 0.95, 24);                  // bovenste doos valt eraf
    p.streep(`M${44.5},${top - bh * 1.15} C${46.5},${top - bh * 1.55} ${49.5},${top - bh * 1.7} ${51.8},${top - bh * 1.6}`, 1.3);
  }

  // ---------- Alle pictogrammen ----------
  // vak: deelvak [u, v, zijde] in kadercoördinaten (standaard dat van het kader), of "kader" om direct in
  // kadercoördinaten te tekenen. nl/en: standaardteksten voor een bord (titel, uitleg).
  const PICTOGRAMMEN = {
    // ----- Waarschuwing -----
    letop: {
      naam: "Algemeen gevaar", groep: "waarschuwing", vak: "kader",
      nl: ["Gevaar", "Wees voorzichtig in dit gebied"], en: ["Danger", "Take care in this area"],
      teken(p) {
        p.vlak([[45.04, 29.44], [54.96, 29.44], [53.2, 60.62], [46.8, 60.62]]);
        p.cirkel(50, 69.28, 4.8);
      },
    },
    vallen: {
      naam: "Vallende goederen", groep: "waarschuwing", vak: "kader",
      nl: ["Losse goederen achter deze pallet", "Pallet voorzichtig wegnemen: er kunnen goederen vallen!"],
      en: ["Loose goods behind this pallet", "Remove the pallet carefully: items may fall!"],
      onder: "Losse goederen eerst zekeren of weghalen  ·  Secure or remove loose goods first",
      teken(p) {
        vakT(p, 0.2, 0.858, 0.8, 0.874);                                             // vloer
        vakT(p, 0.25, 0.79, 0.56, 0.815);                                            // pallet
        for (const u of [0.25, 0.385, 0.52]) vakT(p, u, 0.815, u + 0.04, 0.858);
        vakT(p, 0.26, 0.655, 0.4, 0.782); vakT(p, 0.41, 0.655, 0.55, 0.782);         // gestapelde dozen
        vakT(p, 0.335, 0.53, 0.475, 0.647);
        p.vierkant(66.5, 0.735 * 86.6, 6, 28);                                       // vallende doos
        const streep = (u, v0, v1) => p.vlak([T(u - 0.012, v0), T(u + 0.012, v0), T(u + 0.03, v1), T(u + 0.006, v1)]);
        streep(0.585, 0.53, 0.63); streep(0.645, 0.5, 0.61);
      },
    },
    losse: {
      naam: "Losse dozen naast pallet", groep: "waarschuwing", vak: "kader",
      nl: ["Losse goederen achter deze pallet", "Pallet voorzichtig wegnemen: er kunnen goederen vallen!"],
      en: ["Loose goods behind this pallet", "Remove the pallet carefully: items may fall!"],
      onder: "Losse goederen eerst zekeren of weghalen  ·  Secure or remove loose goods first",
      teken(p) {
        vakT(p, 0.2, 0.858, 0.8, 0.874);
        vakT(p, 0.27, 0.795, 0.51, 0.818);                                           // pallet met ingepakte lading
        for (const u of [0.27, 0.37, 0.47]) vakT(p, u, 0.818, u + 0.04, 0.858);
        vakT(p, 0.305, 0.585, 0.505, 0.79);
        for (const v of [0.63, 0.68, 0.73]) vakT(p, 0.305, v, 0.505, v + 0.012, p.gat);
        vakT(p, 0.545, 0.755, 0.685, 0.858); vakT(p, 0.565, 0.655, 0.7, 0.745);     // losse, scheve dozen
        p.vierkant(61, 0.585 * 86.6, 4.8, 18);
        const streep = (u, v0, v1) => p.vlak([T(u - 0.01, v0), T(u + 0.01, v0), T(u + 0.022, v1), T(u + 0.002, v1)]);
        streep(0.555, 0.43, 0.48); streep(0.61, 0.42, 0.47);
      },
    },
    heftruck: {
      naam: "Heftrucks", groep: "waarschuwing", vak: [29, 34.5, 43],
      nl: ["Heftrucks rijden hier", "Kijk goed uit en houd afstand"], en: ["Forklift trucks operating", "Look out and keep your distance"],
      teken: (q) => VORM.heftruck(q, 20),
    },
    struikelen: {
      naam: "Struikelgevaar", groep: "waarschuwing", vak: [27, 34, 44],
      nl: ["Struikelgevaar", "Kijk uit waar je loopt"], en: ["Trip hazard", "Watch your step"],
      teken: (q) => VORM.struikelen(q),
    },
    glad: {
      naam: "Gladde vloer", groep: "waarschuwing", vak: [28, 34, 44],
      nl: ["Gladde vloer", "Loop voorzichtig"], en: ["Slippery floor", "Walk carefully"],
      teken: (q) => VORM.glad(q),
    },
    elektra: {
      naam: "Elektrische spanning", groep: "waarschuwing", vak: [24, 32, 42],
      nl: ["Elektrische spanning", "Gevaar voor elektrocutie"], en: ["Electrical hazard", "Danger of electric shock"],
      teken: (q) => VORM.bliksem(q),
    },
    hangendeLast: {
      naam: "Hangende last", groep: "waarschuwing", vak: "kader",
      nl: ["Hangende last", "Niet onder de last staan of lopen"], en: ["Overhead load", "Do not stand or walk under the load"],
      teken(p) {
        p.rect(48.8, 21, 2.4, 19.5);
        p.boog(50, 43.4, 3.2, -90, 205, 2.3);
        p.lijn([[50, 46.6], [36.5, 55]], 2.4).lijn([[50, 46.6], [63.5, 55]], 2.4);
        p.rect(32, 55, 36, 20);
      },
    },
    koud: {
      naam: "Lage temperatuur", groep: "waarschuwing", vak: [28, 34, 44],
      nl: ["Lage temperatuur", "Vriescel — draag warme kleding"], en: ["Low temperature", "Freezer — wear warm clothing"],
      teken: (q) => VORM.sneeuw(q),
    },
    laadperron: {
      naam: "Valgevaar laadperron", groep: "waarschuwing", vak: [27, 34, 44],
      nl: ["Valgevaar laadperron", "Blijf uit de buurt van de rand"], en: ["Fall hazard: loading dock", "Keep away from the edge"],
      teken: (q) => VORM.laadperron(q),
    },
    container: {
      naam: "Container: losse goederen achter pallet", groep: "waarschuwing", kader: "paneel",
      nl: ["Losse goederen achter deze pallet", "Pallet voorzichtig wegnemen: er kunnen goederen vallen!"],
      en: ["Loose goods behind this pallet", "Remove the pallet carefully: items may fall!"],
      onder: "Losse goederen eerst zekeren of weghalen  ·  Secure or remove loose goods first",
      teken: (q) => VORM.container(q),
    },
    dozenmuur: {
      naam: "Losse dozen gestapeld", groep: "waarschuwing", vak: "kader",
      nl: ["Losse goederen achter deze pallet", "Pallet voorzichtig wegnemen: er kunnen goederen vallen!"],
      en: ["Loose goods behind this pallet", "Remove the pallet carefully: items may fall!"],
      onder: "Losse goederen eerst zekeren of weghalen  ·  Secure or remove loose goods first",
      teken: (p) => dozenmuur(p),
    },
    brandbaar: {
      naam: "Brandbare stoffen", groep: "waarschuwing", vak: [30, 33, 40],
      nl: ["Brandbare stoffen", "Geen open vuur in de buurt"], en: ["Flammable material", "No open flames nearby"],
      teken: (q) => VORM.vlam(q),
    },

    // ----- Verbod -----
    verboden: {
      naam: "Verboden (algemeen)", groep: "verbod",
      nl: ["Verboden toegang", "Alleen voor bevoegd personeel"], en: ["No entry", "Authorised personnel only"],
      teken() {},
    },
    nietRoken: {
      naam: "Niet roken", groep: "verbod",
      nl: ["Niet roken", "Roken is hier verboden"], en: ["No smoking", "Smoking is prohibited here"],
      teken: (q) => VORM.sigaret(q),
    },
    geenVuur: {
      naam: "Geen open vuur", groep: "verbod",
      nl: ["Geen open vuur", "Vuur, open vlam en roken verboden"], en: ["No open flames", "Fire, naked flames and smoking prohibited"],
      teken: (q) => VORM.vlam(q),
    },
    geenVoetgangers: {
      naam: "Verboden voor voetgangers", groep: "verbod",
      nl: ["Verboden voor voetgangers", "Alleen voor heftrucks"], en: ["No pedestrians", "Forklift trucks only"],
      teken: (q) => VORM.persoonLopend(q),
    },
    geenHeftrucks: {
      naam: "Verboden voor heftrucks", groep: "verbod", vak: [18, 22, 64],
      nl: ["Verboden voor heftrucks", "Alleen voor voetgangers"], en: ["No forklift trucks", "Pedestrians only"],
      teken: (q) => VORM.heftruck(q),
    },
    geenTelefoon: {
      naam: "Geen mobiele telefoon", groep: "verbod",
      nl: ["Geen mobiele telefoon", "Niet bellen tijdens het rijden"], en: ["No mobile phones", "Do not use your phone while driving"],
      teken: (q) => VORM.telefoon(q),
    },
    vrijhouden: {
      naam: "Vrijhouden", groep: "verbod",
      nl: ["Vrijhouden", "Niets plaatsen of opslaan"], en: ["Keep clear", "Do not obstruct or store items here"],
      teken: (q) => VORM.pallet(q),
    },

    // ----- Gebod -----
    gebod: {
      naam: "Gebod (algemeen)", groep: "gebod",
      nl: ["Verplicht", "Volg de veiligheidsvoorschriften"], en: ["Mandatory", "Follow the safety instructions"],
      teken: (q) => VORM.uitroep(q),
    },
    schoenen: {
      naam: "Veiligheidsschoenen", groep: "gebod",
      nl: ["Veiligheidsschoenen verplicht", "In het hele magazijn"], en: ["Safety shoes required", "Throughout the warehouse"],
      teken: (q) => VORM.laars(q),
    },
    hesje: {
      naam: "Veiligheidsvest", groep: "gebod",
      nl: ["Veiligheidsvest verplicht", "Draag altijd een hesje"], en: ["High-visibility vest required", "Always wear a hi-vis vest"],
      teken: (q) => VORM.hesje(q),
    },
    helm: {
      naam: "Veiligheidshelm", groep: "gebod",
      nl: ["Veiligheidshelm verplicht", "Draag altijd een helm"], en: ["Safety helmet required", "Always wear a helmet"],
      teken: (q) => VORM.helm(q),
    },
    gehoor: {
      naam: "Gehoorbescherming", groep: "gebod",
      nl: ["Gehoorbescherming verplicht", "Bescherm je oren"], en: ["Hearing protection required", "Protect your ears"],
      teken: (q) => VORM.gehoor(q),
    },
    handschoenen: {
      naam: "Werkhandschoenen", groep: "gebod",
      nl: ["Werkhandschoenen verplicht", "Bescherm je handen"], en: ["Safety gloves required", "Protect your hands"],
      teken: (q) => VORM.handschoen(q),
    },
    bril: {
      naam: "Veiligheidsbril", groep: "gebod",
      nl: ["Veiligheidsbril verplicht", "Bescherm je ogen"], en: ["Safety glasses required", "Protect your eyes"],
      teken: (q) => VORM.bril(q),
    },
    looppad: {
      naam: "Voetgangers: looppad", groep: "gebod",
      nl: ["Voetgangers: gebruik het looppad", "Blijf uit de rijbaan van heftrucks"], en: ["Pedestrians: use the walkway", "Keep out of the forklift lane"],
      teken: (q) => VORM.persoonLopend(q),
    },

    // ----- Nood en EHBO -----
    ehbo: {
      naam: "EHBO", groep: "nood", kop: "EERSTE HULP  —  FIRST AID",
      nl: ["EHBO", "Eerste hulp bij ongelukken"], en: ["First aid", "First aid kit and assistance"],
      teken: (q) => VORM.kruis(q.sub(8, 8, 84)),
    },
    nooduitgang: {
      naam: "Nooduitgang", groep: "nood", vak: [8, 10, 84], kop: "NOODUITGANG  —  EMERGENCY EXIT",
      nl: ["Nooduitgang", "Altijd vrijhouden"], en: ["Emergency exit", "Always keep clear"],
      teken: (q) => VORM.deur(q),
    },
    aed: {
      naam: "AED", groep: "nood",
      nl: ["AED", "Automatische externe defibrillator"], en: ["AED", "Automated external defibrillator"],
      teken: (q) => VORM.hart(q),
    },
    verzamelplaats: {
      naam: "Verzamelplaats", groep: "nood", vak: [8, 8, 84], kop: "VERZAMELPLAATS  —  ASSEMBLY POINT",
      nl: ["Verzamelplaats", "Bij ontruiming hier verzamelen"], en: ["Assembly point", "Gather here in case of evacuation"],
      teken: (q) => VORM.verzamelplaats(q),
    },
    noodpijl: {
      naam: "Vluchtroute (pijl)", groep: "nood", richting: true, kop: "VLUCHTROUTE  —  ESCAPE ROUTE",
      nl: ["Vluchtroute", "Volg de pijl naar de uitgang"], en: ["Escape route", "Follow the arrow to the exit"],
      teken: (q, el) => q.pijl(PIJLRICHTINGEN.includes(el.richting) && el.richting !== "geen" ? el.richting : "rechts", 1, 0, 0, 100, 100),
    },

    // ----- Brand -----
    blusser: {
      naam: "Brandblusser", groep: "brand",
      nl: ["Brandblusser", "Altijd vrijhouden"], en: ["Fire extinguisher", "Always keep clear"],
      teken: (q) => VORM.blusser(q),
    },
    brandslang: {
      naam: "Brandslang", groep: "brand",
      nl: ["Brandslang", "Altijd vrijhouden"], en: ["Fire hose", "Always keep clear"],
      teken: (q) => VORM.brandslang(q),
    },

    // ----- Verzending (zonder kader) -----
    dezeKantBoven: {
      naam: "Deze kant boven", groep: "verzending",
      nl: ["Deze kant boven", "Niet kantelen"], en: ["This way up", "Do not tilt"],
      teken: (q) => VORM.dezeKantBoven(q),
    },
    breekbaar: {
      naam: "Breekbaar", groep: "verzending",
      nl: ["Breekbaar", "Voorzichtig behandelen"], en: ["Fragile", "Handle with care"],
      teken: (q) => VORM.breekbaar(q),
    },
    droogHouden: {
      naam: "Droog houden", groep: "verzending",
      nl: ["Droog houden", "Beschermen tegen regen en vocht"], en: ["Keep dry", "Protect from rain and moisture"],
      teken: (q) => VORM.paraplu(q),
    },
    nietStapelen: {
      naam: "Niet stapelen", groep: "verzending",
      nl: ["Niet stapelen", "Niets bovenop plaatsen"], en: ["Do not stack", "Do not place anything on top"],
      teken: (q) => VORM.nietStapelen(q),
    },
    zwaartepunt: {
      naam: "Zwaartepunt", groep: "verzending",
      nl: ["Zwaartepunt", "Hier tillen of heffen"], en: ["Centre of gravity", "Lift here"],
      teken: (q) => VORM.zwaartepunt(q),
    },

    // ----- Pijlen -----
    pijl: {
      naam: "Pijl (1–3)", groep: "pijl", richting: true, aantal: true,
      nl: ["Deze kant op", ""], en: ["This way", ""],
      teken() {},   // getekend in tekenPictogram
    },
  };

  // Tekent een pictogram-onderdeel (vorm, kleurstijl, kleur, vulling, richting, aantal) in het vak x, y, w, h (mm).
  function tekenPictogram(r, el, x, y, w, h) {
    const def = PICTOGRAMMEN[el.vorm] || PICTOGRAMMEN.letop;
    const c = kleurenVoor(def.groep, el.kleurstijl, el.kleur, el.vulling);
    if (def.groep === "pijl") {
      const richting = PIJLRICHTINGEN.includes(el.richting) && el.richting !== "geen" ? el.richting : "omhoog";
      return pijlen(r, { r: richting, n: Math.min(Math.max(+el.aantal || 1, 1), 3) }, x, y, w, h, c.teken);
    }
    const k = kader(r, def.kader || def.groep, x, y, w, h, c);
    const vak = def.vak === "kader" ? null : def.vak || k.vak;
    def.teken(vak ? k.p.sub(vak[0], vak[1], vak[2]) : k.p, el);
    if (k.na) k.na();
  }

  const api = { KLEUREN, GROEPEN, PICTOGRAMMEN, PIJLRICHTINGEN, tekenPictogram, kleurenVoor, accentKleur, eigenStart, pijl, pijlen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Pictogrammen = api;
})(typeof window !== "undefined" ? window : globalThis);
