// Stickerbouwer — editor (werkvlak, onderdelen, eigenschappen, sjablonen).
(() => {
  const L = window.Labels;
  const libs = { jsPDF: window.jspdf.jsPDF, JsBarcode: window.JsBarcode, qrcode: window.qrcode };
  const meet = L.meetMet(new libs.jsPDF());
  const $ = (id) => document.getElementById(id);
  const esc = L.esc;
  const afr = (v) => Math.round(v * 100) / 100;
  const svg = $("canvas");

  const opslag = {
    lees(k, s) { try { const v = localStorage.getItem(k); return v == null ? s : JSON.parse(v); } catch { return s; } },
    schrijf(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  let cfg = L.normaliseer(opslag.lees("stickers.cfg", null));
  let geselecteerd = null;
  let index = 0;
  let raster = Number(opslag.lees("stickers.raster", 1));
  let toonVakken = opslag.lees("stickers.vakken", true);
  let gidsen = [];
  let losseMelding = null;

  const TYPENAAM = { tekst: "tekstvak", barcode: "barcode", kader: "kader", afbeelding: "afbeelding", locaties: "locatievak" };
  const sel = () => cfg.elementen.find((e) => e.id === geselecteerd) || null;

  // ---------- Opslaan en ongedaan maken ----------
  const historie = { lijst: [], pos: -1 };
  let vastTimer;
  function opslaan() {
    if (!opslag.schrijf("stickers.cfg", cfg)) losseMelding = "Kon het ontwerp niet in de browser bewaren (afbeelding te groot?). Exporteer het als sjabloon.";
  }
  function vastleggen() {
    const s = JSON.stringify(cfg);
    if (historie.lijst[historie.pos] === s) return;
    historie.lijst = historie.lijst.slice(0, historie.pos + 1);
    historie.lijst.push(s);
    if (historie.lijst.length > 60) historie.lijst.shift();
    historie.pos = historie.lijst.length - 1;
    knoppenHistorie();
  }
  function gewijzigd(direct) {
    opslaan();
    clearTimeout(vastTimer);
    if (direct) vastleggen(); else vastTimer = setTimeout(vastleggen, 450);
  }
  function knoppenHistorie() {
    $("ongedaan").disabled = historie.pos <= 0;
    $("opnieuw").disabled = historie.pos >= historie.lijst.length - 1;
  }
  function herstel() {
    cfg = JSON.parse(historie.lijst[historie.pos]);
    if (!sel()) geselecteerd = null;
    opslaan(); alles(); knoppenHistorie();
  }
  function ongedaan() { clearTimeout(vastTimer); vastleggen(); if (historie.pos > 0) { historie.pos--; herstel(); } }
  function opnieuw() { if (historie.pos < historie.lijst.length - 1) { historie.pos++; herstel(); } }
  $("ongedaan").addEventListener("click", ongedaan);
  $("opnieuw").addEventListener("click", opnieuw);

  // ---------- Tekenen ----------
  function mmPerPx() { const m = svg.getScreenCTM(); return m && m.a ? 1 / m.a : 0.3; }

  function huidigeSticker() {
    let items, fout = null;
    try { items = L.waarden(cfg); } catch (e) { fout = e.message; items = [{ waarde: "", nr: "" }]; }
    index = Math.min(Math.max(index, 0), items.length - 1);
    const item = items[index];
    const r = L.render(cfg, item, L.context(item, index + 1, items.length), libs, meet);
    return Object.assign(r, { totaal: fout ? 0 : items.length, inhoudFout: fout });
  }

  function teken() {
    const B = +cfg.breedte, H = +cfg.hoogte;
    svg.setAttribute("viewBox", `0 0 ${B} ${H}`);
    const px = mmPerPx();
    const r = huidigeSticker();
    const lijn = (extra) => `fill="none" vector-effect="non-scaling-stroke" pointer-events="none" ${extra}`;
    let s = `<rect width="${B}" height="${H}" fill="#fff"/>` + L.opsNaarSvg(r.ops);

    if (toonVakken) for (const e of cfg.elementen)
      s += `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" ${lijn('stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3"')}/>`;
    for (const g of gidsen)
      s += g.as === "x" ? `<line x1="${g.at}" y1="-4" x2="${g.at}" y2="${H + 4}" ${lijn('stroke="#ec4899" stroke-width="1"')}/>`
                        : `<line x1="-4" y1="${g.at}" x2="${B + 4}" y2="${g.at}" ${lijn('stroke="#ec4899" stroke-width="1"')}/>`;

    // Klikvlakken (geselecteerd onderdeel bovenop, zodat je het altijd kunt slepen)
    const mn = 12 * px;
    const volgorde = cfg.elementen.filter((e) => e.id !== geselecteerd).concat(sel() ? [sel()] : []);
    for (const e of volgorde) {
      const x = e.w < mn ? e.x - (mn - e.w) / 2 : e.x, y = e.h < mn ? e.y - (mn - e.h) / 2 : e.y;
      const w = Math.max(e.w, mn), h = Math.max(e.h, mn);
      if (e.type === "kader" && !e.gevuld && e.id !== geselecteerd)
        s += `<rect class="hit" data-id="${e.id}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="none" stroke="transparent" stroke-width="12" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;
      else s += `<rect class="hit" data-id="${e.id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;
    }

    const g = sel();
    if (g) {
      s += `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" ${lijn('stroke="#2563eb" stroke-width="1.5"')}/>`;
      const hs = 9 * px;
      for (const [k, hx, hy] of hendels(g))
        s += `<rect class="handle h-${k}" data-handle="${k}" x="${hx - hs / 2}" y="${hy - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#2563eb" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
    }
    svg.innerHTML = s;

    $("teller").textContent = r.totaal ? `Sticker ${index + 1} van ${r.totaal}` : "–";
    $("vorige").disabled = index <= 0;
    $("volgende").disabled = !r.totaal || index >= r.totaal - 1;
    const m = $("meldingen");
    m.replaceChildren();
    const melding = (soort, tekst) => { const d = document.createElement("div"); d.className = "melding " + soort; d.textContent = tekst; m.append(d); };
    if (r.inhoudFout) melding("fout", r.inhoudFout);
    r.fouten.forEach((f) => melding("fout", f));
    r.waarschuwingen.forEach((w) => melding("let", w));
    if (losseMelding) { melding("let", losseMelding); losseMelding = null; }
    $("download").disabled = $("print").disabled = !!(r.inhoudFout || r.fouten.length);
  }

  let rafGepland = false;
  function planTeken() {
    if (rafGepland) return;
    rafGepland = true;
    requestAnimationFrame(() => { rafGepland = false; teken(); });
  }

  function hendels(g) {
    const { x, y, w, h } = g, cx = x + w / 2, cy = y + h / 2;
    return [["nw", x, y], ["n", cx, y], ["ne", x + w, y], ["e", x + w, cy], ["se", x + w, y + h], ["s", cx, y + h], ["sw", x, y + h], ["w", x, cy]];
  }

  // ---------- Slepen en vergroten ----------
  let actie = null;
  function naarMm(e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function kandidaten(as) {
    const B = +cfg.breedte, H = +cfg.hoogte, m = +cfg.marge || 0, len = as === "x" ? B : H;
    const c = [0, m, len / 2, len - m, len];
    for (const e of cfg.elementen) if (e.id !== geselecteerd) {
      const p = as === "x" ? e.x : e.y, d = as === "x" ? e.w : e.h;
      c.push(p, p + d / 2, p + d);
    }
    return c;
  }
  function dichtstbij(ankers, kand, drempel) {
    let best = null;
    for (const v of ankers) for (const k of kand) {
      const d = k - v;
      if (Math.abs(d) <= drempel && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, k };
    }
    return best;
  }

  svg.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const t = e.target, p = naarMm(e);
    if (t.dataset.handle && sel()) actie = { soort: "maat", h: t.dataset.handle, p, start: { ...sel() } };
    else if (t.dataset.id) {
      if (geselecteerd !== t.dataset.id) selecteer(t.dataset.id);
      actie = { soort: "verplaats", p, start: { ...sel() } };
    } else { if (geselecteerd) selecteer(null); return; }
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  svg.addEventListener("pointermove", (e) => {
    if (!actie) return;
    const g = sel();
    if (!g) return;
    const p = naarMm(e), dx = p.x - actie.p.x, dy = p.y - actie.p.y, s = actie.start;
    const vrij = e.altKey;
    const r = (v) => (raster > 0 && !vrij ? Math.round(v / raster) * raster : afr(v));
    const drempel = 6 * mmPerPx();
    gidsen = [];
    if (actie.soort === "verplaats") {
      let x = r(s.x + dx), y = r(s.y + dy);
      if (!vrij) {
        const bx = dichtstbij([x, x + g.w / 2, x + g.w], kandidaten("x"), drempel);
        if (bx) { x += bx.d; gidsen.push({ as: "x", at: bx.k }); }
        const by = dichtstbij([y, y + g.h / 2, y + g.h], kandidaten("y"), drempel);
        if (by) { y += by.d; gidsen.push({ as: "y", at: by.k }); }
      }
      g.x = afr(x); g.y = afr(y);
    } else {
      const k = actie.h;
      let l = s.x, t = s.y, rr = s.x + s.w, b = s.y + s.h;
      const snap = (v, as) => {
        v = r(v);
        if (vrij) return v;
        const best = dichtstbij([v], kandidaten(as), drempel);
        if (best) { gidsen.push({ as, at: best.k }); return v + best.d; }
        return v;
      };
      if (k.includes("w")) l = Math.min(snap(s.x + dx, "x"), rr - 0.5);
      if (k.includes("e")) rr = Math.max(snap(s.x + s.w + dx, "x"), l + 0.5);
      if (k.includes("n")) t = Math.min(snap(s.y + dy, "y"), b - 0.5);
      if (k.includes("s")) b = Math.max(snap(s.y + s.h + dy, "y"), t + 0.5);
      g.x = afr(l); g.y = afr(t); g.w = afr(rr - l); g.h = afr(b - t);
    }
    werkPositieBij();
    planTeken();
  });

  function stopActie() {
    if (!actie) return;
    actie = null; gidsen = [];
    gewijzigd(true); bouwLijst(); teken();
  }
  svg.addEventListener("pointerup", stopActie);
  svg.addEventListener("pointercancel", stopActie);
  svg.addEventListener("dblclick", (e) => {
    const g = sel();
    if (!g || !e.target.dataset.id) return;
    const veld = $("eigenschappen").querySelector(g.type === "tekst" ? '[data-prop="tekst"]' : g.type === "barcode" ? '[data-prop="inhoud"]' : '[data-prop="naam"]');
    if (veld) { veld.focus(); veld.select && veld.select(); }
  });
  window.addEventListener("resize", planTeken);

  // ---------- Toetsenbord ----------
  document.addEventListener("keydown", (e) => {
    const inVeld = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const mod = e.ctrlKey || e.metaKey;
    if (inVeld) return;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? opnieuw() : ongedaan(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); opnieuw(); return; }
    const g = sel();
    if (!g) return;
    const stap = e.shiftKey ? 5 : e.altKey ? 0.1 : (raster || 0.5);
    const pijl = { ArrowLeft: [-stap, 0], ArrowRight: [stap, 0], ArrowUp: [0, -stap], ArrowDown: [0, stap] }[e.key];
    if (pijl) { e.preventDefault(); g.x = afr(g.x + pijl[0]); g.y = afr(g.y + pijl[1]); werkPositieBij(); gewijzigd(); teken(); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); actieUitvoeren("verwijder"); }
    else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); actieUitvoeren("dupliceer"); }
    else if (e.key === "Escape") selecteer(null);
  });

  // ---------- Selectie, onderdelenlijst ----------
  function selecteer(id) { geselecteerd = id; bouwLijst(); bouwEigenschappen(); teken(); }

  function omschrijving(e) {
    if (e.type === "tekst") return String(e.tekst).split("\n")[0];
    if (e.type === "barcode") return ({ CODE128: "Code 128", CODE39: "Code 39", EAN13: "EAN-13", QR: "QR" }[e.symbologie] || "") + " · " + e.inhoud;
    if (e.type === "kader") return e.gevuld ? "gevuld vlak / lijn" : `rand ${e.dikte} mm`;
    if (e.type === "locaties") return `${e.richting === "onder" ? "onder elkaar" : "naast elkaar"} · ${{ diagonaal: "diagonaal", balk: "kleurbalk", vol: "vol gekleurd", streep: "kleurstreep" }[e.stijl] || ""}`;
    return e.data ? `${e.imgB} × ${e.imgH} px` : "geen afbeelding";
  }
  function bouwLijst() {
    const ICON = { tekst: "T", barcode: "▥", kader: "▢", afbeelding: "▣", locaties: "⌖" };
    const lijst = [...cfg.elementen].reverse();
    $("lagen").innerHTML = lijst.length ? lijst.map((e) => `<li><button type="button" data-kies="${e.id}" class="${e.id === geselecteerd ? "actief" : ""}">
      <span class="ico">${e.type === "barcode" && e.symbologie === "QR" ? "▦" : ICON[e.type]}</span><span class="nm">${esc(e.naam)}</span>
      <span class="sub">${esc(omschrijving(e))}</span></button></li>`).join("")
      : `<li class="leeg">Nog geen onderdelen. Voeg ze toe met de knoppen boven het label.</li>`;
    $("loc-ontwerp").hidden = cfg.elementen.some((e) => e.type === "locaties");
  }
  $("lagen").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kies]");
    if (b) selecteer(b.dataset.kies);
  });

  // ---------- Eigenschappen ----------
  const CHIPS = ["{waarde}", "{nr}", "{n}", "{totaal}", "{datum}", "{barcode}"];
  function bouwEigenschappen() {
    const box = $("eigenschappen"), g = sel();
    $("eig-titel").textContent = g ? `Eigenschappen — ${TYPENAAM[g.type]}` : "Eigenschappen";
    if (!g) {
      box.innerHTML = `<p class="leeg">Klik op een onderdeel op het label of in de lijst om het aan te passen.</p>`;
      return;
    }
    const num = (k, l, step = 0.5, min = "") => `<label>${l} <input type="number" data-prop="${k}" step="${step}" min="${min}" value="${g[k]}"></label>`;
    const chk = (k, l) => `<label class="check"><input type="checkbox" data-prop="${k}" ${g[k] ? "checked" : ""}> ${l}</label>`;
    const seg = (k, opties) => `<div class="seg">${opties.map(([v, t]) => `<button type="button" data-prop="${k}" data-waarde="${v}" class="${g[k] === v ? "actief" : ""}">${t}</button>`).join("")}</div>`;
    const keuze = (k, opties) => `<select data-prop="${k}">${opties.map(([v, t]) => `<option value="${v}" ${g[k] === v ? "selected" : ""}>${t}</option>`).join("")}</select>`;
    const chips = (doel) => `<div class="chips">${CHIPS.map((c) => `<button type="button" data-chip="${c}" data-doel="${doel}" title="Invoegen">${c}</button>`).join("")}</div>`;
    const kleur = (k) => `<div class="kleurkeuze"><input type="color" data-prop="${k}" value="${g[k]}" title="Eigen kleur">
      ${["#000000", "#ffffff", ...L.PALET.slice(0, 7)].map((c) => `<button type="button" class="swatch ${g[k] === c ? "actief" : ""}" data-prop="${k}" data-waarde="${c}" style="background:${c}" title="${c}"></button>`).join("")}</div>`;

    let h = `<label>Naam <input data-prop="naam" value="${esc(g.naam)}"></label>
      <div class="rij4">${num("x", "X")}${num("y", "Y")}${num("w", "Breedte", 0.5, 0.2)}${num("h", "Hoogte", 0.5, 0.2)}</div>
      <span class="sublabel">Plaats op label</span>
      <div class="seg">${[["links", "⇤ Links"], ["hmidden", "Midden"], ["rechts", "Rechts ⇥"]].map(([v, t]) => `<button type="button" data-uitlijn="${v}">${t}</button>`).join("")}</div>
      <div class="seg">${[["boven", "⤒ Boven"], ["vmidden", "Midden"], ["onder", "Onder ⤓"]].map(([v, t]) => `<button type="button" data-uitlijn="${v}">${t}</button>`).join("")}</div>
      <div class="seg"><button type="button" data-uitlijn="breed">↔ Volle breedte</button><button type="button" data-uitlijn="hoog">↕ Volle hoogte</button></div>`;

    if (g.type === "tekst") {
      h += `<label>Tekst <textarea data-prop="tekst" rows="3">${esc(g.tekst)}</textarea></label>${chips("tekst")}
        <div class="rij">
          <label>Lettertype ${keuze("lettertype", Object.entries(L.LETTERTYPEN).map(([v, x]) => [v, x.naam]))}</label>
          ${num("grootte", "Grootte (pt)", 1, 3)}
        </div>
        <span class="sublabel">Uitlijning in het vak</span>
        ${seg("uitlijning", [["left", "Links"], ["center", "Midden"], ["right", "Rechts"]])}
        ${seg("verticaal", [["top", "Boven"], ["middle", "Midden"], ["bottom", "Onder"]])}
        <span class="sublabel">Kleur</span>
        ${kleur("kleur")}
        ${chk("vet", "Vet")}
        ${chk("terugloop", "Lange regels laten teruglopen")}
        ${chk("passend", "Automatisch verkleinen tot het past")}`;
    } else if (g.type === "barcode") {
      h += `<label>Type ${keuze("symbologie", [["CODE128", "Code 128"], ["CODE39", "Code 39"], ["EAN13", "EAN-13"], ["QR", "QR-code"]])}</label>
        <label>Inhoud <input data-prop="inhoud" value="${esc(g.inhoud)}"></label>${chips("inhoud")}
        <p class="hint">Meestal <code>{waarde}</code>. Combineren kan ook, bijv. <code>LOC-{nr}</code> of een vaste URL.</p>
        ${chk("stilleZones", "Stille zones binnen het vak houden (aanbevolen)")}
        <p class="hint">Wil je het nummer als leesbare tekst? Voeg een tekstvak toe met <code>{waarde}</code> (of <code>{barcode}</code> voor EAN-13 met controlecijfer).</p>`;
    } else if (g.type === "kader") {
      h += `${num("dikte", "Lijndikte (mm)", 0.1, 0.1)}${chk("gevuld", "Gevuld (vlak — dun = lijn)")}
        <span class="sublabel">Kleur</span>${kleur("kleur")}`;
    } else if (g.type === "locaties") {
      h += `<span class="sublabel">Locaties op de sticker</span>
        ${seg("richting", [["naast", "Naast elkaar"], ["onder", "Onder elkaar"]])}
        ${num("tussenruimte", "Ruimte tussen de vakken (mm)", 0.5, 0)}
        <span class="sublabel">Stijl</span>
        ${seg("stijl", [["diagonaal", "Diagonaal"], ["balk", "Kleurbalk"], ["vol", "Vol"], ["streep", "Streep"]])}
        <span class="sublabel">Tekstkleur</span>
        ${seg("tekstKleur", [["auto", "Automatisch"], ["zwart", "Zwart"], ["wit", "Wit"]])}
        ${g.stijl === "diagonaal"
          ? `${num("splits", "Aantal segmenten linksboven", 1, 0)}
             <p class="hint">Bijv. 2: <code>07 LL</code> linksboven en <code>01 0</code> rechtsonder.</p>
             <label>Barcode ${keuze("barcode", [["CODE128", "Code 128"], ["CODE39", "Code 39"], ["QR", "QR-code"], ["GEEN", "Geen"]])}</label>`
          : `<div class="rij">
               <label>Barcode ${keuze("barcode", [["CODE128", "Code 128"], ["CODE39", "Code 39"], ["QR", "QR-code"], ["GEEN", "Geen"]])}</label>
               ${num("barcodeDeel", "Barcode (% hoogte)", 5, 15)}
             </div>
             ${chk("koppen", "Segmentnamen boven de code (GANG, STELLING …)")}`}
        ${chk("pijlen", "Pijlen tonen")}
        ${chk("rand", "Dunne rand om elk vak")}
        <p class="hint">Het vak wordt automatisch verdeeld over de locaties van elke sticker. Locaties, kleuren, pijlrichting en aantal pijlen stel je in bij <b>Inhoud → Locaties</b>.</p>`;
    } else {
      h += `<button type="button" data-actie="afbeelding">Andere afbeelding kiezen…</button>
        <p class="hint">De afbeelding blijft in verhouding binnen het vak. Een labelprinter drukt in zwart-wit: een zwart logo op een witte of transparante achtergrond werkt het best.</p>`;
    }
    h += `<div class="eig-acties">
        <button type="button" data-actie="voren">↑ Naar voren</button><button type="button" data-actie="achter">↓ Naar achteren</button>
        <button type="button" data-actie="dupliceer">⧉ Dupliceren</button><button type="button" data-actie="verwijder" class="gevaar">✕ Verwijderen</button>
      </div>`;
    box.innerHTML = h;
  }

  function werkPositieBij() {
    const g = sel();
    if (!g) return;
    for (const k of ["x", "y", "w", "h"]) {
      const el = $("eigenschappen").querySelector(`[data-prop="${k}"]`);
      if (el && document.activeElement !== el) el.value = g[k];
    }
  }

  const GETALLEN = ["x", "y", "w", "h", "grootte", "dikte", "tussenruimte", "barcodeDeel", "splits"];
  function zetProp(k, v) {
    const g = sel();
    if (!g) return;
    if (GETALLEN.includes(k)) {
      v = parseFloat(String(v).replace(",", "."));
      if (!isFinite(v)) return;
      if ((k === "w" || k === "h") && v < 0.2) v = 0.2;
      if (k === "grootte" && v < 1) v = 1;
      if (k === "tussenruimte" && v < 0) v = 0;
      if (k === "barcodeDeel") v = Math.min(Math.max(v, 15), 75);
      if (k === "splits") v = Math.min(Math.max(Math.round(v), 0), 10);
    }
    g[k] = v;
    if (k === "symbologie" && v === "QR") { const z = Math.min(g.w, g.h); g.x = afr(g.x + (g.w - z) / 2); g.w = g.h = afr(z); }
    const typen = ["tekst", "naam", "inhoud", "kleur", ...GETALLEN];   // tijdens typen/slepen: niet elke toets apart in de historie
    gewijzigd(!typen.includes(k));
    bouwLijst();
    planTeken();
  }

  const eig = $("eigenschappen");
  eig.addEventListener("input", (e) => {
    const t = e.target, k = t.dataset.prop;
    if (!k) return;
    zetProp(k, t.type === "checkbox" ? t.checked : t.value);
    if (k === "symbologie") bouwEigenschappen();
  });
  eig.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.waarde != null) { zetProp(t.dataset.prop, t.dataset.waarde); bouwEigenschappen(); }
    else if (t.dataset.uitlijn) uitlijnen(t.dataset.uitlijn);
    else if (t.dataset.actie) actieUitvoeren(t.dataset.actie);
    else if (t.dataset.chip) {
      const veld = eig.querySelector(`[data-prop="${t.dataset.doel}"]`);
      const a = veld.selectionStart ?? veld.value.length, b = veld.selectionEnd ?? a;
      veld.value = veld.value.slice(0, a) + t.dataset.chip + veld.value.slice(b);
      veld.focus();
      veld.setSelectionRange(a + t.dataset.chip.length, a + t.dataset.chip.length);
      veld.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  function uitlijnen(v) {
    const g = sel();
    if (!g) return;
    const B = +cfg.breedte, H = +cfg.hoogte, m = +cfg.marge || 0;
    if (v === "links") g.x = m;
    if (v === "hmidden") g.x = (B - g.w) / 2;
    if (v === "rechts") g.x = B - m - g.w;
    if (v === "boven") g.y = m;
    if (v === "vmidden") g.y = (H - g.h) / 2;
    if (v === "onder") g.y = H - m - g.h;
    if (v === "breed") { g.x = m; g.w = B - 2 * m; }
    if (v === "hoog") { g.y = m; g.h = H - 2 * m; }
    for (const k of ["x", "y", "w", "h"]) g[k] = afr(g[k]);
    werkPositieBij(); gewijzigd(true); teken();
  }

  function actieUitvoeren(a) {
    const g = sel();
    if (!g) return;
    const i = cfg.elementen.indexOf(g);
    if (a === "verwijder") { cfg.elementen.splice(i, 1); geselecteerd = null; }
    else if (a === "dupliceer") {
      const kopie = L.element({ ...g, id: null, naam: uniekeNaam(g.naam), x: afr(g.x + 3), y: afr(g.y + 3) });
      cfg.elementen.splice(i + 1, 0, kopie);
      geselecteerd = kopie.id;
    } else if (a === "voren" && i < cfg.elementen.length - 1) { cfg.elementen.splice(i, 1); cfg.elementen.splice(i + 1, 0, g); }
    else if (a === "achter" && i > 0) { cfg.elementen.splice(i, 1); cfg.elementen.splice(i - 1, 0, g); }
    else if (a === "afbeelding") { afbModus = "vervang"; $("afb-bestand").click(); return; }
    gewijzigd(true); bouwLijst(); bouwEigenschappen(); teken();
  }

  // ---------- Onderdelen toevoegen ----------
  function uniekeNaam(basis) {
    basis = String(basis).replace(/ \d+$/, "");
    const namen = new Set(cfg.elementen.map((e) => e.naam));
    if (!namen.has(basis)) return basis;
    let i = 2;
    while (namen.has(`${basis} ${i}`)) i++;
    return `${basis} ${i}`;
  }

  function plaatsNieuw(e) {
    const B = +cfg.breedte, H = +cfg.hoogte;
    e = L.element(e);
    e.naam = uniekeNaam(e.naam);
    e.x = afr((B - e.w) / 2); e.y = afr((H - e.h) / 2);
    while (cfg.elementen.some((o) => o.x === e.x && o.y === e.y)) { e.x = afr(e.x + 3); e.y = afr(e.y + 3); }
    cfg.elementen.push(e);
    geselecteerd = e.id;
    gewijzigd(true); bouwLijst(); bouwEigenschappen(); teken();
  }

  document.querySelectorAll("[data-nieuw]").forEach((knop) => knop.addEventListener("click", () => {
    const soort = knop.dataset.nieuw;
    const B = +cfg.breedte, H = +cfg.hoogte, m = +cfg.marge || 0, vb = B - 2 * m, vh = H - 2 * m;
    if (soort === "afbeelding") { afbModus = "nieuw"; $("afb-bestand").click(); return; }
    if (soort === "tekst") plaatsNieuw({ type: "tekst", w: Math.min(60, vb), h: Math.min(14, vh) });
    if (soort === "barcode") plaatsNieuw({ type: "barcode", w: Math.min(80, vb), h: Math.min(30, vh) });
    if (soort === "qr") { const z = Math.min(30, vb, vh); plaatsNieuw({ type: "barcode", naam: "QR-code", symbologie: "QR", w: z, h: z }); }
    if (soort === "kader") plaatsNieuw({ type: "kader", w: Math.min(60, vb), h: Math.min(30, vh) });
    if (soort === "lijn") plaatsNieuw({ type: "kader", naam: "Lijn", gevuld: true, w: vb, h: 0.6 });
    if (soort === "locaties") plaatsNieuw({ type: "locaties", w: vb, h: vh, richting: B >= H ? "naast" : "onder" });
  }));

  let afbModus = "nieuw";
  function leesAfbeelding(bestand) {
    return new Promise((ok, nee) => {
      const url = URL.createObjectURL(bestand), img = new Image();
      img.onload = () => {
        const b0 = img.naturalWidth || 300, h0 = img.naturalHeight || 300, schaal = Math.min(1, 1000 / Math.max(b0, h0));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(b0 * schaal)); c.height = Math.max(1, Math.round(h0 * schaal));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok({ data: c.toDataURL("image/png"), imgB: c.width, imgH: c.height });
      };
      img.onerror = () => { URL.revokeObjectURL(url); nee(new Error("Dit bestand kon niet als afbeelding worden gelezen.")); };
      img.src = url;
    });
  }
  $("afb-bestand").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const a = await leesAfbeelding(f);
      const g = sel();
      if (afbModus === "vervang" && g && g.type === "afbeelding") {
        Object.assign(g, a); gewijzigd(true); bouwLijst(); teken();
      } else {
        const B = +cfg.breedte, H = +cfg.hoogte, m = +cfg.marge || 0;
        let w = Math.min(40, B - 2 * m), h = w * a.imgH / a.imgB;
        if (h > H - 2 * m) { h = H - 2 * m; w = h * a.imgB / a.imgH; }
        plaatsNieuw({ type: "afbeelding", naam: "Logo", w: afr(w), h: afr(h), ...a });
      }
    } catch (err) { losseMelding = err.message; teken(); }
  });

  // ---------- Inhoud en labelformaat ----------
  const instellingen = $("instellingen");
  const velden = [...instellingen.querySelectorAll("[data-k]")];
  function zetFormulier() {
    for (const el of velden) {
      const k = el.dataset.k;
      if (el.type === "radio") el.checked = cfg[k] === el.value;
      else if (el.type === "checkbox") el.checked = !!cfg[k];
      else el.value = cfg[k] ?? "";
    }
    document.querySelectorAll("[data-modus]").forEach((el) => (el.hidden = el.dataset.modus !== cfg.modus));
    const hit = Object.entries(L.FORMATEN).find(([, f]) => f.b === +cfg.breedte && f.h === +cfg.hoogte);
    $("formaat").value = hit ? hit[0] : "";
    $("raster").value = String(raster);
    $("kaders").checked = toonVakken;
  }

  function schaal(B2, H2) {
    const B1 = +cfg.breedte, H1 = +cfg.hoogte;
    if ($("meeschalen").checked && B1 > 0 && H1 > 0) {
      const sx = B2 / B1, sy = H2 / H1, sm = Math.min(sx, sy);
      for (const e of cfg.elementen) {
        e.x = afr(e.x * sx); e.w = afr(e.w * sx); e.y = afr(e.y * sy); e.h = afr(e.h * sy);
        if (e.type === "tekst") e.grootte = Math.max(1, Math.round(e.grootte * sm * 2) / 2);
        if (e.type === "barcode" && e.symbologie === "QR") {
          const z = Math.min(e.w, e.h);
          e.x = afr(e.x + (e.w - z) / 2); e.y = afr(e.y + (e.h - z) / 2); e.w = e.h = afr(z);
        }
      }
    }
    cfg.breedte = B2; cfg.hoogte = H2;
    gewijzigd(true); zetFormulier(); bouwEigenschappen(); teken();
  }

  instellingen.addEventListener("input", (e) => {
    const t = e.target, k = t.dataset.k;
    if (!k || k === "breedte" || k === "hoogte") return;
    if (t.type === "radio") { if (t.checked) { cfg[k] = t.value; index = 0; } }
    else if (t.type === "checkbox") cfg[k] = t.checked;
    else if (t.type === "number" || k === "afloop") cfg[k] = t.value === "" ? "" : Number(t.value);
    else cfg[k] = t.value;
    gewijzigd(t.type === "radio" || t.type === "checkbox" || t.tagName === "SELECT");
    document.querySelectorAll("[data-modus]").forEach((el) => (el.hidden = el.dataset.modus !== cfg.modus));
    if (k === "modus") bouwLocaties();
    planTeken();
  });

  // ---------- Locaties ----------
  const SCHEIDINGEN = [[" ", "spatie"], ["-", "streepje -"], [".", "punt ."], ["/", "slash /"], ["", "geen"]];
  const locPaneel = $("loc-paneel");

  function bouwLocaties() {
    const l = cfg.locatie;
    $("segmenten").innerHTML = l.segmenten.map((s, i) => `<div class="segrij">
        <input data-seg="${i}" data-veld="naam" value="${esc(s.naam)}" placeholder="Naam" aria-label="Naam segment ${i + 1}">
        <input data-seg="${i}" data-veld="van" value="${esc(s.van)}" placeholder="01" aria-label="Van">
        <input data-seg="${i}" data-veld="tot" value="${esc(s.tot)}" placeholder="—" aria-label="Tot en met">
        <button type="button" data-seg-weg="${i}" title="Segment verwijderen" ${l.segmenten.length < 2 ? "disabled" : ""}>✕</button>
      </div>`).join("");
    const opties = (sel, lijst, waarde) => {
      sel.innerHTML = lijst.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("");
      sel.value = String(waarde);
    };
    opties($("loc-sch"), SCHEIDINGEN, l.scheiding);
    opties($("loc-bcsch"), SCHEIDINGEN, l.bcScheiding);
    locAfgeleid();
  }

  // Delen die afhangen van de segmenten, zonder de invoervelden opnieuw op te bouwen.
  function locAfgeleid() {
    const l = cfg.locatie;
    const naam = (s, i) => s.naam || `Segment ${i + 1}`;
    const groep = $("loc-groep"), ks = $("loc-kleurseg");
    groep.innerHTML = `<option value="-1">Eén locatie per sticker</option>` +
      l.segmenten.map((s, i) => `<option value="${i}">Alle ${esc(naam(s, i).toLowerCase())}-waarden samen</option>`).join("");
    groep.value = String(l.groep);
    ks.innerHTML = `<option value="-1">Eén kleur voor alles</option>` +
      l.segmenten.map((s, i) => `<option value="${i}">${esc(naam(s, i))}</option>`).join("");
    ks.value = String(l.kleurSeg);

    // Per waarde: kleur, pijlrichting en aantal pijlen
    const PIJL = [["geen", "geen"], ["omhoog", "↑"], ["omlaag", "↓"], ["links", "←"], ["rechts", "→"]];
    const rij = (v, label, kleur, p) => `<div class="kleurrij">
        <input type="color" data-kleur="${esc(v)}" value="${kleur}" aria-label="Kleur ${esc(label)}">
        <span class="waarde">${esc(label)}</span>
        <select data-pijl-r="${esc(v)}" aria-label="Pijl ${esc(label)}">${PIJL.map(([k, t]) => `<option value="${k}" ${p.r === k ? "selected" : ""}>${t}</option>`).join("")}</select>
        <select data-pijl-n="${esc(v)}" aria-label="Aantal pijlen ${esc(label)}" ${p.r === "geen" ? "disabled" : ""}>${[1, 2, 3].map((n) => `<option value="${n}" ${p.n === n ? "selected" : ""}>× ${n}</option>`).join("")}</select>
      </div>`;
    let kleurHtml = "";
    if (l.kleurSeg < 0) {
      kleurHtml = rij("*", "alle locaties", l.kleur, l.pijl);
    } else {
      try {
        const vals = [...new Set(L.segmentWaarden(l.segmenten[l.kleurSeg]))].sort();
        const std = L.standaardKleuren(vals), stdPijl = L.standaardPijlen(vals);
        kleurHtml = `<div class="kleurkop"><span></span><span>${esc(naam(l.segmenten[l.kleurSeg], l.kleurSeg))}</span><span>Pijl</span><span>Aantal</span></div>`
          + vals.slice(0, 40).map((v) => rij(v, v, l.kleuren[v] || std[v], l.pijlen[v] || stdPijl[v])).join("")
          + (vals.length > 40 ? `<span class="hint">… en ${vals.length - 40} meer (kleuren herhalen)</span>` : "")
          + (Object.keys(l.kleuren).length || Object.keys(l.pijlen).length ? `<button type="button" id="loc-kleur-reset">Standaardkleuren en -pijlen</button>` : "");
      } catch { kleurHtml = ""; }
    }
    $("loc-kleuren").innerHTML = kleurHtml;

    let samen = "";
    try {
      const items = L.waarden({ ...cfg, modus: "locaties", kopieen: 1 });
      const per = items[0].locaties.length;
      samen = `${items.length} sticker${items.length === 1 ? "" : "s"} met ${per} locatie${per === 1 ? "" : "s"} per sticker (${items.length * per} locaties). ` +
        `Eerste: ${items[0].locaties.map((x) => x.code).join(" + ")}. Barcode: ${items[0].locaties[0].bc}.`;
    } catch (e) { samen = e.message; }
    $("loc-samenvatting").textContent = samen;
    $("loc-ontwerp").hidden = cfg.elementen.some((e) => e.type === "locaties");
  }

  locPaneel.addEventListener("input", (e) => {
    const t = e.target, l = cfg.locatie;
    if (t.dataset.seg != null) {
      l.segmenten[+t.dataset.seg][t.dataset.veld] = t.dataset.veld === "naam" ? t.value : t.value.toUpperCase();
      gewijzigd(); locAfgeleid(); planTeken();
    } else if (t.dataset.kleur != null) {
      if (t.dataset.kleur === "*") l.kleur = t.value; else l.kleuren[t.dataset.kleur] = t.value;
      gewijzigd(); planTeken();
    }
  });
  locPaneel.addEventListener("change", (e) => {
    const t = e.target, l = cfg.locatie;
    if (t.id === "loc-groep") l.groep = +t.value;
    else if (t.id === "loc-kleurseg") l.kleurSeg = +t.value;
    else if (t.id === "loc-sch") l.scheiding = t.value;
    else if (t.id === "loc-bcsch") l.bcScheiding = t.value;
    else if (t.dataset.kleur != null) { clearTimeout(vastTimer); vastleggen(); locAfgeleid(); return; }
    else if (t.dataset.pijlR != null || t.dataset.pijlN != null) {
      const v = t.dataset.pijlR ?? t.dataset.pijlN;
      const rijEl = t.closest(".kleurrij");
      const p = { r: rijEl.querySelector("[data-pijl-r]").value, n: +rijEl.querySelector("[data-pijl-n]").value || 1 };
      if (v === "*") l.pijl = p; else l.pijlen[v] = p;
      gewijzigd(true); locAfgeleid(); teken(); return;
    }
    else return;
    index = 0;
    gewijzigd(true); locAfgeleid(); teken();
  });
  locPaneel.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const l = cfg.locatie;
    if (t.id === "seg-plus") {
      l.segmenten.push({ naam: `Segment ${l.segmenten.length + 1}`, van: "01", tot: "01" });
    } else if (t.dataset.segWeg != null) {
      const i = +t.dataset.segWeg;
      l.segmenten.splice(i, 1);
      const schuif = (v) => (v === i ? -1 : v > i ? v - 1 : v);
      l.groep = schuif(l.groep); l.kleurSeg = schuif(l.kleurSeg);
    } else if (t.id === "loc-kleur-reset") {
      l.kleuren = {}; l.pijlen = {};
    } else if (t.id === "loc-ontwerp") {
      const s = L.STARTERS.magazijn;
      if (cfg.elementen.length && !confirm("Een locatie-ontwerp toevoegen? Het huidige ontwerp wordt vervangen (ongedaan maken kan met ↶).")) return;
      cfg.breedte = s.breedte; cfg.hoogte = s.hoogte;
      cfg.elementen = s.elementen.map((x) => L.element({ ...x }));
      geselecteerd = null;
      gewijzigd(true); alles(); return;
    } else return;
    index = 0;
    gewijzigd(true); bouwLocaties(); teken();
  });
  instellingen.addEventListener("change", (e) => {
    const k = e.target.dataset.k;
    if (k !== "breedte" && k !== "hoogte") return;
    const v = parseFloat(e.target.value);
    if (!(v >= 10)) { zetFormulier(); return; }
    schaal(k === "breedte" ? v : +cfg.breedte, k === "hoogte" ? v : +cfg.hoogte);
  });

  const formaat = $("formaat");
  for (const [k, f] of Object.entries(L.FORMATEN)) formaat.add(new Option(f.naam, k));
  formaat.add(new Option("Eigen formaat", ""));
  formaat.addEventListener("change", () => { const f = L.FORMATEN[formaat.value]; if (f) schaal(f.b, f.h); });
  $("draai").addEventListener("click", () => schaal(+cfg.hoogte, +cfg.breedte));

  $("raster").addEventListener("change", (e) => { raster = Number(e.target.value); opslag.schrijf("stickers.raster", raster); });
  $("kaders").addEventListener("change", (e) => { toonVakken = e.target.checked; opslag.schrijf("stickers.vakken", toonVakken); teken(); });
  $("vorige").addEventListener("click", () => { index--; teken(); });
  $("volgende").addEventListener("click", () => { index++; teken(); });

  // ---------- Sjablonen ----------
  function laadOntwerp(nieuw) {
    cfg = L.normaliseer(nieuw);
    index = 0; geselecteerd = null;
    gewijzigd(true); alles();
  }

  const starters = $("starters");
  for (const [groep, titel] of [["algemeen", "Algemeen"], ["magazijn", "Magazijnlocaties"]]) {
    const kop = document.createElement("span");
    kop.className = "starterkop"; kop.textContent = titel;
    starters.append(kop);
    for (const [k, s] of Object.entries(L.STARTERS)) {
      if ((s.groep || "algemeen") !== groep) continue;
      const b = document.createElement("button");
      b.type = "button"; b.textContent = s.naam; b.dataset.starter = k;
      starters.append(b);
    }
  }
  starters.addEventListener("click", (e) => {
    const s = L.STARTERS[e.target.dataset.starter];
    if (!s) return;
    if (cfg.elementen.length && !confirm(`Huidig ontwerp vervangen door “${s.naam}”?\n(Ongedaan maken kan met ↶.)`)) return;
    const nieuw = { ...cfg, breedte: s.breedte, hoogte: s.hoogte, elementen: s.elementen.map((x) => ({ ...x })) };
    if (s.modus) nieuw.modus = s.modus;
    if (s.locatie) nieuw.locatie = { ...cfg.locatie, ...JSON.parse(JSON.stringify(s.locatie)) };
    laadOntwerp(nieuw);
  });

  const sjSelect = $("sjabloon");
  const sjablonen = () => opslag.lees("stickers.sjablonen", {});
  function vulSjablonen(kies) {
    sjSelect.length = 1;
    Object.keys(sjablonen()).sort((a, b) => a.localeCompare(b)).forEach((n) => sjSelect.add(new Option(n, n)));
    if (kies) sjSelect.value = kies;
  }
  $("sj-opslaan").addEventListener("click", () => {
    const naam = prompt("Naam voor dit sjabloon:", sjSelect.value || "");
    if (!naam) return;
    const alle = sjablonen();
    alle[naam] = cfg;
    if (!opslag.schrijf("stickers.sjablonen", alle)) { losseMelding = "Sjabloon kon niet worden bewaard (te groot?). Gebruik Exporteren."; teken(); return; }
    vulSjablonen(naam);
  });
  $("sj-laad").addEventListener("click", () => { const s = sjablonen()[sjSelect.value]; if (s) laadOntwerp(s); });
  $("sj-weg").addEventListener("click", () => {
    if (!sjSelect.value || !confirm(`Sjabloon “${sjSelect.value}” verwijderen?`)) return;
    const alle = sjablonen(); delete alle[sjSelect.value];
    opslag.schrijf("stickers.sjablonen", alle); vulSjablonen();
  });
  $("sj-export").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ huidig: cfg, sjablonen: sjablonen() }, null, 2)], { type: "application/json" }));
    a.download = "sticker-sjablonen.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("sj-import").addEventListener("click", () => $("sj-bestand").click());
  $("sj-bestand").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      opslag.schrijf("stickers.sjablonen", Object.assign(sjablonen(), data.sjablonen || {}));
      vulSjablonen();
      if (data.huidig) laadOntwerp(data.huidig);
    } catch { losseMelding = "Dit bestand kon niet worden gelezen."; teken(); }
  });

  // ---------- PDF ----------
  function maak(actie) {
    const knop = $(actie);
    const oud = knop.textContent;
    knop.disabled = true; knop.textContent = "Bezig…";
    setTimeout(() => {
      try {
        const { doc } = L.maakPdf(cfg, libs);
        if (actie === "download") doc.save(`stickers_${new Date().toISOString().slice(0, 10)}.pdf`);
        else window.open(doc.output("bloburl"), "_blank");
      } catch (err) { losseMelding = err.message; teken(); }
      finally { knop.disabled = false; knop.textContent = oud; }
    }, 20);
  }
  $("download").addEventListener("click", () => maak("download"));
  $("print").addEventListener("click", () => maak("print"));

  // ---------- Start ----------
  function alles() { zetFormulier(); bouwLocaties(); bouwLijst(); bouwEigenschappen(); teken(); }
  vulSjablonen();
  alles();
  vastleggen();
  opslaan();
})();
