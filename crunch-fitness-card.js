/**
 * Crunch Fitness Card for Home Assistant
 * https://github.com/ZeekWall/ha-crunch-fitness-card
 *
 * Displays class schedules from the Crunch Fitness integration.
 * Supports multiple gym locations, instructor filtering, and spot counts.
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

        <label class="field-label">Filter by instructor (optional)</label>
        <input
          class="text-input"
          id="instructor-input"
          type="text"
          placeholder="e.g. Jane Smith"
          value="${this._escapeAttr(this._config.instructor || '')}"
        />

        <label class="field-label">Card title (optional)</label>
        <input
          class="text-input"
          id="title-input"
          type="text"
          placeholder="Defaults to instructor or location name"
          value="${this._escapeAttr(this._config.title || '')}"
        />

        <div class="toggle-row">
          <label for="all-classes-toggle">Show full week schedule</label>
          <input type="checkbox" id="all-classes-toggle" ${this._config.show_all_classes ? 'checked' : ''} />
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
          flex-shrink: 0; background: none;
          border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px;
          color: var(--secondary-text-color, #727272); cursor: pointer;
          font-size: 12px; padding: 4px 8px; line-height: 1;
        }
        .remove-btn:hover { color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
        .add-btn {
          background: none; border: 1px dashed var(--primary-color, #e31837);
          border-radius: 4px; color: var(--primary-color, #e31837);
          cursor: pointer; font-size: 13px; padding: 8px; width: 100%;
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

    this.querySelector('#instructor-input').addEventListener('change', (e) => {
      this._updateConfig('instructor', e.target.value || null);
    });

    this.querySelector('#title-input').addEventListener('change', (e) => {
      this._updateConfig('title', e.target.value || null);
    });

    this.querySelector('#all-classes-toggle').addEventListener('change', (e) => {
      this._updateConfig('show_all_classes', e.target.checked);
    });

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
      instructor: null,
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
    return 2 + Math.ceil(this._gatherData().displayClasses.length / 2);
  }

  // ── Data ──

  _gatherData() {
    const empty = { displayClasses: [], totalToday: 0, totalWeek: 0, lastUpdated: null, nextClass: null, multiLocation: false, errors: [] };
    if (!this._hass) return empty;
    const entityIds = (this._config.entities || []).filter(Boolean);
    if (!entityIds.length) return empty;

    const multiLocation = entityIds.length > 1;
    let todayClasses = [];
    let weekClasses = [];
    let totalToday = 0;
    let totalWeek = 0;
    let lastUpdated = null;
    const errors = [];

    for (const entityId of entityIds) {
      const stateObj = this._hass.states[entityId];
      if (!stateObj) { errors.push(entityId); continue; }
      const attrs = stateObj.attributes;
      const loc = attrs.location || entityId;

      todayClasses = todayClasses.concat(
        (attrs.today_classes || []).map(c => ({ ...c, _location: loc, _entityId: entityId }))
      );
      weekClasses = weekClasses.concat(
        (attrs.all_classes || []).map(c => ({ ...c, _location: loc, _entityId: entityId }))
      );

      totalToday += attrs.today_count || 0;
      totalWeek += attrs.total_this_week || 0;

      const lu = attrs.last_updated || stateObj.last_updated;
      if (lu && (!lastUpdated || new Date(lu) < new Date(lastUpdated))) lastUpdated = lu;
    }

    // Sort by start time
    const byTime = (a, b) => {
      const ta = a.local_start_time, tb = b.local_start_time;
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(ta) - new Date(tb);
    };
    todayClasses.sort(byTime);
    weekClasses.sort(byTime);

    let source = this._config.show_all_classes ? weekClasses : todayClasses;

    // Instructor filter (case-insensitive partial match)
    const filter = (this._config.instructor || '').trim().toLowerCase();
    if (filter) {
      source = source.filter(c => (c.instructor || '').toLowerCase().includes(filter));
    }

    const nextClass = source.find(c => !this._isPast(c.local_start_time)) || null;
    const displayClasses = this._config.max_classes ? source.slice(0, this._config.max_classes) : source;

    return { displayClasses, totalToday, totalWeek, lastUpdated, nextClass, multiLocation, errors };
  }

  _formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {}
    return timeStr;
  }

  _formatDate(timeStr) {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      }
    } catch (_) {}
    return '';
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
    return cls._entityId === nextClass._entityId &&
           cls.local_start_time === nextClass.local_start_time &&
           cls.name === nextClass.name;
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

    // Title: explicit > instructor name > location names
    let title = this._config.title;
    if (!title && this._config.instructor) {
      title = this._config.instructor;
    }
    if (!title) {
      const locs = entityIds.map(id => this._hass.states[id]?.attributes?.location).filter(Boolean);
      title = locs.length ? locs.join(' & ') : 'Crunch Fitness';
    }

    // Subtitle when filtering by instructor
    const subtitle = this._config.instructor && !this._config.title
      ? null  // name is already the title
      : this._config.instructor
        ? `Instructor: ${this._config.instructor}`
        : null;

    // Group classes by date when showing full week
    const showDates = this._config.show_all_classes;

    // Build rows, optionally inserting date separators
    let classRows = '';
    let lastDate = null;
    for (const cls of displayClasses) {
      if (showDates) {
        const dateLabel = this._formatDate(cls.local_start_time);
        if (dateLabel && dateLabel !== lastDate) {
          classRows += `<div class="date-separator">${this._escapeHtml(dateLabel)}</div>`;
          lastDate = dateLabel;
        }
      }

      const past = this._isPast(cls.local_start_time);
      const isNext = this._isNext(cls, nextClass);
      const time = this._formatTime(cls.local_start_time) || cls.local_time || '';
      const duration = cls.duration_min ? `${cls.duration_min}m` : '';

      // Spots: "4/16" or just "4" if no total
      let spotsHtml = '';
      if (cls.spots_available != null) {
        const available = cls.spots_available;
        const total = cls.total_spots;
        const ratio = total ? available / total : null;
        const spotsClass = ratio !== null
          ? ratio <= 0.25 ? 'spots-low' : ratio <= 0.5 ? 'spots-mid' : 'spots-ok'
          : '';
        const spotsText = total ? `${available}/${total}` : `${available}`;
        spotsHtml = `<span class="spots ${spotsClass}">${this._escapeHtml(spotsText)}</span>`;
      }

      const instructor = cls.instructor && cls.instructor !== 'TBD'
        ? `<span class="meta-item">${this._escapeHtml(cls.instructor)}</span>`
        : '';
      const room = cls.room ? `<span class="meta-item">${this._escapeHtml(cls.room)}</span>` : '';
      const locBadge = multiLocation
        ? `<span class="loc-badge">${this._escapeHtml(cls._location)}</span>`
        : '';

      classRows += `
        <div class="class-row${past ? ' past' : ''}${isNext ? ' is-next' : ''}">
          <div class="class-time">
            <span class="time">${this._escapeHtml(time)}</span>
            ${duration ? `<span class="duration">${this._escapeHtml(duration)}</span>` : ''}
          </div>
          <div class="class-info">
            <div class="class-name-row">
              <span class="class-name">${this._escapeHtml(cls.name || 'Class')}</span>
              ${locBadge}
              ${isNext ? '<span class="next-badge">NEXT</span>' : ''}
            </div>
            <div class="class-meta">
              ${instructor}${room}
            </div>
          </div>
          <div class="class-right">
            ${spotsHtml}
          </div>
        </div>`;
    }

    const noResultsHtml = displayClasses.length === 0
      ? `<div class="empty">${this._config.instructor ? `No upcoming classes for "${this._escapeHtml(this._config.instructor)}"` : 'No upcoming classes'}</div>`
      : '';

    const filterBadge = this._config.instructor
      ? `<span class="filter-badge"><ha-icon icon="mdi:account"></ha-icon>${this._escapeHtml(this._config.instructor)}</span>`
      : '';

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
          <div class="header-text">
            <span class="title">${this._escapeHtml(title)}</span>
            ${subtitle ? `<span class="subtitle">${this._escapeHtml(subtitle)}</span>` : ''}
          </div>
          ${filterBadge}
        </div>

        ${errorHtml}

        <div class="section-bar">
          <span class="section-label">${this._escapeHtml(sectionLabel)}</span>
        </div>

        <div class="class-list">
          ${classRows}
          ${noResultsHtml}
        </div>

        <div class="card-footer">
          <span>Week: <strong>${this._escapeHtml(String(totalWeek))}</strong> classes</span>
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

        /* ── Header ── */
        .card-header {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; background: #e31837; color: #fff;
        }
        .card-header ha-icon { --mdc-icon-size: 20px; color: #fff; flex-shrink: 0; }
        .header-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .title { font-size: 15px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subtitle { font-size: 11px; opacity: 0.8; }

        .filter-badge {
          display: flex; align-items: center; gap: 4px;
          background: rgba(255,255,255,0.2); border-radius: 12px;
          padding: 3px 8px; font-size: 11px; font-weight: 600;
          white-space: nowrap; flex-shrink: 0;
        }
        .filter-badge ha-icon { --mdc-icon-size: 12px; }

        /* ── Error ── */
        .error-row {
          padding: 6px 14px; font-size: 11px;
          color: var(--error-color, #db4437); background: rgba(219,68,55,0.08);
        }

        /* ── Section bar ── */
        .section-bar {
          padding: 8px 14px 4px;
          border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.08));
        }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
          color: var(--secondary-text-color, #727272); text-transform: uppercase;
        }

        /* ── Class list ── */
        .class-list { padding: 4px 6px; }

        .date-separator {
          padding: 8px 8px 2px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--secondary-text-color, #727272);
        }

        .class-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 8px; border-radius: 6px;
          transition: background 0.15s;
        }
        .class-row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
        .class-row.past { opacity: 0.38; }
        .class-row.is-next {
          background: rgba(227, 24, 55, 0.07);
          border-left: 3px solid #e31837;
          padding-left: 5px;
        }

        /* Time column */
        .class-time {
          display: flex; flex-direction: column; align-items: flex-end;
          min-width: 46px; flex-shrink: 0;
        }
        .time {
          font-size: 13px; font-weight: 600;
          color: var(--primary-text-color, #212121);
          font-variant-numeric: tabular-nums;
        }
        .duration { font-size: 10px; color: var(--secondary-text-color, #727272); }

        /* Info column */
        .class-info { flex: 1; min-width: 0; }
        .class-name-row {
          display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
        }
        .class-name {
          font-size: 13px; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .loc-badge {
          font-size: 10px; font-weight: 600;
          color: #e31837; background: rgba(227,24,55,0.10);
          padding: 1px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0;
        }
        .next-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
          color: #fff; background: #e31837;
          padding: 2px 5px; border-radius: 3px; white-space: nowrap; flex-shrink: 0;
        }
        .class-meta {
          display: flex; flex-wrap: wrap; gap: 0 8px;
          font-size: 11px; color: var(--secondary-text-color, #727272);
          margin-top: 1px;
        }
        .meta-item { white-space: nowrap; }

        /* Spots column */
        .class-right { flex-shrink: 0; text-align: right; }
        .spots {
          display: inline-block;
          font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
          padding: 2px 6px; border-radius: 4px;
        }
        .spots-ok  { color: #2e7d32; background: rgba(46,125,50,0.12); }
        .spots-mid { color: #f57c00; background: rgba(245,124,0,0.12); }
        .spots-low { color: #c62828; background: rgba(198,40,40,0.12); }
        .spots:not(.spots-ok):not(.spots-mid):not(.spots-low) {
          color: var(--secondary-text-color, #727272);
          background: var(--secondary-background-color, rgba(0,0,0,0.06));
        }

        /* ── Empty state ── */
        .empty {
          padding: 18px 16px; text-align: center;
          color: var(--secondary-text-color, #727272);
          font-size: 13px; font-style: italic;
        }

        /* ── Footer ── */
        .card-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 14px 10px; font-size: 11px;
          color: var(--secondary-text-color, #727272);
          border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
          margin-top: 2px;
        }

        /* ── Prompt ── */
        .prompt {
          padding: 20px 16px; text-align: center;
          color: var(--secondary-text-color, #727272); font-size: 14px; font-style: italic;
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
  description: 'Crunch Fitness class schedule with instructor filtering and spot counts.',
});
