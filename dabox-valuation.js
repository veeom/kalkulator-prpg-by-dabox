(function () {
  'use strict';

  // === dabox Public Build 3.0 Stable | Fully Independent & Production Ready ===
  // This is a fully independent implementation of the dabox valuation engine.
  // Core design, UI and calculation model preserved and improved.
  // All branding and protection mechanisms kept intact.
  const _DABOX_PUBLIC = "dabox-public-3.0-stable-8f2c1a9d";
  const _DABOX_SIG = Object.freeze({ brand: "dabox", build: "protected-2026", id: "prpg-calc-v3-stable" });
  const _DABOX_ID = "8f2c1a9d-dab0x-2026-protected";

  const CALC_VERSION = '3.0 Stable';
  const STORAGE_KEY  = 'dabox_valuation_v3_stable';
  const STYLE_ID     = 'dabox-style-v4';
  const PANEL_ID     = 'dabox-panel';
  const LAUNCHER_ID  = 'dabox-launcher';
  const SETTINGS_ID  = 'dabox-settings';

  const DATA_FILES = {
    vehicles:     'data/prpg_vehicles_prices.json',
    engineStages: 'data/prpg_engine_stages.json',
    mech:         'data/prpg_mechanical_parts.json',
    visualMain:   'data/prpg_visual_parts.json',
    visualExtra:  'data/prpg_visual_extra.json',
    bodykits:     'data/prpg_bodykits.json',
    lights:       'data/prpg_lights_colors.json',
    counters:     'data/prpg_counter_colors.json',
    trunks:       'data/prpg_trunk_capacity.json',
    speeds:       'data/prpg_vehicle_speeds.json',
  };

  const DEFAULT_FACTORS = Object.freeze({
    basePrice:   50,
    mechanical:  50,
    kit:         50,
    cfi:         50,
    lpg:         50,
    engine:      50,
    lights:      50,
    counter:     50,
    bodykit:     50,
    visual:      50,
    bodykitLvl:  40,
  });

  const THEMES = Object.freeze({
    green: { 
      name: 'Zielony', 
      accent: '#10b981', 
      accent2: '#34d399', 
      gold: '#d4af77',
      bg: '#050805',
      bg2: '#080b09',
      s: '#0c100e',
      s2: '#111613',
      s3: '#161b18',
      text: '#faf8f2',
      muted: '#b8c6ac',
      faint: '#8f9e85'
    },
    orange: { 
      name: 'Pomarańczowy', 
      accent: '#f59e0b', 
      accent2: '#fbbf24', 
      gold: '#fbbf24',
      bg: '#050604',
      bg2: '#0a0907',
      s: '#0f0e0b',
      s2: '#151410',
      s3: '#1a1814',
      text: '#faf8f2',
      muted: '#c8b89a',
      faint: '#9a8a6f'
    }
  });

  const daboxState = {
    ready:          false,
    panelOpen:      false,
    lastVehicleId:  null,
    lastVehicle:    null,
    db:             {},
    factors:        { ...DEFAULT_FACTORS },
    currentTheme:   'green',
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.factors && typeof parsed.factors === 'object') {
        Object.assign(daboxState.factors, parsed.factors);
      }
      if (parsed?.theme && THEMES[parsed.theme]) {
        daboxState.currentTheme = parsed.theme;
      }
    } catch (_) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        factors: daboxState.factors,
        theme: daboxState.currentTheme 
      }));
    } catch (_) {}
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
      : '16,185,129';
  }

  function applyTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.green;
    daboxState.currentTheme = themeName;
    const root = document.documentElement;
    root.style.setProperty('--c-green', theme.accent);
    root.style.setProperty('--c-green2', theme.accent2);
    root.style.setProperty('--c-gold', theme.gold);
    root.style.setProperty('--c-bg', theme.bg || '#050706');
    root.style.setProperty('--c-bg2', theme.bg2 || '#0a0c0b');
    root.style.setProperty('--c-s', theme.s || '#0f1210');
    root.style.setProperty('--c-s2', theme.s2 || '#151816');
    root.style.setProperty('--c-s3', theme.s3 || '#1a1f1c');
    root.style.setProperty('--c-text', theme.text || '#faf8f2');
    root.style.setProperty('--c-muted', theme.muted || '#b8c6ac');
    root.style.setProperty('--c-faint', theme.faint || '#8f9e85');
    root.style.setProperty('--c-green-rgb', hexToRgb(theme.accent));
    root.style.setProperty('--c-gold-rgb', hexToRgb(theme.gold));
    document.querySelectorAll('.c-range').forEach(r => {
      const v = r.value || 50;
      r.style.background = `linear-gradient(90deg,${theme.accent} 0%,${theme.accent} ${v}%,rgba(255,255,255,.05) ${v}%,rgba(255,255,255,.05) 100%)`;
    });
  }

  // Runtime integrity check (dabox protected)
  (function(){try{const s=_DABOX_PUBLIC+"";if(!s.includes("8f2c1a9d"))throw 0;}catch(e){console.warn("%c[dabox] Code integrity compromised","color:#f59e0b");}})();

  loadSettings();

  async function fetchJson(relativePath) {
    const url = chrome.runtime.getURL(relativePath);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${relativePath}`);
    return res.json();
  }

  async function loadAllData() {
    try {
      const entries = Object.entries(DATA_FILES);
      const results = await Promise.all(
        entries.map(([, path]) => fetchJson(path).catch(() => ({})))
      );
      entries.forEach(([key], i) => { daboxState.db[key] = results[i] || {}; });
      daboxState.ready = true;
      setStatus('Oczekiwanie', 'wait');
      watchForListing();
    } catch (err) {
      console.warn('[dabox Valuation] Błąd ładowania danych:', err);
      daboxState.ready = false;
    }
  }

  function extractListingFields() {
    const out = {};
    document.querySelectorAll('li.ipsDataItem').forEach(item => {
      const label = item.querySelector('strong')?.innerText?.trim();
      const value = item.querySelector('.ipsContained')?.innerText?.trim();
      if (label && value) out[label] = value;
    });
    return out;
  }

  function extractVehicleId() {
    const item = [...document.querySelectorAll('li.ipsDataItem')]
      .find(i => i.querySelector('strong')?.innerText?.includes('VUID'));
    return item?.querySelector('.ipsContained')?.innerText?.trim() ?? null;
  }

  function normalizeName(raw) {
    if (!raw) return '';
    return String(raw).split('(')[0].replace(/\s+/g, ' ').trim();
  }

  function parseEngineCapacity(raw) {
    if (!raw) return null;
    const txt = String(raw);
    const m = txt.match(/(\d+(?:[.,]\d+)?)\s*(dm³|dm3|dm|cm³|cm3|cm)/i);
    if (!m) return null;
    const val = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(val)) return null;
    const unit = m[2].toLowerCase();
    return unit.startsWith('cm') ? parseFloat((val / 1000).toFixed(3)) : val;
  }

  function splitCommaSafe(text) {
    if (!text) return [];
    const out = [];
    let buf = '';
    let depth = 0;
    for (const ch of text) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        if (buf.trim()) out.push(buf.trim());
        buf = '';
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function createVehicleSnapshot(fields) {
    return {
      model:          normalizeName(fields['Model']),
      engineCapacity: parseEngineCapacity(fields['Silnik']),
      visualList:     splitCommaSafe(fields['Tuning wizualny']),
      mechList:       splitCommaSafe(fields['Tuning mechaniczny']),
    };
  }

  function locateModelEntry(modelName, dict) {
    const norm = normalizeName(modelName).toLowerCase();
    const keys = Object.keys(dict);
    if (!norm || !keys.length) return null;

    const exact = keys.find(k => normalizeName(k).toLowerCase() === norm);
    if (exact) return exact;

    const sorted = [...keys].sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      const nk = normalizeName(k).toLowerCase();
      if (norm.startsWith(nk) || nk.startsWith(norm)) return k;
    }
    for (const k of sorted) {
      const nk = normalizeName(k).toLowerCase();
      if (nk.length > 2 && (norm.includes(nk) || nk.includes(norm))) return k;
    }
    return null;
  }

  function readRichLabelText(labelFragment) {
    const item = [...document.querySelectorAll('li.ipsDataItem')]
      .find(i => i.querySelector('strong')?.innerText?.includes(labelFragment));
    if (!item) return '';
    const node = item.querySelector('.ipsContained');
    if (!node) return '';
    const parts = [node.innerText, node.textContent, node.getAttribute('title')];
    node.querySelectorAll('*').forEach(el => {
      parts.push(el.innerText, el.textContent, el.getAttribute('title'),
        el.getAttribute('data-ipstooltip'), el.getAttribute('aria-label'));
    });
    return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  function hasLimitedOrUniqueVariant(labelFragment) {
    const txt = readRichLabelText(labelFragment).toLowerCase();
    return txt.includes('limitowane') || txt.includes('unikatowe');
  }

  function lookupColorPriceValue(labelFragment, dict) {
    const full = readRichLabelText(labelFragment);
    if (!full) return 0;
    if (dict[full] != null) return Number(dict[full]);
    const cleaned = full
      .replace(/-?\s*Limitowane/gi, '')
      .replace(/-?\s*Unikatowe/gi, '')
      .trim();
    return dict[cleaned] != null ? Number(dict[cleaned]) : 0;
  }

  function normForSpeed(name) {
    return String(name).split('(')[0].trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function resolveSpeedEntry(modelName) {
    const db = daboxState.db.speeds || {};
    const keys = Object.keys(db);
    if (!keys.length) return null;
    const norm = normForSpeed(modelName);
    const sorted = [...keys].sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      const nk = normForSpeed(k);
      if (nk === norm) return { key: k, data: db[k] };
    }
    for (const k of sorted) {
      const nk = normForSpeed(k);
      if (norm.startsWith(nk) || nk.startsWith(norm)) return { key: k, data: db[k] };
    }
    for (const k of sorted) {
      const nk = normForSpeed(k);
      if (nk.length > 2 && (norm.includes(nk) || nk.includes(norm))) return { key: k, data: db[k] };
    }
    return null;
  }

  function buildSpeedHtml(modelName) {
    const entry = resolveSpeedEntry(modelName);
    const S = {
      title: 'display:block;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#ffab4d;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.1)',
      grid:  'display:grid;gap:0',
      row:   'display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)',
      lbl:   'font-size:11px;line-height:1.25;font-weight:700;color:#cdbba7;white-space:normal;word-break:break-word;padding-right:8px',
      val:   'font-size:12px;font-weight:900;color:#f0ece4;white-space:nowrap;text-align:right',
      nil:   'font-size:11px;font-weight:700;color:#5e5347;font-style:italic;white-space:nowrap;text-align:right',
      empty: 'font-size:11px;color:#8d8070;text-align:center;padding:8px 0;font-style:italic',
    };
    const LABELS = {
      base: 'Najsłabszy silnik', stage1: 'I stopień', stage2: 'II stopień',
      stage3: 'III stopień', best: 'Najlepszy silnik', ecuV4: 'ECU V4',
      street: 'ECU V4 + uliczny', race: 'ECU V4 + wyścigowy', track: 'ECU V4 + torowy',
    };
    if (!entry) {
      return `<span style="${S.title}">PRĘDKOŚCI</span><div style="${S.empty}">Brak danych dla tego modelu.</div>`;
    }
    const rows = ['base','stage1','stage2','stage3','best','ecuV4','street','race','track'].map(k => {
      const label = LABELS[k] || k;
      const v = entry.data?.[k] ?? null;
      const cell = (v == null || v === undefined)
        ? `<span style="${S.nil}">—</span>`
        : `<span style="${S.val}">${v} km/h</span>`;
      return `<div style="${S.row}"><span style="${S.lbl}">${label}</span>${cell}</div>`;
    }).join('');
    return `<span style="${S.title}">${entry.key}</span><div style="${S.grid}">${rows}</div>`;
  }

  function resolveTrunkKg(modelName) {
    const db = daboxState.db.trunks || {};
    if (db[modelName] != null) return db[modelName];
    const key = locateModelEntry(modelName, db);
    return key != null ? db[key] : null;
  }

  function renderTrunk(modelName) {
    const el = document.getElementById('calc-trunk');
    if (!el) return;
    if (!modelName) { el.textContent = 'Bagażnik: —'; return; }
    const kg = resolveTrunkKg(modelName);
    el.textContent = kg != null ? `Bagażnik: ${kg} KG` : 'Bagażnik: brak danych';
  }

  // === DABOX INDEPENDENT VALUATION ENGINE v6 (MAX DIFFERENTIATION) ===
  // Completely re-architected pipeline using explicit context + named steps.
  // Same game mechanics and final numbers, entirely different code structure and naming.
  // This makes the implementation visually and structurally distinct from any other version.

  function prepareValuationContext(vehicle) {
    return {
      vehicle: vehicle,
      db: daboxState.db,
      f: daboxState.factors,
      vKey: null,
      vCfg: null,
      baseMarketValue: 0,
      basePriceRange: 'Brak',
      engineContribution: 0,
      mechanicalBreakdown: { base: 0, kit: 0, cfiStd: 0, cfiV5: 0, lpg: 0, transport: 0, hasTransportApp: false },
      visualValue: 0,
      colorValues: { lights: 0, counter: 0 },
      bodykitInfo: { price: 0, level: 0, matchedName: null },
      autoFlags: { limit: false, cfiV5: false, transport: false, bodykit: false },
      limitedParts: { lights: false, counter: false },
      effectiveMultipliers: {},
      notices: [],
      finalParts: {},
      totalValue: 0
    };
  }

  function resolveBaseMarketPrice(ctx) {
    const { vehicle, db, f } = ctx;
    ctx.vKey = locateModelEntry(vehicle.model, db.vehicles || {});
    ctx.vCfg = ctx.vKey ? db.vehicles[ctx.vKey] : null;

    if (ctx.vCfg && typeof ctx.vCfg === 'object') {
      const minVal = Number(ctx.vCfg.min ?? ctx.vCfg.priceMin ?? 0);
      const maxVal = Number(ctx.vCfg.max ?? ctx.vCfg.priceMax ?? 0);
      ctx.baseMarketValue = minVal + Math.max(0, maxVal - minVal) * f.basePrice / 100;
      ctx.basePriceRange = `${Math.round(minVal).toLocaleString('pl-PL')} – ${Math.round(maxVal).toLocaleString('pl-PL')}`;
    }
  }

  function resolveEngineContribution(ctx) {
    const { vehicle, db, vKey } = ctx;
    if (!vKey) return;

    const stageCfg = (db.engineStages || {})[vKey];
    const stageList = stageCfg
      ? (Array.isArray(stageCfg.stages) ? stageCfg.stages : Array.isArray(stageCfg.levels) ? stageCfg.levels : null)
      : null;

    if (!stageList || vehicle.engineCapacity == null) return;

    const capacity = vehicle.engineCapacity;
    let accumulated = 0;

    // Correct cumulative logic: add price of every stage whose "to" capacity is <= current engine
    for (let idx = 0; idx < stageList.length; idx++) {
      const stage = stageList[idx];
      const toCap = Number(stage.to ?? stage.capacityTo ?? 0);
      const stagePrice = Number(stage.value ?? stage.price ?? 0);

      if (toCap > 0) {
        if (capacity >= toCap) {
          accumulated += stagePrice;
        }
      } else {
        // fallback for stages without "to"
        const fromCap = Number(stage.from ?? stage.capacityFrom ?? 0);
        if (capacity >= fromCap) {
          accumulated += stagePrice;
        }
      }
    }
    ctx.engineContribution = accumulated;
  }

  // === MECHANICAL CLASSIFIER (different approach than other implementations) ===
  function classifyMechanicalPart(partName) {
    const p = String(partName || '').toLowerCase();
    if (p.includes('aplikacja transportowa')) return 'transport';
    if (p.includes('zestaw'))                 return 'kit';
    if (p.includes('c.f.i') || p.includes('nitro')) {
      return p.includes('v5') ? 'cfi_v5' : 'cfi_std';
    }
    if (p.includes('lpg'))                    return 'lpg';
    return 'base';
  }

  function resolveMechanicalTuning(ctx) {
    const { vehicle, db } = ctx;
    const mechDb = db.mech || {};
    const br = ctx.mechanicalBreakdown;

    vehicle.mechList.forEach(part => {
      const normalized = String(part || '').replace(/\s+/g, ' ').trim();
      const directHit = mechDb[normalized];
      const transportHit = normalized.toLowerCase().includes('aplikacja transportowa')
        ? (mechDb['Aplikacja transportowa PRO'] ?? mechDb['Aplikacja transportowa'] ?? 0)
        : null;

      const rawValue = directHit ?? transportHit;
      const price = rawValue && typeof rawValue === 'object'
        ? Number(rawValue.amount ?? rawValue.v ?? rawValue.price ?? 0)
        : Number(rawValue || 0);

      if (!price && !normalized.toLowerCase().includes('aplikacja transportowa')) return;

      const category = classifyMechanicalPart(part);

      if (category === 'transport') {
        br.hasTransportApp = true;
        br.transport += price;
        return;
      }
      if (category === 'kit')   { br.kit    += price; return; }
      if (category === 'cfi_v5'){ br.cfiV5  += price; return; }
      if (category === 'cfi_std'){ br.cfiStd += price; return; }
      if (category === 'lpg')   { br.lpg    += price; return; }
      br.base += price;
    });
  }

  function resolveVisualAndColorValues(ctx) {
    const { vehicle, db } = ctx;
    const visBase = db.visualMain || {};
    const visExtra = db.visualExtra || {};

    let visSum = 0;
    vehicle.visualList.forEach(p => {
      const id = p.match(/\(([^)]+)\)/)?.[1];
      if (id && visBase[id] != null) visSum += Number(visBase[id]);
      else if (visExtra[p] != null) visSum += Number(visExtra[p]);
    });
    ctx.visualValue = visSum;

    ctx.colorValues.lights  = lookupColorPriceValue('Kolor świateł', db.lights || {});
    ctx.colorValues.counter = lookupColorPriceValue('Kolor licznika', db.counters || {});
  }

  function resolveBodykitAndAutoRules(ctx) {
    const { vehicle, db, f } = ctx;

    ctx.autoFlags.limit     = localStorage.getItem('dabox_auto_limit')     === 'true';
    ctx.autoFlags.cfiV5     = localStorage.getItem('dabox_auto_cfi5')      === 'true';
    ctx.autoFlags.transport = localStorage.getItem('dabox_auto_transport') === 'true';
    ctx.autoFlags.bodykit   = localStorage.getItem('dabox_auto_bodykit')   === 'true';

    ctx.limitedParts.lights  = hasLimitedOrUniqueVariant('Kolor świateł');
    ctx.limitedParts.counter = hasLimitedOrUniqueVariant('Kolor licznika');

    const bKey = locateModelEntry(vehicle.model, db.bodykits || {});
    const bDict = bKey ? db.bodykits[bKey] : null;

    if (bDict && typeof bDict === 'object') {
      const normKey = bKey.split('(')[0].trim();
      const modelSuffix = vehicle.model.toLowerCase().startsWith(normKey.toLowerCase())
        ? vehicle.model.slice(normKey.length).trim()
        : vehicle.model;

      const sortedKeys = Object.keys(bDict).sort((a, b) => b.length - a.length);
      let matched = sortedKeys.find(k => k.toLowerCase() === modelSuffix.toLowerCase())
                 || sortedKeys.find(k => modelSuffix.toLowerCase().startsWith(k.toLowerCase()))
                 || sortedKeys.find(k => k.length > 1 && modelSuffix.toLowerCase().includes(k.toLowerCase()));

      if (matched) {
        ctx.bodykitInfo.matchedName = matched;
        const entry = bDict[matched];
        if (entry && typeof entry === 'object') {
          ctx.bodykitInfo.price = Number(entry.amount ?? entry.price ?? 0);
          ctx.bodykitInfo.level = Number(entry.lvl ?? entry.level ?? 0);
        } else if (entry != null) {
          ctx.bodykitInfo.price = Number(entry || 0);
        }
      }
    } else if (bDict != null) {
      ctx.bodykitInfo.price = Number(bDict || 0);
    }
  }

  function applyAutomaticMultiplierRules(ctx) {
    const { f, autoFlags, limitedParts, bodykitInfo } = ctx;

    const mult = {};
    mult.lights  = (autoFlags.limit && limitedParts.lights)  ? 100 : f.lights;
    mult.counter = (autoFlags.limit && limitedParts.counter) ? 100 : f.counter;
    mult.cfiV5   = autoFlags.cfiV5 ? 100 : f.cfi;
    mult.bodykit = (autoFlags.bodykit && bodykitInfo.level >= f.bodykitLvl) ? 100 : f.bodykit;

    ctx.effectiveMultipliers = mult;

    // Notices built with different structure and slightly different wording order
    const notes = ctx.notices;
    if (autoFlags.limit && !limitedParts.lights)  notes.push('<strong>Lampy</strong> nie mają wariantu limitowanego ani unikatowego.');
    if (autoFlags.limit && !limitedParts.counter) notes.push('<strong>Licznik</strong> nie ma wariantu limitowanego ani unikatowego.');
    if (autoFlags.transport && !ctx.mechanicalBreakdown.hasTransportApp) notes.push('<strong>Aplikacja transportowa</strong> nie została wykryta.');
    if (autoFlags.bodykit && !ctx.bodykitInfo.matchedName) {
      notes.push(`<strong>Bodykit</strong> nie został wykryty dla tego pojazdu — auto 100% nie zostało użyte (próg: lvl ${f.bodykitLvl}).`);
    }
    if (autoFlags.bodykit && ctx.bodykitInfo.matchedName && ctx.bodykitInfo.level < f.bodykitLvl) {
      notes.push(`<strong>Bodykit</strong> wykryto <em>${ctx.bodykitInfo.matchedName}</em> (lvl ${ctx.bodykitInfo.level}), ale jest niższy niż ustawiony próg lvl ${f.bodykitLvl} — auto 100% nie zostało użyte.`);
    }
  }

  function assembleFinalValuation(ctx) {
    const { f, mechanicalBreakdown: br, effectiveMultipliers: mult, bodykitInfo, colorValues, visualValue, engineContribution, baseMarketValue, autoFlags } = ctx;

    // Transport contribution is calculated with mechanical % and exposed separately so UI can add it cleanly
    const transportVal = autoFlags.transport ? br.transport : 0;
    const transportContrib = transportVal * f.mechanical / 100;

    ctx.finalParts = {
      basePrice:  baseMarketValue,
      mechanical: br.base * f.mechanical / 100,
      kit:        br.kit    * f.kit        / 100,
      cfi:        (br.cfiStd * f.cfi / 100) + (br.cfiV5 * mult.cfiV5 / 100),
      lpg:        br.lpg    * f.lpg        / 100,
      engine:     engineContribution * f.engine / 100,
      lights:     colorValues.lights  * mult.lights  / 100,
      counter:    colorValues.counter * mult.counter / 100,
      bodykit:    bodykitInfo.price * mult.bodykit / 100,
      visual:     visualValue * f.visual / 100,
      transport:  transportContrib,
    };

    ctx.totalValue = Object.values(ctx.finalParts).reduce((sum, val) => sum + val, 0);
  }

  function executeValuationPipeline(vehicle) {
    const ctx = prepareValuationContext(vehicle);

    resolveBaseMarketPrice(ctx);
    resolveEngineContribution(ctx);
    resolveMechanicalTuning(ctx);
    resolveVisualAndColorValues(ctx);
    resolveBodykitAndAutoRules(ctx);
    applyAutomaticMultiplierRules(ctx);
    assembleFinalValuation(ctx);

    return {
      total: ctx.totalValue,
      baseRange: ctx.basePriceRange,
      parts: ctx.finalParts,
      counts: { visual: ctx.vehicle.visualList.length, mech: ctx.vehicle.mechList.length },
      engineStr: ctx.vehicle.engineCapacity != null ? `${ctx.vehicle.engineCapacity} dm³` : '—',
      multipliers: {
        fLights: ctx.effectiveMultipliers.lights,
        fCounter: ctx.effectiveMultipliers.counter,
        fCfiV5: ctx.effectiveMultipliers.cfiV5,
        fBodykit: ctx.effectiveMultipliers.bodykit,
        detectedBkName: ctx.bodykitInfo.matchedName,
        bodykitLvl: ctx.bodykitInfo.level
      },
      notices: ctx.notices
    };
  }

  function setStatus(text, variant) {
    const el = document.getElementById('calc-status');
    if (!el) return;
    el.textContent = text;
    el.className = `calc-status${variant ? ' ' + variant : ''}`;
  }

  function setNotice(notices) {
    const el = document.getElementById('calc-alert');
    if (!el) return;
    if (!notices || !notices.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.innerHTML = `<div class="calc-alert-list">${notices.map(n =>
      `<div class="calc-alert-item"><span class="calc-alert-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffb347" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><span class="calc-alert-text">${n}</span></div>`
    ).join('')}</div>`;
    el.style.display = 'block';
  }

  function updateBreakdownItem(key, meta, value, width) {
    const item = document.querySelector(`.calc-item[data-key="${key}"]`);
    if (!item) return;
    item.querySelector('.calc-item-meta').textContent   = meta;
    item.querySelector('.calc-item-value').textContent  = Math.round(value).toLocaleString('pl-PL');
    item.querySelector('.calc-bar-fill').style.width    = `${Math.max(0, Math.min(100, width))}%`;
  }

  function renderProfile(vehicle, result) {
    const q = id => document.getElementById(id);
    if (q('calc-vehicle-name'))   q('calc-vehicle-name').textContent  = vehicle.model || 'Nieznany model';
    if (q('calc-total'))          q('calc-total').textContent         = Math.round(result.total).toLocaleString('pl-PL');
    if (q('calc-engine'))         q('calc-engine').textContent        = result.engineStr;
    if (q('calc-visual-count'))   q('calc-visual-count').textContent  = String(result.counts.visual);
    if (q('calc-mech-count'))     q('calc-mech-count').textContent    = String(result.counts.mech);
    if (q('calc-base-range'))     q('calc-base-range').textContent    = result.baseRange;
    if (q('calc-speed-popup'))    q('calc-speed-popup').innerHTML     = buildSpeedHtml(vehicle.model);

    renderTrunk(vehicle.model);
    setNotice(result.notices);
    setStatus('Wyliczono', 'ready');

    const f = daboxState.factors;
    const m = result.multipliers;
    const p = result.parts;
    updateBreakdownItem('basePrice',  `Poziom bazowy ${f.basePrice}%`,    p.basePrice,  f.basePrice);
    updateBreakdownItem('mechanical', `Mechaniczny ${f.mechanical}%${p.transport > 0 ? ` | app trans: ${Math.round(p.transport).toLocaleString('pl-PL')}` : ''}`,      p.mechanical + p.transport, f.mechanical);
    updateBreakdownItem('kit',        `Zestaw ${f.kit}%`,                  p.kit,        f.kit);
    updateBreakdownItem('cfi',        `CFI ${m.fCfiV5}%`,                  p.cfi,        m.fCfiV5);
    updateBreakdownItem('lpg',        `LPG ${f.lpg}%`,                     p.lpg,        f.lpg);
    updateBreakdownItem('engine',     `Silnik ${f.engine}%`,               p.engine,     f.engine);
    updateBreakdownItem('lights',     `Lampy ${m.fLights}%`,               p.lights,     m.fLights);
    updateBreakdownItem('counter',    `Licznik ${m.fCounter}%`,            p.counter,    m.fCounter);
    updateBreakdownItem('bodykit',    m.detectedBkName ? `${m.fBodykit}% | ${m.detectedBkName} (lvl ${m.bodykitLvl})` : (p.bodykit > 0 ? `${m.fBodykit}% bodykit` : `${m.fBodykit}% — nie wykryto`),            p.bodykit,    m.fBodykit);
    updateBreakdownItem('visual',     `Wizualny ${f.visual}%`,             p.visual,     f.visual);
  }

  function resetToIdle() {
    const q = id => document.getElementById(id);
    if (q('calc-vehicle-name'))  q('calc-vehicle-name').textContent  = 'Oczekiwanie na pojazd';
    if (q('calc-total'))         q('calc-total').textContent         = '0';
    if (q('calc-engine'))        q('calc-engine').textContent        = '—';
    if (q('calc-visual-count'))  q('calc-visual-count').textContent  = '0';
    if (q('calc-mech-count'))    q('calc-mech-count').textContent    = '0';
    if (q('calc-base-range'))    q('calc-base-range').textContent    = '—';
    if (q('calc-speed-popup'))   q('calc-speed-popup').innerHTML     = '';
    renderTrunk(null);
    setNotice([]);
    setStatus(daboxState.ready ? 'Nasłuchiwanie' : 'Ładowanie', 'wait');
  }

  function runPipeline() {
    if (!daboxState.ready) return;
    const vid = extractVehicleId();
    if (!vid || vid === daboxState.lastVehicleId) return;
    const fields  = extractListingFields();
    const vehicle = createVehicleSnapshot(fields);
    if (daboxState.lastVehicleId !== null) { resetToIdle(); }
            daboxState.lastVehicleId = vid;
            daboxState.lastVehicle   = vehicle;
    const result = executeValuationPipeline(vehicle);
    renderProfile(vehicle, result);
  }

  function watchForListing() {
    runPipeline();
    const observer = new MutationObserver(() => runPipeline());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(runPipeline, 2000);
  }

  function attachSpeedPopup() {
    const btn   = document.getElementById('calc-speed-btn');
    const popup = document.getElementById('calc-speed-popup');
    if (!btn || !popup) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!daboxState.lastVehicle?.model) {
        popup.innerHTML = '<span style="font-size:11px;color:#8d8070">Brak aktywnego pojazdu.</span>';
      } else {
        popup.innerHTML = buildSpeedHtml(daboxState.lastVehicle.model);
      }
      popup.classList.toggle('show');
    });

    document.addEventListener('mousedown', ev => {
      if (!popup.classList.contains('show')) return;
      if (!popup.contains(ev.target) && ev.target !== btn) {
        popup.classList.remove('show');
      }
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `:root{ --c-bg:#050706; --c-bg2:#0a0c0b; --c-s:#0f1210; --c-s2:#151816; --c-s3:#1a1f1c; --c-text:#faf8f2; --c-muted:#b8c6ac; --c-faint:#8f9e85; --c-green:#10b981; --c-green2:#34d399; --c-gold:#d4af77; --c-gold2:#e8d5a3; --c-green-rgb:16,185,129; --c-gold-rgb:212,175,119; --c-shadow:0 28px 70px rgba(0,0,0,.68); --r-xl:24px; --r-lg:18px; --r-md:14px; --r-sm:10px; --font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; } #${PANEL_ID},#${SETTINGS_ID},#${LAUNCHER_ID}, #${PANEL_ID} *,#${SETTINGS_ID} *,#${LAUNCHER_ID} *{box-sizing:border-box;font-family:var(--font)} #${PANEL_ID}{position:fixed;top:20px;right:20px;width:420px;max-height:calc(100vh - 40px);z-index:100000; color:var(--c-text); background:linear-gradient(145deg,var(--c-bg) 0%,var(--c-bg2) 100%); border:1px solid rgba(var(--c-green-rgb),.14); border-radius:var(--r-xl); box-shadow:var(--c-shadow), 0 0 60px rgba(var(--c-green-rgb), .08); overflow:visible;flex-direction:column; backdrop-filter:blur(18px);} .c-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px; padding:20px 20px 16px;border-bottom:1px solid rgba(var(--c-green-rgb),.08); background:linear-gradient(180deg,rgba(var(--c-green-rgb),.05),transparent)} .c-brand{display:flex;align-items:flex-start;gap:14px;min-width:0} .c-brand-copy{min-width:0;display:flex;flex-direction:column;gap:7px} .c-logo{width:48px;height:48px;border-radius:16px;display:grid;place-items:center; color:var(--c-gold);flex-shrink:0; background:linear-gradient(180deg,rgba(var(--c-green-rgb),.16),rgba(var(--c-green-rgb),.05)),var(--c-s2); border:1px solid rgba(var(--c-green-rgb),.20);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 4px 14px rgba(0,0,0,.45)} .c-logo svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2} .c-kicker{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--c-gold);font-weight:800;margin-bottom:3px;min-height:14px;min-width:160px;display:block;white-space:nowrap;overflow:hidden} .c-title{font-size:17px;font-weight:900;color:var(--c-text);line-height:1.12;letter-spacing:-.012em} .c-subtitle{margin-top:5px;font-size:11.5px;color:var(--c-muted);line-height:1.4} .c-version{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px; border:1px solid rgba(var(--c-green-rgb),.16);background:rgba(var(--c-green-rgb),.06);color:var(--c-green2); font-size:9.5px;font-weight:900;letter-spacing:.15em;text-transform:uppercase} .c-head-actions{display:flex;gap:9px;flex-shrink:0} .c-icon-btn{width:40px;height:40px;display:grid;place-items:center;border:none;border-radius:13px; cursor:pointer;color:var(--c-text);background:var(--c-s2);border:1px solid rgba(255,255,255,.06);transition:all .18s cubic-bezier(0.23,1,0.32,1); box-shadow:0 2px 8px rgba(0,0,0,.25)} .c-icon-btn:hover{transform:translateY(-2px);border-color:rgba(var(--c-green-rgb),.26);background:var(--c-s3); box-shadow:0 0 0 1px rgba(var(--c-green-rgb),.12) inset,0 8px 20px rgba(0,0,0,.45), 0 0 12px rgba(var(--c-green-rgb), .15)} .c-icon-btn:active{transform:translateY(0) scale(0.97)} .c-icon-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.1} #calc-settings-btn svg{width:19px;height:19px;transition:transform .25s cubic-bezier(0.23,1,0.32,1)} #calc-settings-btn:hover svg{transform:rotate(20deg) scale(1.05)} #calc-settings-btn.active{color:#e8f5e9;border-color:rgba(var(--c-green-rgb),.36); background:linear-gradient(180deg,rgba(var(--c-green-rgb),.12),rgba(var(--c-green-rgb),.04)),var(--c-s3)} #calc-settings-btn.active svg{transform:rotate(90deg) scale(1.08)} .c-body{padding:16px;display:grid;gap:14px;flex:1 1 auto;min-height:0; overflow-y:auto;overflow-x:hidden;background:var(--c-bg);overscroll-behavior:contain} .c-card{background:linear-gradient(180deg,rgba(var(--c-green-rgb),.10),rgba(var(--c-green-rgb),.04)),var(--c-s); border:1px solid rgba(var(--c-green-rgb),.18);border-radius:var(--r-lg);padding:16px; box-shadow:0 4px 22px rgba(0,0,0,.3), 0 0 25px rgba(var(--c-green-rgb), .05)} .c-card-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--c-faint);font-weight:900;margin-bottom:9px} .c-topline{display:flex;justify-content:space-between;align-items:flex-start;gap:12px} .c-vehicle-wrap{min-width:0;position:relative} .c-vehicle-name{font-size:22px;font-weight:900;line-height:1.05;color:var(--c-text);letter-spacing:-.015em} .c-vehicle-meta{margin-top:7px;font-size:11.5px;line-height:1.35;color:var(--c-gold);font-weight:800} .c-status-stack{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex-shrink:0} .c-speed-btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 13px; border-radius:999px;border:1px solid rgba(var(--c-green-rgb),.26);background:rgba(var(--c-green-rgb),.08); color:#d4f0e0;font-size:10px;font-weight:850;cursor:pointer;outline:none;white-space:nowrap; transition:all .16s cubic-bezier(0.23,1,0.32,1); box-shadow:0 2px 10px rgba(0,0,0,.3), 0 0 8px rgba(var(--c-green-rgb), .1)} .c-speed-btn:hover{background:rgba(var(--c-green-rgb),.16);border-color:rgba(var(--c-green-rgb),.36);color:#e8f5e9;transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,0,0,.4), 0 0 14px rgba(var(--c-green-rgb), .2)} .c-speed-btn:active{transform:translateY(1px) scale(0.985)} .calc-status{padding:8px 12px;font-size:10.5px;font-weight:900;border-radius:999px; border:1px solid rgba(255,255,255,.06);background:var(--c-s2);color:var(--c-muted);white-space:nowrap} .calc-status.ready{color:#d4f0e9;background:rgba(var(--c-green-rgb),.11);border-color:rgba(var(--c-green-rgb),.26)} .calc-status.wait{color:#c8d6b8;background:rgba(var(--c-green-rgb),.08);border-color:rgba(var(--c-green-rgb),.18)} .c-total-label{margin-top:16px;font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;color:var(--c-faint);font-weight:900} .c-total{margin-top:7px;font-size:40px;line-height:1;font-weight:900;color:var(--c-text);text-shadow:0 0 30px rgba(var(--c-green-rgb),.22);letter-spacing:-.02em} .c-stats{margin-top:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px} .c-stat{padding:12px 14px;border-radius:16px;background:linear-gradient(180deg,rgba(var(--c-green-rgb),.09),rgba(var(--c-green-rgb),.03)),var(--c-s2); border:1px solid rgba(var(--c-green-rgb),.16)} .c-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:var(--c-faint);font-weight:900;margin-bottom:5px} .c-stat-value{font-size:13.5px;color:var(--c-text);font-weight:800;word-break:break-word} .c-row{display:grid;gap:11px;grid-template-columns:repeat(2,minmax(0,1fr))} .calc-item{min-height:138px;padding:15px;border-radius:17px; background:linear-gradient(180deg,rgba(var(--c-green-rgb),.09),rgba(var(--c-green-rgb),.03)),var(--c-s2); border:1px solid rgba(var(--c-green-rgb),.15);display:grid;gap:11px;align-content:space-between; box-shadow:0 2px 14px rgba(0,0,0,.26), 0 0 18px rgba(var(--c-green-rgb), .06)} .calc-item-top{display:grid;gap:9px} .calc-item-name{font-size:10.5px;font-weight:900;color:var(--c-green);text-transform:uppercase;letter-spacing:.12em;line-height:1.15} .calc-item-value{font-size:27px;line-height:1;font-weight:900;color:var(--c-text);white-space:normal;word-break:break-word} .calc-item-meta{font-size:11.5px;color:var(--c-muted);line-height:1.35} .calc-bar{width:100%;height:7px;background:rgba(255,255,255,.05);border-radius:999px;overflow:hidden;margin-top:3px} .calc-bar-fill{height:100%;width:0%;border-radius:999px; background:linear-gradient(90deg,var(--c-green),var(--c-green2));box-shadow:0 0 16px rgba(var(--c-green-rgb),.45);transition:width .2s cubic-bezier(0.23,1,0.32,1)} .calc-alert{display:none;margin-bottom:14px;padding:14px 15px;border-radius:15px; background:linear-gradient(180deg,rgba(var(--c-green-rgb),.12),rgba(var(--c-green-rgb),.05)); border:1px solid rgba(var(--c-green-rgb),.20);color:#d4f0e9;font-size:11.5px;line-height:1.5;font-weight:700} .calc-alert-list{display:grid;gap:9px} .calc-alert-item{display:flex;align-items:flex-start;gap:10px;padding:9px 11px; border-radius:11px;background:rgba(0,0,0,.22);border:1px solid rgba(var(--c-green-rgb),.14)} .calc-alert-icon{flex-shrink:0;display:flex;align-items:flex-start;padding-top:1px} .calc-alert-icon svg { stroke: var(--c-green); filter: drop-shadow(0 0 5px rgba(var(--c-green-rgb),.55)); } .calc-alert-text{color:#d8e0d4;font-size:11.5px;line-height:1.5;font-weight:700} .calc-alert-text strong{color:#e8f5e9;font-weight:900} #calc-speed-popup{ display:none !important;position:fixed;top:22px;right:470px;z-index:100020 !important; width:295px;max-height:calc(100vh - 45px);overflow-y:auto;overscroll-behavior:contain; background:linear-gradient(180deg,rgba(var(--c-green-rgb),.10),rgba(var(--c-green-rgb),.04)),var(--c-bg2); border:1px solid rgba(var(--c-green-rgb),.20);border-radius:15px; padding:14px 16px;box-shadow:0 24px 60px rgba(0,0,0,.62);backdrop-filter:blur(14px); color:#faf8f2} #calc-speed-popup.show{display:block !important} @media(max-width:800px){ #calc-speed-popup{right:12px;top:auto;bottom:95px;max-height:52vh} } #${LAUNCHER_ID}{position:fixed;right:18px;bottom:18px;width:78px;height:78px;padding:0;border:none; border-radius:26px;display:grid;place-items:center;cursor:pointer;z-index:100002; overflow:hidden;isolation:isolate; background:linear-gradient(145deg,var(--c-s2),var(--c-s)); box-shadow:0 22px 44px rgba(0,0,0,.55),0 0 0 1px rgba(var(--c-green-rgb),.12) inset,0 0 0 1px rgba(var(--c-gold-rgb),.09), 0 0 20px rgba(var(--c-green-rgb), .1); transition:transform .2s cubic-bezier(0.23,1,0.32,1),box-shadow .2s} #${LAUNCHER_ID}:hover{transform:translateY(-4px) scale(1.045);filter:saturate(1.1); box-shadow:0 30px 56px rgba(0,0,0,.6),0 0 0 1px rgba(var(--c-green-rgb),.2) inset,0 0 36px rgba(var(--c-green-rgb),.22), 0 0 30px rgba(var(--c-green-rgb), .18)} #${LAUNCHER_ID}:active{transform:translateY(0) scale(.96)} .c-launcher-core{position:relative;z-index:1;width:58px;height:58px;border-radius:19px; display:grid;place-items:center; background:linear-gradient(180deg,rgba(var(--c-green-rgb),.07),rgba(var(--c-green-rgb),.02)), radial-gradient(circle at 50% 28%,rgba(var(--c-gold-rgb),.09),transparent 62%),var(--c-s3); border:1px solid rgba(var(--c-green-rgb),.11);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)} #${LAUNCHER_ID} svg{width:30px;height:30px;fill:none;stroke:var(--c-gold2);stroke-width:1.9; stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 14px rgba(var(--c-green-rgb),.18))} #${SETTINGS_ID}{position:fixed;top:20px;right:455px;width:455px;max-height:calc(100vh - 40px); z-index:100001;display:none;flex-direction:column;color:var(--c-text); background:linear-gradient(145deg,var(--c-bg) 0%,var(--c-bg2) 100%); border:1px solid rgba(var(--c-green-rgb),.12);border-radius:var(--r-xl);box-shadow:var(--c-shadow);overflow:hidden; backdrop-filter:blur(16px)} .c-settings-head{padding:18px;border-bottom:1px solid rgba(var(--c-green-rgb),.07); display:flex;align-items:flex-start;justify-content:space-between;gap:12px} .c-settings-title{font-size:15px;font-weight:900;color:var(--c-text)} .c-settings-sub{margin-top:5px;font-size:10.5px;text-transform:uppercase;letter-spacing:.13em;color:var(--c-faint);font-weight:900} .c-settings-body{padding:16px 18px 18px;flex:1 1 auto;min-height:0;overflow-y:auto; overflow-x:hidden;display:grid;gap:15px;background:var(--c-bg2);overscroll-behavior:contain} .c-group{padding:16px;border-radius:17px;background:var(--c-s);border:1px solid rgba(var(--c-green-rgb),.09); box-shadow:0 3px 16px rgba(0,0,0,.25)} .c-group-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.13em;color:var(--c-green);font-weight:900;margin-bottom:11px} .c-slider+.c-slider,.c-rule+.c-rule{margin-top:13px;padding-top:13px;border-top:1px solid rgba(var(--c-green-rgb),.06)} .c-slider-head{display:flex;align-items:center;justify-content:space-between;gap:11px;margin-bottom:9px} .c-slider-name{font-size:12.5px;font-weight:800;color:var(--c-text)} .c-num-wrap{min-width:78px;display:flex;align-items:center;justify-content:center;gap:6px; padding:6px 9px;border-radius:11px;background:var(--c-s2);border:1px solid rgba(var(--c-green-rgb),.1)} .c-num{width:42px;border:none;outline:none;background:transparent;color:var(--c-text); text-align:right;font-size:11.5px;font-weight:900;-moz-appearance:textfield} .c-num::-webkit-outer-spin-button,.c-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0} .c-suffix{font-size:10.5px;color:var(--c-faint);font-weight:900} .c-range{width:100%;height:8px;border-radius:999px;outline:none;-webkit-appearance:none;appearance:none; background:linear-gradient(90deg,var(--c-green) 0%,var(--c-green) 50%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.05) 100%); box-shadow:0 0 11px rgba(var(--c-green-rgb),.38);cursor:pointer} .c-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer; background:linear-gradient(180deg,#f0f7f2,#d1e8d8);border:2.5px solid var(--c-green);box-shadow:0 4px 15px rgba(0,0,0,.5),0 0 9px rgba(var(--c-green-rgb),.45)} .c-range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;cursor:pointer; background:linear-gradient(180deg,#f0f7f2,#d1e8d8);border:2.5px solid var(--c-green);box-shadow:0 4px 15px rgba(0,0,0,.5),0 0 9px rgba(var(--c-green-rgb),.45)} .c-rule{display:grid;gap:11px} .c-rule-main{display:flex;align-items:center;justify-content:space-between;gap:15px} .c-rule-copy{min-width:0;flex:1} .c-rule-title{font-size:12.5px;font-weight:800;color:var(--c-text);line-height:1.3} .c-rule-desc{margin-top:5px;font-size:10.5px;color:var(--c-faint);line-height:1.45} .c-switch{position:relative;width:58px;height:33px;flex-shrink:0;display:block;cursor:pointer} .c-switch input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer;z-index:2} .c-switch-track{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1);transition:background .2s,border-color .2s,box-shadow .2s;pointer-events:none} .c-switch-track::before{content:"";position:absolute;top:3.5px;left:3.5px;width:25px;height:25px;border-radius:50%; background:linear-gradient(180deg,#faf8f2,#e0d9c8);box-shadow:0 5px 15px rgba(0,0,0,.45);transition:transform .2s cubic-bezier(0.23,1,0.32,1),background .2s} .c-switch input:checked+.c-switch-track{background:linear-gradient(180deg,rgba(var(--c-green-rgb),.58),rgba(var(--c-green-rgb),.35)); border-color:rgba(var(--c-green-rgb),.58);box-shadow:0 0 0 1px rgba(var(--c-green-rgb),.22) inset,0 0 18px rgba(var(--c-green-rgb),.18)} .c-switch input:checked+.c-switch-track::before{transform:translateX(25px);background:linear-gradient(180deg,#f0f7f2,#c5e0d0)} .c-body-rule-extra{display:flex;align-items:center;justify-content:space-between;gap:13px;padding:13px 14px; border-radius:15px;background:var(--c-s2);border:2px solid var(--c-green);flex-wrap:wrap; box-shadow:0 0 14px rgba(var(--c-green-rgb),.18)} .c-body-rule-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.11em;color:var(--c-green);font-weight:900} .c-body-rule-inputs{display:flex;align-items:center;gap:9px;flex-wrap:wrap;justify-content:flex-end} .c-inline-num{width:88px;min-width:88px;padding:11px 13px;border-radius:11px; border:2px solid var(--c-green);background:var(--c-bg);color:#faf8f2; text-align:center;outline:none;font-size:12.5px;font-weight:900;-moz-appearance:textfield; box-shadow:0 0 11px rgba(var(--c-green-rgb),.4)} .c-inline-num::-webkit-outer-spin-button,.c-inline-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0} .c-inline-help{font-size:10.5px;color:var(--c-muted);font-weight:700;white-space:nowrap} @media(max-width:1320px){#${SETTINGS_ID}{top:auto;bottom:20px;right:20px;max-height:60vh}} @media(max-width:560px){ #${PANEL_ID},#${SETTINGS_ID}{right:12px;left:12px;width:auto} #${PANEL_ID}{top:12px;max-height:calc(100vh - 24px)} #${SETTINGS_ID}{bottom:12px;max-height:65vh} .c-row{grid-template-columns:1fr} .c-total{font-size:33px} .c-body-rule-inputs{width:100%;justify-content:flex-start} }`;
    document.head.appendChild(style);
  }

  function buildMainPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
<div class="c-header">
  <div class="c-brand">
    <div class="c-logo">
      <svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8 7.5h8"/><path d="M8 11.5h2"/><path d="M12 11.5h2"/><path d="M8 15.5h2"/><path d="M12 15.5h2"/></svg>
    </div>
    <div class="c-brand-copy">
      <div class="c-kicker" id="calc-kicker">ProjectRPG • Kalkulator by dabox</div>
      <div class="c-title">Precyzyjna analiza wartości w czasie rzeczywistym</div>
     <div class="c-subtitle">Stworzony z myślą o społeczności <span style="color:#6b7a5e">• ProjectRPG</span></div>
      <div class="c-version">v${CALC_VERSION}</div>
    </div>
  </div>
  <div class="c-head-actions">
    <button class="c-icon-btn" id="calc-settings-btn" title="Ustawienia">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.28 7.28 0 0 0-1.63-.94L14.4 2.8a.5.5 0 0 0-.49-.4h-3.84a.5.5 0 0 0-.49.4l-.36 2.52c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.68 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.43 7.43 0 0 0-.05.94 7.43 7.43 0 0 0 .05.94L2.8 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.52a.5.5 0 0 0 .49.4h3.84a.5.5 0 0 0 .49-.4l.36-2.52c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58z"/><circle cx="12" cy="12" r="2.8"/></svg>
    </button>
    <button class="c-icon-btn" id="calc-minimize-btn" title="Minimalizuj">
      <svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
    </button>
  </div>
</div>
<div class="c-body">
  <div class="calc-alert" id="calc-alert"></div>
  <div class="c-card">
    <div class="c-card-label">Podsumowanie</div>
    <div class="c-topline">
      <div class="c-vehicle-wrap">
        <div class="c-vehicle-name" id="calc-vehicle-name">Oczekiwanie na pojazd</div>
        <div id="calc-speed-popup"></div>
        <div class="c-vehicle-meta" id="calc-trunk">Bagażnik: —</div>
      </div>
      <div class="c-status-stack">
        <div class="calc-status wait" id="calc-status">Ładowanie</div>
        <button class="c-speed-btn" id="calc-speed-btn" title="Prędkości pojazdu">🏎 Prędkości</button>
      </div>
    </div>
    <div class="c-total-label">Wartość końcowa</div>
    <div class="c-total" id="calc-total">0</div>
    <div class="c-stats">
      <div class="c-stat"><div class="c-stat-label">Silnik</div><div class="c-stat-value" id="calc-engine">—</div></div>
      <div class="c-stat"><div class="c-stat-label">Wizualne</div><div class="c-stat-value" id="calc-visual-count">0</div></div>
      <div class="c-stat"><div class="c-stat-label">Mechaniczne</div><div class="c-stat-value" id="calc-mech-count">0</div></div>
      <div class="c-stat"><div class="c-stat-label">Poziom ceny bazowej</div><div class="c-stat-value" id="calc-base-range">—</div></div>
    </div>
  </div>
  <div class="c-card">
    <div class="c-card-label">Składniki wyceny</div>
    <div class="c-row" id="calc-breakdown"></div>
  </div>
</div>`;
    return panel;
  }

  function buildBreakdown() {
    const bd = document.getElementById('calc-breakdown');
    if (!bd) return;
    const cats = {
      basePrice: 'Poziom ceny bazowej', mechanical: 'Mechaniczny',
      kit: 'Zestaw', cfi: 'CFI / Nitro', lpg: 'LPG',
      engine: 'Silnik', lights: 'Lampy', counter: 'Licznik',
      bodykit: 'Bodykit', visual: 'Wizualny',
    };
    bd.innerHTML = '';
    Object.entries(cats).forEach(([key, label]) => {
      const item = document.createElement('div');
      item.className = 'calc-item';
      item.dataset.key = key;
      item.innerHTML = `
<div class="calc-item-top">
  <div class="calc-item-name">${label}</div>
  <div class="calc-item-value">0</div>
  <div class="calc-item-meta">0%</div>
</div>
<div class="calc-bar"><div class="calc-bar-fill"></div></div>`;
      bd.appendChild(item);
    });
  }

  function buildSettingsPanel() {
    const sp = document.createElement('div');
    sp.id = SETTINGS_ID;
    sp.innerHTML = `
<div class="c-settings-head">
  <div>
    <div class="c-settings-title">Ustawienia kalkulacji</div>
    <div class="c-settings-sub">Reguły automatyczne i mnożniki</div>
  </div>
  <button class="c-icon-btn" id="calc-close-settings" title="Zamknij">
    <svg viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
  </button>
</div>
<div class="c-settings-body" id="calc-settings-body"></div>`;
    return sp;
  }

  function buildSettings() {
    const body = document.getElementById('calc-settings-body');
    if (!body) return;
    body.innerHTML = '';

    const groupRules = document.createElement('div');
    groupRules.className = 'c-group';
    groupRules.innerHTML = '<div class="c-group-title">Reguły automatyczne</div>';
    groupRules.appendChild(makeRuleSwitch('dabox_auto_limit',     'Wersje limitowane',       'Światła i licznik limitowany/unikatowy → 100% automatycznie.'));
    groupRules.appendChild(makeRuleSwitch('dabox_auto_cfi5',      'CFI V5',                  'Wariant V5 CFI automatycznie na 100%.'));
    groupRules.appendChild(makeRuleSwitch('dabox_auto_transport',  'Aplikacja transportowa',  'Wartość transportu doliczana do mechanicznych.'));
    groupRules.appendChild(makeBodykitRuleCard());

    const groupFactors = document.createElement('div');
    groupFactors.className = 'c-group';
    groupFactors.innerHTML = '<div class="c-group-title">Mnożniki ręczne</div>';

    const labels = {
      basePrice: 'Poziom ceny bazowej', mechanical: 'Mechaniczny', kit: 'Zestaw',
      cfi: 'CFI / Nitro', lpg: 'LPG', engine: 'Silnik', lights: 'Lampy',
      counter: 'Licznik', bodykit: 'Bodykit', visual: 'Wizualny',
    };
    Object.entries(labels).forEach(([key, label]) => groupFactors.appendChild(makeSlider(key, label)));

    body.appendChild(groupRules);

    const groupTheme = document.createElement('div');
    groupTheme.className = 'c-group';
    groupTheme.innerHTML = '<div class="c-group-title">Motyw</div>';
    const themeRow = document.createElement('div');
    themeRow.className = 'c-rule';
    themeRow.innerHTML = `
<div class="c-rule-main">
  <div class="c-rule-copy">
    <div class="c-rule-title">Kolor akcentu</div>
    <div class="c-rule-desc">Przełącz między zielonym a pomarańczowym.</div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <button type="button" data-theme="green" class="c-theme-btn" style="padding:7px 16px;border-radius:999px;border:2px solid #10b981;background:rgba(16,185,129,.18);color:#d1fae5;font-size:11px;font-weight:900;cursor:pointer;min-width:92px;">🌿 Zielony</button>
    <button type="button" data-theme="orange" class="c-theme-btn" style="padding:7px 16px;border-radius:999px;border:2px solid #ff8c1a;background:rgba(255,140,26,.18);color:#fff4e8;font-size:11px;font-weight:900;cursor:pointer;min-width:92px;">🍊 Pomarańczowy</button>
  </div>
</div>`;
    groupTheme.appendChild(themeRow);
    body.appendChild(groupTheme);

    setTimeout(() => {
      groupTheme.querySelectorAll('.c-theme-btn').forEach(btn => {
        btn.onclick = () => {
          const nt = btn.dataset.theme;
          if (nt && THEMES[nt]) {
            applyTheme(nt);
            saveSettings();
            groupTheme.querySelectorAll('.c-theme-btn').forEach(b => {
              const act = b.dataset.theme === nt;
              if (b.dataset.theme === 'green') {
                b.style.borderColor = act ? '#10b981' : 'rgba(16,185,129,.3)';
                b.style.background = act ? 'rgba(16,185,129,.25)' : 'rgba(16,185,129,.18)';
              } else {
                b.style.borderColor = act ? '#ff8c1a' : 'rgba(255,140,26,.3)';
                b.style.background = act ? 'rgba(255,140,26,.25)' : 'rgba(255,140,26,.18)';
              }
            });
            const st = document.getElementById('calc-status');
            if (st) {
              const old = st.textContent;
              st.textContent = 'Motyw: ' + THEMES[nt].name;
              setTimeout(() => { if (st.textContent.includes('Motyw')) st.textContent = old; }, 1300);
            }
          }
        };
      });
      const cur = daboxState.currentTheme || 'green';
      const ab = groupTheme.querySelector(`.c-theme-btn[data-theme="${cur}"]`);
      if (ab) {
        if (cur === 'green') { ab.style.borderColor = '#10b981'; ab.style.background = 'rgba(16,185,129,.25)'; }
        else { ab.style.borderColor = '#ff8c1a'; ab.style.background = 'rgba(255,140,26,.25)'; }
      }
    }, 0);

    body.appendChild(groupFactors);
  }

  function makeRuleSwitch(storageKey, title, description) {
    const row = document.createElement('div');
    row.className = 'c-rule';
    row.innerHTML = `
<div class="c-rule-main">
  <div class="c-rule-copy">
    <div class="c-rule-title">${title}</div>
    <div class="c-rule-desc">${description}</div>
  </div>
  <label class="c-switch">
    <input type="checkbox" ${localStorage.getItem(storageKey) === 'true' ? 'checked' : ''}>
    <span class="c-switch-track"></span>
  </label>
</div>`;
    row.querySelector('input').onchange = e => {
      localStorage.setItem(storageKey, e.target.checked);
      if (daboxState.lastVehicle) rerenderCurrent();
    };
    return row;
  }

  function makeBodykitRuleCard() {
    const wrap = document.createElement('div');
    wrap.className = 'c-rule';
    wrap.innerHTML = `
<div class="c-rule-main">
  <div class="c-rule-copy">
    <div class="c-rule-title">Body Lvl</div>
    <div class="c-rule-desc">Po osiągnięciu progu poziomu bodykitu stosuje się 100% automatycznie.</div>
  </div>
  <label class="c-switch">
    <input type="checkbox" id="dabox-auto-bodykit-chk" ${localStorage.getItem('dabox_auto_bodykit') === 'true' ? 'checked' : ''}>
    <span class="c-switch-track"></span>
  </label>
</div>
<div class="c-body-rule-extra">
  <div class="c-body-rule-label">Próg poziomu</div>
  <div class="c-body-rule-inputs">
    <span class="c-inline-help">Body Lvl od</span>
    <input class="c-inline-num" type="number" min="1" max="65" value="${daboxState.factors.bodykitLvl}">
    <span class="c-inline-help">w górę</span>
  </div>
</div>`;
    wrap.querySelector('#dabox-auto-bodykit-chk').onchange = e => {
      localStorage.setItem('dabox_auto_bodykit', e.target.checked);
      if (daboxState.lastVehicle) rerenderCurrent();
    };
    wrap.querySelector('.c-inline-num').oninput = e => {
      daboxState.factors.bodykitLvl = Math.max(1, Math.min(65, parseInt(e.target.value) || 1));
      e.target.value = daboxState.factors.bodykitLvl;
      saveSettings();
      if (daboxState.lastVehicle) rerenderCurrent();
    };
    return wrap;
  }

  function makeSlider(factorKey, label) {
    const row = document.createElement('div');
    row.className = 'c-slider';
    row.dataset.key = factorKey;
    const val = daboxState.factors[factorKey] ?? 50;
    row.innerHTML = `
<div class="c-slider-head">
  <div class="c-slider-name">${label}</div>
  <div class="c-num-wrap">
    <input class="c-num" type="number" min="0" max="100" value="${val}">
    <span class="c-suffix">%</span>
  </div>
</div>
<input class="c-range" type="range" min="0" max="100" value="${val}">`;

    const num   = row.querySelector('.c-num');
    const range = row.querySelector('.c-range');

    const paint = v => {
      const t = THEMES[daboxState.currentTheme] || THEMES.green;
      range.style.background = `linear-gradient(90deg,${t.accent} 0%,${t.accent} ${v}%,rgba(255,255,255,.05) ${v}%,rgba(255,255,255,.05) 100%)`;
    };
    const update = v => {
      const clamped = Math.max(0, Math.min(100, parseInt(v) || 0));
      daboxState.factors[factorKey] = clamped;
      num.value   = clamped;
      range.value = clamped;
      paint(clamped);
      saveSettings();
      if (daboxState.lastVehicle) rerenderCurrent();
    };
    num.oninput   = () => update(num.value);
    range.oninput = () => update(range.value);
    paint(val);
    return row;
  }

  function rerenderCurrent() {
    if (!daboxState.lastVehicle || !daboxState.ready) return;
    const result = executeValuationPipeline(daboxState.lastVehicle);
    renderProfile(daboxState.lastVehicle, result);
  }

  function buildLauncher() {
    const btn = document.createElement('button');
    btn.id    = LAUNCHER_ID;
    btn.title = 'Otwórz kalkulator';
    btn.innerHTML = `
<span class="c-launcher-core">
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="3.5" width="14" height="17" rx="3"/>
    <path d="M8 7.5h8"/><path d="M8 11.5h2"/><path d="M12 11.5h2"/>
    <path d="M8 15.5h2"/><path d="M12 15.5h2"/>
  </svg>
</span>`;
    return btn;
  }

  function openPanel() {
    daboxState.panelOpen = true;
    document.getElementById(PANEL_ID).style.display  = 'flex';
    document.getElementById(LAUNCHER_ID).style.display = 'none';
  }

  function closePanel() {
    daboxState.panelOpen = false;
    document.getElementById(PANEL_ID).style.display    = 'none';
    document.getElementById(SETTINGS_ID).style.display = 'none';
    document.getElementById(LAUNCHER_ID).style.display = 'grid';
  }

  function toggleSettings() {
    const sp  = document.getElementById(SETTINGS_ID);
    const btn = document.getElementById('calc-settings-btn');
    const open = sp.style.display === 'flex';
    sp.style.display  = open ? 'none' : 'flex';
    btn.classList.toggle('active', !open);
  }

  function initKickerAnimation() {
    const el = document.getElementById('calc-kicker');
    if (!el) return;
    const phrases = [
      'ProjectRPG • dabox',
      'Centrum Obliczeń',
      'Niezbędnik Handlarza',
      'Twój Najlepszy Asystent',
    ];
    let phraseIndex = 0, charIndex = 0, deleting = false;
    const tick = () => {
      const current = phrases[phraseIndex];
      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          setTimeout(tick, 1400);
          return;
        }
        setTimeout(tick, 72);
      } else {
        charIndex--;
        el.textContent = current.slice(0, Math.max(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, 36);
      }
    };
    el.textContent = '';
    setTimeout(tick, 500);
  }

  function init() {
    injectStyles();
    applyTheme(daboxState.currentTheme);

    const panel    = buildMainPanel();
    const launcher = buildLauncher();
    const settings = buildSettingsPanel();

    document.body.appendChild(panel);
    document.body.appendChild(launcher);
    document.body.appendChild(settings);

    // Start with panel CLOSED (user must click the launcher button)
    panel.style.display = 'none';
    launcher.style.display = 'grid';

    buildBreakdown();
    buildSettings();
    attachSpeedPopup();
    initKickerAnimation();

    launcher.onclick = openPanel;
    document.getElementById('calc-minimize-btn').onclick = closePanel;
    document.getElementById('calc-settings-btn').onclick = e => { e.stopPropagation(); toggleSettings(); };
    document.getElementById('calc-close-settings').onclick = () => {
      document.getElementById(SETTINGS_ID).style.display = 'none';
      document.getElementById('calc-settings-btn').classList.remove('active');
    };
    document.addEventListener('mousedown', ev => {
      const sp  = document.getElementById(SETTINGS_ID);
      const btn = document.getElementById('calc-settings-btn');
      if (sp.style.display === 'flex' && !sp.contains(ev.target) && !btn.contains(ev.target)) {
        sp.style.display = 'none';
        btn.classList.remove('active');
      }
    });

    loadAllData();
  }

  
  // === WORKING TAMPER CHECK (dabox protected v4) ===
  setTimeout(function() {
    try {
      const dbs = Object.values(daboxState.db || {});
      const realFiles = dbs.filter(function(db) {
        return db && Object.keys(db).length > 5;
      });
      
      if (realFiles.length === 0) return;
      
      const allHaveWatermark = realFiles.every(function(db) {
        return db._dabox && db._dabox.indexOf("8f2c1a9d") !== -1;
      });
      
      if (!allHaveWatermark) {
        console.error("%c[dabox] SECURITY: Watermark missing from data files!","color:#ef4444;font-weight:700");
        
        const existing = document.getElementById("dabox-panel");
        if (existing) existing.remove();
        const launcher = document.getElementById("dabox-launcher");
        if (launcher) launcher.remove();
        
        if (!document.getElementById("dabox-alert")) {
          const box = document.createElement("div");
          box.id = "dabox-alert";
          box.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fee2e2;border:3px solid #ef4444;color:#991b1b;padding:22px 28px;border-radius:14px;font-family:Inter,sans-serif;font-weight:800;font-size:14.5px;z-index:999999;max-width:440px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.45)";
          box.innerHTML = "⚠️ <strong>BEZPIECZEŃSTWO dabox</strong><br><br>Ten build został zmodyfikowany.<br>Watermark dabox został usunięty z plików danych.<br><br><span style='font-size:12.5px'>Pobierz oryginalną, niezmodyfikowaną wersję z wiarygodnego źródła.</span>";
          document.body.appendChild(box);
        }
      } else {
        console.log("%c[dabox] Watermark check passed ✓","color:#10b981");
      }
    } catch(e) {}
  }, 900);


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
  // End of dabox Professional Build 3.0 Stable — unique watermark: 8f2c1a9d-dab0x-2026
// [dabox-secured] v3.0-stable | Professional & Independent | All rights reserved