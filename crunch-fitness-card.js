/**
 * Crunch Fitness Card for Home Assistant
 * https://github.com/ZeekWall/ha-crunch-fitness-card
 *
 * Displays class schedules from the Crunch Fitness integration.
 * Supports multiple gym locations combined into a single card.
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
    // Push hass to every picker already in the DOM
    this.querySelectorAll('ha-entity-picker').forEach(p => { p.hass = hass; });
  }

  setConfig(config) {
    // Normalise legacy single-entity config
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
        <ha-entity-picker
          class="entity-picker"
          data-index="${i}"
          label="Location ${i + 1}"
          allow-custom-entity
        ></ha-entity-picker>
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
        <input
          class="text-input"
          id="title-input"
          type="text"
          placeholder="Defaults to location name(s)"
          value="${this._escapeAttr(this._config.title || '')}"
        />

        <div class="toggle-row">
          <label for="all-classes-toggle">Show full week schedule</label>
          <input
            type="checkbox"
            id="all-classes-toggle"
            ${this._config.show_all_classes ? 'checked' : ''}
          />
        </div>

        <label class="field-label">Max classes to show (optional)</label>
        <input
          class="text-input"
          id="max-input"
          type="number"
          min="1"
          placeholder="Show all"
          value="${this._escapeAttr(this._config.max_classes != null ? String(this._config.max_classes) : '')}"
        />
      </div>

      <style>
        .editor { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        .section-label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #727272); text-transform: uppercase; letter-spacing: 0.5px; }
        .entities-list { display: flex; flex-direction: column; gap: 8px; }
        .entity-row { display: flex; align-items: center; gap: 8px; }
        .entity-row ha-entity-picker { flex: 1; display: block; }
        .remove-btn {
          flex-shrink: 0;
          background: none;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          color: var(--secondary-text-color, #727272);
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          line-height: 1;
        }
        .remove-btn:hover { color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
        .add-btn {
          background: none;
          border: 1px dashed var(--primary-color, #e31837);
          border-radius: 4px;
          color: var(--primary-color, #e31837);
          cursor: pointer;
          font-size: 13px;
          padding: 8px;
          width: 100%;
        }
        .add-btn:hover { background: rgba(227,24,55,0.06); }
        .divider { border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08)); margin: 4px 0; }
        .field-label { font-size: 12px; color: var(--secondary-text-color, #727272); margin-bottom: -6px; }
        .text-input {
          width: 100%; box-sizing: border-box; padding: 8px 10px;
          border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121); font-size: 14px;
        }
        .text-input:focus { outline: none; border-color: var(--primary-color, #e31837); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--primary-text-color, #212121); }
        input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #e31837); }
      </style>
    `;

    // Wire up entity pickers
    this.querySelectorAll('ha-entity-picker').forEach((picker, i) => {
      picker.hass = this._hass;
      picker.value = entities[i] || '';
      picker.includeDomains = ['sensor'];
      picker.addEventListener('value-changed', (e) => {
        const idx = parseInt(picker.dataset.index, 10);
        const updated = [...this._config.entities];
        updated[idx] = e.detail.value;
        this._updateConfig('entities', updated);
      });
    });

    // Remove buttons
    this.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const updated = this._config.entities.filter((_, i) => i !== idx);
        this._updateConfig('entities', updated.length ? updated : ['']);
        this._config.entities = updated.length ? updated : [''];
        this._render();
      });
    });

    // Add button
    this.querySelector('.add-btn').addEventListener('click', () => {
      const updated = [...this._config.entities, ''];
      this._config.entities = updated;
      this._updateConfig('entities', updated);
      this._render();
    });

    // Title input
    this.querySelector('#title-input').addEventListener('change', (e) => {
      this._updateConfig('title', e.target.value || null);
    });

    // Week toggle
    this.querySelector('#all-classes-toggle').addEventListener('change', (e) => {
      this._updateConfig('show_all_classes', e.target.checked);
    });

    // Max classes
    this.querySelector('#max-input').addEventListener('change', (e) => {
      this._updateConfig('max_classes', e.target.value ? parseInt(e.target.value, 10) : null);
    });
  }

  _updateConfig(field, value) {
    const newConfig = { ...this._config };
    if (value === null || value === undefined || value === '') {
      delete newConfig[field];
    } else {
      newConfig[field] = value;
    }
    this._config = newConfig;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }
}

customElements.define('crunch-fitness-card-editor', CrunchFitnessCardEditor);

// ─── Main Card ────────────────────────────────────────────────────────────────

class CrunchFitnessCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
  }

  static getConfigElement() {
    return document.createElement('crunch-fitness-card-editor');
  }

  static getStubConfig() {
    return { entities: [] };
  }

  setConfig(config) {
    // Normalise legacy single-entity config
    let entities;
    if (config.entities && config.entities.length) {
      entities = config.entities;
    } else if (config.entity) {
      entities = [config.entity];
    } else {
      entities = [];
    }

    this._config = {
      title: null,
      show_all_classes: false,
      max_classes: null,
      ...config,
      entities,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const count = this._gatherData().displayClasses.length;
    return 2 + Math.ceil(count / 2);
  }

  // ── Data helpers ──

  _gatherData() {
    const empty = { allTodayClasses: [], allWeekClasses: [], displayClasses: [], totalToday: 0, totalWeek: 0, lastUpdated: null, nextClass: null, multiLocation: false, errors: [] };
    if (!this._hass || !this._config.entities) return empty;

    const entityIds = this._config.entities.filter(Boolean);
    if (!entityIds.length) return empty;

    const multiLocation = entityIds.length > 1;
    let allTodayClasses = [];
    let allWeekClasses = [];
    let totalToday = 0;
    let totalWeek = 0;
    let lastUpdated = null;
    const errors = [];

    for (const entityId of entityIds) {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) { errors.push(entityId); continue; }
      const attrs = stateObj.attributes;
      const loc = attrs.location || entityId;

      allTodayClasses = allTodayClasses.concat(
        (attrs.today_classes || []).map(c => ({ ...c, _location: loc, _entityId: entityId }))
      );
      allWeekClasses = allWeekClasses.concat(
        (attrs.all_classes || []).map(c => ({ ...c, _location: loc, _entityId: entityId }))
      );

      totalToday += attrs.today_count || 0;
      totalWeek += attrs.total_this_week || 0;

      const lu = attrs.last_updated || stateObj.last_updated;
      if (lu && (!lastUpdated || new Date(lu) < new Date(lastUpdated))) lastUpdated = lu;
    }

    const sortByTime = (a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return new Date(a.time) - new Date(b.time);
    };
    allTodayClasses.sort(sortByTime);
    allWeekClasses.sort(sortByTime);

    const source = this._config.show_all_classes ? allWeekClasses : allTodayClasses;
    const nextClass = source.find(c => !this._isPast(c.time)) || null;
    const displayClasses = this._config.max_classes ? source.slice(0, this._config.max_classes) : source;

    return { allTodayClasses, allWeekClasses, displayClasses, totalToday, totalWeek, lastUpdated, nextClass, multiLocation, errors };
  }

  _formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {}
    return timeStr;
  }

  _timeAgo(isoStr) {
    if (!isoStr) return '';
    try {
      const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
      return `${Math.floor(diff / 86400)} days ago`;
    } catch (_) { return ''; }
  }

  _isPast(timeStr) {
    if (!timeStr) return false;
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) return d < new Date();
    } catch (_) {}
    return false;
  }

  _isNext(cls, nextClass) {
    if (!nextClass || !cls) return false;
    return cls.name === nextClass.name && cls.time === nextClass.time && cls._entityId === nextClass._entityId;
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _renderPrompt(message) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:dumbbell"></ha-icon>
          <span class="title">Crunch Fitness</span>
        </div>
        <div class="prompt">${this._escapeHtml(message)}</div>
      </ha-card>
      <style>
        ha-card { overflow: hidden; background: var(--card-background-color, #fff); }
        .card-header { display:flex; align-items:center; gap:10px; padding:14px 16px 12px; background:#e31837; color:#fff; font-size:16px; font-weight:600; }
        .card-header ha-icon { --mdc-icon-size:22px; color:#fff; }
        .prompt { padding:20px 16px; color:var(--secondary-text-color,#727272); font-size:14px; font-style:italic; text-align:center; }
      </style>
    `;
  }

  _render() {
    if (!this._config) return;

    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) {
      this._renderPrompt('Please configure at least one Crunch Fitness sensor entity.');
      return;
    }

    if (!this._hass) return;

    const { displayClasses, totalToday, totalWeek, lastUpdated, nextClass, multiLocation, errors } = this._gatherData();

    // Derive title
    let title = this._config.title;
    if (!title) {
      const locations = entityIds
        .map(id => this._hass.states[id]?.attributes?.location)
        .filter(Boolean);
      title = locations.length ? locations.join(' & ') : 'Crunch Fitness';
    }

    const noClasses = displayClasses.length === 0;

    // ── Next class block ──
    let nextCardHtml = '';
    if (nextClass) {
      const locBadge = multiLocation
        ? `<div class="next-location">${this._escapeHtml(nextClass._location)}</div>`
        : '';
      nextCardHtml = `
        <div class="next-class-card">
          <div class="next-label">NEXT CLASS</div>
          ${locBadge}
          <div class="next-name">${this._escapeHtml(nextClass.name || '')}</div>
          <div class="next-time">${this._escapeHtml(this._formatTime(nextClass.time))}</div>
          <div class="next-details">
            ${nextClass.instructor ? `<span>${this._escapeHtml(nextClass.instructor)}</span>` : ''}
            ${nextClass.room ? `<span class="dot">·</span><span>${this._escapeHtml(nextClass.room)}</span>` : ''}
            ${nextClass.available_spots != null ? `<span class="dot">·</span><span>${this._escapeHtml(String(nextClass.available_spots))} spots</span>` : ''}
          </div>
        </div>`;
    } else if (noClasses) {
      nextCardHtml = `<div class="no-classes">No upcoming classes</div>`;
    }

    // ── Class list ──
    const classListHtml = displayClasses.map((cls) => {
      const past = this._isPast(cls.time);
      const isNext = this._isNext(cls, nextClass);
      const time = this._formatTime(cls.time);
      const locBadge = multiLocation
        ? `<span class="loc-badge">${this._escapeHtml(cls._location)}</span>`
        : '';
      const instructor = cls.instructor ? `<span>${this._escapeHtml(cls.instructor)}</span>` : '';
      const room = cls.room ? `<span>${this._escapeHtml(cls.room)}</span>` : '';
      const spots = cls.available_spots != null ? `<span>${this._escapeHtml(String(cls.available_spots))} spots</span>` : '';
      const metaParts = [instructor, room, spots].filter(Boolean);
      const meta = metaParts.join('<span class="dot">·</span>');

      return `
        <div class="class-row${past ? ' past' : ''}${isNext ? ' is-next' : ''}">
          <div class="class-time">${this._escapeHtml(time)}</div>
          <div class="class-info">
            <div class="class-name-row">
              <span class="class-name">${this._escapeHtml(cls.name || 'Class')}</span>
              ${locBadge}
            </div>
            ${meta ? `<div class="class-meta">${meta}</div>` : ''}
          </div>
          ${isNext ? '<div class="next-badge">NEXT</div>' : ''}
        </div>`;
    }).join('');

    const sectionLabel = this._config.show_all_classes
      ? `THIS WEEK — ${totalWeek} classes`
      : `TODAY — ${totalToday} class${totalToday !== 1 ? 'es' : ''}`;

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
        ${nextCardHtml}

        ${displayClasses.length > 0 ? `
          <div class="section-header">${this._escapeHtml(sectionLabel)}</div>
          <div class="class-list">${classListHtml}</div>
        ` : ''}

        <div class="card-footer">
          <span>Week total: <strong>${this._escapeHtml(String(totalWeek))}</strong></span>
          ${lastUpdated ? `<span>Updated ${this._escapeHtml(this._timeAgo(lastUpdated))}</span>` : ''}
        </div>
      </ha-card>

      <style>
        :host { display: block; }

        ha-card {
          overflow: hidden;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
        }

        /* Header */
        .card-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px 12px; background: #e31837;
          color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;
        }
        .card-header ha-icon { --mdc-icon-size: 22px; color: #fff; }
        .title { flex: 1; }

        /* Error */
        .error-row {
          padding: 8px 16px;
          font-size: 12px;
          color: var(--error-color, #db4437);
          background: rgba(219, 68, 55, 0.08);
        }

        /* Next class */
        .next-class-card {
          margin: 14px 14px 0; padding: 12px 14px;
          background: var(--primary-color, #e31837);
          border-radius: 8px; color: #fff;
        }
        .next-label { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; opacity: 0.85; margin-bottom: 2px; }
        .next-location { font-size: 11px; opacity: 0.75; margin-bottom: 4px; font-weight: 500; }
        .next-name { font-size: 20px; font-weight: 700; line-height: 1.2; }
        .next-time { font-size: 15px; font-weight: 600; margin: 2px 0 6px; opacity: 0.9; }
        .next-details { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; opacity: 0.85; align-items: center; }

        .no-classes {
          padding: 20px 16px; text-align: center;
          color: var(--secondary-text-color, #727272); font-style: italic; font-size: 14px;
        }

        /* Section */
        .section-header {
          padding: 14px 16px 6px; font-size: 11px; font-weight: 700;
          letter-spacing: 1px; color: var(--secondary-text-color, #727272); text-transform: uppercase;
        }

        /* Class list */
        .class-list { padding: 0 8px 4px; }
        .class-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 8px; border-radius: 6px; transition: background 0.15s;
        }
        .class-row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
        .class-row.past { opacity: 0.4; }
        .class-row.is-next {
          background: rgba(227, 24, 55, 0.08);
          border-left: 3px solid #e31837;
          padding-left: 5px;
        }
        .class-time {
          min-width: 52px; font-size: 13px; font-weight: 600;
          color: var(--secondary-text-color, #727272); font-variant-numeric: tabular-nums;
        }
        .class-info { flex: 1; min-width: 0; }
        .class-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .class-name {
          font-size: 14px; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .loc-badge {
          font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
          color: #e31837; background: rgba(227,24,55,0.10);
          padding: 1px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0;
        }
        .class-meta {
          display: flex; flex-wrap: wrap; gap: 2px; align-items: center;
          font-size: 11px; color: var(--secondary-text-color, #727272); margin-top: 1px;
        }
        .next-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
          color: #e31837; background: rgba(227,24,55,0.12);
          padding: 2px 6px; border-radius: 4px; white-space: nowrap;
        }

        /* Footer */
        .card-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 16px 12px; font-size: 11px;
          color: var(--secondary-text-color, #727272);
          border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
          margin-top: 6px;
        }

        .dot { opacity: 0.5; margin: 0 2px; }

        /* Prompt */
        .prompt {
          padding: 20px 16px; color: var(--secondary-text-color, #727272);
          font-size: 14px; font-style: italic; text-align: center;
        }
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
  description: 'Display Crunch Fitness gym class schedules — supports multiple locations.',
});
