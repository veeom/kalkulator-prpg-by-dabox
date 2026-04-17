console.log("Auto valuation black-orange UI loaded");

let lastVUID = null;
let currentVehicle = null;
let DATA_READY = false;
let VEHICLES = {}, ENGINE_UPGRADES = {}, MECHANICAL = {}, VISUAL = {};
let VISUAL_EXTRA = {}, BODYKITS = {}, LIGHTS = {}, COUNTERS = {}, BAGAZNIKI = {};

let multipliers = {
  basePrice: 50,
  mechanical: 50,
  kit: 50,
  cfi: 50,
  lpg: 50,
  engine: 50,
  lights: 50,
  counter: 50,
  bodykit: 50,
  visual: 50,
  bodykitLvl: 40
};

let panelOpen = false;

function saveMultipliers() {
  localStorage.setItem("prpg_gracz_multipliers", JSON.stringify(multipliers));
}

function loadMultipliers() {
  const saved = localStorage.getItem("prpg_gracz_multipliers");
  if (saved) {
    try {
      multipliers = { ...multipliers, ...JSON.parse(saved) };
    } catch (e) {}
  }
}
loadMultipliers();

function injectStyles() {
  if (document.getElementById("prpg-black-orange-style")) return;

  const style = document.createElement("style");
  style.id = "prpg-black-orange-style";
  style.textContent = `
    :root{
      --prpg-bg:#060606;
      --prpg-bg-2:#0b0b0b;
      --prpg-surface:#101010;
      --prpg-surface-2:#161616;
      --prpg-surface-3:#1d1d1d;
      --prpg-text:#f7f4ee;
      --prpg-muted:#c0b5a7;
      --prpg-faint:#8d8070;
      --prpg-orange:#ff8c1a;
      --prpg-orange-2:#ffab4d;
      --prpg-shadow:0 24px 60px rgba(0,0,0,.52);
      --prpg-radius-xl:22px;
      --prpg-radius-lg:18px;
      --prpg-radius-md:14px;
      --prpg-radius-sm:10px;
      --prpg-font:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #prpg-panel, #prpg-settings, #prpg-launcher,
    #prpg-panel *, #prpg-settings *, #prpg-launcher *{
      box-sizing:border-box;
      font-family:var(--prpg-font);
    }

    #prpg-panel{
      position:fixed;
      top:20px;
      right:20px;
      width:410px;
      max-height:calc(100vh - 40px);
      z-index:100000;
      color:var(--prpg-text);
      background:radial-gradient(circle at top right, rgba(255,140,26,.10), transparent 32%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005)), var(--prpg-bg);
      border:1px solid rgba(255,255,255,.08);
      border-radius:var(--prpg-radius-xl);
      box-shadow:var(--prpg-shadow);
      overflow:hidden;
      display:none;
    }

    .prpg-header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      padding:18px 18px 14px;
      border-bottom:1px solid rgba(255,255,255,.06);
      background:linear-gradient(180deg, rgba(255,140,26,.04), transparent);
    }

    .prpg-brand{ display:flex; align-items:flex-start; gap:12px; min-width:0; }
    .prpg-logo{
      width:44px; height:44px; border-radius:15px; display:grid; place-items:center; color:#fff2e2;
      background:linear-gradient(180deg, rgba(255,140,26,.24), rgba(255,140,26,.10)), var(--prpg-surface-2);
      border:1px solid rgba(255,140,26,.24);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
      flex-shrink:0;
    }
    .prpg-logo svg{ width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2; }
    .prpg-kicker{ min-height:14px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--prpg-faint); font-weight:800; margin-bottom:4px; }
    .prpg-kicker-text{ display:inline-block; border-right:1px solid rgba(255,171,79,.55); padding-right:3px; white-space:nowrap; }
    .prpg-title{ font-size:16px; font-weight:900; color:var(--prpg-text); line-height:1.2; }
    .prpg-subtitle{ margin-top:4px; font-size:12px; color:var(--prpg-muted); line-height:1.4; }
    .prpg-head-actions{ display:flex; gap:8px; flex-shrink:0; }

    .prpg-icon-btn{
      width:38px; height:38px; display:grid; place-items:center; border:none; border-radius:12px; cursor:pointer;
      color:var(--prpg-text); background:var(--prpg-surface-2); border:1px solid rgba(255,255,255,.08); transition:.16s ease;
    }
    .prpg-icon-btn:hover{
      transform:translateY(-1px);
      border-color:rgba(255,140,26,.22);
      background:var(--prpg-surface-3);
      box-shadow:0 0 0 1px rgba(255,140,26,.08) inset;
    }
    .prpg-icon-btn svg{ width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; }

    .prpg-body{
      padding:14px;
      display:grid;
      gap:12px;
      max-height:calc(100vh - 96px);
      overflow:auto;
      background:var(--prpg-bg);
    }

    .prpg-card{
      background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.008)), var(--prpg-surface);
      border:1px solid rgba(255,255,255,.06);
      border-radius:var(--prpg-radius-lg);
      padding:14px;
    }

    .prpg-card-label, .prpg-stat-label{
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.13em;
      color:var(--prpg-faint);
      font-weight:900;
      margin-bottom:8px;
    }

    .prpg-topline{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .prpg-vehicle-wrap{ min-width:0; }
    .prpg-vehicle{ font-size:21px; font-weight:900; line-height:1.1; color:var(--prpg-text); }
    .prpg-vehicle-meta{ margin-top:6px; font-size:12px; line-height:1.35; color:var(--prpg-orange-2); font-weight:800; }
    .prpg-status{
      padding:7px 11px; font-size:11px; font-weight:900; border-radius:999px; border:1px solid rgba(255,255,255,.08);
      background:var(--prpg-surface-2); color:var(--prpg-muted); white-space:nowrap;
    }
    .prpg-status.ready{ color:#fff4e8; background:rgba(255,140,26,.12); border-color:rgba(255,140,26,.24); }
    .prpg-status.wait{ color:#ffe8c9; background:rgba(255,184,77,.10); border-color:rgba(255,184,77,.20); }
    .prpg-total-label{ margin-top:14px; font-size:11px; text-transform:uppercase; letter-spacing:.13em; color:var(--prpg-faint); font-weight:900; }
    .prpg-total{ margin-top:6px; font-size:38px; line-height:1; font-weight:900; color:var(--prpg-text); text-shadow:0 0 22px rgba(255,140,26,.12); }
    .prpg-grid{ margin-top:14px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .prpg-stat{ padding:11px 12px; border-radius:15px; background:var(--prpg-surface-2); border:1px solid rgba(255,255,255,.05); }
    .prpg-stat-value{ font-size:14px; color:var(--prpg-text); font-weight:800; word-break:break-word; }
    .prpg-row{ display:grid; gap:10px; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .prpg-item{
      min-height:132px; padding:14px; border-radius:16px;
      background:linear-gradient(180deg, rgba(255,140,26,.05), rgba(255,140,26,.015)), var(--prpg-surface-2);
      border:1px solid rgba(255,255,255,.05); display:grid; gap:10px; align-content:space-between;
    }
    .prpg-item-top{ display:grid; gap:8px; }
    .prpg-item-name{ font-size:11px; font-weight:900; color:var(--prpg-orange-2); text-transform:uppercase; letter-spacing:.11em; line-height:1.2; }
    .prpg-item-value{ font-size:26px; line-height:1; font-weight:900; color:var(--prpg-text); white-space:normal; word-break:break-word; }
    .prpg-item-meta{ font-size:12px; color:var(--prpg-muted); line-height:1.35; }
    .prpg-alert{ display:none; margin-bottom:12px; padding:13px 14px; border-radius:14px; background:linear-gradient(180deg, rgba(255,108,108,.18), rgba(180,32,32,.10)); border:1px solid rgba(255,120,120,.24); color:#ffd7d7; font-size:12px; line-height:1.55; font-weight:800; box-shadow:0 10px 24px rgba(0,0,0,.22); }
    .prpg-alert-list{ display:grid; gap:10px; }
    .prpg-alert-item{ display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-radius:12px; background:rgba(0,0,0,.14); border:1px solid rgba(255,255,255,.05); }
    .prpg-alert-icon{ flex-shrink:0; font-size:14px; line-height:1.4; }
    .prpg-alert-text{ color:#ffdede; font-size:12px; line-height:1.55; font-weight:700; }
    .prpg-alert strong{ color:#fff1f1; font-weight:900; }
    .prpg-bar{ width:100%; height:8px; background:rgba(255,255,255,.06); border-radius:999px; overflow:hidden; margin-top:2px; }
    .prpg-bar-fill{ height:100%; width:0%; border-radius:999px; background:linear-gradient(90deg, var(--prpg-orange), var(--prpg-orange-2)); box-shadow:0 0 16px rgba(255,140,26,.34); transition:width .18s ease; }

    #prpg-launcher{
      position:fixed; right:18px; bottom:18px; width:74px; height:74px; padding:0; border:none; border-radius:24px; display:grid; place-items:center;
      cursor:pointer; z-index:100002; overflow:hidden; isolation:isolate;
      background:linear-gradient(180deg, rgba(255,162,66,.16), rgba(255,140,26,.04)), linear-gradient(180deg, #171717, #0d0d0d);
      box-shadow:0 18px 34px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 0 1px rgba(255,170,92,.12);
      transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, filter .18s ease;
    }
    #prpg-launcher::before{
      content:""; position:absolute; inset:-1px; border-radius:inherit;
      background:linear-gradient(135deg, rgba(255,185,112,.28), rgba(255,140,26,0), rgba(255,185,112,.16));
      opacity:.75; z-index:0; pointer-events:none;
    }
    #prpg-launcher::after{
      content:""; position:absolute; width:120px; height:120px; border-radius:50%; top:-34px; right:-26px;
      background:radial-gradient(circle, rgba(255,160,64,.22), transparent 60%);
      pointer-events:none; z-index:0;
    }
    #prpg-launcher:hover{
      transform:translateY(-3px) scale(1.035);
      background:linear-gradient(180deg, rgba(255,171,79,.22), rgba(255,140,26,.08)), linear-gradient(180deg, #1b1b1b, #101010);
      box-shadow:0 24px 44px rgba(0,0,0,.48), 0 0 0 1px rgba(255,255,255,.08) inset, 0 0 0 1px rgba(255,170,92,.18), 0 0 28px rgba(255,140,26,.16);
      filter:saturate(1.05);
    }
    #prpg-launcher:active{ transform:translateY(0) scale(.985); }
    .prpg-launcher-core{
      position:relative; z-index:1; width:56px; height:56px; border-radius:18px; display:grid; place-items:center;
      background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015)), radial-gradient(circle at 50% 30%, rgba(255,166,77,.12), transparent 58%), #121212;
      border:1px solid rgba(255,255,255,.06); box-shadow:inset 0 1px 0 rgba(255,255,255,.06), inset 0 -10px 18px rgba(0,0,0,.22);
    }
    #prpg-launcher svg{ width:28px; height:28px; fill:none; stroke:#f4ede4; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; filter:drop-shadow(0 0 10px rgba(255,170,92,.10)); }

    #prpg-settings{
      position:fixed; top:20px; right:445px; width:440px; max-height:calc(100vh - 40px); z-index:100001; display:none; color:var(--prpg-text);
      background:linear-gradient(180deg, rgba(255,140,26,.05), rgba(255,255,255,.01)), var(--prpg-bg-2);
      border:1px solid rgba(255,255,255,.08); border-radius:var(--prpg-radius-xl); box-shadow:var(--prpg-shadow); overflow:hidden;
    }
    .prpg-settings-head{ padding:16px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .prpg-settings-title{ font-size:14px; font-weight:900; color:var(--prpg-text); }
    .prpg-settings-sub{ margin-top:4px; font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--prpg-faint); font-weight:900; }
    .prpg-settings-body{ padding:14px 16px 16px; max-height:calc(100vh - 90px); overflow:auto; display:grid; gap:14px; background:var(--prpg-bg-2); }
    .prpg-group{ padding:14px; border-radius:16px; background:var(--prpg-surface); border:1px solid rgba(255,255,255,.05); }
    .prpg-group-title{ font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--prpg-orange-2); font-weight:900; margin-bottom:10px; }
    .prpg-slider + .prpg-slider, .prpg-rule-card + .prpg-rule-card{ margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,.05); }
    .prpg-slider-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
    .prpg-slider-name{ font-size:13px; font-weight:800; color:var(--prpg-text); }
    .prpg-num-wrap{ min-width:74px; display:flex; align-items:center; justify-content:center; gap:6px; padding:5px 8px; border-radius:10px; background:var(--prpg-surface-2); border:1px solid rgba(255,255,255,.07); }
    .prpg-num{ width:40px; border:none; outline:none; background:transparent; color:var(--prpg-text); text-align:right; font-size:12px; font-weight:900; -moz-appearance:textfield; }
    .prpg-num::-webkit-outer-spin-button, .prpg-num::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
    .prpg-suffix{ font-size:11px; color:var(--prpg-faint); font-weight:900; }
    .prpg-range{ width:100%; height:8px; border-radius:999px; outline:none; -webkit-appearance:none; appearance:none; background:linear-gradient(90deg, rgba(255,140,26,.85) 0%, rgba(255,140,26,.85) 50%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.08) 100%); }
    .prpg-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:18px; height:18px; border-radius:50%; cursor:pointer; background:linear-gradient(180deg, #fff2df, #ffc97b); border:2px solid rgba(255,140,26,.75); box-shadow:0 4px 14px rgba(0,0,0,.42); }
    .prpg-range::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:linear-gradient(180deg, #fff2df, #ffc97b); border:2px solid rgba(255,140,26,.75); box-shadow:0 4px 14px rgba(0,0,0,.42); }
    .prpg-rule-card{ display:grid; gap:10px; }
    .prpg-rule-main{ display:flex; align-items:center; justify-content:space-between; gap:14px; }
    .prpg-switch-copy{ min-width:0; flex:1; }
    .prpg-switch-title{ font-size:13px; font-weight:800; color:var(--prpg-text); line-height:1.35; }
    .prpg-switch-desc{ margin-top:4px; font-size:11px; color:var(--prpg-faint); line-height:1.5; }
    .prpg-switch{ position:relative; width:56px; height:32px; flex-shrink:0; display:block; cursor:pointer; }
    .prpg-switch input{ position:absolute; inset:0; width:100%; height:100%; opacity:0; margin:0; cursor:pointer; z-index:2; }
    .prpg-switch-track{ position:absolute; inset:0; border-radius:999px; background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.12); transition:background .18s ease, border-color .18s ease, box-shadow .18s ease; pointer-events:none; }
    .prpg-switch-track::before{ content:""; position:absolute; top:3px; left:3px; width:24px; height:24px; border-radius:50%; background:linear-gradient(180deg, #fff6ea, #ffd08f); box-shadow:0 4px 12px rgba(0,0,0,.35); transition:transform .18s ease, background .18s ease; }
    .prpg-switch input:checked + .prpg-switch-track{ background:linear-gradient(180deg, rgba(255,140,26,.50), rgba(255,140,26,.28)); border-color:rgba(255,140,26,.50); box-shadow:0 0 0 1px rgba(255,140,26,.14) inset, 0 0 14px rgba(255,140,26,.12); }
    .prpg-switch input:checked + .prpg-switch-track::before{ transform:translateX(24px); background:linear-gradient(180deg, #fff7ef, #ffbe66); }
    .prpg-body-rule-extra{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px; border-radius:14px; background:var(--prpg-surface-2); border:1px solid rgba(255,140,26,.12); flex-wrap:wrap; }
    .prpg-body-rule-label{ font-size:11px; text-transform:uppercase; letter-spacing:.10em; color:var(--prpg-orange-2); font-weight:900; }
    .prpg-body-rule-input-wrap{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    .prpg-inline-num{ width:86px; min-width:86px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.08); background:var(--prpg-surface-3); color:var(--prpg-text); text-align:center; outline:none; font-size:13px; font-weight:900; -moz-appearance:textfield; }
    .prpg-inline-num::-webkit-outer-spin-button, .prpg-inline-num::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
    .prpg-inline-help{ font-size:11px; color:var(--prpg-muted); font-weight:700; white-space:nowrap; }

    @media (max-width: 1320px){
      #prpg-settings{ top:auto; bottom:20px; right:20px; width:440px; max-height:62vh; }
    }
    @media (max-width: 560px){
      #prpg-panel, #prpg-settings{ right:10px; left:10px; width:auto; }
      #prpg-panel{ top:10px; max-height:calc(100vh - 20px); }
      #prpg-settings{ bottom:10px; max-height:68vh; }
      .prpg-row{ grid-template-columns:1fr; }
      .prpg-total{ font-size:31px; }
      .prpg-body-rule-input-wrap{ width:100%; justify-content:flex-start; }
    }
  `;
  document.head.appendChild(style);
}

const panel = document.createElement("div");
panel.id = "prpg-panel";

const launcherButton = document.createElement("button");
launcherButton.id = "prpg-launcher";
launcherButton.title = "Otwórz kalkulator";
launcherButton.innerHTML = `
  <span class="prpg-launcher-core">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="3"></rect>
      <path d="M8 7.5h8"></path>
      <path d="M8 11.5h2"></path>
      <path d="M12 11.5h2"></path>
      <path d="M8 15.5h2"></path>
      <path d="M12 15.5h2"></path>
      <path d="M16 11.5h0"></path>
      <path d="M16 15.5h0"></path>
    </svg>
  </span>
`;

const settingsPanel = document.createElement("div");
settingsPanel.id = "prpg-settings";

function createMainUI() {
  panel.innerHTML = `
    <div class="prpg-header">
      <div class="prpg-brand">
        <div class="prpg-logo">
          <svg viewBox="0 0 24 24">
            <path d="M5 16l1.5-5a2 2 0 0 1 1.92-1.43h7.16A2 2 0 0 1 17.5 11L19 16"></path>
            <path d="M3 16h18"></path>
            <path d="M5 16v2a1 1 0 0 0 1 1h1"></path>
            <path d="M19 16v2a1 1 0 0 1-1 1h-1"></path>
            <circle cx="7.5" cy="16.5" r="1.5"></circle>
            <circle cx="16.5" cy="16.5" r="1.5"></circle>
          </svg>
        </div>
        <div>
          <div class="prpg-kicker"><span class="prpg-kicker-text" id="prpg-kicker-text">Kalkulator by dabox</span></div>
          <div class="prpg-title">Kalkulator wartości pojazdu</div>
          <div class="prpg-subtitle">Pełny panel rozwijany z ikonki w prawym dolnym rogu.</div>
        </div>
      </div>
      <div class="prpg-head-actions">
        <button class="prpg-icon-btn" id="prpg-open-settings" title="Ustawienia">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 9l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4L12 3z"></path>
            <circle cx="12" cy="12" r="3.2"></circle>
            <path d="M19 12h2M3 12H1M12 19v2M12 3V1"></path>
          </svg>
        </button>
        <button class="prpg-icon-btn" id="prpg-minimize" title="Minimalizuj">
          <svg viewBox="0 0 24 24"><path d="M5 12h14"></path></svg>
        </button>
      </div>
    </div>

    <div class="prpg-body">
      <div class="prpg-alert" id="prpg-alert"></div>
      <div class="prpg-card">
        <div class="prpg-card-label">Podsumowanie</div>
        <div class="prpg-topline">
          <div class="prpg-vehicle-wrap">
            <div class="prpg-vehicle" id="prpg-vehicle-name">Oczekiwanie na pojazd</div>
            <div class="prpg-vehicle-meta" id="prpg-vehicle-trunk">Bagażnik: -</div>
          </div>
          <div class="prpg-status wait" id="prpg-status">Nasłuchiwanie</div>
        </div>
        <div class="prpg-total-label">Wartość końcowa</div>
        <div class="prpg-total" id="prpg-total">0</div>
        <div class="prpg-grid">
          <div class="prpg-stat">
            <div class="prpg-stat-label">Silnik</div>
            <div class="prpg-stat-value" id="prpg-engine">-</div>
          </div>
          <div class="prpg-stat">
            <div class="prpg-stat-label">Wizualne</div>
            <div class="prpg-stat-value" id="prpg-visual-count">0</div>
          </div>
          <div class="prpg-stat">
            <div class="prpg-stat-label">Mechaniczne</div>
            <div class="prpg-stat-value" id="prpg-mechanical-count">0</div>
          </div>
          <div class="prpg-stat">
            <div class="prpg-stat-label">Poziom ceny bazowej</div>
            <div class="prpg-stat-value" id="prpg-base-range">-</div>
          </div>
        </div>
      </div>

      <div class="prpg-card">
        <div class="prpg-card-label">Składniki wyceny</div>
        <div class="prpg-row" id="prpg-breakdown"></div>
      </div>
    </div>
  `;

  settingsPanel.innerHTML = `
    <div class="prpg-settings-head">
      <div>
        <div class="prpg-settings-title">Ustawienia kalkulacji</div>
        <div class="prpg-settings-sub">Reguły automatyczne i mnożniki</div>
      </div>
      <button class="prpg-icon-btn" id="prpg-close-settings" title="Zamknij">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
      </button>
    </div>
    <div class="prpg-settings-body" id="prpg-settings-body"></div>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(launcherButton);
  document.body.appendChild(settingsPanel);

  launcherButton.onclick = openPanel;
  document.getElementById("prpg-minimize").onclick = closePanel;
  document.getElementById("prpg-open-settings").onclick = (e) => {
    e.stopPropagation();
    settingsPanel.style.display = settingsPanel.style.display === "block" ? "none" : "block";
  };
  document.getElementById("prpg-close-settings").onclick = () => settingsPanel.style.display = "none";

  document.addEventListener("mousedown", (event) => {
    const openBtn = document.getElementById("prpg-open-settings");
    if (settingsPanel.style.display === "block" && !settingsPanel.contains(event.target) && !openBtn.contains(event.target)) {
      settingsPanel.style.display = "none";
    }
  });

  buildBreakdown();
  buildSettings();
}

function openPanel() {
  panelOpen = true;
  panel.style.display = "block";
  launcherButton.style.display = "none";
}

function closePanel() {
  panelOpen = false;
  panel.style.display = "none";
  settingsPanel.style.display = "none";
  launcherButton.style.display = "grid";
}

function initKickerAnimation() {
  const el = document.getElementById("prpg-kicker-text");
  if (!el) return;

  const phrases = ["Kalkulator by dabox", "Premium Edition"];
  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const current = phrases[phraseIndex];

    if (!deleting) {
      charIndex++;
      el.textContent = current.slice(0, charIndex);
      if (charIndex >= current.length) {
        deleting = true;
        setTimeout(tick, 1300);
        return;
      }
      setTimeout(tick, 75);
    } else {
      charIndex--;
      el.textContent = current.slice(0, Math.max(0, charIndex));
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, 280);
        return;
      }
      setTimeout(tick, 38);
    }
  };

  el.textContent = "";
  setTimeout(tick, 300);
}

function buildBreakdown() {
  const breakdown = document.getElementById("prpg-breakdown");
  breakdown.innerHTML = "";

  const cats = {
    basePrice: "Poziom ceny bazowej",
    mechanical: "Mechaniczny",
    kit: "Zestaw",
    cfi: "CFI Nitro",
    lpg: "LPG",
    engine: "Silnik",
    lights: "Lampy",
    counter: "Licznik",
    bodykit: "Bodykit",
    visual: "Wizualny"
  };

  Object.entries(cats).forEach(([key, label]) => {
    const item = document.createElement("div");
    item.className = "prpg-item";
    item.dataset.key = key;
    item.innerHTML = `
      <div class="prpg-item-top">
        <div class="prpg-item-name">${label}</div>
        <div class="prpg-item-value">0</div>
        <div class="prpg-item-meta">0%</div>
      </div>
      <div class="prpg-bar"><div class="prpg-bar-fill"></div></div>
    `;
    breakdown.appendChild(item);
  });
}

function updateBreakdownItem(key, meta, value, width) {
  const item = document.querySelector(`.prpg-item[data-key="${key}"]`);
  if (!item) return;
  item.querySelector(".prpg-item-meta").textContent = meta;
  item.querySelector(".prpg-item-value").textContent = Math.round(value).toLocaleString("pl-PL");
  item.querySelector(".prpg-bar-fill").style.width = `${Math.max(0, Math.min(100, width))}%`;
}

function setNotice(message) {
  const alert = document.getElementById("prpg-alert");
  if (!alert) return;
  if (!message) {
    alert.style.display = "none";
    alert.textContent = "";
    return;
  }
  const items = message.split("||").map(s => s.trim()).filter(Boolean);
  alert.innerHTML = `<div class="prpg-alert-list">${items.map(item => `<div class="prpg-alert-item"><div class="prpg-alert-icon">⚠️</div><div class="prpg-alert-text">${item}</div></div>`).join("")}</div>`;
  alert.style.display = "block";
}

function buildSettings() {
  const body = document.getElementById("prpg-settings-body");
  body.innerHTML = "";

  const groupRules = document.createElement("div");
  groupRules.className = "prpg-group";
  groupRules.innerHTML = `<div class="prpg-group-title">Reguły automatyczne</div>`;
  groupRules.appendChild(createRuleSwitch("prpg_gracz_auto_limit", "Wersje limitowane", "Światła i licznik limitowany lub unikatowy otrzymają 100% automatycznie."));
  groupRules.appendChild(createRuleSwitch("prpg_gracz_auto_cfi5", "CFI V5", "Jeżeli wykryty będzie wariant V5, część CFI liczona jest automatycznie na 100."));
  groupRules.appendChild(createBodyRuleCard());

  const labels = {
    basePrice: "Poziom ceny bazowej",
    mechanical: "Mechaniczny",
    kit: "Zestaw",
    cfi: "CFI Nitro",
    lpg: "LPG",
    engine: "Silnik",
    lights: "Lampy",
    counter: "Licznik",
    bodykit: "Bodykit",
    visual: "Wizualny"
  };

  const groupMultipliers = document.createElement("div");
  groupMultipliers.className = "prpg-group";
  groupMultipliers.innerHTML = `<div class="prpg-group-title">Mnożniki ręczne</div>`;
  Object.entries(labels).forEach(([key, label]) => groupMultipliers.appendChild(createSlider(key, label)));

  body.appendChild(groupRules);
  body.appendChild(groupMultipliers);
}

function createRuleSwitch(storageKey, title, description) {
  const row = document.createElement("div");
  row.className = "prpg-rule-card";
  row.innerHTML = `
    <div class="prpg-rule-main">
      <div class="prpg-switch-copy">
        <div class="prpg-switch-title">${title}</div>
        <div class="prpg-switch-desc">${description}</div>
      </div>
      <div>
        <label class="prpg-switch">
          <input type="checkbox" ${localStorage.getItem(storageKey) === "true" ? "checked" : ""}>
          <span class="prpg-switch-track"></span>
        </label>
      </div>
    </div>
  `;

  row.querySelector("input").onchange = (e) => {
    localStorage.setItem(storageKey, e.target.checked);
    if (currentVehicle) calculateVehicleValue(currentVehicle);
  };

  return row;
}

function createBodyRuleCard() {
  const wrap = document.createElement("div");
  wrap.className = "prpg-rule-card";
  wrap.innerHTML = `
    <div class="prpg-rule-main">
      <div class="prpg-switch-copy">
        <div class="prpg-switch-title">Body Lvl</div>
        <div class="prpg-switch-desc">Po osiągnięciu ustawionego progu poziomu bodykitu kalkulator automatycznie zastosuje pełną wartość dla bodykitu.</div>
      </div>
      <div>
        <label class="prpg-switch">
          <input type="checkbox" ${localStorage.getItem("prpg_gracz_auto_body") === "true" ? "checked" : ""}>
          <span class="prpg-switch-track"></span>
        </label>
      </div>
    </div>
    <div class="prpg-body-rule-extra">
      <div class="prpg-body-rule-label">Próg poziomu</div>
      <div class="prpg-body-rule-input-wrap">
        <span class="prpg-inline-help">Body Lvl od</span>
        <input class="prpg-inline-num" type="number" min="1" max="65" value="${multipliers.bodykitLvl}">
        <span class="prpg-inline-help">w górę</span>
      </div>
    </div>
  `;

  const input = wrap.querySelector(".prpg-inline-num");
  input.oninput = (e) => {
    multipliers.bodykitLvl = Math.max(1, Math.min(65, parseInt(e.target.value) || 1));
    e.target.value = multipliers.bodykitLvl;
    saveMultipliers();
    if (currentVehicle) calculateVehicleValue(currentVehicle);
  };

  wrap.querySelector('input[type="checkbox"]').onchange = (e) => {
    localStorage.setItem("prpg_gracz_auto_body", e.target.checked);
    if (currentVehicle) calculateVehicleValue(currentVehicle);
  };

  return wrap;
}

function createSlider(name, label) {
  const row = document.createElement("div");
  row.className = "prpg-slider";
  row.dataset.key = name;

  row.innerHTML = `
    <div class="prpg-slider-head">
      <div class="prpg-slider-name">${label}</div>
      <div class="prpg-num-wrap">
        <input class="prpg-num" type="number" min="0" max="100" value="${multipliers[name]}">
        <span class="prpg-suffix">%</span>
      </div>
    </div>
    <input class="prpg-range" type="range" min="0" max="100" value="${multipliers[name]}">
  `;

  const num = row.querySelector(".prpg-num");
  const range = row.querySelector(".prpg-range");

  const paint = (value) => {
    range.style.background = `linear-gradient(90deg, rgba(255,140,26,.92) 0%, rgba(255,140,26,.92) ${value}%, rgba(255,255,255,.08) ${value}%, rgba(255,255,255,.08) 100%)`;
  };

  const update = (value) => {
    const v = Math.max(0, Math.min(100, parseInt(value) || 0));
    multipliers[name] = v;
    num.value = v;
    range.value = v;
    paint(v);
    saveMultipliers();
    if (currentVehicle) calculateVehicleValue(currentVehicle);
  };

  num.oninput = () => update(num.value);
  range.oninput = () => update(range.value);
  paint(multipliers[name]);

  return row;
}

async function loadJSON(path) {
  const res = await fetch(chrome.runtime.getURL(path));
  return await res.json();
}

async function loadData() {
  VEHICLES = await loadJSON("data/vehicles.json");
  ENGINE_UPGRADES = await loadJSON("data/engineUpgrades.json");
  MECHANICAL = await loadJSON("data/mechanical.json");
  VISUAL = await loadJSON("data/visual.json");
  VISUAL_EXTRA = await loadJSON("data/visualExtra.json");
  BODYKITS = await loadJSON("data/bodykits.json");
  LIGHTS = await loadJSON("data/lights.json");
  COUNTERS = await loadJSON("data/counter.json");
  BAGAZNIKI = await loadJSON("data/bagaznik.json");
  DATA_READY = true;
  setWaitingState();
  processVehicle();
}

function findMatchInDatabase(fullName, database) {
  const keys = Object.keys(database).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (fullName && fullName.includes(key)) return key;
  }
  return null;
}

function getBagaznikValue(model) {
  if (!model || !BAGAZNIKI) return null;

  if (Object.prototype.hasOwnProperty.call(BAGAZNIKI, model)) {
    return BAGAZNIKI[model];
  }

  const directMatch = findMatchInDatabase(model, BAGAZNIKI);
  if (directMatch && Object.prototype.hasOwnProperty.call(BAGAZNIKI, directMatch)) {
    return BAGAZNIKI[directMatch];
  }

  const normalizedModel = String(model).trim().toLowerCase();
  const keys = Object.keys(BAGAZNIKI).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const normalizedKey = String(key).trim().toLowerCase();
    if (normalizedModel === normalizedKey || normalizedModel.includes(normalizedKey) || normalizedKey.includes(normalizedModel)) {
      return BAGAZNIKI[key];
    }
  }

  return null;
}

function updateBagaznikDisplay(model) {
  const el = document.getElementById("prpg-vehicle-trunk");
  if (!el) return;

  if (!model) {
    el.textContent = "Bagażnik: -";
    return;
  }

  const bagaznikKg = getBagaznikValue(model);
  el.textContent = bagaznikKg == null ? "Bagażnik: brak danych" : `Bagażnik: ${bagaznikKg} KG`;
}

function getContainedText(labelName) {
  const item = [...document.querySelectorAll("li.ipsDataItem")].find(i => {
    const strong = i.querySelector("strong");
    return strong && strong.innerText.trim().includes(labelName);
  });

  if (!item) return "";
  const contained = item.querySelector(".ipsContained");
  if (!contained) return "";

  const textParts = [
    contained.innerText || "",
    contained.textContent || "",
    contained.getAttribute("_title") || "",
    contained.getAttribute("title") || ""
  ];

  contained.querySelectorAll("*").forEach(el => {
    textParts.push(el.innerText || "");
    textParts.push(el.textContent || "");
    textParts.push(el.getAttribute("_title") || "");
    textParts.push(el.getAttribute("title") || "");
    textParts.push(el.getAttribute("data-ipstooltip") || "");
    textParts.push(el.getAttribute("aria-label") || "");
  });

  return textParts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function isPartLimitedOrUnique(labelName) {
  const fullText = getContainedText(labelName).toLowerCase();
  return fullText.includes("limitowane") || fullText.includes("unikatowe");
}

function getLightsValue() {
  const fullName = getContainedText("Kolor świateł");
  if (!fullName) return 0;
  if (LIGHTS[fullName]) return LIGHTS[fullName];

  const fallback = fullName
    .replace(/-?\s*Limitowane/gi, "")
    .replace(/-?\s*Unikatowe/gi, "")
    .trim();

  return LIGHTS[fallback] || 0;
}

function getCounterValue() {
  const fullName = getContainedText("Kolor licznika");
  if (!fullName) return 0;
  if (COUNTERS[fullName]) return COUNTERS[fullName];

  const fallback = fullName
    .replace(/-?\s*Limitowane/gi, "")
    .replace(/-?\s*Unikatowe/gi, "")
    .trim();

  return COUNTERS[fallback] || 0;
}

function getVisualValue(parts) {
  let val = 0;
  parts.forEach(p => {
    const id = p.match(/\((\d+)\)/)?.[1];
    val += id ? (VISUAL[id] || 0) : (VISUAL_EXTRA[p] || 0);
  });
  return val;
}

function getVehicleData() {
  const data = {};
  document.querySelectorAll("li.ipsDataItem").forEach(item => {
    const label = item.querySelector("strong")?.innerText.trim();
    const value = item.querySelector(".ipsContained")?.innerText.trim();
    if (label && value) data[label] = value;
  });
  return data;
}

function parseVehicle(vData) {
  const getModel = t => t?.split("(")[0].trim();
  const getEngine = t => {
    const m = t?.match(/(\d+(?:\.\d+)?)\s*(dm|cm)/i);
    if (!m) return null;
    const value = parseFloat(m[1]);
    return m[2].toLowerCase() === "cm" ? parseFloat((value / 1000).toFixed(3)) : value;
  };
  const parseT = t => {
    if (!t) return [];
    const res = [];
    let curr = "", p = 0;
    for (const c of t) {
      if (c === "(") p++;
      if (c === ")") p--;
      if (c === "," && p === 0) {
        res.push(curr.trim());
        curr = "";
      } else {
        curr += c;
      }
    }
    if (curr) res.push(curr.trim());
    return res;
  };

  return {
    model: getModel(vData["Model"]),
    engineCapacity: getEngine(vData["Silnik"]),
    visual: parseT(vData["Tuning wizualny"]),
    mechanical: parseT(vData["Tuning mechaniczny"])
  };
}

function setWaitingState() {
  document.getElementById("prpg-vehicle-name").textContent = "Oczekiwanie na pojazd";
  updateBagaznikDisplay(null);
  const status = document.getElementById("prpg-status");
  status.textContent = DATA_READY ? "Nasłuchiwanie" : "Ładowanie";
  status.className = "prpg-status wait";
  document.getElementById("prpg-total").textContent = "0";
  document.getElementById("prpg-engine").textContent = "-";
  document.getElementById("prpg-visual-count").textContent = "0";
  document.getElementById("prpg-mechanical-count").textContent = "0";
  document.getElementById("prpg-base-range").textContent = "-";

  ["basePrice","mechanical","kit","cfi","lpg","engine","lights","counter","bodykit","visual"].forEach(k => {
    updateBreakdownItem(k, "0%", 0, 0);
  });
  setNotice("");
}

function resetUI() {
  lastVUID = null;
  currentVehicle = null;
  setWaitingState();
}

function setSliderVisualValue(key, value) {
  const row = document.querySelector(`.prpg-slider[data-key="${key}"]`);
  if (!row) return;

  const num = row.querySelector(".prpg-num");
  const range = row.querySelector(".prpg-range");
  const v = Math.max(0, Math.min(100, parseInt(value) || 0));

  num.value = v;
  range.value = v;
  range.style.background = `linear-gradient(90deg, rgba(255,140,26,.92) 0%, rgba(255,140,26,.92) ${v}%, rgba(255,255,255,.08) ${v}%, rgba(255,255,255,.08) 100%)`;
}

function calculateVehicleValue(vehicle) {
  currentVehicle = vehicle;

  const baseKey = findMatchInDatabase(vehicle.model, VEHICLES);
  let basePrice = 0;
  let baseRange = "Brak";

  if (baseKey && VEHICLES[baseKey]) {
    const vData = VEHICLES[baseKey];
    basePrice = vData.priceMin + (vData.priceMax - vData.priceMin) * (multipliers.basePrice / 100);
    baseRange = `${Math.round(vData.priceMin).toLocaleString("pl-PL")} - ${Math.round(vData.priceMax).toLocaleString("pl-PL")}`;
  }

  let engineVal = 0;
  if (baseKey && ENGINE_UPGRADES[baseKey]) {
    ENGINE_UPGRADES[baseKey].levels.forEach(l => {
      if (vehicle.engineCapacity >= l.to) engineVal = l.price;
    });
  }

  let bodyVal = 0;
  let finalBodyMult = multipliers.bodykit;
  let detectedBodyLvl = null;
  let bodyRuleActive = false;
  const autoBody = localStorage.getItem("prpg_gracz_auto_body") === "true";
  if (baseKey && BODYKITS[baseKey]) {
    const mBody = findMatchInDatabase(vehicle.model, BODYKITS[baseKey]);
    if (mBody) {
      const data = BODYKITS[baseKey][mBody];
      if (typeof data === "object" && data !== null) {
        bodyVal = Number(data.price || 0);
        detectedBodyLvl = Number(data.level || 0);
        if (autoBody && detectedBodyLvl >= multipliers.bodykitLvl) {
          finalBodyMult = 100;
          bodyRuleActive = true;
        }
      } else {
        bodyVal = Number(data || 0);
      }
    }
  }

  let mech = 0, kit = 0, cfiNormal = 0, cfiV5 = 0, lpg = 0;
  vehicle.mechanical.forEach(p => {
    const v = MECHANICAL[p] || 0;
    if (p.includes("Zestaw")) kit += v;
    else if (p.includes("C.F.I") || p.includes("Nitro")) {
      if (p.includes("V5")) cfiV5 += v;
      else cfiNormal += v;
    } else if (p.includes("LPG")) lpg += v;
    else mech += v;
  });

  const autoLimit = localStorage.getItem("prpg_gracz_auto_limit") === "true";
  const autoCfiV5 = localStorage.getItem("prpg_gracz_auto_cfi5") === "true";

  const hasLimitedLights = isPartLimitedOrUnique("Kolor świateł");
  const hasLimitedCounter = isPartLimitedOrUnique("Kolor licznika");
  const fLgtMult = autoLimit && hasLimitedLights ? 100 : multipliers.lights;
  const fCntMult = autoLimit && hasLimitedCounter ? 100 : multipliers.counter;
  const fCfiV5Mult = autoCfiV5 ? 100 : multipliers.cfi;

  const notices = [];
  if (autoLimit && !hasLimitedLights) notices.push("<strong>Lampy:</strong> nie są limitowane ani unikatowe, więc auto 100% nie zostało użyte.");
  if (autoLimit && !hasLimitedCounter) notices.push("<strong>Licznik:</strong> nie jest limitowany ani unikatowy, więc auto 100% nie zostało użyte.");
  if (autoBody && !bodyRuleActive) {
    if (detectedBodyLvl !== null) {
      notices.push(`<strong>Body Lvl:</strong> wykryty poziom ${detectedBodyLvl} jest niższy niż ustawiony próg ${multipliers.bodykitLvl}, więc auto 100% nie zostało użyte.`);
    } else if (bodyVal > 0) {
      notices.push(`<strong>Body Lvl:</strong> nie udało się określić poziomu bodykitu, więc auto 100% nie zostało użyte.`);
    } else {
      notices.push(`<strong>Body Lvl:</strong> nie wykryto bodykitu spełniającego ustawiony próg, więc auto 100% nie zostało użyte.`);
    }
  }
  setNotice(notices.join("||"));

  setSliderVisualValue("lights", fLgtMult);
  setSliderVisualValue("counter", fCntMult);
  setSliderVisualValue("cfi", cfiV5 > 0 && autoCfiV5 ? 100 : multipliers.cfi);
  setSliderVisualValue("bodykit", finalBodyMult);

  const meng = engineVal * multipliers.engine / 100;
  const mbody = bodyVal * finalBodyMult / 100;
  const mmech = mech * multipliers.mechanical / 100;
  const mkit = kit * multipliers.kit / 100;
  const mcfi = cfiNormal * multipliers.cfi / 100 + cfiV5 * fCfiV5Mult / 100;
  const mlpg = lpg * multipliers.lpg / 100;
  const mvis = getVisualValue(vehicle.visual) * multipliers.visual / 100;
  const mlgt = getLightsValue() * fLgtMult / 100;
  const mcnt = getCounterValue() * fCntMult / 100;
  const total = basePrice + mmech + mkit + mcfi + mlpg + meng + mlgt + mcnt + mbody + mvis;

  document.getElementById("prpg-vehicle-name").textContent = vehicle.model || "Nieznany model";
  updateBagaznikDisplay(vehicle.model);
  const status = document.getElementById("prpg-status");
  status.textContent = "Auto wyliczono";
  status.className = "prpg-status ready";
  document.getElementById("prpg-total").textContent = Math.round(total).toLocaleString("pl-PL");
  document.getElementById("prpg-engine").textContent = vehicle.engineCapacity ? `${vehicle.engineCapacity} dm³` : "Brak";
  document.getElementById("prpg-visual-count").textContent = String(vehicle.visual.length);
  document.getElementById("prpg-mechanical-count").textContent = String(vehicle.mechanical.length);
  document.getElementById("prpg-base-range").textContent = baseRange;

  const parts = {
    basePrice: { val: basePrice, meta: `${multipliers.basePrice}% przedziału min–max` },
    mechanical: { val: mmech, meta: `${multipliers.mechanical}% tuning` },
    kit: { val: mkit, meta: `${multipliers.kit}% zestaw` },
    cfi: { val: mcfi, meta: `${cfiV5 > 0 && autoCfiV5 ? 100 : multipliers.cfi}% CFI` },
    lpg: { val: mlpg, meta: `${multipliers.lpg}% LPG` },
    engine: { val: meng, meta: `${multipliers.engine}% silnik` },
    lights: { val: mlgt, meta: `${fLgtMult}% lampy` },
    counter: { val: mcnt, meta: `${fCntMult}% licznik` },
    bodykit: { val: mbody, meta: `${finalBodyMult}% bodykit` },
    visual: { val: mvis, meta: `${multipliers.visual}% wizualny` }
  };

  Object.entries(parts).forEach(([key, obj]) => {
    let width = 0;
    if (key === "bodykit") width = finalBodyMult;
    else if (key === "lights") width = fLgtMult;
    else if (key === "counter") width = fCntMult;
    else if (key === "cfi") width = cfiV5 > 0 && autoCfiV5 ? 100 : multipliers.cfi;
    else width = multipliers[key] ?? 0;
    updateBreakdownItem(key, obj.meta, obj.val, width);
  });
}

function processVehicle() {
  if (!DATA_READY) return;

  const vuidNode = [...document.querySelectorAll("li.ipsDataItem")].find(i => i.querySelector("strong")?.innerText.includes("VUID"));
  const vuid = vuidNode?.querySelector(".ipsContained")?.innerText.trim();

  if (!vuid) {
    if (lastVUID !== null) resetUI();
    return;
  }

  const data = getVehicleData();
  const parsed = parseVehicle(data);

  const snapshot = JSON.stringify({
    vuid,
    model: parsed.model,
    engine: parsed.engineCapacity,
    visual: parsed.visual,
    mechanical: parsed.mechanical
  });

  if (snapshot === lastVUID) return;
  lastVUID = snapshot;
  calculateVehicleValue(parsed);
}

injectStyles();
createMainUI();
initKickerAnimation();
setWaitingState();
closePanel();
loadData();
new MutationObserver(processVehicle).observe(document.body, { childList: true, subtree: true, characterData: true });
