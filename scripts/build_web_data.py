"""Build every data file the web app reads, as JSON (web/data/*.json).

  trends.json       global trend map for each variable (1.0 x 1.25 deg): confirmed up / confirmed down / not confirmed
  top_trends.json   the strongest confirmed trends by country or province, found automatically
  places.topo.json  country and province borders (Natural Earth, public domain), used to name a place
  offline.js        the same data in one script, so the app also opens by double click (file://), where fetch() is blocked

Inputs: out/scan/*.npz (scripts/global_scan.py), data/geo/places.topo.json (scripts/build_places.sh),
        web/data/cases.json + nino.json (scripts/build_cases.py), web/data/drivers.json, web/data/earth.jpg.
Usage:  python scripts/build_web_data.py
"""
import base64, json, os, sys
import numpy as np
from matplotlib.path import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from trendsleuth import grid as G

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WEB = os.path.join(ROOT, "web", "data")
Z95 = 1.96
# variable -> (scan file, show the slope as % of the mean, units, decimals)
VARS = {
    "PRECTOTCORR": ("m2_PRECTOTCORR_1998_2025", True, "mm/day", 2),
    "T2M": ("m2_T2M_1981_2025", False, "°C", 2),
    "T2M_MAX": ("m2_T2M_MAX_1981_2025", False, "°C", 2),
    "T2M_MIN": ("m2_T2M_MIN_1981_2025", False, "°C", 2),
    "GWETROOT": ("m2_GWETROOT_1981_2025", True, "fraction", 3),
    "RH2M": ("m2_RH2M_1981_2025", False, "%", 2),
    "WS10M": ("m2_WS10M_1981_2025", True, "m/s", 2),
}
RAIN_WITNESS = "imerg_PRECTOT_1998_2025"
MIN_CELLS = 12         # smallest region we rank (about 150 000 km2 at the equator)
MIN_CELLS_SMALL = 8    # used only when no region of MIN_CELLS qualifies (the card says "small region")
MIN_AGREE = 0.70       # share of the region that must be confirmed in the same direction
SEA_BLOCK = (10, 20)   # open-sea regions: blocks of 10 deg latitude x 20 deg longitude, used when no land region qualifies
SEA_MIN_CELLS = 40


def scan(tag):
    return np.load(os.path.join(ROOT, "out", "scan", tag + ".npz"))


def dump(name, obj):
    path = os.path.join(WEB, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    return os.path.getsize(path)


def q(a, scale):
    return [None if not np.isfinite(v) else int(round(float(v) * scale)) for v in np.asarray(a).ravel()]


# ----------------------------------------------------------------------------- trend classes
def classify(key):
    """Returns (cls, slope per decade, mean, z). cls: 0 no data, 1 not confirmed, 2 confirmed up, 3 confirmed down."""
    s = scan(VARS[key][0])
    z, sen, mean = s["zall"], s["sall"] * 10.0, s["mean"]
    ok = np.isfinite(z)
    if key == "PRECTOTCORR":
        # two independent NASA datasets must both pass the test and agree on the direction
        w = scan(RAIN_WITNESS)["zall"]
        ok &= np.isfinite(w) & (np.abs(s["lat"])[:, None] <= 60)
        conf = ok & (np.abs(z) > Z95) & (np.abs(w) > Z95) & (np.sign(z) == np.sign(w))
        rule = "Seasonal Mann-Kendall test (Hirsch-Slack), p < 0.05 in NASA MERRA-2 and in NASA GPM IMERG, same direction"
    else:
        # one dataset: control the false discovery rate over the whole map (Benjamini-Hochberg, Wilks 2016)
        conf, _ = G.fdr_bh(np.where(ok, G.p_from_z(z), np.nan), 0.05)
        conf &= ok
        rule = "Seasonal Mann-Kendall test (Hirsch-Slack) on NASA MERRA-2, 5% false discovery rate over the map"
    cls = np.zeros(z.shape, np.uint8)
    cls[ok] = 1
    cls[conf & (z > 0)] = 2
    cls[conf & (z < 0)] = 3
    return cls, sen, mean, z, s, rule


def magnitude(key, cls, sen, mean):
    """How fast each confirmed cell changes, as a digit 1..9 (0 = not confirmed).
    9 = the 95th percentile of the confirmed cells of this variable or faster. Rain, soil moisture and wind use % of the local mean."""
    pct, units = VARS[key][1], VARS[key][2]
    floor = {"mm/day": 0.3, "m/s": 0.5, "fraction": 0.05}.get(units, 0)
    rate = np.abs(100 * sen / np.maximum(mean, floor)) if pct else np.abs(sen)
    conf = cls >= 2
    top = float(np.nanpercentile(rate[conf], 95)) if conf.any() else 1.0
    mag = np.zeros(cls.shape, np.uint8)
    mag[conf] = np.clip(np.ceil(9 * rate[conf] / top), 1, 9).astype(np.uint8)
    return mag, dict(strong=round(top, 3 if top < 1 else 1), units="% per decade" if pct else units + " per decade")


# ----------------------------------------------------------------------------- places
def decode_topo(topo):
    sx, sy = topo["transform"]["scale"]; tx, ty = topo["transform"]["translate"]
    arcs = []
    for a in topo["arcs"]:
        pts = np.cumsum(np.asarray(a, float), axis=0)
        arcs.append(np.column_stack([pts[:, 0] * sx + tx, pts[:, 1] * sy + ty]))

    def ring(ids):
        parts = []
        for i in ids:
            a = arcs[~i][::-1] if i < 0 else arcs[i]
            parts.append(a if not parts else a[1:])
        return np.vstack(parts)

    out = {}
    for name, obj in topo["objects"].items():
        feats = []
        for g in obj["geometries"]:
            if not g.get("type"):
                continue
            polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
            feats.append(dict(props=g.get("properties", {}), polys=[[ring(r) for r in p] for p in polys]))
        out[name] = feats
    return out


def rasterise(feats, lat, lon):
    """Index of the feature that contains each cell centre (-1 = none)."""
    LON, LAT = np.meshgrid(lon, lat)
    pts = np.column_stack([LON.ravel(), LAT.ravel()])
    idx = np.full(pts.shape[0], -1, np.int32)
    for k, f in enumerate(feats):
        for poly in f["polys"]:
            outer = poly[0]
            x0, y0 = outer.min(0); x1, y1 = outer.max(0)
            cand = np.where((pts[:, 0] >= x0) & (pts[:, 0] <= x1) & (pts[:, 1] >= y0) & (pts[:, 1] <= y1))[0]
            if not cand.size:
                continue
            inside = Path(outer).contains_points(pts[cand])
            for hole in poly[1:]:
                inside &= ~Path(hole).contains_points(pts[cand])
            idx[cand[inside]] = k
    return idx.reshape(len(lat), len(lon))


def sea_name(lat, lon):
    """(sea, ocean) for a point in the open sea. Simple boxes, good enough to name a 10 x 20 degree block."""
    if lat < -60:
        for name, a, b in (("Weddell Sea", -60, -20), ("Bellingshausen Sea", -100, -60), ("Amundsen Sea", -150, -100)):
            if a <= lon < b:
                return name, "Southern Ocean"
        if lon >= 160 or lon < -150:
            return "Ross Sea", "Southern Ocean"
        return ("Atlantic sector" if lon < 20 else "Indian Ocean sector"), "Southern Ocean"
    if lat > 66:
        return "Arctic Ocean", "Arctic Ocean"
    if -70 < lon < 20 or (lat > 9 and -98 < lon <= -60):
        ocean = "Atlantic"
    elif (20 <= lon <= 100 and lat < 31) or (100 < lon <= 146 and lat < -10):
        return ("Northern Indian Ocean" if lat >= 0 else "Southern Indian Ocean"), "Indian Ocean"
    else:
        ocean = "Pacific"
    part = "Tropical " if abs(lat) < 20 else ("North " if lat > 0 else "South ")
    return part + ocean, ocean + " Ocean"


def top_trends(layers, lat, lon, geo):
    """For each variable: the region with the fastest confirmed rise and the fastest confirmed fall.
    1) countries and provinces of at least MIN_CELLS cells; 2) if none, land regions of at least MIN_CELLS_SMALL cells;
    3) if none, open-sea blocks. Steps 2 and 3 are marked in the output (tier = "small" or "sea")."""
    area = np.cos(np.deg2rad(lat))[:, None] * np.ones((1, len(lon)))
    LON, LAT = np.meshgrid(lon, lat)
    masks = []
    land = np.zeros(LAT.shape, bool)
    for kind in ("ctry", "prov"):
        ras = rasterise(geo[kind], lat, lon)
        land |= ras >= 0
        for k, f in enumerate(geo[kind]):
            m = ras == k
            if m.sum() >= MIN_CELLS_SMALL and f["props"].get("admin") != "Antarctica" and (kind == "ctry" or f["props"].get("name")):
                masks.append((kind, f["props"], m, "land" if m.sum() >= MIN_CELLS else "small"))
    dy, dx = SEA_BLOCK
    for y0 in range(-80, 80, dy):
        for x0 in range(-180, 180, dx):
            m = ~land & (LAT >= y0) & (LAT < y0 + dy) & (LON >= x0) & (LON < x0 + dx)
            if m.sum() >= SEA_MIN_CELLS:
                sea, ocean = sea_name(y0 + dy / 2, x0 + dx / 2)
                masks.append(("sea", dict(name=sea, admin=ocean), m, "sea"))
    need = {"land": MIN_CELLS, "small": MIN_CELLS_SMALL, "sea": SEA_MIN_CELLS}
    rank = {"land": 0, "small": 1, "sea": 2}
    out = []
    for key, (cls, sen, mean, z) in layers.items():
        pct, units, dec = VARS[key][1], VARS[key][2], VARS[key][3]
        best = {}
        for kind, props, m, tier in masks:
            have = m & (cls > 0)
            if have.sum() < need[tier]:
                continue
            w = area[have]
            for code, sign in ((2, 1), (3, -1)):
                share = float(area[have & (cls == code)].sum() / w.sum())
                if share < MIN_AGREE:
                    continue
                slope = float((sen[have] * w).sum() / w.sum())
                mu = float((mean[have] * w).sum() / w.sum())
                rel = 100 * slope / mu if pct and mu > 0 else None
                score = abs(rel) if pct else abs(slope)
                if pct and mu < {"mm/day": 0.3, "m/s": 0.5, "fraction": 0.05}[units]:
                    continue                      # a percentage of almost nothing is not a useful headline
                if sign * slope <= 0:
                    continue
                cand = dict(var=key, dir="up" if sign > 0 else "down", kind={"ctry": "country", "prov": "province", "sea": "sea"}[kind], tier=tier,
                            name=props["admin"] if kind == "ctry" else props.get("name"), country=props["admin"],
                            slope=round(slope, dec + 1), units=units, pct=None if rel is None else round(rel, 1),
                            confirmed_share=round(share, 2), mean_z=round(float((np.abs(z[have]) * w).sum() / w.sum()), 1),
                            lat=round(float((LAT[have] * w).sum() / w.sum()), 2), lon=round(float(LON[have][np.argmax(w)]), 2),
                            cells=int(have.sum()), score=score)
                # the label point must be a cell of the region: take the cell closest to the weighted centre
                cy, cx = (LAT[have] * w).sum() / w.sum(), (LON[have] * w).sum() / w.sum()
                j = np.argmin((LAT[have] - cy) ** 2 + (LON[have] - cx) ** 2)
                cand["lat"], cand["lon"] = round(float(LAT[have][j]), 2), round(float(LON[have][j]), 2)
                old = best.get(cand["dir"])
                if not old or rank[tier] < rank[old["tier"]] or (tier == old["tier"] and score > old["score"]):
                    best[cand["dir"]] = cand
        for d in ("up", "down"):
            if d in best:
                best[d].pop("score"); out.append(best[d])
    return out


# ----------------------------------------------------------------------------- main
def main():
    os.makedirs(WEB, exist_ok=True)
    topo = json.load(open(os.path.join(ROOT, "data", "geo", "places.topo.json"), encoding="utf-8"))
    geo = decode_topo(topo)
    sizes, layers, tv = {}, {}, {}
    lat = lon = None
    for key in VARS:
        cls, sen, mean, z, s, rule = classify(key)
        lat, lon = s["lat"], s["lon"]
        area = np.cos(np.deg2rad(lat))[:, None] * np.ones(cls.shape)
        tot = area[cls > 0].sum()
        tv[key] = dict(period=f"{int(s['y0'])}-{int(s['y1'])}", rule=rule, cls="".join(" nud"[c] for c in cls.ravel()),
                       share=dict(up=round(float(area[cls == 2].sum() / tot), 3), down=round(float(area[cls == 3].sum() / tot), 3),
                                  none=round(float(area[cls == 1].sum() / tot), 3)))
        mag, tv[key]["scale"] = magnitude(key, cls, sen, mean)
        tv[key]["mag"] = "".join(str(int(m)) for m in mag.ravel())
        layers[key] = (cls, sen, mean, z)
        print(f"{key:12s} {tv[key]['period']} up {tv[key]['share']['up']:.1%} down {tv[key]['share']['down']:.1%} not confirmed {tv[key]['share']['none']:.1%}")
    im = scan(RAIN_WITNESS)
    trends = dict(
        grid=dict(lat0=float(lat[0]), dlat=1.0, lon0=float(lon[0]), dlon=1.25, nlat=len(lat), nlon=len(lon)),
        legend={" ": "no data", "n": "trend not confirmed", "u": "confirmed upward trend", "d": "confirmed downward trend",
                "mag": "speed of the confirmed trend, 1 (slow) to 9 (the 95th percentile of this variable, see scale.strong, or faster); 0 = not confirmed"},
        vars=tv,
        # second witness for rain at any place: GPM IMERG trend of the cell (slope in 0.01 mm/day per decade, Z x 10)
        rain_witness=dict(period="1998-2025", source="NASA GPM IMERG", sen=q(im["sall"] * 10, 100), z=q(im["zall"], 10),
                          sen_adj=q(im["sall_adj"] * 10, 100), z_adj=q(im["zall_adj"], 10)))
    sizes["trends.json"] = dump("trends.json", trends)
    top = dict(method=f"Regions with at least {MIN_CELLS} grid cells where at least {MIN_AGREE:.0%} of the area has a confirmed trend in the same direction. "
                      "For each variable we keep the fastest rise and the fastest fall (area-weighted mean Sen slope). "
                      f"If no such region exists we look at smaller land regions (at least {MIN_CELLS_SMALL} cells, tier 'small') and then at open-sea blocks of "
                      f"{SEA_BLOCK[0]} x {SEA_BLOCK[1]} degrees (tier 'sea').", list=top_trends(layers, lat, lon, geo))
    sizes["top_trends.json"] = dump("top_trends.json", top)
    for t in top["list"]:
        print(f"  {t['var']:12s} {t['dir']:4s} {t['name']}, {t['country']}: {t['slope']:+} {t['units']}/decade" + (f" ({t['pct']:+}%)" if t["pct"] is not None else "") + f" confirmed {t['confirmed_share']:.0%} cells {t['cells']} [{t['tier']}]")
    sizes["places.topo.json"] = dump("places.topo.json", topo)

    # one-file copy for file:// (double click). Same content as the JSON files.
    load = lambda n: json.load(open(os.path.join(WEB, n), encoding="utf-8"))
    b64 = lambda n, mime: f"data:{mime};base64," + base64.b64encode(open(os.path.join(WEB, n), "rb").read()).decode()
    bundle = dict(cases=load("cases.json"), nino=load("nino.json"), drivers=load("drivers.json"), trends=trends, top=top, places=topo,
                  earth=b64("earth.jpg", "image/jpeg"), bump=b64("earth_bump.png", "image/png"))
    with open(os.path.join(WEB, "offline.js"), "w", encoding="utf-8") as f:
        f.write("/* Generated by scripts/build_web_data.py. Do not edit: edit the JSON files and rebuild. */\nwindow.TS_OFFLINE = ")
        json.dump(bundle, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";\n")
    sizes["offline.js"] = os.path.getsize(os.path.join(WEB, "offline.js"))
    print({k: f"{v / 1024:.0f} kB" for k, v in sizes.items()})


if __name__ == "__main__":
    main()
