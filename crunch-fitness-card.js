/**
 * Crunch Fitness Card for Home Assistant
 * https://github.com/ZeekWall/ha-crunch-fitness-card
 *
 * Displays class schedules from the Crunch Fitness integration.
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
    const picker = this.querySelector('ha-entity-picker');
    if (picker) picker.hass = hass;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _render() {
    this.innerHTML = `
      <div class="editor">
        <ha-entity-picker
          id="entity-picker"
          label="Entity (required)"
          allow-custom-entity
        ></ha-entity-picker>

        <label class="field-label">Title (optional)</label>
        <input
          class="text-input"
          id="title-input"
          type="text"
          placeholder="Defaults to location name"
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
        .editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
        }
        ha-entity-picker {
          display: block;
        }
        .field-label {
          font-size: 12px;
          color: var(--secondary-text-color, #727272);
          margin-bottom: -6px;
        }
        .text-input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 4px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 14px;
        }
        .text-input:focus {
          outline: none;
          border-color: var(--primary-color, #e31837);
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: var(--primary-text-color, #212121);
        }
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary-color, #e31837);
        }
      </style>
    `;

    // Set hass on the entity picker (must be done as property, not attribute)
    const picker = this.querySelector('#entity-picker');
    if (picker) {
      picker.hass = this._hass;
      picker.value = this._config.entity || '';
      picker.includeDomains = ['sensor'];
      picker.addEventListener('value-changed', (e) => {
        this._updateConfig('entity', e.detail.value);
      });
    }

    const titleInput = this.querySelector('#title-input');
    titleInput.addEventListener('change', (e) => {
      this._updateConfig('title', e.target.value || null);
    });

    const allToggle = this.querySelector('#all-classes-toggle');
    allToggle.addEventListener('change', (e) => {
      this._updateConfig('show_all_classes', e.target.checked);
    });

    const maxInput = this.querySelector('#max-input');
    maxInput.addEventListener('change', (e) => {
      const val = e.target.value ? parseInt(e.target.value, 10) : null;
      this._updateConfig('max_classes', val);
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
    return {};
  }

  setConfig(config) {
    this._config = {
      title: null,
      show_all_classes: false,
      max_classes: null,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const stateObj = this._hass && this._config.entity && this._hass.states[this._config.entity];
    if (!stateObj) return 3;
    const attrs = stateObj.attributes;
    const classes = this._config.show_all_classes
      ? (attrs.all_classes || [])
      : (attrs.today_classes || []);
    const shown = this._config.max_classes ? Math.min(classes.length, this._config.max_classes) : classes.length;
    return 2 + Math.ceil(shown / 2);
  }

  _formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
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
    } catch (_) {
      return '';
    }
  }

  _isPast(timeStr) {
    if (!timeStr) return false;
    try {
      const classTime = new Date(timeStr);
      if (!isNaN(classTime.getTime())) return classTime < new Date();
    } catch (_) {}
    return false;
  }

  _isNext(cls, nextClass) {
    if (!nextClass || !cls) return false;
    return cls.name === nextClass.name && cls.time === nextClass.time;
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _renderPrompt(message) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:dumbbell"></ha-icon>
          <span class="location">Crunch Fitness</span>
        </div>
        <div class="prompt">${this._escapeHtml(message)}</div>
      </ha-card>
      <style>
        ha-card { overflow: hidden; background: var(--card-background-color, #fff); }
        .card-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px 12px; background: #e31837;
          color: #fff; font-size: 16px; font-weight: 600;
        }
        .card-header ha-icon { --mdc-icon-size: 22px; color: #fff; }
        .prompt {
          padding: 20px 16px;
          color: var(--secondary-text-color, #727272);
          font-size: 14px;
          font-style: italic;
          text-align: center;
        }
      </style>
    `;
  }

  _render() {
    if (!this._config) return;

    if (!this._config.entity) {
      this._renderPrompt('Please configure a Crunch Fitness sensor entity.');
      return;
    }

    if (!this._hass) return;

    const entityId = this._config.entity;
    const stateObj = this._hass.states[entityId];

    if (!stateObj) {
      this._renderPrompt(`Entity not found: ${entityId}`);
      return;
    }

    const attrs = stateObj.attributes;
    const location = this._config.title || attrs.location || entityId;
    const nextClass = attrs.next_class || null;
    const todayClasses = attrs.today_classes || [];
    const allClasses = attrs.all_classes || [];
    const todayCount = attrs.today_count || 0;
    const weekTotal = attrs.total_this_week || 0;
    const lastUpdated = attrs.last_updated || stateObj.last_updated || null;
    const noClasses = stateObj.state === 'No upcoming classes';

    const sourceClasses = this._config.show_all_classes ? allClasses : todayClasses;
    const displayClasses = this._config.max_classes
      ? sourceClasses.slice(0, this._config.max_classes)
      : sourceClasses;

    const classListHtml = displayClasses.map((cls) => {
      const past = this._isPast(cls.time);
      const isNext = this._isNext(cls, nextClass);
      const time = this._formatTime(cls.time);
      const instructor = cls.instructor ? `<span class="instructor">${this._escapeHtml(cls.instructor)}</span>` : '';
      const room = cls.room ? `<span class="room">${this._escapeHtml(cls.room)}</span>` : '';
      const spots = cls.available_spots != null
        ? `<span class="spots">${this._escapeHtml(String(cls.available_spots))} spots</span>`
        : '';
      const meta = [instructor, room, spots].filter(Boolean).join('<span class="dot">·</span>');

      return `
        <div class="class-row${past ? ' past' : ''}${isNext ? ' is-next' : ''}">
          <div class="class-time">${this._escapeHtml(time)}</div>
          <div class="class-info">
            <div class="class-name">${this._escapeHtml(cls.name || 'Class')}</div>
            ${meta ? `<div class="class-meta">${meta}</div>` : ''}
          </div>
          ${isNext ? '<div class="next-badge">NEXT</div>' : ''}
        </div>
      `;
    }).join('');

    const nextCardHtml = nextClass && !noClasses ? `
      <div class="next-class-card">
        <div class="next-label">NEXT CLASS</div>
        <div class="next-name">${this._escapeHtml(nextClass.name || '')}</div>
        <div class="next-time">${this._escapeHtml(this._formatTime(nextClass.time))}</div>
        <div class="next-details">
          ${nextClass.instructor ? `<span>${this._escapeHtml(nextClass.instructor)}</span>` : ''}
          ${nextClass.room ? `<span class="dot">·</span><span>${this._escapeHtml(nextClass.room)}</span>` : ''}
          ${nextClass.available_spots != null ? `<span class="dot">·</span><span>${this._escapeHtml(String(nextClass.available_spots))} spots</span>` : ''}
        </div>
      </div>
    ` : noClasses ? `
      <div class="no-classes">No upcoming classes</div>
    ` : '';

    const sectionLabel = this._config.show_all_classes
      ? `THIS WEEK — ${weekTotal} classes`
      : `TODAY — ${todayCount} class${todayCount !== 1 ? 'es' : ''}`;

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:dumbbell"></ha-icon>
          <span class="location">${this._escapeHtml(location)}</span>
        </div>

        ${nextCardHtml}

        ${displayClasses.length > 0 ? `
          <div class="section-header">${this._escapeHtml(sectionLabel)}</div>
          <div class="class-list">${classListHtml}</div>
        ` : ''}

        <div class="card-footer">
          <span>Week total: <strong>${this._escapeHtml(String(weekTotal))}</strong></span>
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

        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 12px;
          background: #e31837;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .card-header ha-icon { --mdc-icon-size: 22px; color: #fff; }
        .location { flex: 1; }

        .next-class-card {
          margin: 14px 14px 0;
          padding: 12px 14px;
          background: var(--primary-color, #e31837);
          border-radius: 8px;
          color: #fff;
        }
        .next-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          opacity: 0.85;
          margin-bottom: 4px;
        }
        .next-name { font-size: 20px; font-weight: 700; line-height: 1.2; }
        .next-time { font-size: 15px; font-weight: 600; margin: 2px 0 6px; opacity: 0.9; }
        .next-details {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          font-size: 12px;
          opacity: 0.85;
          align-items: center;
        }

        .no-classes {
          padding: 20px 16px;
          text-align: center;
          color: var(--secondary-text-color, #727272);
          font-style: italic;
          font-size: 14px;
        }

        .section-header {
          padding: 14px 16px 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--secondary-text-color, #727272);
          text-transform: uppercase;
        }

        .class-list { padding: 0 8px 4px; }

        .class-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 8px;
          border-radius: 6px;
          transition: background 0.15s;
          position: relative;
        }
        .class-row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
        .class-row.past { opacity: 0.4; }
        .class-row.is-next {
          background: rgba(227, 24, 55, 0.08);
          border-left: 3px solid #e31837;
          padding-left: 5px;
        }

        .class-time {
          min-width: 52px;
          font-size: 13px;
          font-weight: 600;
          color: var(--secondary-text-color, #727272);
          font-variant-numeric: tabular-nums;
        }
        .class-info { flex: 1; min-width: 0; }
        .class-name {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .class-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          align-items: center;
          font-size: 11px;
          color: var(--secondary-text-color, #727272);
          margin-top: 1px;
        }
        .next-badge {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #e31837;
          background: rgba(227, 24, 55, 0.12);
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px 12px;
          font-size: 11px;
          color: var(--secondary-text-color, #727272);
          border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08));
          margin-top: 6px;
        }

        .dot { opacity: 0.5; margin: 0 2px; }
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
  description: 'Display your Crunch Fitness gym class schedule on your dashboard.',
});
