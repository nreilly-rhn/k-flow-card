// k-flow-card.js – Unified Edition v7.1.1
// Fixes:
//   - System limits use explicit <ha-textfield> inputs (impossible to miss).
//   - Battery current & power moved outside battery icon:
//     power above flow‑bar, current below.
//   - Sun always stays on the arc.
//   - All previous features preserved.

// ═══════════════════════════════════════════════════════════════
// VISUAL EDITOR
// ═══════════════════════════════════════════════════════════════
class KFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._attached = false;
    this._rendered = false;
    this._ownChange = false;
  }

  connectedCallback() {
    this._attached = true;
    this._render();
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._ownChange) return;
    if (this._attached) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered && this._attached) {
      this._render();
    } else {
      this.querySelectorAll('ha-selector').forEach(el => { el.hass = hass; });
    }
  }

  _fireChanged() {
    this._ownChange = true;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
      bubbles: true,
      composed: true,
    }));
    Promise.resolve().then(() => { this._ownChange = false; });
  }

  _set(key, value) {
    if (this._config[key] === value) return;
    this._config = { ...this._config, [key]: value };
    this._fireChanged();
    if (key === '_show_battery' || key === '_show_limits' || key === '_labels_custom_entities')
      this._render();
  }

  _render() {
    if (!this._hass) return;
    if (!this._sectionOpen) this._sectionOpen = {};
    const cfg = this._config;
    const showBatt1 = !!(cfg._show_battery !== false);
    const showLimits = !!(cfg._show_limits);

    const style = `
      <style>
        :host { display: block; font-family: var(--paper-font-body1_-_font-family, inherit); }
        .section {
          margin-bottom: 16px;
          border: 1px solid var(--divider-color, rgba(0,0,0,.12));
          border-radius: 10px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--secondary-background-color, rgba(0,0,0,.04));
          font-size: .82rem;
          font-weight: 700;
          letter-spacing: .5px;
          text-transform: uppercase;
          color: var(--secondary-text-color);
          cursor: default;
        }
        .section-header.toggleable { cursor: pointer; user-select: none; }
        .section-header .toggle-chip {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .3px;
          text-transform: none;
          padding: 2px 10px 2px 6px;
          border-radius: 20px;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, rgba(0,0,0,.15));
          color: var(--primary-text-color);
          transition: background .15s;
        }
        .section-header .toggle-chip.on {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
          color: #fff;
        }
        .section-body { padding: 12px 14px 4px; }
        .row {
          display: block;
          margin-bottom: 6px;
        }
        .row-label {
          display: block;
          font-size: .78rem;
          font-weight: 500;
          color: var(--primary-text-color);
          margin-bottom: 3px;
          padding-left: 2px;
          line-height: 1.3;
        }
        .row-label small {
          display: inline;
          font-size: .68rem;
          color: var(--secondary-text-color);
          margin-left: 5px;
        }
        .row-input { display: block; width: 100%; }
        ha-selector, ha-textfield { width: 100%; display: block; }
        ha-textfield { --mdc-shape-small: 6px; }
        .divider { height: 1px; background: var(--divider-color, rgba(0,0,0,.08)); margin: 4px 0 14px; }
      </style>
    `;

    const shell = document.createElement('div');
    shell.innerHTML = style;

    const makeSection = (sectionId, icon, title, rows, opts = {}) => {
      if (this._sectionOpen[sectionId] === undefined) this._sectionOpen[sectionId] = false;
      const isOpen = this._sectionOpen[sectionId];
      const sec = document.createElement('div');
      sec.className = 'section';
      const hdr = document.createElement('div');
      hdr.className = 'section-header toggleable';
      // Chevron — styled as a small disclosure button
      const chevron = document.createElement('span');
      chevron.textContent = isOpen ? '▼' : '▶';
      chevron.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'width:20px',
        'height:20px',
        'min-width:20px',
        'border-radius:5px',
        'background:var(--secondary-background-color,rgba(255,255,255,.07))',
        'border:1px solid var(--divider-color,rgba(255,255,255,.15))',
        'font-size:.7rem',
        'line-height:1',
        `color:${isOpen ? 'var(--primary-color,#03a9f4)' : 'var(--secondary-text-color,#aaa)'}`,
        'flex-shrink:0',
        'transition:color .15s,background .15s',
        'cursor:pointer',
        'user-select:none',
      ].join(';');
      hdr.appendChild(chevron);
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${icon} ${title}`;
      hdr.appendChild(titleSpan);
      // Click anywhere on header (except toggle-chip) to collapse/expand
      hdr.addEventListener('click', () => {
        this._sectionOpen[sectionId] = !this._sectionOpen[sectionId];
        this._render();
      });
      if (opts.toggleKey) {
        const chip = document.createElement('span');
        chip.className = 'toggle-chip' + (opts.toggleOn ? ' on' : '');
        chip.innerHTML = opts.toggleOn ? `✓ Enabled` : `＋ Enable`;
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          this._set(opts.toggleKey, !opts.toggleOn);
        });
        hdr.appendChild(chip);
      }
      sec.appendChild(hdr);
      // Body visible when section is open AND content not suppressed by toggle
      const bodyVisible = isOpen && !opts.hidden;
      if (bodyVisible) {
        const body = document.createElement('div');
        body.className = 'section-body';
        rows.forEach(r => body.appendChild(r));
        sec.appendChild(body);
      }
      return sec;
    };

    const picker = (key, label, optional = false) => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const lbl = document.createElement('div');
      lbl.className = 'row-label';
      lbl.textContent = label;
      if (optional) {
        const sm = document.createElement('small');
        sm.textContent = 'optional';
        lbl.appendChild(sm);
      }
      const inputWrap = document.createElement('div');
      inputWrap.className = 'row-input';
      const sel = document.createElement('ha-selector');
      sel.hass = this._hass;
      sel.selector = { entity: {} };
      sel.value = cfg[key] || '';
      sel._configKey = key;
      sel.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        this._set(key, ev.detail.value || '');
      });
      inputWrap.appendChild(sel);
      wrap.appendChild(lbl);
      wrap.appendChild(inputWrap);
      return wrap;
    };

    // Text field — native input, commits on blur/Enter only.
    // ha-selector(text) fires value-changed per keystroke → triggers setConfig → _render → destroys field.
    const textField = (key, label, placeholder = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const fieldBox = document.createElement('div');
      fieldBox.style.cssText = `
        display:block; position:relative;
        border:1px solid var(--divider-color, rgba(0,0,0,.42));
        border-radius:4px;
        padding:6px 12px 6px;
        background:var(--input-fill-color, var(--secondary-background-color, rgba(0,0,0,.04)));
        box-sizing:border-box; width:100%;
        transition: border-color .15s;
      `;
      fieldBox.addEventListener('focusin',  () => { fieldBox.style.borderColor = 'var(--primary-color, #03a9f4)'; });
      fieldBox.addEventListener('focusout', () => { fieldBox.style.borderColor = 'var(--divider-color, rgba(0,0,0,.42))'; });
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = `font-size:.72rem; color:var(--secondary-text-color); margin-bottom:2px; line-height:1;`;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = cfg[key] !== undefined ? String(cfg[key]) : '';
      input.style.cssText = `
        display:block; width:100%; border:none; outline:none;
        background:transparent; color:var(--primary-text-color);
        font-size:.95rem; font-family:inherit; padding:0; box-sizing:border-box;
      `;
      // Commit ONLY on blur or Enter — prevents per-keystroke re-render
      const commit = (ev) => this._set(key, ev.target.value);
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.target.blur(); });
      fieldBox.appendChild(lbl);
      fieldBox.appendChild(input);
      wrap.appendChild(fieldBox);
      return wrap;
    };

    // Number field — native input, commits on blur/Enter only (same reason as textField).
    const numberField = (key, label, min, max, step, unit = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.marginBottom = '14px';
      const fieldBox = document.createElement('div');
      fieldBox.style.cssText = `
        display:block; position:relative;
        border:1px solid var(--divider-color, rgba(0,0,0,.42));
        border-radius:4px;
        padding:6px 12px 6px;
        background:var(--input-fill-color, var(--secondary-background-color, rgba(0,0,0,.04)));
        box-sizing:border-box; width:100%;
        transition: border-color .15s;
      `;
      fieldBox.addEventListener('focusin',  () => { fieldBox.style.borderColor = 'var(--primary-color, #03a9f4)'; });
      fieldBox.addEventListener('focusout', () => { fieldBox.style.borderColor = 'var(--divider-color, rgba(0,0,0,.42))'; });
      const lbl = document.createElement('div');
      lbl.textContent = unit ? `${label}  (${unit})` : label;
      lbl.style.cssText = `font-size:.72rem; color:var(--secondary-text-color); margin-bottom:2px; line-height:1;`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(min); input.max = String(max); input.step = String(step);
      input.value = cfg[key] !== undefined && cfg[key] !== '' ? String(cfg[key]) : '';
      input.style.cssText = `
        display:block; width:100%; border:none; outline:none;
        background:transparent; color:var(--primary-text-color);
        font-size:.95rem; font-family:inherit; padding:0; box-sizing:border-box;
      `;
      // Commit ONLY on blur or Enter — prevents per-keystroke re-render
      const commit = (ev) => { const v = parseFloat(ev.target.value); if (!isNaN(v)) this._set(key, v); };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ev.target.blur(); });
      fieldBox.appendChild(lbl);
      fieldBox.appendChild(input);
      wrap.appendChild(fieldBox);
      return wrap;
    };


    // Native CSS pill toggle
    const switchRow = (key, labelText, hintText = '') => {
      const wrap = document.createElement('div');
      wrap.className = 'row';
      wrap.style.cssText = 'margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      const left = document.createElement('div');
      left.style.flex = '1';
      const lbl = document.createElement('div');
      lbl.className = 'row-label';
      lbl.style.marginBottom = '2px';
      lbl.textContent = labelText;
      left.appendChild(lbl);
      if (hintText) {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:.68rem;color:var(--secondary-text-color);line-height:1.4;';
        hint.textContent = hintText;
        left.appendChild(hint);
      }
      const pillLabel = document.createElement('label');
      pillLabel.style.cssText = 'position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!cfg[key];
      cb.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
      const track = document.createElement('span');
      const knob  = document.createElement('span');
      const sync = () => {
        track.style.cssText = 'position:absolute;inset:0;border-radius:11px;transition:background .2s;background:' +
          (cb.checked ? 'var(--primary-color,#03a9f4)' : 'var(--divider-color,rgba(0,0,0,.25))') + ';';
        knob.style.cssText  = 'position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;' +
          'box-shadow:0 1px 3px rgba(0,0,0,.35);transition:left .2s;left:' + (cb.checked ? '21px' : '3px') + ';';
      };
      sync();
      cb.addEventListener('change', () => { sync(); this._set(key, cb.checked); });
      pillLabel.appendChild(cb);
      pillLabel.appendChild(track);
      pillLabel.appendChild(knob);
      wrap.appendChild(left);
      wrap.appendChild(pillLabel);
      return wrap;
    };

    const divider = () => {
      const d = document.createElement('div');
      d.className = 'divider';
      return d;
    };

    // ── Labels section with "Enable custom entities" toggle ──
    // When _labels_custom_entities is true, pickers inside labels are active
    // AND the corresponding entity pickers in their native sections are disabled
    // (greyed out with a pointer-events:none overlay) to prevent duplication.
    const labelsEnabled = !!(cfg._labels_custom_entities);

    // Helper: entity picker that can be visually disabled
    const pickerMaybeDisabled = (key, label, disabled = false, optional = false) => {
      const wrap = picker(key, label, optional);
      if (disabled) {
        wrap.style.position = 'relative';
        const veil = document.createElement('div');
        veil.style.cssText = [
          'position:absolute', 'inset:0', 'border-radius:6px',
          'background:var(--secondary-background-color,rgba(0,0,0,.06))',
          'opacity:.55', 'pointer-events:all', 'cursor:not-allowed',
          'z-index:10',
        ].join(';');
        const note = document.createElement('div');
        note.style.cssText = [
          'position:absolute', 'inset:0', 'display:flex', 'align-items:center',
          'justify-content:center', 'font-size:.68rem', 'font-weight:600',
          'color:var(--secondary-text-color)', 'letter-spacing:.3px',
          'pointer-events:none', 'z-index:11',
        ].join(';');
        note.textContent = '⛔ Overridden by Labels section';
        wrap.appendChild(veil);
        wrap.appendChild(note);
      }
      return wrap;
    };

    // Patch existing pickers in battery / grid sections if labels are enabled.
    // We achieve this by overriding picker() locally for those sections — but since sections
    // are already appended later, we pass `labelsEnabled` as a flag to the section builders.
    // Store it so section builders below can use it.
    this._labelsEnabled = labelsEnabled;

    // Label rows — each has a text field + entity picker below it
    const labelRow = (textKey, textLabel, textPlaceholder, entityKey) => {
      const frag = document.createDocumentFragment();
      frag.appendChild(textField(textKey, textLabel, textPlaceholder));
      const entityRow = document.createElement('div');
      entityRow.style.cssText = 'margin-top:-6px;margin-bottom:14px;';
      const entityLabel = document.createElement('div');
      entityLabel.style.cssText = 'font-size:.72rem;color:var(--secondary-text-color);padding:0 2px 3px;line-height:1;';
      entityLabel.textContent = 'Entity (overrides default)';
      const sel = document.createElement('ha-selector');
      sel.hass = this._hass;
      sel.selector = { entity: {} };
      sel.value = cfg[entityKey] || '';
      sel._configKey = entityKey;
      sel.style.cssText = 'width:100%;display:block;';
      if (!labelsEnabled) {
        sel.style.opacity = '0.4';
        sel.style.pointerEvents = 'none';
        sel.title = 'Enable custom entities first';
      }
      sel.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        this._set(entityKey, ev.detail.value || '');
      });
      entityRow.appendChild(entityLabel);
      entityRow.appendChild(sel);
      const wrapper = document.createElement('div');
      wrapper.appendChild(frag);
      wrapper.appendChild(entityRow);
      return wrapper;
    };

    // Info banner above label rows
    const labelInfoBanner = (() => {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:.72rem;line-height:1.5;color:var(--secondary-text-color);background:var(--secondary-background-color,rgba(0,0,0,.04));border:1px solid var(--divider-color,rgba(0,0,0,.10));border-radius:7px;padding:7px 10px;margin-bottom:10px;';
      info.innerHTML = '&#x1F4A1; <strong>Tip:</strong> The boxes below let you rename the battery stat tiles to anything you like. Enable <em>Custom Entities</em> below to also override which sensor each tile reads &mdash; matching fields in Battery sections will then lock to prevent duplication.';
      return info;
    })();

    shell.appendChild(makeSection('labels', '🏷️', 'Labels', [
      labelInfoBanner,
      switchRow('_labels_custom_entities', '🔗 Enable custom entities',
        'When ON, entity pickers below activate and their counterparts in Battery sections are locked to prevent duplication.'),
      (() => { const d = document.createElement('div'); d.className='divider'; return d; })(),
      labelRow('label_endurance',        'Endurance label',         'ENDURANCE',         'label_entity_endurance'),
      labelRow('label_batt_dis',         'Batt Dis label',          'Batt Dis.',         'label_entity_batt_dis'),
      labelRow('label_endu_eta',         'Endu ETA label',          'Endu ETA',          'label_entity_endu_eta'),
    ]));

    shell.appendChild(makeSection('solar', '☀️', 'Solar', [
      picker('pv1_power', 'PV1 Power'),
    ]));

    shell.appendChild(makeSection('solar_extras', '☀️', 'Solar Extras', [
      picker('pv_total_power',  'Total PV Power',  true),
      divider(),
      picker('today_pv',        'Today PV Gen'),
      picker('today_batt_chg',  'Today Batt Charge'),
      picker('today_load',      'Today Load'),
      picker('consump',         'House Consumption'),
    ]));

    const gridHint = (() => {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:.72rem;line-height:1.5;color:var(--secondary-text-color);background:var(--secondary-background-color,rgba(0,0,0,.04));border:1px solid var(--divider-color,rgba(0,0,0,.10));border-radius:7px;padding:7px 10px;margin:-6px 0 12px;';
      info.textContent = 'Positive = importing from grid. Negative = exporting to grid.';
      return info;
    })();

    shell.appendChild(makeSection('grid', '🔌', 'Grid', [
      picker('grid_power', 'Grid Power'),
      gridHint,
      picker('grid_import_energy', 'Import Today (kWh)', true),
      picker('grid_export_energy', 'Export Today (kWh)', true),
    ]));

    shell.appendChild(makeSection('battery1', '🔋', 'Battery', [
      switchRow('invert_battery_power', '🔄 Invert battery power sign', 'Enable if positive = discharging'),
      divider(),
      picker('battery_soc',      'Battery SOC'),
      picker('battery_power',    'Battery Power'),
      picker('battery_capacity',    'Battery Capacity'),
      // picker('battery_current',  'Battery Current'), # This is calculated from power & voltage
      pickerMaybeDisabled('battery_voltage',  'Battery Voltage',    labelsEnabled),
      pickerMaybeDisabled('batt_dis',         'Discharge Today',    labelsEnabled),
    ], { toggleKey: '_show_battery', toggleOn: showBatt1, hidden: !showBatt1 }));

    // shell.appendChild(makeSection('limits', '⚙️', 'System Limits', [
    //   numberField('battery_full_ah',    'Battery Capacity',  0, 2000,  1,   'Ah'),
    //   numberField('battery_full_wh',    'Battery Capacity',  0, 50000, 1,   'Wh'),
    //   numberField('battery_max_power', 'Battery Max Power', 1000, 20000, 100, 'W'),
    //   numberField('pv_max_power',       'PV Max Power',      1000,30000,100, 'W'),
    // ], { toggleKey: '_show_limits', toggleOn: showLimits, hidden: !showLimits }));

    this.innerHTML = '';
    this.appendChild(shell);
    this._rendered = true;
  }
}
customElements.define('k-flow-card-editor', KFlowCardEditor);

// ═══════════════════════════════════════════════════════════════
// MAIN CARD
// ═══════════════════════════════════════════════════════════════
class KFlowCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this.config = {};
    this._prevPvTotal = -1;
    this._prevSunPos = { bx: -1, by: -1 };
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig() {
    return {
      pv1_power: 'sensor.goodwe_pv1_power',
      pv_total_power: 'sensor.goodwe_pv_power',
      grid_power: 'sensor.my_home_site_power',
      grid_import_energy: '',
      grid_export_energy: '',
      consump: 'sensor.goodwe_house_consumption',
      today_pv: 'sensor.goodwe_today_s_pv_generation',
      today_batt_chg: 'sensor.goodwe_today_battery_charge',
      today_load: 'sensor.goodwe_today_load',
      battery_soc: 'sensor.jk_soc',
      battery_power: 'sensor.jk_power',
      battery_current: 'sensor.jk_current',
      battery_voltage: 'sensor.jk_voltage',
      goodwe_battery_soc: 'sensor.goodwe_battery_state_of_charge',
      goodwe_battery_curr: 'sensor.goodwe_battery_current',
      batt_dis: 'sensor.goodwe_today_battery_discharge',
      battery_full_ah: 314,
      battery_full_wh: 16076,
      battery_max_power: 6000,
      pv_max_power: 7500,
      sun: 'sun.sun',
      label_endurance: 'ENDURANCE',
      label_batt_dis: 'Batt Dis.',
      label_endu_eta: 'Battery Volt',
      label_entity_endurance: '',
      label_entity_batt_dis: '',
      label_entity_endu_eta: '',
      _labels_custom_entities: false,
      _show_battery: true,
      invert_battery_power: false,
      _show_limits: false,
    };
  }

  getCardSize() { return 8; }
  static getConfigElement() { return document.createElement('k-flow-card-editor'); }

  setConfig(config) {
    this.config = { ...KFlowCard.getStubConfig(), ...config };
    this._buildStaticSVG();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateDynamic();
  }

  _val(eid) {
    if (!eid) return null;
    const s = this._hass?.states?.[eid];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    return parseFloat(s.state);
  }

  /** Power in watts; converts kW sensors using unit_of_measurement. */
  _powerWatts(eid) {
    if (!eid) return null;
    const s = this._hass?.states?.[eid];
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    let v = parseFloat(s.state);
    if (!Number.isFinite(v)) return null;
    const uom = String(s.attributes?.unit_of_measurement || '').toLowerCase();
    if (uom === 'kw') v *= 1000;
    return v;
  }

  _socColor(p) { return p<=25?'#f85149':p<=50?'#f39c4b':p<=75?'#58a6ff':'#4CAF50'; }
  _remCapColor(p) { return p<=15?'#e34d4c':p<=30?'#f39c4b':p<=55?'#f4d03f':'#2ecc71'; }
  _fmtTime(h) { if(!isFinite(h)||h<=0) return'--';const hh=Math.floor(h),mm=Math.round((h-hh)*60);return hh+'h '+(mm<10?'0':'')+mm+'m'; }

  _sunData() {
    const attrs = this._hass?.states[this.config.sun || 'sun.sun']?.attributes;
    let rise = '06:00', set = '18:00';
    const fmtIso = iso => {
      try { const d = new Date(iso); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); } catch(e) { return null; }
    };
    if (attrs) {
      if (attrs.next_rising) rise = fmtIso(attrs.next_rising) || rise;
      if (attrs.next_setting) set = fmtIso(attrs.next_setting) || set;
    }
    const toMin = s => { const p = s.split(':').map(Number); return p[0]*60 + p[1]; };
    const NOW = new Date(), nowMin = NOW.getHours()*60 + NOW.getMinutes();
    const RISE = toMin(rise), SET = toMin(set);
    let t = Math.max(0, Math.min(1, (nowMin - RISE) / (SET - RISE)));
    const night = nowMin < RISE || nowMin > SET;
    const bell = 1 - Math.pow(Math.abs(2*t - 1), 1.5);
    const bx = Math.round((1-t)*(1-t)*35 + 2*(1-t)*t*260 + t*t*485);
    const by = Math.round((1-t)*(1-t)*78 + 2*(1-t)*t*(-45) + t*t*78);
    let mx = 260, my = 72;
    if (night) {
      const nightLen = 1440 - (SET - RISE);
      let tMoon = nowMin > SET ? (nowMin - SET)/nightLen : (nowMin + 1440 - SET)/nightLen;
      tMoon = Math.max(0, Math.min(1, tMoon));
      mx = Math.round((1-tMoon)*(1-tMoon)*485 + 2*(1-tMoon)*tMoon*260 + tMoon*tMoon*35);
      my = Math.round((1-tMoon)*(1-tMoon)*78 + 2*(1-tMoon)*tMoon*158 + tMoon*tMoon*78);
    }
    return { rise, set, night, bell, bx, by, mx, my, t };
  }

  _battFill(soc){
    const ft=145,fb=263,fh=118;const fH=Math.round((soc||0)/100*fh),fY=fb-fH;let c,f,tc;
    if(soc<=40){c='#ff2200';f='url(#battGlowRed)';tc='#000';}else if(soc<=75){c='#f4d03f';f='url(#battGlowOrange)';tc='#000';}else{c='#00ff11';f='url(#battGlowGreen)';tc='#fff';}
    return{y:fY,height:fH,color:c,filter:fH>4?f:'none',textColor:tc};
  }

  _flowLevel(w,type){
    if(type==='solar'){if(w<200)return{dur:4,size:1.8,count:6};if(w<600)return{dur:3.2,size:2.2,count:12};if(w<1200)return{dur:2.7,size:2.5,count:20};if(w<2500)return{dur:2.4,size:2.8,count:30};if(w<4000)return{dur:1.8,size:3.2,count:42};if(w<6000)return{dur:1.2,size:3.5,count:55};return{dur:.9,size:3.8,count:65};}
    if(w<150)return{dur:4,size:1.8,count:4};if(w<500)return{dur:3.2,size:2.2,count:8};if(w<1000)return{dur:2.7,size:2.5,count:14};if(w<2000)return{dur:2.4,size:2.8,count:22};if(w<3000)return{dur:1.8,size:3.2,count:30};if(w<4500)return{dur:1.5,size:3.5,count:40};return{dur:.9,size:3.8,count:50};
  }

  _buildPvWaveHTML(bx,by,pvT){
    if(pvT<=10)return'';const fl=this._flowLevel(pvT,'solar');const lay=this._flowLayout||{};const pvEndY=lay.pvEndY??127;const gwX=lay.gwX??260;const gwY=lay.gwY??250;const sY=by+7;const pD='M '+bx.toFixed(1)+','+sY.toFixed(1)+' C '+bx.toFixed(1)+',85 '+gwX+',5 '+gwX+','+pvEndY+' V '+gwY;const col='rgba(255,232,60,.95)',gc='rgba(255,190,20,.55)';const dD=(fl.dur*.8).toFixed(2),dL=(8+fl.size*1.5).toFixed(1),gL=(6+fl.size*1.2).toFixed(1),dT=(parseFloat(dL)+parseFloat(gL)).toFixed(1);let h='';h+='<path d="'+pD+'" fill="none" stroke="'+gc+'" stroke-width="6" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round" opacity="0.25" filter="url(#arcSunF2)"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';h+='<path d="'+pD+'" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';h+='<path d="'+pD+'" fill="none" stroke="'+col+'" stroke-width="1.0" stroke-dasharray="'+dL+' '+gL+'" stroke-linecap="round" opacity="0.85"><animate attributeName="stroke-dashoffset" from="'+dT+'" to="0" dur="'+dD+'s" repeatCount="indefinite" calcMode="linear"/></path>';const wD=[{amp:6,dur:fl.dur*.9,ox:0,op:.9,sc:'rgba(255,255,255,0.92)',dLen:'3.0',dGap:'40.0'},{amp:10,dur:fl.dur*1.1,ox:3,op:.6,sc:col,dLen:'4.5',dGap:'50.0'}];const wc=Math.min(2,Math.max(1,Math.round(fl.count/5)));for(let wi=0;wi<wc;wi++){const w=wD[wi];const sC=Math.round(fl.count*.5),sD=w.dur.toFixed(2),sCy=(parseFloat(w.dLen)+parseFloat(w.dGap)).toFixed(1);for(let si=0;si<sC;si++){const fr=si/sC,ph=fr*Math.PI*2,sY2=(w.amp*Math.sin(ph+wi*1.1)).toFixed(1),sX=(w.ox+w.amp*.3*Math.cos(ph*.5)).toFixed(1),sDe=(fr*w.dur%w.dur).toFixed(3),sO=(w.op*(.5+.5*Math.abs(Math.sin(ph)))*.6).toFixed(2);h+='<g transform="translate('+sX+','+sY2+')"><path d="'+pD+'" fill="none" stroke="'+w.sc+'" stroke-width="1.2" stroke-dasharray="'+w.dLen+' '+w.dGap+'" stroke-linecap="round" opacity="'+sO+'"><animate attributeName="stroke-dashoffset" from="'+sCy+'" to="0" dur="'+sD+'s" begin="-'+sDe+'s" repeatCount="indefinite" calcMode="linear"/></path></g>';}}return h;
  }

  _buildStaticSVG() {
    const showBatt1 = !!(this.config._show_battery !== false);
    const iconPath = '/local/community/k-flow-card';    // icons served from HACS community folder
    // Topology: Sun→Gateway←Grid ; Gateway→Home ; Battery→Gateway
    const GW_X = 260;
    const GW_Y = 250;
    const GRID_ICON_X = 399;
    const GRID_ICON_Y = 133;
    const GRID_ICON_W = 121;
    const GW_CONN_X = GW_X + 35;
    const GRID_CONN_Y = GRID_ICON_Y + Math.round(GRID_ICON_W / 2);
    const BATT_CONN_X = 59;
    const BATT_CONN_Y = 175;
    // Smooth curves into gateway (cubic Bézier, tangent-friendly for dash animation)
    const GRID_PATH_D = `M ${GRID_ICON_X},${GRID_CONN_Y} C ${GRID_ICON_X - 58},${GRID_CONN_Y} ${GW_CONN_X + 22},${GRID_CONN_Y + 42} ${GW_CONN_X},${GW_Y}`;
    const BATT_PATH_D = `M ${BATT_CONN_X},${BATT_CONN_Y} C ${BATT_CONN_X + 72},${BATT_CONN_Y} ${GW_X - 58},${GW_Y - 8} ${GW_X},${GW_Y}`;
    const PV_FLOW_Y = 105;  // sun arc bend before drop to gateway
    const HOME_BUS_X = 260;
    const HOME_BUS_Y = GW_Y + 75;
    const HOME_ICON_X = 179;
    const HOME_ICON_W = 160;
    const HOME_ICON_Y = HOME_BUS_Y + 10;
    const HOME_CENTER_X = HOME_ICON_X + Math.round(HOME_ICON_W / 2);
    const HOME_CONN_Y = HOME_ICON_Y + 52;
    const HOME_LOAD_LABEL_Y = HOME_ICON_Y + 81;
    const GW_HOME_PATH_D = `M ${GW_X},${GW_Y + 35} V ${HOME_CONN_Y}`;
    const SVG_H = HOME_ICON_Y + 175;
    this._flowLayout = { pvEndY: PV_FLOW_Y, gwX: GW_X, gwY: GW_Y };

    // Battery current/power placed OUTSIDE the transformed group, above/below the flow bar (center y=175)
    const battText = `
      <text id="battPwrFlow" x="75" y="165" font-size="10" font-weight="600" fill="#cde">-- W</text>
      <text id="battCurrFlow" x="75" y="196" font-size="10" font-weight="600" fill="#fff">-- A</text>
    `;

    const batteryTip = `<rect x="75" y="126" width="18" height="4" rx="2" fill="url(#battCapGrad)"/>`;

    // Battery visibility helpers
    const battGhostPath = showBatt1
      ? `<path d="${BATT_PATH_D}" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" opacity="0.18"/>`
      : '';
    const battFlowPaths = showBatt1 ? `
      <path id="flowBattIn" d="${BATT_PATH_D}" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="4.0s" repeatCount="indefinite"/></path>
      <path id="flowBattOut" d="${BATT_PATH_D}" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4.0s" repeatCount="indefinite"/></path>` : '';
    const gwHomeWireLayer = `
      <g id="gwHomeWireLayer" style="pointer-events:none">
        <path id="gwHomeWireBase" d="${GW_HOME_PATH_D}" fill="none" stroke="#c9d1d9" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
        <path id="flowGwHomeIn" d="${GW_HOME_PATH_D}" fill="none" stroke="#ffe83c" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="4.0s" repeatCount="indefinite"/></path>
        <path id="flowGwHomeOut" d="${GW_HOME_PATH_D}" fill="none" stroke="#ffe83c" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4.0s" repeatCount="indefinite"/></path>
      </g>`;
    const gridWireLayer = `
      <g id="gridWireLayer" style="pointer-events:none">
        <path id="gridWireBase" d="${GRID_PATH_D}" fill="none" stroke="#8b949e" stroke-width="3.5" stroke-linecap="round" opacity="0.75"/>
        <path id="flowGridIn" d="${GRID_PATH_D}" fill="none" stroke="#FF2929" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.8s" repeatCount="indefinite"/></path>
        <path id="flowGridOut" d="${GRID_PATH_D}" fill="none" stroke="#2ecc71" stroke-width="4" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" visibility="hidden"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="0.8s" repeatCount="indefinite"/></path>
      </g>`;
    const battIconSection = !showBatt1 ? '' : (
      `<g transform="translate(-36.6, 25.4) scale(0.8)">
        <g id="battIconWrap">
          <rect x="49" y="135" width="70" height="132" rx="10" fill="url(#battShellGrad)"/>
          ${batteryTip}
          <rect x="51" y="258" width="66" height="9" rx="4" fill="url(#battCapGrad)"/>
          <rect x="51" y="137" width="66" height="7" rx="4" fill="url(#battCapGrad)"/>
          <rect x="49" y="135" width="70" height="132" rx="10" fill="url(#battGlassBody)" style="pointer-events:none"/>
          <rect x="53" y="145" width="62" height="118" rx="8" fill="#0f1214"/>
            <rect id="battFillBar" x="53" y="263" width="62" height="0" rx="0" fill="#3fb950" clip-path="url(#battBodyClip)"/>
            <rect id="battFillHL" x="53" y="263" width="62" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClip)" style="pointer-events:none"/>
            <g id="battBoltGroup" opacity="0"><polygon points="86,176 74,199 82,199 77,223 93,195 85,195 97,176" fill="#ffa01a" stroke="rgba(100,150,255,.5)" stroke-width="0.8" filter="url(#battGlowBolt)"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.0s" repeatCount="indefinite"/></polygon></g>
            <text id="fcBattVal" x="84" y="211" text-anchor="middle" font-size="18" font-weight="900" fill="#fff">--%</text>
            <text id="battVoltageFlow" x="84" y="285" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">-- V</text>
        </g>
      </g>`
    );

    this.shadowRoot.innerHTML = `<style>
      :host{display:block} @keyframes svgPulseOrange{0%,100%{filter:drop-shadow(0 0 5px #f39c4b)}50%{filter:drop-shadow(0 0 8px #f39c4bff)}}
      .st{background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:7px 9px}
      .st .l{font-size:.48rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
      .st .v{font-size:.8rem;font-weight:600;color:#c9d1d9}
      .dv{height:1px;background:#21262d;margin:8px 0}
      .ct{font-size:.56rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b949e;margin-bottom:10px;display:flex;align-items:center;gap:7px}
      .ct::after{content:'';flex:1;height:1px;background:#21262d}
      .pvf{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:2px}
      .pvi{text-align:center;background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:6px 2px}
      .pvi .ico{font-size:.95rem;margin-bottom:2px}
      .pvi .lbl{font-size:.44rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px}
      .pvi .val{font-size:.76rem;font-weight:700;color:#c9d1d9}
      .pvi .val.yw{color:#f4d03f} text{font-family:'Segoe UI',Arial,sans-serif}
    </style>
    <div style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:13px;box-shadow:0 4px 20px rgba(0,0,0,.4);width:100%;box-sizing:border-box;">
      <div class="ct">⚡ Energy Flow <span id="battStatusBadge" style="margin-left:auto;font-size:.5rem;font-weight:700;letter-spacing:1.5px;padding:1px 8px;border-radius:8px;background:#21262d;color:#8b949e;text-transform:uppercase">IDLE</span></div>
      <div style="width:100%;max-width:520px;margin:0 auto"><svg id="flowSvg" viewBox="0 0 520 ${SVG_H}" style="width:100%;display:block">
      <defs>
        <filter id="arcSunF" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id="arcSunF2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="moonF"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <radialGradient id="dynAuraG" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="rgba(30,100,200,.28)"/><stop offset="55%" stop-color="rgba(30,80,160,.10)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></radialGradient>
        <radialGradient id="sunCG" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="rgba(255,255,220,.98)"/><stop offset="40%" stop-color="rgb(255,125,10)"/><stop offset="100%" stop-color="rgba(255,130,10,.6)"/></radialGradient>
        <linearGradient id="arcDayGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,180,50,0)"/><stop offset="20%" stop-color="rgba(255,200,70,.5)"/><stop offset="50%" stop-color="rgba(255,228,110,.92)"/><stop offset="80%" stop-color="rgba(255,200,70,.5)"/><stop offset="100%" stop-color="rgba(255,180,50,0)"/></linearGradient>
        <linearGradient id="arcNightGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(140,170,255,0)"/><stop offset="30%" stop-color="rgba(155,185,255,.35)"/><stop offset="50%" stop-color="rgba(200,215,255,.7)"/><stop offset="70%" stop-color="rgba(155,185,255,.35)"/><stop offset="100%" stop-color="rgba(140,170,255,0)"/></linearGradient>
        <linearGradient id="battCapGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2d2d2d"/><stop offset="18%" stop-color="#8f8f8f"/><stop offset="50%" stop-color="#ececec"/><stop offset="82%" stop-color="#7a7a7a"/><stop offset="100%" stop-color="#242424"/></linearGradient>
        <linearGradient id="battShellGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#050505"/><stop offset="18%" stop-color="#111"/><stop offset="50%" stop-color="#080808"/><stop offset="82%" stop-color="#111"/><stop offset="100%" stop-color="#030303"/></linearGradient>
        <linearGradient id="battGlassBody" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.03)"/><stop offset="15%" stop-color="rgba(255,255,255,0.22)"/><stop offset="33%" stop-color="rgba(255,255,255,0.05)"/><stop offset="50%" stop-color="rgba(255,255,255,0)"/><stop offset="67%" stop-color="rgba(255,255,255,0.05)"/><stop offset="85%" stop-color="rgba(255,255,255,0.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0.03)"/></linearGradient>
        <linearGradient id="battFillHighlight" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.02)"/><stop offset="20%" stop-color="rgba(255,255,255,0.22)"/><stop offset="48%" stop-color="rgba(255,255,255,0.44)"/><stop offset="60%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>
        <clipPath id="battBodyClip"><rect x="53" y="145" width="62" height="118" rx="8"/></clipPath>
        <filter id="battGlowRed"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowOrange"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowGreen"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowCyan"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="battGlowBolt"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowOrange" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(255,140,0,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowBlue" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(30,144,255,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowGreen" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(46,204,113,0.6)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="iconGlowYellow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10" result="b"/><feFlood flood-color="rgba(255,230,0,0.7)" result="c"/><feComposite in="c" in2="b" operator="in" result="d"/><feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse id="skyAura" cx="260" cy="84" rx="230" ry="110" fill="url(#dynAuraG)"/>
      <path d="M 35,78 Q 260,-45 485,78 Z" fill="rgba(30,100,200,.05)"/>
      <line x1="8" y1="78" x2="512" y2="78" stroke="rgba(255,255,255,.12)" stroke-width="1" stroke-dasharray="3,8"/>
      <circle cx="35" cy="78" r="3.5" fill="rgba(255,200,80,.7)"/>
      <circle cx="260" cy="78" r="2.5" fill="rgba(255,255,255,.25)"/>
      <circle cx="485" cy="78" r="3.5" fill="rgba(255,110,55,.7)"/>
      <text id="arcRiseLabel" x="35" y="92" fill="rgba(255,255,255,.5)" font-size="10" text-anchor="middle">06:00</text>
      <text x="260" y="92" fill="rgba(255,255,255,.28)" font-size="10" text-anchor="middle">12:00</text>
      <text id="arcSetLabel" x="485" y="92" fill="rgba(255,255,255,.5)" font-size="10" text-anchor="middle">18:00</text>
      <path d="M 35,78 Q 260,-45 485,78" fill="none" stroke="url(#arcDayGrad)" stroke-width="2.2"/>
      <path d="M 485,78 Q 260,158 35,78" fill="none" stroke="url(#arcNightGrad)" stroke-width="1.5" stroke-dasharray="4,5" opacity=".35"/>
      <g id="arcSunGroup" opacity="1">
        <circle id="arcSunGlow2" cx="260" cy="35" r="28" fill="rgba(255,200,60,.12)" filter="url(#arcSunF)"><animate attributeName="r" values="28;34;28" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;0.9;0.55" dur="2.2s" repeatCount="indefinite"/></circle>
        <circle id="arcSunGlow1" cx="260" cy="35" r="14" fill="rgba(255,200,60,.5)" filter="url(#arcSunF2)"><animate attributeName="r" values="14;17;14" dur="2.2s" repeatCount="indefinite"/></circle>
        <circle id="arcSunDot" cx="260" cy="35" r="7" fill="url(#sunCG)" stroke="rgba(255,255,200,.85)" stroke-width="1.2"><animate attributeName="r" values="7;8;7" dur="2.2s" repeatCount="indefinite"/></circle>
      </g>
      <g id="moonGroup" opacity="0" filter="url(#moonF)">
        <circle id="moonGlow" cx="260" cy="72" r="12" fill="rgba(180,205,255,.18)"/>
        <circle id="moonDot" cx="260" cy="72" r="6" fill="rgba(220,235,255,.92)" stroke="rgba(240,248,255,.9)" stroke-width="1.2"/>
      </g>
      <rect id="arcPvLabelRect" x="162" y="22" width="96" height="26" rx="13" fill="rgba(255,200,50,.22)" stroke="rgba(255,210,60,.5)" stroke-width="1.2"/>
      <text id="arcPvLabelText" x="210" y="39" text-anchor="middle" fill="rgba(255,235,110,.98)" font-size="13" font-weight="800">0 W ⚡</text>
      <g id="pvFlowGroup"></g>

      ${battGhostPath}

      ${battFlowPaths}

      <!-- Battery current/power placed above/below flow bar -->
      ${showBatt1 ? battText : ''}

      ${battIconSection}

      <g id="gatewayIconImg" transform="translate(${GW_X - 35},${GW_Y - 35})" style="opacity:1"><image href="${iconPath}/fronius-inverter-icon.png" x="0" y="0" width="70" height="70" preserveAspectRatio="xMidYMid meet"/></g>

      <g id="gridIconImg" transform="translate(${GRID_ICON_X},${GRID_ICON_Y})" style="opacity:1"><image href="${iconPath}/grid-icon.png" x="0" y="0" width="${GRID_ICON_W}" height="${GRID_ICON_W}" preserveAspectRatio="xMidYMid meet"/></g>

      <text id="fcGridVal" x="445" y="269" text-anchor="middle" font-size="13" font-weight="700" fill="#e05c00">-- W</text>

      <g id="homeIconImg" transform="translate(${HOME_ICON_X},${HOME_ICON_Y})" style="opacity:1"><image href="${iconPath}/home-icon.png" x="0" y="0" width="${HOME_ICON_W}" height="${HOME_ICON_W}" preserveAspectRatio="xMidYMid meet"/></g>

      ${gridWireLayer}
      ${gwHomeWireLayer}

      <text id="fcLoadVal" x="174" y="${HOME_LOAD_LABEL_Y}" text-anchor="end" font-size="13" font-weight="700" fill="#F7F6D3">-- W</text>
      </svg></div>`+

      `<div style="display:flex;gap:8px;align-items:center;margin-top:10px">
        <div style="flex:1;display:flex;align-items:center;gap:4px"><span style="font-size:.42rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase">PV</span><div style="flex:1;display:flex;gap:2px;align-items:flex-end;height:10px" id="pvBlocks"></div></div>
        <div style="flex:1;display:flex;align-items:center;gap:4px"><span style="font-size:.42rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase">Pwr</span><div style="flex:1;background:#21262d;border-radius:20px;height:9px;overflow:hidden;position:relative"><div id="pwrBar" style="position:absolute;inset:0;right:auto;width:0%;border-radius:20px;background:#3fb950;transition:width .4s,background .4s"></div></div></div>
      </div>
      <div class="dv"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:5px">
        <div class="st"><div class="l">${this.config.label_cell_temp_minmax || 'CELL TEMP MIN/MAX'}</div><div class="v" id="bTemp1">-- °C</div></div>
        <div class="st"><div class="l">${this.config.label_bms_temp || 'BMS TEMP'}</div><div class="v" id="bTemp2">-- °C</div></div>
        <div class="st"><div class="l">${this.config.label_endurance || 'Time Remaining'}</div><div class="v" id="bEndurance">--</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">
        <div class="st"><div class="l">${this.config.label_min_cell || 'Min Cell'}</div><div class="v" id="bMinCell">-- V</div></div>
        <div class="st"><div class="l">${this.config.label_max_cell || 'Max Cell'}</div><div class="v" id="bMaxCell">-- V</div></div>
        <div class="st"><div class="l">${this.config.label_batt_dis || 'Batt Dis.'}</div><div class="v" id="bBattDis">-- kWh</div></div>
      </div>
      <div class="dv"></div>
      <div class="ct">☀️ Solar</div>
      <div class="pvf">
        <div class="pvi"><div class="ico">☀️</div><div class="lbl">Today PV</div><div class="val yw" id="statTodayPv">-- kWh</div></div>
        <div class="pvi"><div class="ico">⚡</div><div class="lbl">Remaining</div><div class="val" id="statRemCap">-- Ah</div></div>
        <div class="pvi"><div class="ico">⚡</div><div class="lbl">Time Remaining</div><div class="v" id="bEndurance">--</div></div>
        <div class="pvi"><div class="ico">🏡</div><div class="lbl">Today Load</div><div class="val" id="statTodayLoad">-- kWh</div></div>
      </div>
    </div>`;
  }

  _updateDynamic() {
    if (!this._hass || !this.config) return;
    const root = this.shadowRoot;
    const getEl = (id) => root.getElementById(id);
    const setText = (id, txt) => { const el = getEl(id); if (el) el.textContent = txt; };
    const setAttr = (id, attr, val) => { const el = getEl(id); if (el) el.setAttribute(attr, val); };
    const setDisplay = (id, visible) => { const el = getEl(id); if (!el) return; el.style.display = visible ? '' : 'none'; };

    const pv1 = this._powerWatts(this.config.pv1_power) ?? this._val(this.config.pv1_power) ?? 0;
    const totalPvSensor = this._powerWatts(this.config.pv_total_power) ?? this._val(this.config.pv_total_power);
    const pvTotal = (totalPvSensor !== null && !isNaN(totalPvSensor) && totalPvSensor > 0) ? totalPvSensor : pv1;
    // grid_power: positive = import from grid, negative = export to grid (watts; kW auto-converted)
    let gridActive = this._powerWatts(this.config.grid_power) ?? this._powerWatts(this.config.grid_active_power) ?? this._val(this.config.grid_power) ?? this._val(this.config.grid_active_power) ?? 0;
    if (!Number.isFinite(gridActive)) gridActive = 0;
    const gridFlowMinW = 5;
    const gridImport = this._val(this.config.grid_import_energy) || 0;
    const gridExport = this._val(this.config.grid_export_energy) || 0;
    const load = this._powerWatts(this.config.consump) ?? this._val(this.config.consump) ?? 0;
    const todayPv = this._val(this.config.today_pv) || 0;
    const todayBattChg = this._val(this.config.today_batt_chg) || 0;
    const todayLoad = this._val(this.config.today_load) || 0;
    const battSoc1 = this._val(this.config.battery_soc) || this._val(this.config.goodwe_battery_soc) || 0;
    let battPwr1 = this._val(this.config.battery_power) || 0;
    if (this.config.invert_battery_power) battPwr1 = -battPwr1;
    let battCurr1 = this._val(this.config.battery_current) || this._val(this.config.goodwe_battery_curr) || 0;
    if (this.config.invert_battery_power) battCurr1 = -battCurr1;
    const battVolt1 = this._val(this.config.battery_voltage) || 0;
    const battDis1 = this._val(this.config.batt_dis) || 0;

    // System limits – direct numbers
    const fullAh = Number(this.config.battery_full_ah) || 314;
    const fullWh = Number(this.config.battery_full_wh) || 16076;
    const battMax = Number(this.config.battery_max_power ?? this.config.inverter_max_power) || 6000;
    const pvMax = Number(this.config.pv_max_power) || 7500;

    const remCap1 = (battSoc1 / 100) * fullAh;

    const sun = this._sunData();
    const auraEl = getEl('skyAura');
    if (auraEl) auraEl.setAttribute('cy', (94 - Math.round((sun.bell || 0.5) * 22)).toString());
    ['arcSunDot', 'arcSunGlow1', 'arcSunGlow2'].forEach(id => { const e = getEl(id); if (e) { e.setAttribute('cx', sun.bx); e.setAttribute('cy', sun.by); } });
    getEl('arcSunGroup')?.setAttribute('opacity', sun.night ? '0' : '1');
    const moonGroup = getEl('moonGroup');
    if (sun.night) {
      ['moonGlow', 'moonDot'].forEach(id => { const e = getEl(id); if (e) { e.setAttribute('cx', sun.mx || 260); e.setAttribute('cy', sun.my || 72); } });
      if (moonGroup) moonGroup.setAttribute('opacity', '1');
    } else { if (moonGroup) moonGroup.setAttribute('opacity', '0'); }

    const pvTxt = (pvTotal >= 1000 ? (pvTotal / 1000).toFixed(2) + ' kW' : pvTotal.toFixed(0) + ' W') + ' ⚡';
    const pvLabelRect = getEl('arcPvLabelRect');
    const pvLabelText = getEl('arcPvLabelText');
    if (pvLabelRect) { pvLabelRect.setAttribute('x', sun.t < 0.5 ? Math.max(4, sun.bx - 108) : Math.min(sun.bx + 14, 420)); pvLabelRect.setAttribute('y', Math.max(2, sun.by - 28)); }
    if (pvLabelText) { pvLabelText.setAttribute('x', sun.t < 0.5 ? Math.max(52, sun.bx - 60) : Math.min(sun.bx + 62, 468)); pvLabelText.setAttribute('y', Math.max(19, sun.by - 11)); pvLabelText.textContent = pvTxt; }
    setText('arcRiseLabel', sun.rise);
    setText('arcSetLabel', sun.set);

    if (pvTotal !== this._prevPvTotal || sun.bx !== this._prevSunPos.bx || sun.by !== this._prevSunPos.by) {
      this._prevPvTotal = pvTotal; this._prevSunPos = { bx: sun.bx, by: sun.by };
      const pvGroup = getEl('pvFlowGroup');
      if (pvGroup) pvGroup.innerHTML = this._buildPvWaveHTML(sun.bx, sun.by, pvTotal);
    }

    const flowDur = (w) => Math.max(0.5, 3.0 - (Math.min(Math.abs(w), 8000) / 8000) * 2.5).toFixed(2) + 's';
    const setFlow = (id, show, watts, durStr, color) => {
      const el = getEl(id); if (!el) return;
      el.style.removeProperty('display');
      el.style.opacity = show ? '1' : '0';
      el.style.visibility = show ? 'visible' : 'hidden';
      if (!show) return;
      if (durStr !== undefined) { const anim = el.querySelector('animate'); if (anim) anim.setAttribute('dur', durStr); }
      if (color !== undefined) el.style.stroke = color;
    };

    const absPwr1 = Math.abs(battPwr1);
    const isCharging1 = battPwr1 > 10;
    const showBattIn = battPwr1 > 10;
    const showBattOut = battPwr1 < -10;
    let battLineColor = '#8b949e', battDur = '4.0s', battShowIn = false, battShowOut = false;
    if (absPwr1 < 10) { battShowIn = false; battShowOut = false; }
    else if (absPwr1 < 50) { battShowIn = showBattIn; battShowOut = showBattOut; battLineColor = '#8b949e'; }
    else { battShowIn = showBattIn; battShowOut = showBattOut; battDur = flowDur(absPwr1);
      if (isCharging1) battLineColor = '#2bff60';
      else if (absPwr1 < 1000) battLineColor = '#f39c4b';
      else if (absPwr1 < 2500) battLineColor = '#e67e22';
      else battLineColor = '#f85149'; }
    setFlow('flowBattIn', battShowIn, absPwr1, battDur, battLineColor);
    setFlow('flowBattOut', battShowOut, absPwr1, battDur, battLineColor);
    const gridImporting = gridActive > gridFlowMinW;
    const gridExporting = gridActive < -gridFlowMinW;
    setFlow('flowGridIn', gridImporting, gridActive, flowDur(gridActive), '#FF2929');
    setFlow('flowGridOut', gridExporting, Math.abs(gridActive), flowDur(Math.abs(gridActive)), '#2ecc71');
    const gridWireBase = getEl('gridWireBase');
    if (gridWireBase) {
      gridWireBase.setAttribute('opacity', gridImporting || gridExporting ? '0.35' : '0.75');
      gridWireBase.setAttribute('stroke', gridImporting ? '#FF2929' : gridExporting ? '#2ecc71' : '#8b949e');
    }

    // Dominant colour for power reaching the home (via gateway)
    const absGrid = Math.abs(gridActive > 10 ? gridActive : 0);
    const absBattOut = battPwr1 < -10 ? Math.abs(battPwr1) : 0;
    const absPvLoad = pvTotal > 10 ? pvTotal : 0;
    let loadFlowColor = '#ffe83c';
    if (absGrid >= absPvLoad && absGrid >= absBattOut && absGrid > 10) {
      loadFlowColor = '#FF2929';
    } else if (absBattOut >= absPvLoad && absBattOut >= absGrid && absBattOut > 10) {
      loadFlowColor = absBattOut < 1000 ? '#f39c4b' : absBattOut < 2500 ? '#e67e22' : '#f85149';
    }

    const showPvGw = pvTotal > 10;

    // Gateway → home (any source feeding the load through the hub)
    const showGwHome = load > gridFlowMinW || pvTotal > gridFlowMinW || Math.abs(gridActive) >= gridFlowMinW || absPwr1 >= 10;
    const gwHomeOut = load > gridFlowMinW || battPwr1 < -10 || gridExporting || (pvTotal > gridFlowMinW && load <= gridFlowMinW && !gridImporting);
    let gwHomeColor = '#8b949e';
    if (showGwHome) {
      if (load > gridFlowMinW && absPvLoad >= absGrid && absPvLoad >= absBattOut) gwHomeColor = loadFlowColor;
      else if (absPwr1 >= Math.abs(gridActive) && absPwr1 >= 10) gwHomeColor = battLineColor;
      else if (gridImporting) gwHomeColor = '#FF2929';
      else if (gridExporting) gwHomeColor = '#2ecc71';
      else if (pvTotal > gridFlowMinW) gwHomeColor = '#ffe83c';
      else if (load > gridFlowMinW) gwHomeColor = loadFlowColor;
    }
    const gwHomeW = showGwHome ? Math.max(load, pvTotal, absPwr1, Math.abs(gridActive)) : 0;
    const gwHomeDur = flowDur(gwHomeW);
    const gwHomeFlowing = showGwHome && gwHomeW > gridFlowMinW;
    setFlow('flowGwHomeIn', gwHomeFlowing && !gwHomeOut, gwHomeW, gwHomeDur, gwHomeColor);
    setFlow('flowGwHomeOut', gwHomeFlowing && gwHomeOut, gwHomeW, gwHomeDur, gwHomeColor);
    const gwHomeWireBase = getEl('gwHomeWireBase');
    if (gwHomeWireBase) {
      gwHomeWireBase.style.opacity = gwHomeFlowing ? '0.3' : '0.9';
      gwHomeWireBase.style.stroke = gwHomeFlowing ? gwHomeColor : '#c9d1d9';
    }

    // Icon glows
    const battIconWrap = getEl('battIconWrap');
    if (battIconWrap) { battIconWrap.setAttribute('filter', absPwr1 >= 50 ? 'url(#iconGlowBlue)' : ''); }
    const gridImg = getEl('gridIconImg');
    if (gridImg) { gridImg.style.opacity = !gridImporting && !gridExporting ? '0.4' : '1'; gridImg.setAttribute('filter', gridActive >= 50 ? 'url(#iconGlowOrange)' : gridActive <= -50 ? 'url(#iconGlowYellow)' : ''); }
    const gwImg = getEl('gatewayIconImg');
    if (gwImg) {
      const gwActive = showPvGw || showGwHome;
      gwImg.style.opacity = gwActive ? '1' : '0.55';
      gwImg.setAttribute('filter', gwActive && (pvTotal >= 50 || gwHomeW >= 50) ? 'url(#iconGlowBlue)' : (showPvGw ? 'url(#iconGlowYellow)' : ''));
    }
    const homeImg = getEl('homeIconImg');
    if (homeImg) { homeImg.style.opacity = load > gridFlowMinW ? '1' : '0.7'; homeImg.setAttribute('filter', load > gridFlowMinW ? 'url(#iconGlowOrange)' : ''); }

    // Battery fill & stats
    const fill = this._battFill(battSoc1);
    const bf = getEl('battFillBar'); if (bf) { bf.setAttribute('y', fill.y); bf.setAttribute('height', fill.height); bf.setAttribute('fill', fill.color); bf.setAttribute('filter', fill.filter); }
    const bh = getEl('battFillHL'); if (bh) { bh.setAttribute('y', fill.y); bh.setAttribute('height', fill.height); }
    setText('fcBattVal', battSoc1 + '%'); setAttr('fcBattVal', 'fill', fill.textColor);
    setText('battVoltageFlow', battVolt1.toFixed(1) + ' V');
    setText('battPwrFlow', absPwr1.toFixed(0) + ' W');
    setText('battCurrFlow', battCurr1.toFixed(1) + ' A');
    setText('battCurrFlow', (battVolt1 / absPwr1).toFixed(1) + ' A');
    const bolt = getEl('battBoltGroup'); if (bolt) bolt.setAttribute('opacity', (battPwr1 > 10 && absPwr1 >= 10) ? '1' : '0');
    setText('bBattDis', battDis1 + ' kWh');

    // Endurance
    let endText = '--', endColor = '#8b949e';
    const remWh = (remCap1 / fullAh) * fullWh;
    if (battPwr1 < -10) {
      const left = remWh / Math.abs(battPwr1);
      const ec = left >= 5 ? '#4ade80' : '#f85149';
      endText = this._fmtTime(left); endColor = ec;
    } else if (battPwr1 > 10) {
      const missingWh = ((fullAh - remCap1) / fullAh) * fullWh;
      const eta = Math.max(0, missingWh / Math.abs(battPwr1));
      endText = 'ETA ' + this._fmtTime(eta); endColor = '#00d7ff';
    }
    setText('bEndurance', endText);
    getEl('bEndurance').style.color = endColor;
    setText('bEnduranceSvg', endText);
    const _bEndSvg = getEl('bEnduranceSvg'); if (_bEndSvg) { _bEndSvg.setAttribute('fill', endColor); }

    // bEnduEta — same logic, shown below the battery icon in SVG
    // Label switches between "ENDU" (discharging) and "ETA" (charging)
    {
      let enduEtaText = '--', enduEtaColor = '#8b949e', enduEtaLabelText = 'ENDU';
      const remWhB = (remCap1 / fullAh) * fullWh;
      if (battPwr1 < -10) {
        const left = remWhB / Math.abs(battPwr1);
        enduEtaText = this._fmtTime(left);
        enduEtaColor = left >= 5 ? '#4ade80' : '#f85149';
        enduEtaLabelText = 'ENDU';
      } else if (battPwr1 > 10) {
        const missingWhB = ((fullAh - remCap1) / fullAh) * fullWh;
        const eta = Math.max(0, missingWhB / Math.abs(battPwr1));
        enduEtaText = this._fmtTime(eta);
        enduEtaColor = '#00d7ff';
        enduEtaLabelText = 'ETA';
      }
      const _enduLbl = getEl('bEnduEtaLabel');
      if (_enduLbl) { _enduLbl.textContent = this.config.label_endu_eta || enduEtaLabelText; _enduLbl.setAttribute('fill', enduEtaColor); }
      const _enduVal = getEl('bEnduEta');
      if (_enduVal) { _enduVal.textContent = enduEtaText; _enduVal.setAttribute('fill', enduEtaColor); }
    }

    const pwrBar = getEl('pwrBar');
    if (pwrBar) {
      pwrBar.style.width = Math.min(absPwr1 / battMax * 100, 100).toFixed(1) + '%';
      pwrBar.style.background = absPwr1 < 50 ? '#8b949e' : isCharging1 ? '#2b59ff' :
        'linear-gradient(to right, #f4d03f, #f39c4b ' + ((absPwr1 / battMax * 100) * 0.5).toFixed(0) + '%, #f85149)';
    }
    const badge = getEl('battStatusBadge');
    if (badge) { badge.textContent = absPwr1 < 50 ? 'IDLE' : isCharging1 ? 'CHG' : 'DISCHG'; badge.style.color = absPwr1 < 50 ? '#8b949e' : isCharging1 ? '#00d7ff' : '#3ce878'; }

    const gridDir = gridImporting ? '▼ ' : gridExporting ? '▲ ' : '';
    const gridValTxt = Math.abs(gridActive) >= 1000
      ? (Math.abs(gridActive) / 1000).toFixed(2) + ' kW'
      : Math.abs(gridActive).toFixed(0) + ' W';
    setText('fcGridVal', gridDir + gridValTxt);
    setAttr('fcGridVal', 'fill', gridImporting ? '#FF2929' : gridExporting ? '#2ecc71' : '#3a3a3a');

    setText('fcLoadVal', load >= 1000 ? (load / 1000).toFixed(2) + ' kW' : load.toFixed(0) + ' W');
    setAttr('fcLoadVal', 'fill', load > gridFlowMinW ? loadFlowColor : '#8b949e');

    setText('pv1FlowVal', pv1 >= 1000 ? (pv1 / 1000).toFixed(2) + ' kW' : pv1.toFixed(0) + ' W');

    setText('statTodayPv', (todayPv / 1000).toFixed(2) + ' kWh');
    setText('statTodayBattChg', todayBattChg + ' kWh');
    setText('statTodayBattDis', battDis1 + ' kWh');
    setText('statTodayLoad', todayLoad + ' kWh');
    const totalRemAh = remCap1;
    const statRemCapEl = getEl('statRemCap');
    if (statRemCapEl) { statRemCapEl.textContent = totalRemAh.toFixed(1) + ' Ah'; statRemCapEl.style.color = this._remCapColor((remCap1 / fullAh) * 100); }

    const pvBlocks = getEl('pvBlocks');
    if (pvBlocks) { const lit = Math.round((pvTotal / pvMax) * 20); const heights = [20, 35, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]; let html = ''; for (let i = 0; i < 20; i++) html += `<div style="flex:1;background:${i < lit ? 'rgba(255,255,255,0.55)' : '#21262d'};height:${i < lit ? heights[i] : 100}%;opacity:${i < lit ? 1 : 0.35};border-radius:2px;"></div>`; pvBlocks.innerHTML = html; }

    // EV
    const evGroup = getEl('evGroup');
    if (evGroup) {
      if (!this.config._show_ev) { evGroup.style.display = 'none'; return; }
      evGroup.style.display = '';
      const isChargingEV = chargerStateStr === 'charging';
      const isCompleted = chargerStateStr === 'completed' || chargerStateStr === 'finished';
      const evFlow = getEl('flowHomeEV');
      const evIcon = getEl('evIconImg');
      if (evFlow) {
        if (isChargingEV) {
          evFlow.setAttribute('opacity', '0.9'); evFlow.setAttribute('stroke', '#2b59ff');
          if (evIcon) evIcon.setAttribute('filter', 'url(#iconGlowOrange)');
        } else if (isCompleted) {
          evFlow.setAttribute('opacity', '0');
          if (evIcon) evIcon.setAttribute('filter', 'url(#iconGlowGreen)');
        } else {
          evFlow.setAttribute('opacity', '0');
          if (evIcon) { evIcon.setAttribute('filter', ''); evIcon.style.opacity = '0.3'; }
        }
      }
      if (isChargingEV || isCompleted) {
        setText('evPowerVal', chargerPower.toFixed(0) + ' W');
        setText('evCurrentVal', chargerCurrent.toFixed(1) + ' A');
        setText('evSocVal', chargerSoc.toFixed(0) + ' %');
        let evEta = '--';
        if (isChargingEV) {
          if (chargerEtaSensor !== null && !isNaN(chargerEtaSensor)) evEta = this._fmtTime(chargerEtaSensor / 60);
          else if (chargerBattCapWh && chargerSoc > 0 && chargerPower > 0) {
            const remainingWh = chargerBattCapWh * (100 - chargerSoc) / 100;
            const hours = remainingWh / chargerPower;
            evEta = this._fmtTime(hours);
          }
        } else if (isCompleted) {
          evEta = 'Full';
        }
        setText('evEtaVal', evEta);
      } else {
        setText('evPowerVal', '-- W');
        setText('evCurrentVal', '-- A');
        setText('evSocVal', '-- %');
        setText('evEtaVal', '--');
      }
    }
  }
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'k-flow-card',
  name: 'K-Flow Card',
  description: 'Solar Energy Flow Card',
  preview: true,
  version: '7.1.1',
});
customElements.define('k-flow-card', KFlowCard);
