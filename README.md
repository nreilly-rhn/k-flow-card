# ⚡ k-flow-card v7.1.2

> **Repository:** https://github.com/thekhan1122/k-flow-card

**A beautiful real-time solar energy flow card for Home Assistant.**

k-flow-card visualises the live power flow between your solar panels, battery, inverter, grid and home load — all inside a single animated Lovelace card. It ships with a full visual editor and supports GoodWe inverters and JK-BMS batteries.

---

## ✨ Features

- Fully customizable,label of boxes now can be changed, Battery etc can be disabled. Grid and Battery Flow direction cane be inverted via toggle switch.
- Live animated energy-flow diagram (PV → Inverter → Battery / Grid / Load)
- Animated sun arc that tracks actual sunrise / sunset from `sun.sun`
- PV1 string power (optional total PV sensor)
- Battery endurance / charge-ETA estimator
- Battery discharge today and endurance / charge ETA
- Grid import / export energy totals
- Full visual editor — no YAML required
- Animated glowing icons with directional flow arrows
<img width="1708" height="2520" alt="sc3" src="https://github.com/user-attachments/assets/864a963a-0bb2-4ba8-957d-2d553db64506" />
<img width="1737" height="2544" alt="sc2" src="https://github.com/user-attachments/assets/37b1e321-906b-45fc-bacc-539b098155b2" />
<img width="1726" height="2536" alt="sc1" src="https://github.com/user-attachments/assets/f8ec01b1-0057-465c-8901-19bc17ee907e" />

---

## 📦 Installation

### Option A — HACS (Recommended)

1. Open **HACS** in Home Assistant → **Frontend**.
2. Click the **⋮ menu** (top-right) → **Custom repositories**.
3. Paste `https://github.com/thekhan1122/k-flow-card`, select category **Lovelace**, click **Add**.
4. Search for **k-flow-card** and click **Download**.
5. HACS downloads all files — the card JS and all icons — into `/config/www/community/k-flow-card/`. **if image not load then manual icon png file copying is needed.**

6. **Hard-refresh** your browser (`Ctrl + Shift + R` / `Cmd + Shift + R`).

> HACS registers the resource automatically. You do **not** need to add it manually in the dashboard settings.

---

### Option B — Manual Installation

1. Download the following files from the [repository](https://github.com/thekhan1122/k-flow-card):
   - `k-flow-card.js`
   - `flow.svg`
   - `pv-array.png`
   - `home-icon.png`
   - `grid-icon.png`
   - `powerwall-gateway-icon.png`

2. Create the folder `/config/www/community/k-flow-card/` if it does not already exist, and copy all files into it:

   ```bash
   mkdir -p /config/www/community/k-flow-card
   cp k-flow-card.js flow.svg pv-icon.png home-icon.png grid-icon.png powerwall-gateway-icon.png \
      /config/www/community/k-flow-card/
   ```

   The folder mirrors exactly where HACS puts files, so the card icon paths work the same for both install methods.

3. Register the JavaScript resource (see [Add as Dashboard Resource](#-add-as-dashboard-resource-manual-only) below).

4. **Hard-refresh** your browser (`Ctrl + Shift + R` / `Cmd + Shift + R`).

---

## 🔗 Add as Dashboard Resource *(Manual Only)*

HACS registers the resource automatically. **Skip this section if you used HACS.**

1. Go to **Settings → Dashboards → ⋮ menu → Resources**.
2. Click **+ Add Resource**.
3. Set:
   - **URL**: `/local/community/k-flow-card/k-flow-card.js`
   - **Resource type**: `JavaScript Module`
4. Click **Create** and reload the browser.

Alternatively in `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/community/k-flow-card/k-flow-card.js
      type: module
```

---

## 🖼 Icons

The card uses PNG icons automatically served from the install folder:

| File | Used for |
|---|---|
| `pv-array.png` | Inverter / PV array |
| `home-icon.png` | House / load icon |
| `grid-icon.png` | Grid / utility icon |
| `powerwall-gateway-icon.png` | Gateway hub (battery + grid ↔ home) |

Icons are served from `/local/community/k-flow-card/` for both HACS and manual installs. As long as the files are in the correct folder no extra configuration is required.

---

## ⚙️ Configuration

### Visual Editor

Open any dashboard in **Edit** mode, add a new card, and search for **k-flow-card**. All entities are picked from drop-down selectors — no YAML needed.

### YAML Example

```yaml
type: custom:k-flow-card
inverter_name: My GoodWe

# ── Solar ────────────────────────────────────────────
pv1_power: sensor.goodwe_pv1_power
pv_total_power: sensor.goodwe_pv_power   # optional — uses PV1 if omitted

# ── Solar Extras ─────────────────────────────────────
today_pv: sensor.goodwe_today_s_pv_generation
today_batt_chg: sensor.goodwe_today_battery_charge
today_load: sensor.goodwe_today_load
consump: sensor.goodwe_house_consumption

# ── Grid ─────────────────────────────────────────────
grid_active_power: sensor.goodwe_active_power
grid_import_energy: sensor.goodwe_today_energy_import
grid_export_energy: sensor.goodwe_today_energy_export  # optional
grid_power_alt: sensor.grid_phase_a_power              # optional fallback

# ── Primary Battery ──────────────────────────────────
battery_soc: sensor.jk_soc
battery_power: sensor.jk_power
battery_current: sensor.jk_current
battery_voltage: sensor.jk_voltage
batt_dis: sensor.goodwe_today_battery_discharge

# ── Fallback sensors (inverter-reported, optional) ───
goodwe_battery_soc: sensor.goodwe_battery_state_of_charge
goodwe_battery_curr: sensor.goodwe_battery_current

# ── System Limits ────────────────────────────────────
battery_full_ah: 314       # your battery capacity in Ah
battery_full_wh: 16076     # your battery capacity in Wh
inverter_max_power: 6000   # inverter rated power in W
pv_max_power: 7500         # total PV array peak in W

# ── Feature Toggles ──────────────────────────────────
_show_limits: false        # reveal limits section in visual editor
```

---

## 📋 Entity Reference

### General

| Key | Required | Type | Description |
|---|---|---|---|
| `inverter_name` | No | text | Label shown on the inverter box (e.g. `GoodWe 6kW`) |
| `sun` | No | entity | Sun entity, defaults to `sun.sun` |

### Solar

| Key | Required | Description |
|---|---|---|
| `pv1_power` | **Yes** | PV string power (W) |
| `pv_total_power` | No | Total PV power sensor — overrides `pv1_power` if provided |
| `today_pv` | **Yes** | Today's PV generation (kWh) |
| `today_batt_chg` | **Yes** | Today's battery charge from PV (kWh) |
| `today_load` | **Yes** | Today's total load (kWh) |
| `consump` | **Yes** | Real-time house consumption / load (W) |

### Grid

| Key | Required | Description |
|---|---|---|
| `grid_active_power` | **Yes** | Grid active power (W). Positive = import, negative = export |
| `grid_import_energy` | **Yes** | Grid energy imported today (kWh) |
| `grid_export_energy` | No | Grid energy exported today (kWh) |
| `grid_power_alt` | No | Alternative / fallback grid power sensor (used if primary is unavailable) |

### Primary Battery

| Key | Required | Description |
|---|---|---|
| `battery_soc` | **Yes** | State of charge (%) |
| `battery_power` | **Yes** | Battery power (W). Positive = charging, negative = discharging |
| `battery_current` | **Yes** | Battery current (A) |
| `battery_voltage` | **Yes** | Battery pack voltage (V) |
| `batt_dis` | **Yes** | Battery discharged today (kWh) |
| `goodwe_battery_soc` | No | Inverter-reported SOC — fallback if primary is unavailable |
| `goodwe_battery_curr` | No | Inverter-reported current — fallback |

### System Limits

| Key | Default | Description |
|---|---|---|
| `battery_full_ah` | `314` | Battery full capacity in Ah — used for endurance calculation |
| `battery_full_wh` | `16076` | Battery full capacity in Wh — used for endurance calculation |
| `inverter_max_power` | `6000` | Inverter rated output in W — used for load % bar |
| `pv_max_power` | `7500` | Total PV array peak in W — used for PV bar scaling |

### Feature Toggles

| Key | Default | Description |
|---|---|---|
| `_show_limits` | `false` | Reveal System Limits section in the visual editor |

---

## 🔍 Troubleshooting

### Card does not appear / "Custom element doesn't exist: k-flow-card"

- **Manual install:** Confirm the resource is registered at `/local/community/k-flow-card/k-flow-card.js` as a **JavaScript Module**.
- **HACS install:** Open HACS → Frontend → k-flow-card and confirm it shows as Installed.
- Hard-refresh the browser (`Ctrl + Shift + R`). If still missing, fully restart Home Assistant.

### Icons are missing (blank boxes)

Icon PNGs and `flow.svg` must be in `/config/www/community/k-flow-card/`:

```bash
ls /config/www/community/k-flow-card/
# Expected: k-flow-card.js  flow.svg  pv-array.png  home-icon.png  grid-icon.png
```

- **HACS:** If icons are missing after install, go to HACS → k-flow-card → **Redownload**.
- **Manual:** Make sure the folder name is exactly `k-flow-card` (lowercase, hyphen) and file names match exactly.

### All values show `--` or `0`

- Verify entity IDs in **Settings → Devices & Services → Entities**.
- Ensure entities are not `unavailable` or `unknown` — the card skips these states.
- Open browser Developer Tools → Console tab and look for JavaScript errors.

### `grid_active_power` always shows 0

The card falls back to `grid_power_alt` if the primary sensor is unavailable. Set both to cover sensor dropouts.

### Battery SOC not updating

The card reads `battery_soc` first, then falls back to `goodwe_battery_soc`. Assign at least one.

### Endurance shows `--`

- Set `battery_full_ah` and `battery_full_wh` to match your actual battery pack.
- Endurance only calculates when battery power is above 10 W (discharging or charging).

### Sun arc does not move

The arc requires the `sun.sun` entity which is part of the default HA installation. Verify it exists in **Developer Tools → States**. You can override it with the `sun` config key if needed.

---

## 📁 Repository File Structure

```
k-flow-card/
├── k-flow-card.js         ← Main card script
├── flow.svg               ← Energy flow diagram (loaded at runtime)
├── pv-array.png           ← Inverter / PV array icon
├── pv-panel.png           ← Single panel icon (optional asset)
├── home-icon.png          ← House / load icon
├── grid-icon.png          ← Grid / utility icon
├── hacs.json              ← HACS manifest
└── README.md
```

---

## 🙏 Credits

Developed for real-world GoodWe + JK-BMS solar systems.  
Built for [Home Assistant](https://www.home-assistant.io/).
