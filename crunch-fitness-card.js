/**
 * Crunch Fitness Card for Home Assistant
 * https://github.com/ZeekWall/ha-crunch-fitness-card
 *
 * Displays class schedules from the Crunch Fitness integration.
 * Supports multiple gym locations, live search filtering, and spot counts.
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
        .text-input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px; background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); font-size: 14px; }
        .text-input:focus { outline: none; border-color: var(--primary-color, #e31837); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--primary-text-color, #212121); }
        input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #e31837); }
      </style>
    `;

    this.querySelectorAll('ha-entity-picker').forEach((picker, i) => {
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
  }

  static getConfigElement() { return document.createElement('crunch-fitness-card-editor'); }
  static getStubConfig() { return { entities: [] }; }

  setConfig(config) {
    let entities = config.entities?.length ? config.entities : config.entity ? [config.entity] : [];
    this._config = { title: null, show_all_classes: false, max_height: 400, ...config, entities };
    // Pre-populate search from config if set (YAML only, not editor)
    if (config.instructor && !this._filterText) this._filterText = config.instructor;
    this._fullRender();
  }

  set hass(hass) {
    this._hass = hass;
    // If structure is already rendered, just refresh the data portion
    if (this.shadowRoot.querySelector('#class-container')) {
      this._updateClassList();
    } else {
      this._fullRender();
    }
  }

  getCardSize() {
    const maxH = this._config.max_height || 400;
    return Math.ceil(maxH / 50) + 2;
  }

  // ── Data gathering ──────────────────────────────────────────────────────────

  _gatherClasses() {
    if (!this._hass) return { source: [], totalToday: 0, totalWeek: 0, lastUpdated: null, multiLocation: false, errors: [] };
    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) return { source: [], totalToday: 0, totalWeek: 0, lastUpdated: null, multiLocation: false, errors: [] };

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

  // ── Rendering ───────────────────────────────────────────────────────────────

  _fullRender() {
    if (!this._config) return;
    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) {
      this._renderPrompt('Please configure at least one Crunch Fitness sensor entity.');
      return;
    }
    if (!this._hass) return;

    const { totalToday, totalWeek, lastUpdated, multiLocation, errors } = this._gatherClasses();

    let title = this._config.title;
    if (!title) {
      const locs = entityIds.map(id => this._hass.states[id]?.attributes?.location).filter(Boolean);
      title = locs.length ? locs.join(' & ') : 'Crunch Fitness';
    }

    const maxH = this._config.max_height || 400;
    const sectionLabel = this._config.show_all_classes
      ? `This week — ${totalWeek} classes`
      : `Today — ${totalToday} class${totalToday !== 1 ? 'es' : ''}`;

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
          <input
            id="search-input"
            type="text"
            placeholder="Filter by class, instructor…"
            autocomplete="off"
            spellcheck="false"
          />
          <button id="search-clear" class="clear-btn" aria-label="Clear">✕</button>
        </div>

        <div class="section-bar">
          <span id="section-label" class="section-label">${this._escapeHtml(sectionLabel)}</span>
        </div>

        <div id="class-container" class="class-container" style="max-height:${maxH}px"></div>

        <div class="card-footer">
          <span>Week: <strong>${this._escapeHtml(String(totalWeek))}</strong> classes</span>
          ${lastUpdated ? `<span>Updated ${this._escapeHtml(this._timeAgo(lastUpdated))}</span>` : ''}
        </div>
      </ha-card>

      <style>
        :host { display: block; }
        ha-card { overflow: hidden; font-family: var(--paper-font-body1_-_font-family, sans-serif); background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); }

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

        /* Section bar */
        .section-bar { padding: 6px 14px 4px; }
        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--secondary-text-color, #727272); text-transform: uppercase; }

        /* Scrollable class list */
        .class-container { overflow-y: auto; padding: 2px 6px 4px; scrollbar-width: thin; scrollbar-color: var(--divider-color, #ccc) transparent; }
        .class-container::-webkit-scrollbar { width: 4px; }
        .class-container::-webkit-scrollbar-track { background: transparent; }
        .class-container::-webkit-scrollbar-thumb { background: var(--divider-color, #ccc); border-radius: 2px; }

        /* Date separators */
        .date-separator { padding: 8px 8px 2px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--secondary-text-color, #727272); }

        /* Class rows */
        .class-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; transition: background 0.15s; }
        .class-row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
        .class-row.past { opacity: 0.35; }
        .class-row.is-next { background: rgba(227,24,55,0.07); border-left: 3px solid #e31837; padding-left: 5px; }

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
      </style>
    `;

    // Wire up search input
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

    this._updateClassList();
  }

  _updateClassList() {
    const container = this.shadowRoot.querySelector('#class-container');
    if (!container) return;

    const { source, multiLocation } = this._gatherClasses();
    const filtered = this._applyFilter(source, this._filterText);
    const nextClass = filtered.find(c => !this._isPast(c.local_start_time)) || null;

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

    for (const cls of classes) {
      if (this._config.show_all_classes) {
        const dateLabel = this._formatDate(cls.local_start_time);
        if (dateLabel && dateLabel !== lastDate) {
          html += `<div class="date-separator">${this._escapeHtml(dateLabel)}</div>`;
          lastDate = dateLabel;
        }
      }

      const past   = this._isPast(cls.local_start_time);
      const isNext = this._isNext(cls, nextClass);
      const time   = this._formatTime(cls.local_start_time) || cls.local_time || '';
      const dur    = cls.duration_min ? `${cls.duration_min}m` : '';

      let spotsHtml = '';
      if (cls.spots_available != null) {
        const avail = cls.spots_available, total = cls.total_spots;
        const ratio = total ? avail / total : null;
        const cls2  = ratio !== null ? (ratio <= 0.25 ? 'spots-low' : ratio <= 0.5 ? 'spots-mid' : 'spots-ok') : '';
        spotsHtml = `<span class="spots ${cls2}">${this._escapeHtml(total ? `${avail}/${total}` : String(avail))}</span>`;
      }

      const instructor = cls.instructor && cls.instructor !== 'TBD'
        ? `<span class="meta-item">${this._escapeHtml(cls.instructor)}</span>` : '';
      const room = cls.room ? `<span class="meta-item">${this._escapeHtml(cls.room)}</span>` : '';
      const locBadge = multiLocation
        ? `<span class="loc-badge">${this._escapeHtml(cls._location)}</span>` : '';

      html += `
        <div class="class-row${past ? ' past' : ''}${isNext ? ' is-next' : ''}">
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
    }
    return html;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _formatTime(t) {
    if (!t) return '';
    try { const d = new Date(t); if (!isNaN(d)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (_) {}
    return t;
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
  description: 'Crunch Fitness class schedule with live search, instructor filtering, and spot counts.',
});
