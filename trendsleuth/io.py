"""Loading of the reduced NASA data cubes (see scripts/reduce_packs.py)."""
import json, os, numpy as np
DATA = os.environ.get("TS_DATA", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "proc"))

def load(name, key="glob"):
    """Returns (cube float32 [time, lat, lon] with NaN, lat, lon, meta)."""
    z = np.load(os.path.join(DATA, name + ".npz"), allow_pickle=False)
    meta = json.loads(str(z["meta"]))
    raw = z[key]
    a = raw.astype(np.float32) / np.float32(meta["scale"])
    a[raw == meta["nodata"]] = np.nan
    return a, z[key + "_lat"], z[key + "_lon"], meta

def nino34(path=None, base=(1991, 2020)):
    """Nino 3.4 SST anomaly from the MERRA-2 skin temperature (5S-5N, 170W-120W)."""
    import csv
    path = path or os.path.join(DATA, "m2_sst_boxes.csv")
    rows = list(csv.DictReader(open(path)))
    out = {}
    for k in ("nino34", "nino12", "nino3", "nino4"):
        v = np.array([float(r[k]) for r in rows])
        ny = len(v) // 12
        m = v[: ny * 12].reshape(ny, 12)
        y0 = int(rows[0]["month"][:4])
        clim = m[base[0] - y0: base[1] - y0 + 1].mean(0)
        full = np.full(int(np.ceil(len(v) / 12)) * 12, np.nan); full[: len(v)] = v
        out[k] = (full.reshape(-1, 12) - clim).ravel()[: len(v)]
    return out, [r["month"] for r in rows]

def box_mean(cube, lat, lon, la0, la1, lo0, lo1, land=None):
    ii = (lat >= la0) & (lat <= la1); jj = (lon >= lo0) & (lon <= lo1)
    sub = cube[:, ii][:, :, jj]
    w = np.cos(np.deg2rad(lat[ii]))[None, :, None] * np.ones_like(sub)
    if land is not None:
        w = w * land[ii][:, jj][None]
    w = np.where(np.isfinite(sub), w, 0)
    with np.errstate(invalid="ignore"):
        return np.nansum(sub * w, axis=(1, 2)) / w.sum(axis=(1, 2))

def noaa_nino34(path=None, start_year=1981):
    """Official NOAA PSL Nino 3.4 anomaly (ERSST, 5N-5S 170W-120W). Returns (values from Jan start_year, last 'YYYY-MM')."""
    path = path or os.path.join(DATA, "noaa_nina34_anom.txt")
    rows = [l.split() for l in open(path) if l.strip() and l.split()[0].isdigit() and len(l.split()) == 13]
    yrs = [int(r[0]) for r in rows]
    v = np.array([[float(x) for x in r[1:]] for r in rows]); v[v < -90] = np.nan
    x = v[yrs.index(start_year):].ravel()
    last = np.where(np.isfinite(x))[0][-1]
    return x[: last + 1], f"{start_year + last // 12}-{last % 12 + 1:02d}"

def series(name, box, key="glob", pad=0.0):
    cube, lat, lon, meta = load(name, key)
    la0, la1, lo0, lo1 = box
    return box_mean(cube, lat, lon, la0 - pad, la1 + pad, lo0 - pad, lo1 + pad), meta

def align_nino(nino, start_year, n, nino_start=1981):
    off = (start_year - nino_start) * 12
    out = np.full(n, np.nan); seg = nino[off: off + n]; out[: len(seg)] = seg
    return out
