"""Figures for the report and the demo slides (all from out/cases.json and out/scan)."""
import json, os, sys, numpy as np, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from trendsleuth import engine as E
C = {c["id"]: c for c in json.load(open("out/cases.json"))["cases"]}
NAVY, TEAL, ORANGE, RED, GREY = "#0B1F3A", "#0E8A86", "#E2672B", "#B42318", "#B9C2CE"
MON = "J F M A M J J A S O N D".split()
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 13, "axes.spines.top": False, "axes.spines.right": False, "axes.titleweight": "bold", "axes.titlecolor": NAVY})
os.makedirs("out/fig", exist_ok=True)
nz = lambda a: np.array([np.nan if v is None else v for v in a], float)
def rm(a, w=12):
    out = np.full(len(a), np.nan)
    for i in range(w - 1, len(a)):
        seg = a[i - w + 1:i + 1]
        if np.isfinite(seg).sum() >= 9: out[i] = np.nanmean(seg)
    return out
def tax(c): return c["start_year"] + np.arange(len(c["series"]["y"])) / 12

# 1 - same Nino, opposite fates
fig, ax = plt.subplots(1, 2, figsize=(10, 5.6), sharey=False)
for a, cid, col, ttl in ((ax[0], "ec_costa", "#1D6FB8", "COAST: wetter"), (ax[1], "ec_coca", "#B45309", "AMAZON (Coca): drier")):
    e = C[cid]["enso"]; a.bar(MON, e["sensitivity_by_month"], color=col); a.axhline(0, color=NAVY, lw=1)
    a.set_title(ttl); a.set_ylabel("mm/day per +1 °C")
    a.text(0.98, 0.95 if cid == "ec_costa" else 0.08, f"index: {e['index']}\nexplains {e['variance_share']:.0%} of monthly swings\np = {e['coef_p']:.1g}", transform=a.transAxes, ha="right", va="top" if cid == "ec_costa" else "bottom", fontsize=11, color=NAVY)
fig.suptitle("Rain response to El Niño by month (GPM IMERG, 1998–2026)", fontweight="bold", color=NAVY, fontsize=15); fig.tight_layout(); fig.savefig("out/fig/fig1_opposite_fates.png", dpi=170); plt.close()

# 2 - phantom wetting
c = C["ec_coca_m2"]; fig, a = plt.subplots(figsize=(10, 5.6))
ym = nz(c["series"]["y"]); am, _ = E.anomalies(ym); yi = nz(c["series"]["second"]); ai, _ = E.anomalies(yi)
t = tax(c); ti = c["series"]["second_start"] + np.arange(len(yi)) / 12
a.plot(t, rm(am), color=RED, lw=2.4, label=f"MERRA-2 alone: {c['detection']['sen_per_decade']:+.2f} mm/day per decade, p = {c['detection']['mk_p']:.4f}")
sec = c["robustness"]["second"]
a.plot(ti, rm(ai), color=TEAL, lw=2.4, label=f"GPM IMERG (second witness): {sec['second']['sen_per_decade']:+.2f} mm/day per decade, n.s.")
a.axhline(0, color=NAVY, lw=1); a.set_ylabel("rainfall anomaly, mm/day\n(12-month average)"); a.legend(frameon=False, loc="upper left", fontsize=11.5)
a.set_title("The phantom wetting (Coca basin, Ecuador)"); fig.tight_layout(); fig.savefig("out/fig/fig2_phantom.png", dpi=170); plt.close()

# 3 - hidden drying of the atolls
c = C["pac_atolls"]; t = tax(c); an = nz(c["series"]["anomaly"]); adj = nz(c["series"]["adjusted"]); idx = nz(c["series"]["index"])
fig, ax = plt.subplots(2, 1, figsize=(10, 6.0), sharex=True)
ax[0].bar(t, an, width=1 / 12, color=np.where(an >= 0, "#7FB7E6", "#E8A07A")); ax[0].plot(t, rm(an), color=NAVY, lw=2)
s = c["detection"]["sen_per_decade"]; ax[0].plot(t, np.nanmedian(an - s / 120 * np.arange(len(an))) + s / 120 * np.arange(len(an)), color=ORANGE, lw=3, ls=":")
ax[0].set_title(f"Raw record: no trend (p = {c['detection']['mk_p']:.2f}). El Niño explains {c['enso']['variance_share']:.0%} of the swings"); ax[0].set_ylabel("mm/day")
a2 = ax[0].twinx(); a2.plot(t, idx, color=RED, lw=1, alpha=.6); a2.set_ylabel("Niño 3.4 (°C)", color=RED); a2.spines["right"].set_visible(True)
ax[1].bar(t, adj, width=1 / 12, color=np.where(adj >= 0, "#7FB7E6", "#E8A07A")); ax[1].plot(t, rm(adj), color=NAVY, lw=2)
s = c["enso"]["trend_adj_per_decade"]; ax[1].plot(t, np.nanmedian(adj - s / 120 * np.arange(len(adj))) + s / 120 * np.arange(len(adj)), color=ORANGE, lw=3)
ax[1].set_title(f"After removing El Niño: {s:+.2f} mm/day per decade ({100*s/c['mean']:+.0f}% per decade), p = {c['enso']['mk_p_adj']:.4f}"); ax[1].set_ylabel("mm/day")
fig.suptitle("Rainfall over Nauru and the Gilbert Islands (GPM IMERG)", fontweight="bold", color=NAVY, fontsize=15); fig.tight_layout(); fig.savefig("out/fig/fig3_hidden_atolls.png", dpi=170); plt.close()

# 4 - global map: hidden + phantom cells
L = lambda t: np.load(f"out/scan/{t}.npz"); im, m2, gw = L("imerg_PRECTOT_1998_2025"), L("m2_PRECTOTCORR_1998_2025"), L("m2_GWETROOT_1981_2025")
lat, lon = m2["lat"], m2["lon"]; landm = np.isfinite(gw["zall"])
zi, zm, zia, zma = im["zall"], m2["zall"], im["zall_adj"], m2["zall_adj"]
hid = (np.abs(zi) < 1.64) & (np.abs(zm) < 1.64) & (np.abs(zia) > 1.96) & (np.abs(zma) > 1.96) & (np.sign(zia) == np.sign(zma))
ph = landm & (np.abs(zm) > 1.96) & (np.sign(zi) != np.sign(zm)); conf = (np.abs(zi) > 1.96) & (np.abs(zm) > 1.96) & (np.sign(zi) == np.sign(zm))
fig, a = plt.subplots(figsize=(13, 6)); a.set_facecolor("#EEF2F6")
a.contourf(lon, lat, landm.astype(float), levels=[0.5, 1.5], colors=["#D9DEE5"])
for mask, col, lab in ((conf & (zi > 0), "#7FB7E6", "confirmed wetting (both sources)"), (conf & (zi < 0), "#E8A07A", "confirmed drying (both sources)"), (ph, RED, "phantom: MERRA-2 significant, IMERG opposite"), (hid, NAVY, "hidden behind El Niño (both sources)")):
    yy, xx = np.where(mask & (np.abs(lat)[:, None] < 60)); a.scatter(lon[xx], lat[yy], s=5, c=col, marker="s", label=lab, linewidths=0)
a.set_xlim(-180, 180); a.set_ylim(-60, 60); a.set_xticks([]); a.set_yticks([]); a.legend(loc="lower left", frameon=True, fontsize=11, markerscale=3)
a.set_title("Rainfall trends 1998–2025: what one dataset shows, what two datasets confirm, and what El Niño hides"); fig.tight_layout(); fig.savefig("out/fig/fig4_global_map.png", dpi=170); plt.close()

# 5 - model-free bar chart: rainfall by ENSO state, first vs second half of each record
from trendsleuth import io
n34, _ = io.noaa_nino34(); res = {}
fig, ax = plt.subplots(1, 2, figsize=(12, 4.4), sharey=True)
for a, (name, y0, lab) in zip(ax, (("imerg_PRECTOT", 1998, "GPM IMERG"), ("m2_PRECTOTCORR", 1981, "MERRA-2"))):
    y, m = io.series(name, (-6, 3, 160, 178)); nino = io.align_nino(n34, y0, len(y)); lag = np.r_[np.nan, nino[:-1]]; yrs = y0 + np.arange(len(y)) / 12; mid = y0 + (yrs[-1] - y0) / 2
    groups = (("La Niña", lag < -0.5), ("Neutral", np.abs(lag) < 0.5), ("El Niño", lag > 0.5)); v1 = [np.nanmean(y[g & (yrs < mid)]) for _, g in groups]; v2 = [np.nanmean(y[g & (yrs >= mid)]) for _, g in groups]
    x = np.arange(3); a.bar(x - .2, v1, .4, color=GREY, label=f"{y0}–{int(mid)}"); a.bar(x + .2, v2, .4, color=ORANGE, label=f"{int(mid)+1}–2026")
    for i in range(3): a.text(x[i] + .2, v2[i] + .15, f"{100*(v2[i]-v1[i])/v1[i]:+.0f}%", ha="center", fontweight="bold", color=NAVY)
    a.set_xticks(x); a.set_xticklabels([g for g, _ in groups]); a.set_title(lab); a.legend(frameon=False); res[lab] = dict(first=v1, second=v2, mid=mid)
ax[0].set_ylabel("average rainfall, mm/day")
fig.suptitle("Nauru and Gilbert Islands: less rain whenever El Niño is not there", fontweight="bold", color=NAVY, fontsize=15); fig.tight_layout(); fig.savefig("out/fig/fig5_atolls_states.png", dpi=170); plt.close()
json.dump(res, open("out/atolls_states.json", "w"))
print(os.listdir("out/fig"), res)
