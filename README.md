# Crunch Fitness Card

A custom Lovelace card for Home Assistant that displays your Crunch Fitness gym class schedule. Works with the [Crunch Fitness Integration](https://github.com/ZeekWall/ha-crunch-fitness-integration).

## Features

- Next upcoming class displayed prominently
- Today's full class list (or full weekly schedule)
- Class details: time, instructor, room, available spots
- Past classes shown dimmed; next class highlighted
- Adapts to your HA theme automatically
- HACS compatible

## Requirements

- [Crunch Fitness Integration](https://github.com/ZeekWall/ha-crunch-fitness-integration) installed and configured

## Installation

### Via HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to **Frontend**
3. Click the **+** button and search for **Crunch Fitness Card**
4. Install and reload your browser

### Manual

1. Download `crunch-fitness-card.js` from this repository
2. Copy it to your HA `config/www/` folder
3. In HA go to **Settings → Dashboards → Resources**
4. Add `/local/crunch-fitness-card.js` as a **JavaScript module**
5. Reload your browser

## Usage

Add the card to your dashboard via the UI card picker, or manually in YAML:

```yaml
type: custom:crunch-fitness-card
entity: sensor.crunch_desoto_schedule
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID of your Crunch sensor |
| `title` | string | location name | Override the card title |
| `show_all_classes` | boolean | `false` | Show full week instead of today only |
| `max_classes` | number | none | Limit the number of classes shown |

### Examples

**Basic:**
```yaml
type: custom:crunch-fitness-card
entity: sensor.crunch_desoto_schedule
```

**Custom title, limited to 5 classes:**
```yaml
type: custom:crunch-fitness-card
entity: sensor.crunch_desoto_schedule
title: My Gym
max_classes: 5
```

**Show full week schedule:**
```yaml
type: custom:crunch-fitness-card
entity: sensor.crunch_desoto_schedule
show_all_classes: true
```

## Related

- [Crunch Fitness Integration](https://github.com/ZeekWall/ha-crunch-fitness-integration)

## License

MIT
