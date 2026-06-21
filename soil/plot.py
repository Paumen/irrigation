import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.dates import DateFormatter
from datetime import date

d = json.load(open("/home/user/irrigation/soil/example_data.json"))
s = d["series"]
tank = d["tankSize"]
today = date(2026, 6, 21)

dates = [date.fromisoformat(r["date"]) for r in s]
level = [r["level"] for r in s]
rain = [r["rain"] for r in s]
applied = [r["applied"] for r in s]
watered = set(d["wateredSet"])

fig, ax = plt.subplots(figsize=(13, 6))

# Soil moisture level (the tank)
ax.plot(dates, level, color="#1f6f43", lw=2.4, marker="o", ms=4,
        label="Soil moisture (mm available)", zorder=5)
ax.fill_between(dates, level, color="#1f6f43", alpha=0.10, zorder=1)
ax.axhline(tank, color="#555", ls="--", lw=1, label=f"Tank full ({tank:g} mm)")
ax.axhline(0, color="#b03030", ls="--", lw=1, label="Empty (wilting)")

# Rain bars (secondary axis)
ax2 = ax.twinx()
ax2.bar(dates, rain, width=0.7, color="#4a90d9", alpha=0.45,
        label="Rain (mm)", zorder=0)
ax2.set_ylabel("Rain / watering (mm)", color="#2c6")
ax2.set_ylim(0, max(20, max(rain) * 1.1))

# Watering events
wd = [dates[i] for i in watered]
wl = [level[i] for i in watered]
ax.scatter(wd, wl, s=170, marker="*", color="#e8a317",
           edgecolor="#7a5400", lw=0.8, zorder=6, label="Watered (dose 3.78 mm)")

# Today marker
ax.axvline(today, color="#888", ls=":", lw=1.2)
ax.text(today, tank * 1.02, " today", color="#555", fontsize=9, va="bottom")

ax.set_title(f"Soil water balance — {d['site']['name']}", fontsize=13, weight="bold")
ax.set_ylabel("Soil moisture (mm plant-available)")
ax.set_ylim(-1, tank * 1.12)
ax.xaxis.set_major_formatter(DateFormatter("%b %d"))
fig.autofmt_xdate(rotation=45)
ax.grid(True, axis="y", alpha=0.25)

# Combined legend
h1, l1 = ax.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc="upper right", fontsize=9, framealpha=0.9)

fig.tight_layout()
fig.savefig("/home/user/irrigation/soil/water_balance.png", dpi=130)
print("saved")
