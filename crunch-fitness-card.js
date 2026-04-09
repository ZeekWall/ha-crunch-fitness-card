/**
 * Crunch Fitness Card for Home Assistant
 * https://github.com/ZeekWall/ha-crunch-fitness-card
 *
 * Displays class schedules from the Crunch Fitness integration.
 * Supports multiple gym locations, live search, spot counts, and calendar booking.
 * Compatible with HACS.
 */

// ─── Visual Editor ────────────────────────────────────────────────────────────

class CrunchFitnessCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  setConfig(config) {
    if (config.entity && !config.entities) {
      this._config = { ...config, entities: [config.entity] };
      delete this._config.entity;
    } else {
      this._config = { ...config };
    }
    if (!this._config.entities) this._config.entities = [''];
    this._render();
  }

  _render() {
    const entities = this._config.entities.length ? this._config.entities : [''];

    const pickerRows = entities.map((e, i) => `
      <div class="entity-row" data-index="${i}">
        <ha-entity-picker class="entity-picker" data-index="${i}" label="Location ${i + 1}" allow-custom-entity></ha-entity-picker>
        <button class="remove-btn" data-index="${i}" title="Remove">✕</button>
      </div>
    `).join('');

    this.innerHTML = `
      <div class="editor">
        <div class="section-label">Locations</div>
        <div class="entities-list">${pickerRows}</div>
        <button class="add-btn">+ Add Location</button>

        <div class="divider"></div>

        <div class="section-label">Calendar</div>
        <ha-entity-picker id="calendar-picker" label="Calendar for bookings" allow-custom-entity></ha-entity-picker>
        <p class="hint">Select a writable HA calendar. Clicking a class will offer to add it as an event.</p>

        <div class="divider"></div>

        <label class="field-label">Card title (optional)</label>
        <input class="text-input" id="title-input" type="text"
          placeholder="Defaults to location name(s)"
          value="${this._escapeAttr(this._config.title || '')}" />

        <div class="toggle-row">
          <label for="all-classes-toggle">Show full week schedule</label>
          <input type="checkbox" id="all-classes-toggle" ${this._config.show_all_classes ? 'checked' : ''} />
        </div>

        <label class="field-label">Max height in pixels (default: 400)</label>
        <input class="text-input" id="max-height-input" type="number" min="100" step="50"
          placeholder="400"
          value="${this._escapeAttr(this._config.max_height != null ? String(this._config.max_height) : '')}" />
      </div>

      <style>
        .editor { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        .section-label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #727272); text-transform: uppercase; letter-spacing: 0.5px; }
        .entities-list { display: flex; flex-direction: column; gap: 8px; }
        .entity-row { display: flex; align-items: center; gap: 8px; }
        .entity-row ha-entity-picker { flex: 1; display: block; }
        .remove-btn { flex-shrink: 0; background: none; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px; color: var(--secondary-text-color, #727272); cursor: pointer; font-size: 12px; padding: 4px 8px; line-height: 1; }
        .remove-btn:hover { color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
        .add-btn { background: none; border: 1px dashed var(--primary-color, #e31837); border-radius: 4px; color: var(--primary-color, #e31837); cursor: pointer; font-size: 13px; padding: 8px; width: 100%; }
        .add-btn:hover { background: rgba(227,24,55,0.06); }
        .divider { border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08)); margin: 4px 0; }
        .field-label { font-size: 12px; color: var(--secondary-text-color, #727272); margin-bottom: -6px; }
        .hint { margin: -6px 0 0; font-size: 11px; color: var(--secondary-text-color, #9e9e9e); }
        .text-input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px; background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); font-size: 14px; }
        .text-input:focus { outline: none; border-color: var(--primary-color, #e31837); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--primary-text-color, #212121); }
        input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #e31837); }
      </style>
    `;

    // Location pickers
    this.querySelectorAll('ha-entity-picker.entity-picker').forEach((picker, i) => {
      picker.hass = this._hass;
      picker.value = entities[i] || '';
      picker.includeDomains = ['sensor'];
      picker.addEventListener('value-changed', (e) => {
        const updated = [...this._config.entities];
        updated[parseInt(picker.dataset.index, 10)] = e.detail.value;
        this._updateConfig('entities', updated);
      });
    });

    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const updated = this._config.entities.filter((_, i) => i !== parseInt(btn.dataset.index, 10));
        this._config.entities = updated.length ? updated : [''];
        this._updateConfig('entities', this._config.entities);
        this._render();
      });
    });

    this.querySelector('.add-btn').addEventListener('click', () => {
      this._config.entities = [...this._config.entities, ''];
      this._updateConfig('entities', this._config.entities);
      this._render();
    });

    // Calendar picker
    const calPicker = this.querySelector('#calendar-picker');
    if (calPicker) {
      calPicker.hass = this._hass;
      calPicker.value = this._config.calendar_entity || '';
      calPicker.includeDomains = ['calendar'];
      calPicker.addEventListener('value-changed', (e) => {
        this._updateConfig('calendar_entity', e.detail.value || null);
      });
    }

    this.querySelector('#title-input').addEventListener('change', (e) => {
      this._updateConfig('title', e.target.value || null);
    });

    this.querySelector('#all-classes-toggle').addEventListener('change', (e) => {
      this._updateConfig('show_all_classes', e.target.checked);
    });

    this.querySelector('#max-height-input').addEventListener('change', (e) => {
      this._updateConfig('max_height', e.target.value ? parseInt(e.target.value, 10) : null);
    });
  }

  _updateConfig(field, value) {
    const cfg = { ...this._config };
    if (value === null || value === undefined || value === '') { delete cfg[field]; } else { cfg[field] = value; }
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _escapeAttr(str) { return String(str).replace(/"/g, '&quot;'); }
}

customElements.define('crunch-fitness-card-editor', CrunchFitnessCardEditor);

// ─── Main Card ────────────────────────────────────────────────────────────────

class CrunchFitnessCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._filterText = '';
    this._displayedClasses = [];
    this._addedClasses = new Set();   // class IDs added to calendar this session
    this._escHandler = (e) => { if (e.key === 'Escape') this._closePopup(); };
  }

  static getConfigElement() { return document.createElement('crunch-fitness-card-editor'); }
  static getStubConfig() { return { entities: [] }; }

  static getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_rows: 6,
      grid_min_columns: 2,
      grid_min_rows: 2,
    };
  }

  setConfig(config) {
    let entities = config.entities?.length ? config.entities : config.entity ? [config.entity] : [];
    this._config = { title: null, show_all_classes: false, max_height: 400, ...config, entities };
    if (config.instructor && !this._filterText) this._filterText = config.instructor;
    this._fullRender();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot.querySelector('#class-container')) {
      this._updateClassList();
    } else {
      this._fullRender();
    }
  }

  getCardSize() { return 4; }

  // ── Data ────────────────────────────────────────────────────────────────────

  _gatherClasses() {
    const empty = { source: [], totalToday: 0, totalWeek: 0, lastUpdated: null, multiLocation: false, errors: [] };
    if (!this._hass) return empty;
    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) return empty;

    const multiLocation = entityIds.length > 1;
    let todayClasses = [], weekClasses = [], totalToday = 0, totalWeek = 0, lastUpdated = null;
    const errors = [];

    for (const entityId of entityIds) {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) { errors.push(entityId); continue; }
      const attrs = stateObj.attributes;
      const loc = attrs.location || entityId;
      const tag = c => ({ ...c, _location: loc, _entityId: entityId });

      todayClasses = todayClasses.concat((attrs.today_classes || []).map(tag));
      weekClasses  = weekClasses.concat((attrs.all_classes   || []).map(tag));
      totalToday  += attrs.today_count     || 0;
      totalWeek   += attrs.total_this_week || 0;

      const lu = attrs.last_updated || stateObj.last_updated;
      if (lu && (!lastUpdated || new Date(lu) < new Date(lastUpdated))) lastUpdated = lu;
    }

    const byTime = (a, b) => {
      if (!a.local_start_time && !b.local_start_time) return 0;
      if (!a.local_start_time) return 1;
      if (!b.local_start_time) return -1;
      return new Date(a.local_start_time) - new Date(b.local_start_time);
    };
    todayClasses.sort(byTime);
    weekClasses.sort(byTime);

    const source = this._config.show_all_classes ? weekClasses : todayClasses;
    return { source, totalToday, totalWeek, lastUpdated, multiLocation, errors };
  }

  _applyFilter(source, filterText) {
    const q = filterText.trim().toLowerCase();
    if (!q) return source;
    return source.filter(c =>
      (c.name       || '').toLowerCase().includes(q) ||
      (c.instructor || '').toLowerCase().includes(q) ||
      (c.category   || '').toLowerCase().includes(q)
    );
  }

  // ── Full render (structure) ─────────────────────────────────────────────────

  _fullRender() {
    if (!this._config) return;
    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) {
      this._renderPrompt('Please configure at least one Crunch Fitness sensor entity.');
      return;
    }
    if (!this._hass) return;

    const { totalWeek, lastUpdated, errors } = this._gatherClasses();

    let title = this._config.title;
    if (!title) {
      const locs = entityIds.map(id => this._hass.states[id]?.attributes?.location).filter(Boolean);
      title = locs.length ? locs.join(' & ') : 'Crunch Fitness';
    }

    const maxH = this._config.max_height || 400;
    this.style.setProperty('--crunch-list-max-height', `${maxH}px`);

    const errorHtml = errors.length
      ? `<div class="error-row">Entity not found: ${errors.map(e => this._escapeHtml(e)).join(', ')}</div>`
      : '';

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:dumbbell"></ha-icon>
          <span class="title">${this._escapeHtml(title)}</span>
        </div>

        ${errorHtml}

        <div class="search-bar">
          <ha-icon icon="mdi:magnify"></ha-icon>
          <input id="search-input" type="text" placeholder="Filter by class, instructor…" autocomplete="off" spellcheck="false" />
          <button id="search-clear" class="clear-btn" aria-label="Clear">✕</button>
        </div>

        <div id="class-container" class="class-container"></div>

        <div class="card-footer">
          <span>Week: <strong>${this._escapeHtml(String(totalWeek))}</strong> classes</span>
          ${lastUpdated ? `<span>Updated ${this._escapeHtml(this._timeAgo(lastUpdated))}</span>` : ''}
        </div>
      </ha-card>

      <style>
        :host { display: block; height: 100%; }
        ha-card { display: flex; flex-direction: column; height: 100%; overflow: hidden; font-family: var(--paper-font-body1_-_font-family, sans-serif); background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); }

        /* Header */
        .card-header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #e31837; color: #fff; }
        .card-header ha-icon { --mdc-icon-size: 20px; color: #fff; flex-shrink: 0; }
        .title { font-size: 15px; font-weight: 700; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Search bar */
        .search-bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08)); background: var(--secondary-background-color, rgba(0,0,0,0.03)); }
        .search-bar ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color, #727272); flex-shrink: 0; }
        #search-input { flex: 1; border: none; background: transparent; color: var(--primary-text-color, #212121); font-size: 13px; outline: none; min-width: 0; }
        #search-input::placeholder { color: var(--secondary-text-color, #9e9e9e); }
        .clear-btn { background: none; border: none; color: var(--secondary-text-color, #9e9e9e); cursor: pointer; font-size: 12px; padding: 0 2px; line-height: 1; display: none; }
        .clear-btn.visible { display: block; }
        .clear-btn:hover { color: var(--primary-text-color, #212121); }

        /* Scrollable class list — flex:1 fills grid-allocated height; max-height is fallback for non-grid use */
        .class-container { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 6px 4px; scrollbar-width: thin; scrollbar-color: var(--divider-color, #ccc) transparent; max-height: var(--crunch-list-max-height, 400px); }
        .class-container::-webkit-scrollbar { width: 4px; }
        .class-container::-webkit-scrollbar-track { background: transparent; }
        .class-container::-webkit-scrollbar-thumb { background: var(--divider-color, #ccc); border-radius: 2px; }

        /* Date separators */
        .date-separator { padding: 8px 8px 2px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text-color, #727272); }

        /* Class rows */
        .class-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; transition: background 0.15s; cursor: pointer; }
        .class-row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.06)); }
        .class-row.past { opacity: 0.35; }
        .class-row.is-next { background: rgba(227,24,55,0.07); border-left: 3px solid #e31837; padding-left: 5px; }
        .class-row.is-next:hover { background: rgba(227,24,55,0.12); }

        .class-time { display: flex; flex-direction: column; align-items: flex-end; min-width: 46px; flex-shrink: 0; }
        .time { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .duration { font-size: 10px; color: var(--secondary-text-color, #727272); }

        .class-info { flex: 1; min-width: 0; }
        .class-name-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .class-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .loc-badge { font-size: 10px; font-weight: 600; color: #e31837; background: rgba(227,24,55,0.10); padding: 1px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
        .next-badge { font-size: 9px; font-weight: 700; color: #fff; background: #e31837; padding: 2px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
        .class-meta { display: flex; flex-wrap: wrap; gap: 0 8px; font-size: 11px; color: var(--secondary-text-color, #727272); margin-top: 1px; }
        .meta-item { white-space: nowrap; }

        .class-right { flex-shrink: 0; text-align: right; }
        .spots { display: inline-block; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; padding: 2px 6px; border-radius: 4px; }
        .spots-ok  { color: #2e7d32; background: rgba(46,125,50,0.12); }
        .spots-mid { color: #f57c00; background: rgba(245,124,0,0.12); }
        .spots-low { color: #c62828; background: rgba(198,40,40,0.12); }
        .spots:not(.spots-ok):not(.spots-mid):not(.spots-low) { color: var(--secondary-text-color, #727272); background: var(--secondary-background-color, rgba(0,0,0,0.06)); }

        .empty { padding: 18px 16px; text-align: center; color: var(--secondary-text-color, #727272); font-size: 13px; font-style: italic; }

        /* Error */
        .error-row { padding: 6px 14px; font-size: 11px; color: var(--error-color, #db4437); background: rgba(219,68,55,0.08); }

        /* Footer */
        .card-footer { display: flex; justify-content: space-between; align-items: center; padding: 6px 14px 10px; font-size: 11px; color: var(--secondary-text-color, #727272); border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08)); }

        /* Prompt */
        .prompt { padding: 20px 16px; text-align: center; color: var(--secondary-text-color, #727272); font-size: 14px; font-style: italic; }

        /* ── Popup overlay ── */
        .popup-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998; animation: fadeIn 0.15s ease; }
        .popup-panel {
          position: fixed; z-index: 9999;
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: min(420px, calc(100vw - 32px));
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: slideUp 0.18s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translate(-50%, -44%); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }

        .popup-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 16px 12px; background: #e31837; color: #fff; }
        .popup-class-name { font-size: 18px; font-weight: 700; line-height: 1.2; flex: 1; margin-right: 8px; }
        .popup-close { background: rgba(255,255,255,0.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .popup-close:hover { background: rgba(255,255,255,0.35); }

        .popup-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .popup-detail { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; }
        .popup-detail ha-icon { --mdc-icon-size: 16px; color: var(--secondary-text-color, #727272); margin-top: 1px; flex-shrink: 0; }
        .popup-detail-text { line-height: 1.4; }
        .popup-detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text-color, #727272); }

        .popup-footer { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 8px; }
        .popup-cal-btn {
          width: 100%; padding: 11px; border: none; border-radius: 8px;
          background: #e31837; color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s;
        }
        .popup-cal-btn:hover:not(:disabled) { background: #c41230; }
        .popup-cal-btn:disabled { opacity: 0.6; cursor: default; }
        .popup-cal-btn.added { background: #2e7d32; }
        .popup-cal-btn ha-icon { --mdc-icon-size: 18px; color: #fff; }
        .popup-no-cal { font-size: 11px; color: var(--secondary-text-color, #9e9e9e); text-align: center; }
        .popup-error { font-size: 12px; color: var(--error-color, #c62828); text-align: center; display: none; }
        .popup-reg-note { font-size: 11px; color: var(--secondary-text-color, #9e9e9e); text-align: center; }
      </style>
    `;

    // Search input
    const input = this.shadowRoot.querySelector('#search-input');
    const clearBtn = this.shadowRoot.querySelector('#search-clear');
    input.value = this._filterText;
    if (this._filterText) clearBtn.classList.add('visible');

    input.addEventListener('input', (e) => {
      this._filterText = e.target.value;
      clearBtn.classList.toggle('visible', !!this._filterText);
      this._updateClassList();
    });

    clearBtn.addEventListener('click', () => {
      this._filterText = '';
      input.value = '';
      clearBtn.classList.remove('visible');
      input.focus();
      this._updateClassList();
    });

    // Delegated click on class rows
    const container = this.shadowRoot.querySelector('#class-container');
    container.addEventListener('click', (e) => {
      const row = e.target.closest('.class-row');
      if (!row) return;
      const idx = parseInt(row.dataset.idx, 10);
      const cls = this._displayedClasses[idx];
      if (cls) this._openPopup(cls);
    });

    this._updateClassList();
  }

  // ── Class list (partial refresh) ────────────────────────────────────────────

  _updateClassList() {
    const container = this.shadowRoot.querySelector('#class-container');
    if (!container) return;

    const { source, multiLocation } = this._gatherClasses();
    const filtered = this._applyFilter(source, this._filterText);
    const nextClass = filtered.find(c => !this._isClassPast(c)) || null;
    this._displayedClasses = filtered;

    container.innerHTML = this._buildListHtml(filtered, nextClass, multiLocation);
  }

  _buildListHtml(classes, nextClass, multiLocation) {
    if (!classes.length) {
      const msg = this._filterText
        ? `No classes matching "${this._escapeHtml(this._filterText)}"`
        : 'No upcoming classes';
      return `<div class="empty">${msg}</div>`;
    }

    let html = '';
    let lastDate = null;

    classes.forEach((cls, idx) => {
      if (this._config.show_all_classes) {
        const dateLabel = this._fmtClassDate(cls);
        if (dateLabel && dateLabel !== lastDate) {
          html += `<div class="date-separator">${this._escapeHtml(dateLabel)}</div>`;
          lastDate = dateLabel;
        }
      }

      const past   = this._isClassPast(cls);
      const isNext = this._isNext(cls, nextClass);
      const time   = this._fmtLocalTime(cls.local_time);
      const dur    = cls.duration_min ? `${cls.duration_min}m` : '';

      let spotsHtml = '';
      if (cls.spots_available != null) {
        const avail = cls.spots_available, total = cls.total_spots;
        const ratio = total ? avail / total : null;
        const sc = ratio !== null ? (ratio <= 0.25 ? 'spots-low' : ratio <= 0.5 ? 'spots-mid' : 'spots-ok') : '';
        spotsHtml = `<span class="spots ${sc}">${this._escapeHtml(total ? `${avail}/${total}` : String(avail))}</span>`;
      }

      const instructor = cls.instructor && cls.instructor !== 'TBD'
        ? `<span class="meta-item">${this._escapeHtml(cls.instructor)}</span>` : '';
      const room = cls.room ? `<span class="meta-item">${this._escapeHtml(cls.room)}</span>` : '';
      const locBadge = multiLocation ? `<span class="loc-badge">${this._escapeHtml(cls._location)}</span>` : '';

      html += `
        <div class="class-row${past ? ' past' : ''}${isNext ? ' is-next' : ''}" data-idx="${idx}" title="Tap to view details">
          <div class="class-time">
            <span class="time">${this._escapeHtml(time)}</span>
            ${dur ? `<span class="duration">${this._escapeHtml(dur)}</span>` : ''}
          </div>
          <div class="class-info">
            <div class="class-name-row">
              <span class="class-name">${this._escapeHtml(cls.name || 'Class')}</span>
              ${locBadge}
              ${isNext ? '<span class="next-badge">NEXT</span>' : ''}
            </div>
            <div class="class-meta">${instructor}${room}</div>
          </div>
          <div class="class-right">${spotsHtml}</div>
        </div>`;
    });

    return html;
  }

  // ── Popup ────────────────────────────────────────────────────────────────────

  _openPopup(cls) {
    this._closePopup(); // remove any existing one
    document.addEventListener('keydown', this._escHandler);

    const startDt  = this._classDate(cls);
    const dateStr  = startDt
      ? startDt.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      : '';
    const startFmt = this._fmtLocalTime(cls.local_time);
    const endFmt   = cls.duration_min ? this._fmtLocalTimeAdd(cls.local_time, cls.duration_min) : '';
    const timeRange = endFmt ? `${startFmt} – ${endFmt}` : startFmt;
    const dur  = cls.duration_min ? ` (${cls.duration_min} min)` : '';
    const alreadyAdded = cls.id && this._addedClasses.has(cls.id);
    const calConfigured = !!this._config.calendar_entity;

    let spotsText = '';
    if (cls.spots_available != null) {
      spotsText = cls.total_spots
        ? `${cls.spots_available} of ${cls.total_spots} spots available`
        : `${cls.spots_available} spots available`;
    }

    let calBtnHtml = '';
    if (!calConfigured) {
      calBtnHtml = `<div class="popup-no-cal">Configure a calendar in card settings to enable booking reminders.</div>`;
    } else if (alreadyAdded) {
      calBtnHtml = `<button class="popup-cal-btn added" disabled><ha-icon icon="mdi:check"></ha-icon>Added to Calendar</button>`;
    } else {
      calBtnHtml = `<button class="popup-cal-btn" id="popup-add-cal"><ha-icon icon="mdi:calendar-plus"></ha-icon>Add to Calendar</button>`;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'popup-backdrop';
    backdrop.addEventListener('click', () => this._closePopup());

    const panel = document.createElement('div');
    panel.className = 'popup-panel';
    panel.innerHTML = `
      <div class="popup-header">
        <div class="popup-class-name">${this._escapeHtml(cls.name || 'Class')}</div>
        <button class="popup-close" aria-label="Close">✕</button>
      </div>
      <div class="popup-body">
        ${dateStr ? `
          <div class="popup-detail">
            <ha-icon icon="mdi:calendar"></ha-icon>
            <div class="popup-detail-text">${this._escapeHtml(dateStr)}</div>
          </div>` : ''}
        <div class="popup-detail">
          <ha-icon icon="mdi:clock-outline"></ha-icon>
          <div class="popup-detail-text">${this._escapeHtml(timeRange)}${this._escapeHtml(dur)}</div>
        </div>
        ${cls.instructor && cls.instructor !== 'TBD' ? `
          <div class="popup-detail">
            <ha-icon icon="mdi:account"></ha-icon>
            <div class="popup-detail-text">${this._escapeHtml(cls.instructor)}</div>
          </div>` : ''}
        ${cls.room ? `
          <div class="popup-detail">
            <ha-icon icon="mdi:map-marker"></ha-icon>
            <div class="popup-detail-text">${this._escapeHtml(cls.room)}${cls._location ? ' · ' + this._escapeHtml(cls._location) : ''}</div>
          </div>` : (cls._location ? `
          <div class="popup-detail">
            <ha-icon icon="mdi:map-marker"></ha-icon>
            <div class="popup-detail-text">${this._escapeHtml(cls._location)}</div>
          </div>` : '')}
        ${spotsText ? `
          <div class="popup-detail">
            <ha-icon icon="mdi:account-group"></ha-icon>
            <div class="popup-detail-text">${this._escapeHtml(spotsText)}</div>
          </div>` : ''}
      </div>
      <div class="popup-footer">
        ${calBtnHtml}
        <div class="popup-error" id="popup-error"></div>
        ${calConfigured && !alreadyAdded ? `<div class="popup-reg-note">Registration opens 22 hours before class</div>` : ''}
      </div>
    `;

    panel.querySelector('.popup-close').addEventListener('click', () => this._closePopup());

    const addBtn = panel.querySelector('#popup-add-cal');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._addToCalendar(cls, panel));
    }

    this.shadowRoot.appendChild(backdrop);
    this.shadowRoot.appendChild(panel);
  }

  _closePopup() {
    this.shadowRoot.querySelector('.popup-backdrop')?.remove();
    this.shadowRoot.querySelector('.popup-panel')?.remove();
    document.removeEventListener('keydown', this._escHandler);
  }

  async _addToCalendar(cls, panel) {
    const btn = panel.querySelector('#popup-add-cal');
    const errEl = panel.querySelector('#popup-error');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<ha-icon icon="mdi:loading"></ha-icon>Adding…';

    const startDt = this._classDate(cls);
    if (!startDt) {
      if (errEl) { errEl.textContent = 'Cannot create event: class has no valid time.'; errEl.style.display = 'block'; }
      btn.disabled = false;
      btn.innerHTML = '<ha-icon icon="mdi:calendar-plus"></ha-icon>Add to Calendar';
      return;
    }
    const endMs = startDt.getTime() + (cls.duration_min || 60) * 60 * 1000;

    const fmtLocal = (d) => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
    };

    const descParts = [
      cls.instructor && cls.instructor !== 'TBD' ? `Instructor: ${cls.instructor}` : '',
      cls.room                                   ? `Room: ${cls.room}`             : '',
      cls.spots_available != null
        ? `Spots: ${cls.spots_available}${cls.total_spots ? '/' + cls.total_spots : ''}`
        : '',
      cls._location ? `Gym: Crunch ${cls._location}` : '',
      'Registration opens 22 hours before class start.',
    ].filter(Boolean).join('\n');

    try {
      await this._hass.callService('calendar', 'create_event', {
        entity_id: this._config.calendar_entity,
        summary: `${cls.name}${cls._location ? ' — Crunch ' + cls._location : ''}`,
        start_date_time: fmtLocal(startDt),
        end_date_time:   fmtLocal(new Date(endMs)),
        description: descParts,
      });

      if (cls.id) this._addedClasses.add(cls.id);
      btn.innerHTML = '<ha-icon icon="mdi:check"></ha-icon>Added to Calendar';
      btn.classList.add('added');

      // Hide the registration note once added
      panel.querySelector('.popup-reg-note')?.remove();

    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<ha-icon icon="mdi:calendar-plus"></ha-icon>Add to Calendar';
      if (errEl) {
        errEl.textContent = 'Failed to add event. Check that your calendar is writable.';
        errEl.style.display = 'block';
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Build a correct local Date from cls.date + cls.local_time.
  // Avoids timezone issues: local_start_time may carry a UTC offset that would
  // shift the time when parsed with new Date().
  _classDate(cls) {
    if (cls.date && cls.local_time) {
      const [y, mo, d] = cls.date.split('-').map(Number);
      const [h, m]     = cls.local_time.split(':').map(Number);
      if (!isNaN(y) && !isNaN(h)) return new Date(y, mo - 1, d, h, m, 0, 0);
    }
    // Fallback: strip any timezone suffix so Date() treats it as local time
    if (cls.local_start_time) {
      const stripped = cls.local_start_time.replace(/Z$/i, '').replace(/[+-]\d{2}:?\d{2}$/, '');
      const dt = new Date(stripped);
      if (!isNaN(dt)) return dt;
    }
    return null;
  }

  // True if the class has already started (timezone-safe)
  _isClassPast(cls) {
    const d = this._classDate(cls);
    return d ? d < new Date() : false;
  }

  // Format "HH:MM" as a locale time string (e.g. "10:30 AM") — no Date parsing needed
  _fmtLocalTime(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return hhmm;
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Add N minutes to "HH:MM" and return locale time string
  _fmtLocalTimeAdd(hhmm, mins) {
    if (!hhmm || !mins) return '';
    const [h, m] = hhmm.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const total = h * 60 + m + mins;
    return new Date(2000, 0, 1, Math.floor(total / 60) % 24, total % 60)
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Format class date using cls.date ("YYYY-MM-DD") directly — avoids timezone issues
  _fmtClassDate(cls) {
    if (cls.date) {
      const [y, mo, d] = cls.date.split('-').map(Number);
      if (!isNaN(y)) {
        const dt    = new Date(y, mo - 1, d);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tom   = new Date(today); tom.setDate(today.getDate() + 1);
        if (dt.getTime() === today.getTime()) return 'Today';
        if (dt.getTime() === tom.getTime()) return 'Tomorrow';
        return dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      }
    }
    return this._formatDate(cls.local_start_time);
  }

  _formatTime(t) {
    if (!t) return '';
    try { const d = new Date(t); if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (_) {}
    return String(t);
  }

  _formatDate(t) {
    if (!t) return '';
    try {
      const d = new Date(t);
      if (isNaN(d)) return '';
      const today = new Date(), tom = new Date(today);
      tom.setDate(today.getDate() + 1);
      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (_) { return ''; }
  }

  _timeAgo(t) {
    if (!t) return '';
    try {
      const s = Math.floor((Date.now() - new Date(t)) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return `${Math.floor(s / 60)} min ago`;
      if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
      return `${Math.floor(s / 86400)} days ago`;
    } catch (_) { return ''; }
  }

  _isPast(t) {
    if (!t) return false;
    try { const d = new Date(t); return !isNaN(d) && d < new Date(); } catch (_) { return false; }
  }

  _isNext(cls, nextClass) {
    if (!nextClass || !cls) return false;
    return cls._entityId === nextClass._entityId &&
           cls.local_start_time === nextClass.local_start_time &&
           cls.name === nextClass.name;
  }

  _escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _renderPrompt(msg) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:dumbbell"></ha-icon>
          <span class="title">Crunch Fitness</span>
        </div>
        <div class="prompt">${this._escapeHtml(msg)}</div>
      </ha-card>
      <style>
        ha-card { overflow: hidden; background: var(--card-background-color, #fff); }
        .card-header { display:flex; align-items:center; gap:10px; padding:12px 14px; background:#e31837; color:#fff; font-size:15px; font-weight:700; }
        .card-header ha-icon { --mdc-icon-size:20px; color:#fff; }
        .prompt { padding:20px 16px; text-align:center; color:var(--secondary-text-color,#727272); font-size:14px; font-style:italic; }
      </style>
    `;
  }
}

customElements.define('crunch-fitness-card', CrunchFitnessCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'crunch-fitness-card',
  name: 'Crunch Fitness Card',
  preview: false,
  description: 'Crunch Fitness class schedule with live search, spot counts, and calendar booking.',
});
