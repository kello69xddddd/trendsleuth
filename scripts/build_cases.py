"""Build the pre-computed case files and global statistics used by the web app and the report
(web/data/cases.json, web/data/nino.json).  Everything is derived from the reduced NASA cubes in data/proc."""
import sys, os, json, warnings, numpy as np
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from trendsleuth import io, engine as E

n34, n34_last = io.noaa_nino34()
n12, n12_last = io.noaa_nino34(os.path.join(io.DATA, "noaa_nina12_anom.txt"))
SRC = {
    "imerg_PRECTOT": dict(label="GPM IMERG precipitation", units="mm/day", product="NASA GPM IMERG monthly (via NASA POWER v10, s3://nasa-power/imerg)"),
    "m2_PRECTOTCORR": dict(label="MERRA-2 corrected precipitation", units="mm/day", product="NASA MERRA-2 PRECTOTCORR monthly (via NASA POWER v10, s3://nasa-power/merra2)"),
    "m2_T2M": dict(label="MERRA-2 air temperature at 2 m", units="°C", product="NASA MERRA-2 T2M monthly (via NASA POWER v10, s3://nasa-power/merra2)"),
}
CASES = [
    dict(id="ec_costa", title="Ecuador coast: rainfall", story="cycle", region="Coastal lowlands of Ecuador (3.5°S–1°N, 80.9–79.4°W)",
         box=(-3.5, 1.0, -80.9, -79.4), prim=("imerg_PRECTOT", "ec", 0.0), sec=("m2_PRECTOTCORR", "sa", 0.3)),
    dict(id="ec_coca", title="Ecuador Amazon (Coca basin): rainfall", story="cycle", region="Coca river basin, upstream of Coca Codo Sinclair (0.8°S–0.3°N, 78.3–77.3°W)",
         box=(-0.8, 0.3, -78.3, -77.3), prim=("imerg_PRECTOT", "ec", 0.0), sec=("m2_PRECTOTCORR", "sa", 0.3)),
    dict(id="ec_coca_m2", title="The phantom wetting (Coca basin, single source)", story="phantom", region="Same basin, but analysed with MERRA-2 only, as a single-source tool would",
         box=(-0.8, 0.3, -78.3, -77.3), prim=("m2_PRECTOTCORR", "sa", 0.3), sec=("imerg_PRECTOT", "ec", 0.0)),
    dict(id="ec_paute", title="Ecuador Austro (Paute basin): rainfall", story="cycle", region="Paute river basin: Mazar, Molino, Sopladora plants (3.2–2.3°S, 79.3–78.4°W)",
         box=(-3.2, -2.3, -79.3, -78.4), prim=("imerg_PRECTOT", "ec", 0.0), sec=("m2_PRECTOTCORR", "sa", 0.3)),
    dict(id="ec_quito_t", title="Northern Andes of Ecuador: temperature", story="trend", region="Quito region (0.8°S–0.5°N, 78.9–78.0°W)",
         box=(-0.8, 0.5, -78.9, -78.0), prim=("m2_T2M", "sa", 0.3), sec=None),
    dict(id="pac_atolls", title="Open case: the hidden drying of the equatorial Pacific atolls", story="hidden",
         region="Nauru and the Gilbert Islands of Kiribati (6°S–3°N, 160–178°E)",
         box=(-6, 3, 160, 178), prim=("imerg_PRECTOT", "glob", 0.0), sec=("m2_PRECTOTCORR", "glob", 0.0)),
    dict(id="pac_atolls_m2", title="Atolls, second witness (MERRA-2, 1981–2026)", story="hidden",
         region="Nauru and the Gilbert Islands of Kiribati (6°S–3°N, 160–178°E)",
         box=(-6, 3, 160, 178), prim=("m2_PRECTOTCORR", "glob", 0.0), sec=("imerg_PRECTOT", "glob", 0.0)),
    dict(id="amazon_south", title="Known trend re-discovered: southern Amazon drying", story="known", region="Rondônia / southern Amazon (14–8°S, 65–58°W)",
         box=(-14, -8, -65, -58), prim=("imerg_PRECTOT", "glob", 0.0), sec=("m2_PRECTOTCORR", "glob", 0.0)),
    dict(id="china_north", title="Known trend re-discovered: North China wetting", story="known", region="North China (36–44°N, 105–120°E)",
         box=(36, 44, 105, 120), prim=("imerg_PRECTOT", "glob", 0.0), sec=("m2_PRECTOTCORR", "glob", 0.0)),
]

def r(a, k=3):
    return [None if not np.isfinite(v) else round(float(v), k) for v in np.asarray(a, float)]

def build(c):
    name, key, pad = c["prim"]
    y, meta = io.series(name, c["box"], key, pad); y0 = int(meta["t0"][:4])
    kw = {}
    if c["sec"]:
        z, m2 = io.series(c["sec"][0], c["box"], c["sec"][1], c["sec"][2]); kw = dict(second=z, second_start=(int(m2["t0"][:4]), 1))
    drivers = {"Nino 3.4": io.align_nino(n34, y0, len(y)), "Nino 1+2": io.align_nino(n12, y0, len(y))}
    case = E.analyze(y, nino=drivers, start_year=y0, units=SRC[name]["units"], name=c["title"], **kw)
    out = E.clean(case)
    out.update(id=c["id"], title=c["title"], story=c["story"], region=c["region"], box=c["box"], start_year=y0,
               primary=dict(SRC[name], key=name, fetched=meta.get("fetched"), definition=meta.get("definition")),
               secondary=(dict(SRC[c["sec"][0]], key=c["sec"][0]) if c["sec"] else None),
               mean=float(np.nanmean(y)),
               series=dict(y=r(y), anomaly=r(case["_anomaly"]), adjusted=r(case.get("_adjusted", case["_anomaly"])),
                           index=r(drivers[case["enso"]["index"]], 2)))
    if c["sec"]:
        out["series"]["second"] = r(z); out["series"]["second_start"] = int(m2["t0"][:4])
    return out

def global_stats():
    L = lambda t: np.load(f"out/scan/{t}.npz")
    im, m2, gw = L("imerg_PRECTOT_1998_2025"), L("m2_PRECTOTCORR_1998_2025"), L("m2_GWETROOT_1981_2025")
    lat, lon = m2["lat"], m2["lon"]
    area = np.cos(np.deg2rad(lat))[:, None] * np.ones((1, len(lon)))
    land = np.isfinite(gw["zall"]) & (np.abs(lat)[:, None] < 60) & np.isfinite(im["zall"])
    zi, zm = im["zall"], m2["zall"]
    A = lambda m: float(area[m].sum())
    sigM = land & (np.abs(zm) > 1.96); naive = land & (np.abs(m2["znaive"]) > 1.96)
    conf = sigM & (np.abs(zi) > 1.96) & (np.sign(zi) == np.sign(zm)); opp = sigM & (np.sign(zi) != np.sign(zm))
    allc = (np.abs(lat)[:, None] < 60) & np.isfinite(zi) & np.isfinite(zm)
    hid = allc & (np.abs(zi) < 1.64) & (np.abs(zm) < 1.64) & (np.abs(im["zall_adj"]) > 1.96) & (np.abs(m2["zall_adj"]) > 1.96) & (np.sign(im["zall_adj"]) == np.sign(m2["zall_adj"]))
    km2 = 111.2 * 1.0 * 111.2 * 1.25 / 1e6
    st = dict(period="1998-2025", land_share_merra2_significant=A(sigM) / A(land), land_share_naive_significant=A(naive) / A(land),
              share_lost_to_serial_correlation=1 - A(sigM) / A(naive), share_confirmed_by_imerg=A(conf) / A(sigM),
              share_opposite_sign_in_imerg=A(opp) / A(sigM), hidden_area_Mkm2=A(hid) * km2,
              n_land_cells=int(land.sum()))
    return st

if __name__ == "__main__":
    os.makedirs("web/data", exist_ok=True)
    cases = [build(c) for c in CASES]
    st = global_stats()
    nino = dict(start_year=1981, source="NOAA PSL, ERSST v6 anomalies (1981-2010 base): https://psl.noaa.gov/data/correlation/nina34.anom.data and nina1.anom.data",
                last=n34_last, nino34=r(n34, 2), nino12=r(n12, 2))
    dump = lambda path, obj: json.dump(obj, open(path, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
    dump("out/cases.json", dict(cases=cases, global_stats=st))
    dump("web/data/cases.json", dict(cases=cases, global_stats=st))
    dump("web/data/nino.json", nino)
    # trends.json, top_trends.json and offline.js are written by scripts/build_web_data.py (run it after this script)
    print(json.dumps(st, indent=1))
    for c in cases:
        v, d, e = c["verdict"], c["detection"], c["enso"]
        print(f"{c['id']:14s} {c['start']}..{c['end']} mean={c['mean']:.2f} | {v['level']:8s} {v['trend_per_decade']:+.3f} [{v['trend_lo']:+.3f},{v['trend_hi']:+.3f}] ({100*v['trend_per_decade']/c['mean']:+.1f}%/dec) on {v['judged_on'][:5]} raw p={d['mk_p']:.3g} naive p={d['mk_p_naive']:.3g} | {e['index']} var={e['variance_share']:.2f} p={e['coef_p']:.2g} peak m{e['peak_month']} {e['peak_sensitivity']:+.2f} lag={e['lag_months']} | hidden={v['hidden_by_enso']} disagree={v['sources_disagree']} need={c['detectability']['years_needed']:.0f}y")
    print({k: os.path.getsize('web/data/' + k) for k in os.listdir('web/data')})
