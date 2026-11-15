"""Global scan: run the grid engine on every cell, raw and ENSO-adjusted.
Usage: python scripts/global_scan.py NAME [first_year last_year]"""
import sys, os, time, json, numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from trendsleuth import io, grid as G

def run(name, y0=None, y1=None, key="glob"):
    cube, lat, lon, meta = io.load(name, key)
    t0 = int(meta["t0"][:4])
    y0 = y0 or t0
    nfull = cube.shape[0] // 12
    y1 = y1 or (t0 + nfull - 1)
    cube = cube[(y0 - t0) * 12:(y1 - t0 + 1) * 12]
    nin, _ = io.nino34(); n34 = nin["nino34"][(y0 - 1981) * 12:(y1 - 1981 + 1) * 12]
    anom, clim = G.monthly_anomalies(cube)
    ny = anom.shape[0]
    shp = anom.shape[2:]
    a = anom.reshape(ny, 12, -1)
    valid = np.isfinite(a).all(axis=(0, 1)) & (np.nanstd(a, axis=(0, 1)) > 0)
    av = np.ascontiguousarray(a[:, :, valid])
    t = time.time()
    zmon, smon, zall, znaive, sall = G.scan_monthly(av)
    adj, coef, lag, r = G.remove_enso(av, n34)
    zmon2, smon2, zall2, _, sall2 = G.scan_monthly(np.ascontiguousarray(adj))
    def full(x):
        out = np.full(x.shape[:-1] + (valid.size,), np.nan, np.float32); out[..., valid] = x
        return out.reshape(x.shape[:-1] + shp)
    res = dict(lat=lat, lon=lon, y0=y0, y1=y1, clim=clim.astype(np.float32), mean=np.nanmean(cube, 0).astype(np.float32),
               zmon=full(zmon), smon=full(smon), zall=full(zall), znaive=full(znaive), sall=full(sall),
               zmon_adj=full(zmon2), smon_adj=full(smon2), zall_adj=full(zall2), sall_adj=full(sall2),
               enso_coef=full(coef.astype(np.float32)), enso_lag=full(lag.astype(np.float32)), enso_r=full(r.astype(np.float32)),
               meta=json.dumps(meta))
    os.makedirs("out/scan", exist_ok=True)
    tag = f"{name}_{y0}_{y1}" + ("" if key == "glob" else "_" + key)
    np.savez_compressed(f"out/scan/{tag}.npz", **res)
    p = G.p_from_z(res["zall"]); fd, cut = G.fdr_bh(p)
    print(f"{tag}: cells={valid.sum()} secs={time.time()-t:.0f} sig(p<.05)={np.nanmean(p<0.05):.1%} naive={np.nanmean(G.p_from_z(res['znaive'])<0.05):.1%} FDR={fd.sum()/valid.sum():.1%}")
    return res

if __name__ == "__main__":
    a = sys.argv[1:]
    run(a[0], int(a[1]) if len(a) > 1 else None, int(a[2]) if len(a) > 2 else None, a[3] if len(a) > 3 else "glob")
