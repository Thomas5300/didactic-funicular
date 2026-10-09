// Containerplanner — pallets in een container of trailer plannen (bovenaanzicht + zijaanzicht), met maten en controle.
// Alle maten intern in mm. x loopt over de lengte (0 = kopse kant/achterwand, L = deur), y over de breedte (0 = linkerwand).
(() => {
  const $ = (id) => document.getElementById(id);
  const svgB = $("boven"), svgZ = $("zij");

  // Binnenmaten zoals ze meestal zijn (o.a. Hapag-Lloyd); per container kan het iets verschillen.
  const RUIMTES = {
    c20: { naam: "20ft", kort: "20ft", l: 5900, b: 2352, h: 2395, deurB: 2340, deurH: 2292, kg: 28130 },
    c20hc: { naam: "20ft high cube", kort: "20ft HC", l: 5900, b: 2352, h: 2700, deurB: 2340, deurH: 2597, kg: 28000 },
    c40: { naam: "40ft", kort: "40ft", l: 12032, b: 2352, h: 2395, deurB: 2340, deurH: 2292, kg: 28750 },
    c40hc: { naam: "40ft high cube", kort: "40ft HC", l: 12032, b: 2350, h: 2700, deurB: 2340, deurH: 2597, kg: 28600 },
    c45: { naam: "45ft", kort: "45ft", l: 13556, b: 2352, h: 2395, deurB: 2340, deurH: 2292, kg: 27700 },
    c45hc: { naam: "45ft high cube", kort: "45ft HC", l: 13556, b: 2352, h: 2700, deurB: 2340, deurH: 2597, kg: 27700 },
    trailer: { naam: "Trailer (oplegger 13,6 m)", kort: "Trailer", l: 13600, b: 2480, h: 2700, deurB: 2480, deurH: 2700, kg: 24000 },
    eigen: { naam: "Eigen maat", kort: "Eigen maat" },
  };
  const PALLETS = {
    euro: { naam: "Europallet", l: 1200, b: 800 },
    blok: { naam: "Blokpallet", l: 1200, b: 1000 },
    half: { naam: "Halve pallet", l: 800, b: 600 },
    kwart: { naam: "Kwartpallet", l: 600, b: 400 },
    us: { naam: "US-pallet", l: 1219, b: 1016 },
    eigen: { naam: "Eigen maat" },
  };

  const opslag = {
    lees(k, s) { try { const v = localStorage.getItem(k); return v == null ? s : JSON.parse(v); } catch { return s; } },
    schrijf(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privévenster */ } },
  };
  const SLEUTEL = "containerplanner.v1";
  function standaard() {
    return {
      ruimte: "c40", eigen: { l: 12000, b: 2400, h: 2600, deurH: 2500, kg: 25000 },
      nieuw: { type: "euro", richting: "lengte", h: 1500, kg: "", aantal: 1, l: 1200, b: 800 },
      pallets: [], teller: 1, speling: 0,
    };
  }
  let st = Object.assign(standaard(), opslag.lees(SLEUTEL, {}));
  st.nieuw = Object.assign(standaard().nieuw, st.nieuw);
  st.eigen = Object.assign(standaard().eigen, st.eigen);
  if (!RUIMTES[st.ruimte]) st.ruimte = "c40";
  st.pallets = (Array.isArray(st.pallets) ? st.pallets : []).filter((p) => p && p.w > 0 && p.d > 0);
  let sel = null, sleep = null, gidsen = [];

  // ---------- Hulp ----------
  const m2 = (mm) => (mm / 1000).toFixed(2).replace(".", ",");       // 12,03
  const cm = (mm) => String(Math.round(mm / 10));                       // 120
  const kgTekst = (kg) => Math.round(kg).toLocaleString("nl-NL");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ruimte = () => (st.ruimte === "eigen" ? { ...RUIMTES.eigen, ...st.eigen, deurB: st.eigen.b } : RUIMTES[st.ruimte]);
  const vind = (id) => st.pallets.find((p) => p.id === id) || null;
  const overlapt = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.d - 0.5 && b.y < a.y + a.d - 0.5;
  const binnen = (p, R) => p.x >= -0.5 && p.y >= -0.5 && p.x + p.w <= R.l + 0.5 && p.y + p.d <= R.b + 0.5;
  const nieuwId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- Opslaan en ongedaan maken ----------
  const historie = [];
  function vastleggen() {
    const s = JSON.stringify(st);
    if (historie[historie.length - 1] !== s) historie.push(s);
    if (historie.length > 60) historie.shift();
    $("ongedaan").disabled = historie.length < 2;
  }
  function bewaar() { opslag.schrijf(SLEUTEL, st); vastleggen(); }
  function ongedaan() {
    clearTimeout($("selectie").t); vastleggen();   // net getypte maat eerst bewaren
    if (historie.length < 2) return;
    historie.pop();
    st = JSON.parse(historie[historie.length - 1]);
    if (!vind(sel)) sel = null;
    opslag.schrijf(SLEUTEL, st);
    $("ongedaan").disabled = historie.length < 2;
    alles();
  }

  // ---------- Controle ----------
  // Laadvolgorde: nummer 1 staat het dichtst bij de kopse kant.
  function genummerd() {
    const R = ruimte();
    return [...st.pallets].sort((a, b) => (binnen(b, R) - binnen(a, R)) || a.x - b.x || a.y - b.y);
  }
  function analyse() {
    const R = ruimte(), ps = st.pallets, nr = new Map(genummerd().map((p, i) => [p.id, i + 1]));
    const fout = new Set(), problemen = [];
    const buiten = ps.filter((p) => !binnen(p, R));
    for (const p of buiten) fout.add(p.id);
    if (buiten.length) problemen.push(buiten.every((p) => p.x >= R.l) ? `${buiten.length} pallet${buiten.length === 1 ? " past" : "s passen"} niet meer in de ${R.kort}.`
      : `${buiten.length === 1 ? "Pallet " + nr.get(buiten[0].id) + " steekt" : buiten.length + " pallets steken"} buiten de laadruimte.`);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      if (!overlapt(ps[i], ps[j])) continue;
      fout.add(ps[i].id); fout.add(ps[j].id);
      if (problemen.length < 8) problemen.push(`Pallet ${nr.get(ps[i].id)} en ${nr.get(ps[j].id)} staan over elkaar.`);
    }
    const hoog = new Set();
    for (const p of ps) {
      const hh = p.h * p.stapel;
      if (hh > R.h + 0.5) { hoog.add(p.id); problemen.push(`Pallet ${nr.get(p.id)} is te hoog: ${cm(hh)} cm (binnen ${cm(R.h)} cm).`); }
      else if (hh > R.deurH + 0.5) { hoog.add(p.id); problemen.push(`Pallet ${nr.get(p.id)} (${cm(hh)} cm) past niet door de deur (${cm(R.deurH)} cm).`); }
    }
    const erin = ps.filter((p) => binnen(p, R));
    const lengte = erin.length ? Math.max(...erin.map((p) => p.x + p.w)) : 0;
    const vloer = erin.reduce((t, p) => t + p.w * p.d, 0) / (R.l * R.b);
    const gewicht = ps.reduce((t, p) => t + (+p.kg || 0) * p.stapel, 0);
    if (R.kg && gewicht > R.kg) problemen.push(`Te zwaar: ${kgTekst(gewicht)} kg (max. ${kgTekst(R.kg)} kg).`);
    const metKg = erin.filter((p) => +p.kg > 0), kgIn = metKg.reduce((t, p) => t + p.kg * p.stapel, 0);
    const zwaartepunt = kgIn ? metKg.reduce((t, p) => t + (p.x + p.w / 2) * p.kg * p.stapel, 0) / kgIn : null;
    const hoogste = ps.length ? Math.max(...ps.map((p) => p.h * p.stapel)) : 0;
    return { R, nr, fout, hoog, problemen, erin, lengte, vloer, gewicht, zwaartepunt, hoogste };
  }

  // ---------- Plaatsen ----------
  function maat(type) {
    const t = PALLETS[type] || PALLETS.euro;
    return type === "eigen" ? { l: Math.max(10, +st.nieuw.l || 1200), b: Math.max(10, +st.nieuw.b || 800) } : { l: t.l, b: t.b };
  }
  // Eerste vrije plek (vanaf de kopse kant, dan vanaf de linkerwand); null als hij nergens past.
  function vrijePlek(w, d, andere, R) {
    const sp = Math.max(0, +st.speling || 0), groter = (o) => ({ x: o.x - sp, y: o.y - sp, w: o.w + 2 * sp, d: o.d + 2 * sp });
    const xs = [0, ...andere.map((o) => o.x + o.w + sp)], ys = [0, ...andere.map((o) => o.y + o.d + sp)];
    const kand = [];
    for (const x of xs) for (const y of ys) if (x + w <= R.l + 0.5 && y + d <= R.b + 0.5) kand.push({ x, y });
    kand.sort((a, b) => a.x - b.x || a.y - b.y);
    for (const k of kand) { const p = { x: k.x, y: k.y, w, d }; if (!andere.some((o) => overlapt(p, groter(o)))) return k; }
    return null;
  }
  // Plek naast de container (achter de deur) voor pallets die niet passen.
  function buitenPlek(w, d, R) {
    const buiten = st.pallets.filter((p) => p.x >= R.l);
    let x = R.l + 600, y = 0;
    for (const o of buiten) { if (overlapt({ x, y, w, d }, o)) { y = o.y + o.d + 100; if (y + d > R.b) { y = 0; x = Math.max(x, o.x + o.w + 100); } } }
    return { x, y };
  }
  function nieuwePallet(type, richting, R, metDraaien) {
    const m = maat(type), lengte = richting !== "breedte";
    let w = lengte ? m.l : m.b, d = lengte ? m.b : m.l;
    const andere = st.pallets.filter((p) => binnen(p, R));
    let plek = vrijePlek(w, d, andere, R);
    if (!plek && metDraaien) { const p2 = vrijePlek(d, w, andere, R); if (p2) { [w, d] = [d, w]; plek = p2; } }
    const p = {
      id: nieuwId(), type, naam: "", w, d, h: Math.max(1, +st.nieuw.h || 1500), stapel: 1, kg: +st.nieuw.kg > 0 ? +st.nieuw.kg : "",
      ...(plek || buitenPlek(w, d, R)),
    };
    st.pallets.push(p);
    return !!plek;
  }
  function toevoegen() {
    const R = ruimte(), n = Math.min(Math.max(Math.round(+st.nieuw.aantal || 1), 1), 200);
    let laatste;
    for (let i = 0; i < n; i++) { nieuwePallet(st.nieuw.type, st.nieuw.richting, R, true); laatste = st.pallets[st.pallets.length - 1]; }
    sel = laatste ? laatste.id : sel;
    bewaar(); alles();
  }
  // Zo vol mogelijk: in een lege ruimte de beste indeling in kolommen (deels in de lengte, deels in de breedte);
  // anders de vrije plekken opvullen, in beide richtingen.
  function vullen() {
    const R = ruimte(), m = maat(st.nieuw.type);
    const erin = st.pallets.filter((p) => binnen(p, R));
    let n = 0;
    const sp = Math.max(0, +st.speling || 0), past = (lengte, maat) => Math.floor((lengte + sp) / (maat + sp));
    if (!erin.length) {
      let best = { n: -1, a: 0, b: 0 };
      for (let a = 0; a * (m.b + sp) <= R.b + sp; a++) for (let b = 0; a * (m.b + sp) + b * (m.l + sp) <= R.b + sp; b++) {
        const tot = a * past(R.l, m.l) + b * past(R.l, m.b);
        if (tot > best.n || (tot === best.n && a > best.a)) best = { n: tot, a, b };
      }
      let y = 0;
      const kolom = (w, d, aantal) => {
        for (let i = 0; i < aantal; i++) st.pallets.push({ id: nieuwId(), type: st.nieuw.type, naam: "", w, d, x: i * (w + sp), y, h: Math.max(1, +st.nieuw.h || 1500), stapel: 1, kg: +st.nieuw.kg > 0 ? +st.nieuw.kg : "" });
        y += d + sp; n += aantal;
      };
      for (let i = 0; i < best.b; i++) kolom(m.b, m.l, past(R.l, m.b));   // in de breedte
      for (let i = 0; i < best.a; i++) kolom(m.l, m.b, past(R.l, m.l));   // in de lengte
    } else {
      while (n < 400) {
        const voor = st.pallets.length;
        const pastVoor = nieuwePallet(st.nieuw.type, st.nieuw.richting, R, true);
        if (!pastVoor) { st.pallets.splice(voor, 1); break; }
        n++;
      }
    }
    melding = n ? `${n} pallet${n === 1 ? "" : "s"} bijgezet${sp ? ` (met ${cm(sp * 10) / 10} cm speling)` : " — precies passend, zonder speling. Wil je wat ruimte tussen de pallets? Vul bij Speling bijv. 1 cm in"}.`
      : "Er past geen pallet van deze maat meer bij.";
    bewaar(); alles();
  }
  let melding = "";

  // ---------- Tekenen ----------
  function mmPerPx(svg) { const m = svg.getScreenCTM(); return m && m.a ? 1 / m.a : 20; }
  function naarMm(e) {
    const p = svgB.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svgB.getScreenCTM().inverse());
  }
  // Breedte van de tekening: de laadruimte plus ruimte voor maten, de deur en pallets die niet passen.
  function kader(R) {
    const verst = Math.max(R.l, ...st.pallets.map((p) => p.x + p.w));
    const links = R.l * 0.045 + 260, rechts = (verst > R.l + 1 ? verst - R.l + 350 : 0) + R.l * 0.035 + 420;
    return { x0: -links, x1: R.l + rechts, fs: Math.max(R.l / 70, 70) };
  }

  function tekenBoven(A) {
    const R = A.R, K = kader(R), fs = K.fs, ps = st.pallets;
    const boven = fs * 3.3, onder = fs * 2.6;
    svgB.setAttribute("viewBox", `${K.x0} ${-boven} ${K.x1 - K.x0} ${R.b + boven + onder}`);
    const lijn = (x1, y1, x2, y2, extra) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
    const tekst = (x, y, t, extra = "") => `<text x="${x}" y="${y}" font-size="${fs}" ${extra}>${esc(t)}</text>`;
    let s = "";
    // Wanden en vloer (open aan de deurkant)
    const wand = Math.max(R.b * 0.025, 40);
    s += `<rect x="${-wand}" y="${-wand}" width="${R.l + wand}" height="${R.b + 2 * wand}" fill="#3f3f46"/>`;
    s += `<rect x="0" y="0" width="${R.l}" height="${R.b}" fill="#fafafa"/>`;
    for (let x = 1000; x < R.l; x += 1000) s += lijn(x, 0, x, R.b, 'stroke="#ececef" stroke-width="8"');
    // Deuren (open) en teksten
    const blad = R.b * 0.42;
    s += `<polygon points="${R.l},${-wand} ${R.l + blad * 0.26},${-wand - blad * 0.96} ${R.l + blad * 0.26 + wand},${-wand - blad * 0.96 + wand * 0.3} ${R.l + wand},${-wand * 0.2}" fill="#71717a"/>`;
    s += `<polygon points="${R.l},${R.b + wand} ${R.l + blad * 0.26},${R.b + wand + blad * 0.96} ${R.l + blad * 0.26 + wand},${R.b + wand + blad * 0.96 - wand * 0.3} ${R.l + wand},${R.b + wand * 0.2}" fill="#71717a"/>`;
    s += tekst(R.l + fs * 0.5, R.b / 2, "DEUR", `font-weight="700" fill="#71717a" transform="rotate(90 ${R.l + fs * 0.5} ${R.b / 2})" text-anchor="middle"`);
    s += tekst(-wand - fs * 0.6, R.b / 2, "KOPSE KANT", `font-weight="700" fill="#71717a" transform="rotate(-90 ${-wand - fs * 0.6} ${R.b / 2})" text-anchor="middle"`);
    // Liniaal over de lengte
    const ly = -wand - fs * 0.9;
    s += lijn(0, ly, R.l, ly, 'stroke="#18181b" stroke-width="6"');
    for (let x = 0; x <= R.l + 0.5; x += 100) {
      const groot = x % 1000 === 0, half = x % 500 === 0;
      s += lijn(x, ly, x, ly - (groot ? fs * 0.7 : half ? fs * 0.45 : fs * 0.25), `stroke="#18181b" stroke-width="${groot ? 8 : 5}"`);
      if (groot && x > 0 && R.l - x > fs * 2.2) s += tekst(x, ly - fs * 0.9, `${x / 1000} m`, 'text-anchor="middle" fill="#3f3f46"');
    }
    s += lijn(R.l, ly, R.l, ly - fs * 0.7, 'stroke="#18181b" stroke-width="8"');
    s += tekst(R.l, ly - fs * 0.9, `${m2(R.l)} m`, 'text-anchor="end" font-weight="700"');
    s += tekst(0, ly - fs * 0.9, "0", 'text-anchor="start" fill="#3f3f46"');
    // Breedte aan de linkerkant
    const bx = -wand - fs * 2.1;
    s += lijn(bx, 0, bx, R.b, 'stroke="#18181b" stroke-width="6"') + lijn(bx - fs * 0.3, 0, bx + fs * 0.3, 0, 'stroke="#18181b" stroke-width="6"') + lijn(bx - fs * 0.3, R.b, bx + fs * 0.3, R.b, 'stroke="#18181b" stroke-width="6"');
    s += tekst(bx - fs * 0.35, R.b / 2, `${cm(R.b)} cm`, `text-anchor="middle" font-weight="700" transform="rotate(-90 ${bx - fs * 0.35} ${R.b / 2})"`);
    // Gebied naast de deur voor pallets die niet passen
    const buiten = ps.filter((p) => p.x >= R.l);
    if (buiten.length) {
      const x0 = R.l + 450, x1 = Math.max(...buiten.map((p) => p.x + p.w)) + 150;
      s += `<rect x="${x0}" y="${-wand}" width="${x1 - x0}" height="${R.b + 2 * wand}" fill="#fef2f2" stroke="#fca5a5" stroke-width="10" stroke-dasharray="60 40"/>`;
      s += tekst((x0 + x1) / 2, R.b + wand + fs * 1.1, "Past niet", 'text-anchor="middle" font-weight="700" fill="#dc2626"');
    }
    // Laadlengte en zwaartepunt
    if (A.erin.length) {
      s += lijn(A.lengte, -wand, A.lengte, R.b + wand, 'stroke="#2563eb" stroke-width="10" stroke-dasharray="50 35"');
      const vrij = R.l - A.lengte;
      s += tekst(A.lengte, R.b + wand + fs * 1.1, `laadlengte ${m2(A.lengte)} m`, `text-anchor="${vrij < R.l * 0.2 ? "end" : "middle"}" fill="#2563eb" font-weight="700"`);
      if (vrij > 50) s += tekst(A.lengte + vrij / 2, R.b + wand + fs * 2.2, `vrij ${cm(vrij)} cm`, 'text-anchor="middle" fill="#2563eb"');
    }
    if (A.zwaartepunt != null) {
      const zx = A.zwaartepunt, zy = R.b + wand;
      s += `<polygon points="${zx},${zy} ${zx - fs * 0.45},${zy + fs * 0.75} ${zx + fs * 0.45},${zy + fs * 0.75}" fill="#ea580c"><title>Zwaartepunt van de lading</title></polygon>`;
    }
    // Pallets
    for (const p of ps) {
      const fout = A.fout.has(p.id), hoog = A.hoog.has(p.id), gekozen = p.id === sel;
      const vul = fout ? "#fecaca" : p.stapel > 1 ? "#e9c27c" : "#f3d9a4", rand = fout ? "#dc2626" : hoog ? "#ea580c" : "#8a6a32";
      const f = Math.min(fs, p.d * 0.3, p.w * 0.2);
      s += `<g data-id="${p.id}" class="pallet">`;
      s += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.d}" rx="18" fill="${vul}" stroke="${rand}" stroke-width="${fout || hoog ? 22 : 12}"/>`;
      // planken
      const lang = p.w >= p.d;
      for (const t of [0.25, 0.5, 0.75]) s += lang ? lijn(p.x + 30, p.y + p.d * t, p.x + p.w - 30, p.y + p.d * t, 'stroke="#000" stroke-opacity=".07" stroke-width="10"')
        : lijn(p.x + p.w * t, p.y + 30, p.x + p.w * t, p.y + p.d - 30, 'stroke="#000" stroke-opacity=".07" stroke-width="10"');
      s += `<text x="${p.x + p.w / 2}" y="${p.y + p.d / 2 - f * 0.15}" font-size="${f * 1.15}" font-weight="700" text-anchor="middle">${A.nr.get(p.id)}${p.stapel > 1 ? ` ×${p.stapel}` : ""}</text>`;
      s += `<text x="${p.x + p.w / 2}" y="${p.y + p.d / 2 + f * 0.95}" font-size="${f * 0.75}" text-anchor="middle" fill="#3f3f46">${cm(p.w)}×${cm(p.d)}</text>`;
      if (p.naam && p.d > f * 3.4) s += `<text x="${p.x + p.w / 2}" y="${p.y + p.d / 2 + f * 1.9}" font-size="${f * 0.65}" text-anchor="middle" fill="#3f3f46">${esc(p.naam.slice(0, 18))}</text>`;
      s += `</g>`;
      if (gekozen) s += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.d}" rx="18" fill="none" stroke="#2563eb" stroke-width="26" pointer-events="none"/>`;
    }
    // Hulplijnen tijdens het slepen
    for (const g of gidsen)
      s += g.as === "x" ? lijn(g.at, -wand * 2, g.at, R.b + wand * 2, 'stroke="#ec4899" stroke-width="10" pointer-events="none"')
                        : lijn(K.x0, g.at, K.x1, g.at, 'stroke="#ec4899" stroke-width="10" pointer-events="none"');
    // Maten van de gekozen pallet tot de wand of de dichtstbijzijnde pallet
    const p = vind(sel);
    if (p) s += afstanden(p, R, fs);
    svgB.innerHTML = s;
  }

  // Maatlijnen links/rechts/boven/onder tot het eerste obstakel (pallet of wand).
  function afstanden(p, R, fs) {
    if (p.x >= R.l) return "";
    const andere = st.pallets.filter((o) => o.id !== p.id && binnen(o, R));
    const yOver = (o) => o.y < p.y + p.d && p.y < o.y + o.d, xOver = (o) => o.x < p.x + p.w && p.x < o.x + o.w;
    const links = Math.max(0, ...andere.filter((o) => yOver(o) && o.x + o.w <= p.x + 0.5).map((o) => o.x + o.w));
    const rechts = Math.min(R.l, ...andere.filter((o) => yOver(o) && o.x >= p.x + p.w - 0.5).map((o) => o.x));
    const boven = Math.max(0, ...andere.filter((o) => xOver(o) && o.y + o.d <= p.y + 0.5).map((o) => o.y + o.d));
    const onder = Math.min(R.b, ...andere.filter((o) => xOver(o) && o.y >= p.y + p.d - 0.5).map((o) => o.y));
    const cx = p.x + p.w / 2, cy = p.y + p.d / 2, f = fs * 0.85;
    let s = "";
    const maatlijn = (x1, y1, x2, y2, label, tx, ty, draai) => {
      if (Math.hypot(x2 - x1, y2 - y1) < 5) return;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="9" pointer-events="none"/>`;
      for (const [x, y] of [[x1, y1], [x2, y2]]) s += `<circle cx="${x}" cy="${y}" r="${f * 0.18}" fill="#2563eb" pointer-events="none"/>`;
      s += `<text x="${tx}" y="${ty}" font-size="${f}" font-weight="700" fill="#1d4ed8" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="${f * 0.25}"
        pointer-events="none" ${draai ? `transform="rotate(-90 ${tx} ${ty})"` : ""}>${label}</text>`;
    };
    maatlijn(links, cy, p.x, cy, `${cm(p.x - links)} cm`, (links + p.x) / 2, cy - f * 0.35);
    maatlijn(p.x + p.w, cy, rechts, cy, `${cm(rechts - p.x - p.w)} cm`, (p.x + p.w + rechts) / 2, cy - f * 0.35);
    maatlijn(cx, boven, cx, p.y, `${cm(p.y - boven)} cm`, cx - f * 0.35, (boven + p.y) / 2, true);
    maatlijn(cx, p.y + p.d, cx, onder, `${cm(onder - p.y - p.d)} cm`, cx - f * 0.35, (p.y + p.d + onder) / 2, true);
    return s;
  }

  function tekenZij(A) {
    const R = A.R, K = kader(R), fs = K.fs, ps = st.pallets;
    const hMax = Math.max(R.h, A.hoogste) + fs * 0.6;
    const boven = fs * 1.6, onder = fs * 1.6;
    svgZ.setAttribute("viewBox", `${K.x0} ${-hMax - boven} ${K.x1 - K.x0} ${hMax + boven + onder}`);
    let s = "";
    const wand = Math.max(R.b * 0.025, 40);
    // Container: vloer, dak, kopse kant; deurhoogte gestippeld
    s += `<rect x="${-wand}" y="${-R.h - wand}" width="${R.l + wand}" height="${R.h + 2 * wand}" fill="#3f3f46"/>`;
    s += `<rect x="0" y="${-R.h}" width="${R.l}" height="${R.h}" fill="#fafafa"/>`;
    s += `<line x1="${R.l - R.l * 0.08}" y1="${-R.deurH}" x2="${R.l + wand * 3}" y2="${-R.deurH}" stroke="#ea580c" stroke-width="10" stroke-dasharray="40 30"/>`;
    s += `<text x="${R.l + wand * 3.4}" y="${-R.deurH + fs * 0.35}" font-size="${fs * 0.8}" fill="#ea580c">deur ${cm(R.deurH)}</text>`;
    s += `<text x="${-wand - fs * 0.4}" y="${-R.h / 2}" font-size="${fs * 0.85}" font-weight="700" text-anchor="middle" transform="rotate(-90 ${-wand - fs * 0.4} ${-R.h / 2})">${cm(R.h)} cm</text>`;
    // Pallets (doorzichtig, zodat pallets naast elkaar samen zichtbaar zijn)
    for (const p of [...ps].sort((a, b) => b.h * b.stapel - a.h * a.stapel)) {
      const fout = A.fout.has(p.id) || A.hoog.has(p.id), gekozen = p.id === sel;
      for (let i = 0; i < p.stapel; i++)
        s += `<rect x="${p.x}" y="${-(i + 1) * p.h}" width="${p.w}" height="${p.h}" fill="${fout ? "#fca5a5" : "#e9c27c"}" fill-opacity=".55"
          stroke="${gekozen ? "#2563eb" : fout ? "#dc2626" : "#8a6a32"}" stroke-width="${gekozen ? 24 : 10}"/>`;
    }
    if (A.hoogste) {
      s += `<line x1="0" y1="${-A.hoogste}" x2="${R.l}" y2="${-A.hoogste}" stroke="#2563eb" stroke-width="8" stroke-dasharray="30 30"/>`;
      s += `<text x="${fs * 0.3}" y="${-A.hoogste - fs * 0.3}" font-size="${fs * 0.8}" fill="#1d4ed8" font-weight="700">hoogste ${cm(A.hoogste)} cm</text>`;
    }
    svgZ.innerHTML = s;
  }

  // ---------- Panelen ----------
  function bouwRuimtes() {
    $("ruimtes").innerHTML = Object.entries(RUIMTES).map(([k, r]) =>
      `<button type="button" data-ruimte="${k}" class="${k === st.ruimte ? "actief" : ""}">${esc(r.kort)}</button>`).join("");
    const R = ruimte();
    $("eigen-ruimte").hidden = st.ruimte !== "eigen";
    document.querySelectorAll("[data-eigen]").forEach((el) => {
      const k = el.dataset.eigen;
      if (el !== document.activeElement) el.value = k === "kg" ? st.eigen.kg : cm(st.eigen[k]);
    });
    $("ruimte-info").innerHTML = `<b>${esc(R.naam)}</b> — binnen ${m2(R.l)} × ${m2(R.b)} × ${m2(R.h)} m (l × b × h)<br>
      Deuropening ${m2(R.deurB)} × ${m2(R.deurH)} m${R.kg ? ` · max. lading ± ${kgTekst(R.kg)} kg` : ""}`;
  }
  function bouwPaltypes() {
    $("paltypes").innerHTML = Object.entries(PALLETS).map(([k, t]) => {
      const m = k === "eigen" ? null : t, z = 28, s = m ? Math.min(z / m.l, z / m.b) : 0;
      const mini = m ? `<svg viewBox="0 0 ${z + 2} ${z + 2}" aria-hidden="true"><rect x="${1 + (z - m.l * s) / 2}" y="${1 + (z - m.b * s) / 2}" width="${m.l * s}" height="${m.b * s}" rx="1.5" fill="#f3d9a4" stroke="#8a6a32"/></svg>`
        : `<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="4" y="7" width="22" height="16" rx="1.5" fill="none" stroke="#8a6a32" stroke-dasharray="3 2"/></svg>`;
      return `<button type="button" data-type="${k}" class="${k === st.nieuw.type ? "actief" : ""}">${mini}<span><b>${esc(t.naam)}</b><small>${m ? `${cm(m.l)} × ${cm(m.b)} cm` : "zelf invullen"}</small></span></button>`;
    }).join("");
    $("eigen-pallet").hidden = st.nieuw.type !== "eigen";
    document.querySelectorAll("#richting [data-richting]").forEach((b) => b.classList.toggle("actief", b.dataset.richting === st.nieuw.richting));
    if ($("n-speling") !== document.activeElement) $("n-speling").value = Math.round((+st.speling || 0)) / 10;
    for (const [id, k, f] of [["n-h", "h", 10], ["n-l", "l", 10], ["n-b", "b", 10], ["n-kg", "kg", 1], ["n-aantal", "aantal", 1]]) {
      const el = $(id);
      if (el !== document.activeElement) el.value = st.nieuw[k] === "" ? "" : Math.round((+st.nieuw[k] / f) * 10) / 10;
    }
  }
  function bouwOverzicht(A) {
    const R = A.R, n = st.pallets.length, buiten = st.pallets.filter((p) => p.x >= R.l).length;
    const rij = (k, v) => `<div class="ov-rij"><span>${k}</span><b>${v}</b></div>`;
    let h = rij("Laadruimte", esc(R.naam));
    h += rij("Pallets", n ? `${n - buiten} in de ${esc(R.kort)}${buiten ? ` <em class="rood">+ ${buiten} past niet</em>` : ""}` : "nog geen");
    h += rij("Laadlengte", `${m2(A.lengte)} m van ${m2(R.l)} m`);
    h += rij("Vrij tot de deur", `${cm(R.l - A.lengte)} cm`);
    h += rij("Vloer benut", `${Math.round(A.vloer * 100)}%`);
    if (A.gewicht) h += rij("Gewicht", `${kgTekst(A.gewicht)} kg${R.kg ? ` van ${kgTekst(R.kg)} (${Math.round((A.gewicht / R.kg) * 100)}%)` : ""}`);
    if (A.zwaartepunt != null) h += rij("Zwaartepunt", `${m2(A.zwaartepunt)} m vanaf de kop (${Math.round((A.zwaartepunt / R.l) * 100)}%)`);
    h += rij("Hoogste stapel", A.hoogste ? `${cm(A.hoogste)} cm (binnen ${cm(R.h)}, deur ${cm(R.deurH)})` : "—");
    h += n ? (A.problemen.length ? `<div class="melding fout">${A.problemen.map(esc).join("<br>")}</div>` : `<div class="melding goed">✓ Alles past</div>`) : "";
    if (melding) { h += `<div class="melding let">${esc(melding)}</div>`; melding = ""; }
    $("overzicht").innerHTML = h;
    $("plan-titel").textContent = `${R.naam} — ${m2(R.l)} × ${m2(R.b)} × ${m2(R.h)} m`;
    const status = $("plan-status");
    status.textContent = !n ? "Voeg pallets toe" : A.problemen.length ? `✗ ${A.problemen.length} probleem${A.problemen.length === 1 ? "" : "en"}` : "✓ Alles past";
    status.className = "status " + (!n ? "" : A.problemen.length ? "fout" : "goed");
  }
  function bouwSelectie(A) {
    const p = vind(sel), box = $("selectie");
    if (!p) {
      $("sel-titel").textContent = "Pallet";
      box.innerHTML = `<p class="leeg">Klik op een pallet om de maten, de hoogte, het gewicht of de plek aan te passen.</p>`;
      return;
    }
    $("sel-titel").textContent = `Pallet ${A.nr.get(p.id)} — ${(PALLETS[p.type] || PALLETS.eigen).naam}`;
    const veld = (k, label, waarde, extra = "") => `<label>${label} <input data-veld="${k}" type="number" value="${waarde}" ${extra}></label>`;
    box.innerHTML = `<label>Omschrijving <input data-veld="naam" value="${esc(p.naam || "")}" placeholder="bijv. order 2026-001 of klant"></label>
      <div class="rij">${veld("w", "Lengte (cm) ⟷", cm(p.w), 'min="10" step="1"')}${veld("d", "Breedte (cm) ↕", cm(p.d), 'min="10" step="1"')}</div>
      <div class="rij3">${veld("h", "Hoogte (cm)", cm(p.h), 'min="1" step="1"')}
        <label>Stapel <select data-veld="stapel">${[1, 2, 3].map((n) => `<option value="${n}" ${p.stapel === n ? "selected" : ""}>${n} hoog</option>`).join("")}</select></label>
        ${veld("kg", "Gewicht (kg)", p.kg === "" ? "" : p.kg, 'min="0" step="1" placeholder="—"')}</div>
      <div class="rij">${veld("x", "Vanaf kopse kant (cm)", cm(p.x), 'step="1"')}${veld("y", "Vanaf linkerwand (cm)", cm(p.y), 'step="1"')}</div>
      <p class="hint">Gewicht en stapel tellen per pallet: ${p.stapel} × ${cm(p.h)} cm = ${cm(p.h * p.stapel)} cm hoog${+p.kg ? `, ${kgTekst(p.kg * p.stapel)} kg` : ""}.</p>
      <div class="eig-acties">
        <button type="button" data-actie="draai">↻ Draaien</button><button type="button" data-actie="dupliceer">⧉ Dupliceren</button>
        <button type="button" data-actie="tegenaan">⇤ Tegen de kop</button><button type="button" data-actie="verwijder" class="gevaar">✕ Verwijderen</button>
      </div>`;
  }
  function alles() {
    const A = analyse();
    bouwRuimtes(); bouwPaltypes(); bouwOverzicht(A); bouwSelectie(A);
    tekenBoven(A); tekenZij(A);
  }
  let raf = false;
  function planTeken() {
    if (raf) return;
    raf = true;
    requestAnimationFrame(() => { raf = false; const A = analyse(); tekenBoven(A); tekenZij(A); bouwOverzicht(A); });
  }

  // ---------- Acties ----------
  function draai(p) {
    const R = ruimte(), cx = p.x + p.w / 2, cy = p.y + p.d / 2;
    [p.w, p.d] = [p.d, p.w];
    p.x = Math.round(cx - p.w / 2); p.y = Math.round(cy - p.d / 2);
    if (p.x < R.l) {   // binnen de container houden waar mogelijk
      p.x = Math.min(Math.max(p.x, 0), Math.max(R.l - p.w, 0));
      p.y = Math.min(Math.max(p.y, 0), Math.max(R.b - p.d, 0));
    }
  }
  function actie(a) {
    const p = vind(sel);
    if (!p) return;
    const R = ruimte();
    if (a === "draai") draai(p);
    else if (a === "verwijder") { st.pallets = st.pallets.filter((o) => o.id !== p.id); sel = null; }
    else if (a === "dupliceer") {
      const kopie = { ...p, id: nieuwId() }, andere = st.pallets.filter((o) => binnen(o, R));
      const plek = vrijePlek(kopie.w, kopie.d, andere, R) || buitenPlek(kopie.w, kopie.d, R);
      Object.assign(kopie, plek); st.pallets.push(kopie); sel = kopie.id;
    } else if (a === "tegenaan") {
      const andere = st.pallets.filter((o) => o.id !== p.id && binnen(o, R) && o.y < p.y + p.d && p.y < o.y + o.d && o.x + o.w <= p.x + 0.5);
      p.x = Math.max(0, ...andere.map((o) => o.x + o.w));
    }
    bewaar(); alles();
  }

  // Slepen met vastklikken tegen wanden en andere pallets
  function vastklikken(p, x, y, R, drempel) {
    const andere = st.pallets.filter((o) => o.id !== p.id);
    const kx = [0, R.l - p.w], ky = [0, R.b - p.d];
    const sp = Math.max(0, +st.speling || 0);
    for (const o of andere) {
      kx.push(o.x + o.w, o.x - p.w, o.x, o.x + o.w - p.w); ky.push(o.y + o.d, o.y - p.d, o.y, o.y + o.d - p.d);
      if (sp) { kx.push(o.x + o.w + sp, o.x - p.w - sp); ky.push(o.y + o.d + sp, o.y - p.d - sp); }
    }
    const best = (v, kand) => kand.reduce((b, k) => (Math.abs(k - v) < Math.abs(b - v) ? k : b), Infinity);
    const bx = best(x, kx), by = best(y, ky);
    gidsen = [];
    if (Math.abs(bx - x) <= drempel) { x = bx; gidsen.push({ as: "x", at: Math.abs(bx - (R.l - p.w)) < 0.5 ? R.l : bx === 0 ? 0 : x }); }
    if (Math.abs(by - y) <= drempel) { y = by; gidsen.push({ as: "y", at: y }); }
    return { x, y };
  }
  svgB.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const g = e.target.closest("[data-id]");
    if (!g) { if (sel) { sel = null; alles(); } return; }
    const p = vind(g.dataset.id);
    if (!p) return;
    const m = naarMm(e);
    if (sel !== p.id) { sel = p.id; bouwSelectie(analyse()); }
    sleep = { id: p.id, dx: m.x - p.x, dy: m.y - p.y, bewogen: false };
    svgB.setPointerCapture(e.pointerId);
    e.preventDefault();
    planTeken();
  });
  svgB.addEventListener("pointermove", (e) => {
    if (!sleep) return;
    const p = vind(sleep.id), R = ruimte();
    if (!p) return;
    const m = naarMm(e);
    let x = m.x - sleep.dx, y = m.y - sleep.dy;
    if (!e.altKey) ({ x, y } = vastklikken(p, x, y, R, 9 * mmPerPx(svgB)));
    else gidsen = [];
    x = Math.round(x); y = Math.round(y);
    if (x !== p.x || y !== p.y) { p.x = x; p.y = y; sleep.bewogen = true; planTeken(); }
  });
  function stopSlepen() {
    if (!sleep) return;
    const bewogen = sleep.bewogen;
    sleep = null; gidsen = [];
    if (bewogen) bewaar();
    alles();
  }
  svgB.addEventListener("pointerup", stopSlepen);
  svgB.addEventListener("pointercancel", stopSlepen);
  svgB.addEventListener("dblclick", (e) => { const g = e.target.closest("[data-id]"); if (g) { sel = g.dataset.id; actie("draai"); } });

  document.addEventListener("keydown", (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); ongedaan(); return; }
    const p = vind(sel);
    if (!p) return;
    const stap = e.shiftKey ? 100 : 10;
    const pijl = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] }[e.key];
    if (pijl) { e.preventDefault(); p.x += pijl[0]; p.y += pijl[1]; bewaar(); alles(); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); actie("verwijder"); }
    else if (e.key.toLowerCase() === "r" && !mod) { e.preventDefault(); actie("draai"); }
    else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); actie("dupliceer"); }
    else if (e.key === "Escape") { sel = null; alles(); }
  });

  // Panelen
  $("ruimtes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ruimte]");
    if (!b) return;
    st.ruimte = b.dataset.ruimte; bewaar(); alles();
  });
  document.querySelectorAll("[data-eigen]").forEach((el) => el.addEventListener("input", () => {
    const k = el.dataset.eigen, v = parseFloat(el.value);
    if (!(v > 0)) return;
    st.eigen[k] = k === "kg" ? v : v * 10;
    bewaar(); planTeken();
    const R = ruimte();
    $("ruimte-info").innerHTML = `<b>${esc(R.naam)}</b> — binnen ${m2(R.l)} × ${m2(R.b)} × ${m2(R.h)} m (l × b × h)<br>Deuropening ${m2(R.deurB)} × ${m2(R.deurH)} m${R.kg ? ` · max. lading ± ${kgTekst(R.kg)} kg` : ""}`;
  }));
  $("paltypes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-type]");
    if (!b) return;
    st.nieuw.type = b.dataset.type; bewaar(); bouwPaltypes();
  });
  $("richting").addEventListener("click", (e) => {
    const b = e.target.closest("[data-richting]");
    if (b) { st.nieuw.richting = b.dataset.richting; bewaar(); bouwPaltypes(); }
  });
  $("n-speling").addEventListener("input", (e) => { st.speling = Math.max(0, (+e.target.value || 0) * 10); opslag.schrijf(SLEUTEL, st); });
  for (const [id, k, f] of [["n-h", "h", 10], ["n-l", "l", 10], ["n-b", "b", 10], ["n-kg", "kg", 1], ["n-aantal", "aantal", 1]])
    $(id).addEventListener("input", (e) => { const v = e.target.value; st.nieuw[k] = v === "" ? "" : +v * f; opslag.schrijf(SLEUTEL, st); });
  $("toevoegen").addEventListener("click", toevoegen);
  $("vullen").addEventListener("click", vullen);
  $("ongedaan").addEventListener("click", ongedaan);
  $("wissen").addEventListener("click", () => {
    if (!st.pallets.length || !confirm("Alle pallets weghalen?")) return;
    st.pallets = []; sel = null; bewaar(); alles();
  });
  const selBox = $("selectie");
  selBox.addEventListener("input", (e) => {
    const p = vind(sel), k = e.target.dataset.veld;
    if (!p || !k) return;
    const v = e.target.value;
    if (k === "naam") p.naam = v;
    else if (k === "stapel") p.stapel = Math.min(Math.max(+v || 1, 1), 3);
    else if (k === "kg") p.kg = v === "" ? "" : Math.max(0, +v);
    else { const n = parseFloat(v); if (!isFinite(n)) return; p[k] = k === "x" || k === "y" ? Math.round(n * 10) : Math.max(10, Math.round(n * 10)); }
    opslag.schrijf(SLEUTEL, st);
    planTeken();
    if (k === "stapel" || k === "kg" || k === "h") { clearTimeout(selBox.t); selBox.t = setTimeout(() => { vastleggen(); bouwSelectie(analyse()); }, 600); }
    else { clearTimeout(selBox.t); selBox.t = setTimeout(vastleggen, 600); }
  });
  selBox.addEventListener("click", (e) => { const b = e.target.closest("[data-actie]"); if (b) actie(b.dataset.actie); });
  window.addEventListener("resize", planTeken);

  // ---------- Laadplan als PDF ----------
  function maakPdf() {
    const { jsPDF } = window.jspdf, A = analyse(), R = A.R;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setProperties({ title: `Laadplan ${R.naam}` });
    const kleur = (hex, soort = "fill") => { const n = parseInt(hex.slice(1), 16); doc[soort === "fill" ? "setFillColor" : soort === "draw" ? "setDrawColor" : "setTextColor"]((n >> 16) & 255, (n >> 8) & 255, n & 255); };
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); kleur("#18181b", "text");
    doc.text(`Laadplan — ${R.naam}`, 10, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); kleur("#52525b", "text");
    doc.text(`Binnen ${m2(R.l)} × ${m2(R.b)} × ${m2(R.h)} m · deur ${m2(R.deurB)} × ${m2(R.deurH)} m · ${new Date().toLocaleDateString("nl-NL")}`, 10, 19.5);
    const samenvatting = [`${A.erin.length} pallets in de ${R.kort}`, `laadlengte ${m2(A.lengte)} m (vrij ${cm(R.l - A.lengte)} cm)`, `vloer ${Math.round(A.vloer * 100)}%`,
      A.gewicht ? `${kgTekst(A.gewicht)} kg${R.kg ? ` van ${kgTekst(R.kg)}` : ""}` : "", A.hoogste ? `hoogste ${cm(A.hoogste)} cm` : ""].filter(Boolean).join(" · ");
    doc.text(samenvatting, 10, 24);
    if (A.problemen.length) { kleur("#dc2626", "text"); doc.text(`Let op: ${A.problemen.slice(0, 3).join(" ")}`, 10, 28.5); }

    // Bovenaanzicht
    const buiten = st.pallets.filter((p) => p.x >= R.l);
    const breed = buiten.length ? Math.max(...buiten.map((p) => p.x + p.w)) + 200 : R.l;
    const s = Math.min(265 / breed, 70 / R.b), X = (v) => 16 + v * s, Y0 = 40, Y = (v) => Y0 + v * s;
    kleur("#3f3f46"); doc.rect(X(0) - 1, Y(0) - 1, R.l * s + 1, R.b * s + 2, "F");
    kleur("#ffffff"); doc.rect(X(0), Y(0), R.l * s, R.b * s, "F");
    doc.setFontSize(6); kleur("#3f3f46", "text"); kleur("#18181b", "draw"); doc.setLineWidth(0.2);
    doc.line(X(0), Y0 - 4, X(R.l), Y0 - 4);
    for (let x = 0; x <= R.l + 0.5; x += 500) { doc.line(X(x), Y0 - 4, X(x), Y0 - (x % 1000 ? 5 : 6)); if (x % 1000 === 0 && x > 0 && R.l - x > 600) doc.text(`${x / 1000} m`, X(x), Y0 - 7, { align: "center" }); }
    doc.setFont("helvetica", "bold"); doc.text(`${m2(R.l)} m`, X(R.l), Y0 - 7, { align: "right" });
    doc.text("KOP", X(0) - 3, Y(R.b / 2), { angle: 90, align: "center" });
    doc.text("DEUR", X(R.l) + 5.5, Y(R.b / 2), { angle: 90, align: "center" });
    for (const p of st.pallets) {
      const fout = A.fout.has(p.id) || A.hoog.has(p.id);
      kleur(fout ? "#fecaca" : p.stapel > 1 ? "#e9c27c" : "#f3d9a4"); kleur(fout ? "#dc2626" : "#8a6a32", "draw"); doc.setLineWidth(0.25);
      doc.rect(X(p.x), Y(p.y), p.w * s, p.d * s, "FD");
      const f = Math.max(4, Math.min(9, p.d * s * 1.1, p.w * s * 0.9));
      doc.setFont("helvetica", "bold"); doc.setFontSize(f); kleur("#18181b", "text");
      doc.text(`${A.nr.get(p.id)}${p.stapel > 1 ? ` ×${p.stapel}` : ""}`, X(p.x + p.w / 2), Y(p.y + p.d / 2), { align: "center", baseline: "middle" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(f * 0.6); kleur("#52525b", "text");
      doc.text(`${cm(p.w)}×${cm(p.d)}`, X(p.x + p.w / 2), Y(p.y + p.d / 2) + f * 0.3, { align: "center", baseline: "middle" });
    }
    if (A.erin.length) { kleur("#2563eb", "draw"); doc.setLineWidth(0.35); doc.setLineDashPattern([1.5, 1], 0); doc.line(X(A.lengte), Y(0) - 2, X(A.lengte), Y(R.b) + 2); doc.setLineDashPattern([], 0); }

    // Lijst
    let y = Y(R.b) + 9;
    const kol = [10, 22, 60, 88, 104, 120, 142, 170, 198];
    const kop = ["Nr", "Type", "L × B (cm)", "H (cm)", "Stapel", "Gewicht", "Vanaf kop", "Vanaf links", "Omschrijving"];
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); kleur("#18181b", "text");
    kop.forEach((t, i) => doc.text(t, kol[i], y));
    doc.setLineWidth(0.2); kleur("#a1a1aa", "draw"); doc.line(10, y + 1.5, 287, y + 1.5);
    doc.setFont("helvetica", "normal");
    for (const p of genummerd()) {
      y += 5;
      if (y > 200) { doc.addPage("a4", "landscape"); y = 15; }
      const buitenP = p.x >= R.l;
      kleur(A.fout.has(p.id) || A.hoog.has(p.id) ? "#dc2626" : "#18181b", "text");
      [String(A.nr.get(p.id)), (PALLETS[p.type] || PALLETS.eigen).naam, `${cm(p.w)} × ${cm(p.d)}`, cm(p.h), `${p.stapel} hoog`, +p.kg ? `${kgTekst(p.kg * p.stapel)} kg` : "—",
        buitenP ? "past niet" : `${cm(p.x)} cm`, buitenP ? "" : `${cm(p.y)} cm`, String(p.naam || "").slice(0, 45)].forEach((t, i) => doc.text(t, kol[i], y));
    }
    doc.save(`laadplan_${R.kort.replace(/\s+/g, "")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
  $("pdf").addEventListener("click", () => { try { maakPdf(); } catch (err) { melding = "PDF maken mislukt: " + err.message; alles(); } });

  // ---------- Start ----------
  alles();
  vastleggen();
})();
