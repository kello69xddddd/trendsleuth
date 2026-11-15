"""TrendSleuth data reduction (runs on the laptop).
Input : .tspk packs = raw zarr chunks fetched from the public NASA POWER bucket (s3://nasa-power).
Output: compact int16 .npz files (global 1.0 x 1.25 deg grid + full-resolution regional boxes).
Usage : python reduce_packs.py m2 VAR | syn VAR | imerg PARTNO | imerg_finish | nino
"""
import sys, os, json, struct, time, numpy as np
from numcodecs import get_codec
RAW = os.environ.get("TS_RAW", os.path.expanduser("~/mnt/Downloads"))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "proc")
TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "tmp")
NODATA = -32768
BOXES = {"sa": (-25.0, 15.0, -95.0, -30.0)}          # tropical South America, native resolution
IMERG_BOX = (-6.0, 3.0, -82.0, -74.0)                # Ecuador, native 0.1 deg

def read_pack(path):
    with open(path, "rb") as f:
        assert f.read(4) == b"TSPK"
        (hl,) = struct.unpack("<I", f.read(4)); header = json.loads(f.read(hl)); blob = f.read()
    ent = {e["key"].split("/", 1)[1]: e for e in header["entries"]}
    g = lambda k: json.loads(blob[ent[k]["offset"]: ent[k]["offset"] + ent[k]["length"]])
    return header, blob, ent, g(".zarray"), g(".zattrs")

def chunks(blob, ent, za):
    comp = get_codec(za["compressor"]) if za["compressor"] else None
    filters = [get_codec(f) for f in (za["filters"] or [])]
    dt = np.dtype(za["dtype"])
    for key, e in ent.items():
        if key.startswith(".z"): continue
        buf = blob[e["offset"]: e["offset"] + e["length"]]
        if comp: buf = comp.decode(buf)
        for flt in reversed(filters): buf = flt.decode(buf)
        yield [int(i) for i in key.split(".")], np.frombuffer(buf, dtype=dt).reshape(za["chunks"])

def full(path):
    h, blob, ent, za, zt = read_pack(path)
    out = np.full(za["shape"], np.nan, dtype="f4")
    for idx, arr in chunks(blob, ent, za):
        sl = tuple(slice(i * c, min((i + 1) * c, s)) for i, c, s in zip(idx, za["chunks"], za["shape"]))
        out[sl] = arr[tuple(slice(0, s.stop - s.start) for s in sl)]
    return out, zt, h

def to_i16(a, scale):
    b = np.round(a * scale); b[~np.isfinite(b)] = NODATA
    return np.clip(b, -32767, 32767, out=b, where=b != NODATA).astype("i2")

def scale_for(a):
    m = np.nanmax(np.abs(a))
    return 100.0 if m < 320 else (10.0 if m < 3200 else 1.0)

def reduce_grid(tag, var, coarsen):
    a, zt, h = full(os.path.join(RAW, f"ts_{tag}_{var}.tspk"))
    nt = int(np.where(np.isfinite(a).any(axis=(1, 2)))[0][-1]) + 1
    a = a[:nt]
    if tag == "m2":
        lat = np.arange(-90, 90.01, 0.5); lon = np.arange(-180, 180, 0.625); t0 = "1981-01"
    else:
        lat = np.arange(-89.5, 90, 1.0); lon = np.arange(-179.5, 180, 1.0); t0 = "2001-01"
    sc = 100.0 if var in ("PRECTOTCORR","EVLAND") else scale_for(a); res = {}
    if coarsen:
        b = a[:, :360, :].reshape(nt, 180, 2, 288, 2)
        with np.errstate(invalid="ignore"):
            c = np.nanmean(b, axis=(2, 4))
        res["glob"] = to_i16(c, sc); res["glob_lat"] = lat[:360].reshape(180, 2).mean(1); res["glob_lon"] = lon.reshape(288, 2).mean(1)
        for name, (la0, la1, lo0, lo1) in BOXES.items():
            ii = np.where((lat >= la0) & (lat <= la1))[0]; jj = np.where((lon >= lo0) & (lon <= lo1))[0]
            res[name] = to_i16(a[:, ii[0]:ii[-1] + 1, jj[0]:jj[-1] + 1], sc); res[name + "_lat"] = lat[ii]; res[name + "_lon"] = lon[jj]
    else:
        res["glob"] = to_i16(a, sc); res["glob_lat"] = lat; res["glob_lon"] = lon
    meta = dict(var=var, source=h["source"], fetched=h["fetched"], long_name=zt.get("long_name"), units=zt.get("units"),
                definition=zt.get("definition"), scale=sc, nodata=NODATA, t0=t0, nt=nt)
    np.savez_compressed(os.path.join(OUT, f"{tag}_{var}.npz"), meta=json.dumps(meta), **res)
    print(tag, var, "nt", nt, "scale", sc, {k: v.shape for k, v in res.items() if v.ndim == 3})
    return a, lat, lon, nt

def nino():
    a, lat, lon, nt = reduce_grid("m2", "TS", True)
    boxes = {"nino34": (-5, 5, -170, -120), "nino12": (-10, 0, -90, -80), "nino3": (-5, 5, -150, -90), "nino4": (-5, 5, 160, -150)}
    w = np.cos(np.deg2rad(lat))
    out = {}
    for k, (la0, la1, lo0, lo1) in boxes.items():
        ii = (lat >= la0) & (lat <= la1)
        jj = ((lon >= lo0) & (lon <= lo1)) if lo0 < lo1 else ((lon >= lo0) | (lon <= lo1))
        sub = a[:, ii][:, :, jj]; ww = np.broadcast_to(w[ii][None, :, None], sub.shape)
        out[k] = (np.nansum(sub * ww, axis=(1, 2)) / np.nansum(np.where(np.isfinite(sub), ww, 0), axis=(1, 2)))
    with open(os.path.join(OUT, "m2_sst_boxes.csv"), "w") as f:
        f.write("month," + ",".join(out) + "\n")
        for t in range(nt):
            f.write(f"{1981 + t // 12}-{t % 12 + 1:02d}," + ",".join(f"{out[k][t]:.4f}" for k in out) + "\n")
    print("nino csv", nt)

def imerg_part(p):
    h, blob, ent, za, zt = read_pack(os.path.join(RAW, f"ts_imerg_PRECTOT_part{p}.tspk"))
    nt = za["shape"][0]; cs = za["chunks"]
    sp, cp = os.path.join(TMP, "imerg_sum.npy"), os.path.join(TMP, "imerg_cnt.npy")
    if p == 0 or not os.path.exists(sp):
        S = np.zeros((nt, 180, 288), "f4"); C = np.zeros((nt, 180, 288), "u2")
    else:
        S = np.load(sp); C = np.load(cp)
    la0, la1, lo0, lo1 = IMERG_BOX
    bi = (int(round((la0 + 89.95) / 0.1)), int(round((la1 + 89.95) / 0.1)), int(round((lo0 + 179.95) / 0.1)), int(round((lo1 + 179.95) / 0.1)))
    bp = os.path.join(TMP, "imerg_box.npy")
    B = np.load(bp) if os.path.exists(bp) and p > 0 else np.full((nt, bi[1] - bi[0], bi[3] - bi[2]), np.nan, "f4")
    n = 0
    for idx, arr in chunks(blob, ent, za):
        i0, j0 = idx[1] * cs[1], idx[2] * cs[2]
        ni, nj = min(cs[1], 1800 - i0), min(cs[2], 3600 - j0)
        arr = arr[:, :ni, :nj]
        lat = -89.95 + 0.1 * (i0 + np.arange(ni)); lon = -179.95 + 0.1 * (j0 + np.arange(nj))
        ci = np.floor((lat + 90.25) / 1.0).astype(int); cj = np.floor((lon + 180.3125) / 1.25).astype(int) % 288
        fin = np.isfinite(arr); v = np.where(fin, arr, 0.0)
        for a_ in np.unique(ci):
            if a_ > 179: continue
            mi = ci == a_
            for b_ in np.unique(cj):
                mj = cj == b_
                S[:, a_, b_] += v[:, mi][:, :, mj].sum(axis=(1, 2)); C[:, a_, b_] += fin[:, mi][:, :, mj].sum(axis=(1, 2)).astype("u2")
        # Ecuador native box
        r0, r1, c0, c1 = max(i0, bi[0]), min(i0 + ni, bi[1]), max(j0, bi[2]), min(j0 + nj, bi[3])
        if r0 < r1 and c0 < c1:
            B[:, r0 - bi[0]:r1 - bi[0], c0 - bi[2]:c1 - bi[2]] = arr[:, r0 - i0:r1 - i0, c0 - j0:c1 - j0]
        n += 1
    np.save(sp, S); np.save(cp, C); np.save(bp, B)
    with open(os.path.join(TMP, "imerg_meta.json"), "w") as f:
        json.dump(dict(source=h["source"], fetched=h["fetched"], long_name=zt.get("long_name"), units=zt.get("units"), definition=zt.get("definition")), f)
    print("imerg part", p, "chunks", n)

def imerg_finish():
    S = np.load(os.path.join(TMP, "imerg_sum.npy")); C = np.load(os.path.join(TMP, "imerg_cnt.npy")); B = np.load(os.path.join(TMP, "imerg_box.npy"))
    m = json.load(open(os.path.join(TMP, "imerg_meta.json")))
    with np.errstate(invalid="ignore", divide="ignore"):
        g = np.where(C >= 60, S / C, np.nan)           # need >=60 of ~125 native cells
    nt = int(np.where(np.isfinite(g).any(axis=(1, 2)))[0][-1]) + 1
    la0, la1, lo0, lo1 = IMERG_BOX
    meta = dict(var="IMERG_PRECTOT", scale=100.0, nodata=NODATA, t0="1998-01", nt=nt, **m)
    np.savez_compressed(os.path.join(OUT, "imerg_PRECTOT.npz"), meta=json.dumps(meta),
                        glob=to_i16(g[:nt], 100.0), glob_lat=-89.75 + np.arange(180), glob_lon=-179.6875 + 1.25 * np.arange(288),
                        ec=to_i16(B[:nt], 100.0), ec_lat=la0 + 0.05 + 0.1 * np.arange(B.shape[1]), ec_lon=lo0 + 0.05 + 0.1 * np.arange(B.shape[2]))
    print("imerg done nt", nt, g.shape, B.shape, "finite frac", float(np.isfinite(g[:nt]).mean()))

if __name__ == "__main__":
    t = time.time(); cmd = sys.argv[1]
    if cmd == "m2": reduce_grid("m2", sys.argv[2], True)
    elif cmd == "syn": reduce_grid("syn", sys.argv[2], False)
    elif cmd == "nino": nino()
    elif cmd == "imerg": imerg_part(int(sys.argv[2]))
    elif cmd == "imerg_finish": imerg_finish()
    print("secs", round(time.time() - t, 1))
