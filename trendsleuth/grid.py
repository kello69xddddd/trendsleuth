"""
Vectorised (numba) version of the Evidence Engine for whole grids.
Runs the same statistics as engine.py on every cell of a (time, lat, lon) cube:
per-calendar-month Mann-Kendall + Sen slope, the all-months seasonal test with the
Hirsch-Slack covariance, the ENSO regression, and Benjamini-Hochberg FDR control.
"""
import math
import numpy as np
from numba import njit, prange
from scipy import stats


@njit(cache=True)
def _mk_one(x):
    """S, Var(S) with tie correction, Sen slope (per step) for one finite series."""
    n = len(x)
    s = 0.0
    npair = n * (n - 1) // 2
    sl = np.empty(npair)
    k = 0
    for i in range(n - 1):
        for j in range(i + 1, n):
            d = x[j] - x[i]
            if d > 0:
                s += 1
            elif d < 0:
                s -= 1
            sl[k] = d / (j - i)
            k += 1
    xs = np.sort(x)
    tie = 0.0
    run = 1
    for i in range(1, n):
        if xs[i] == xs[i - 1]:
            run += 1
        else:
            if run > 1:
                tie += run * (run - 1) * (2 * run + 5)
            run = 1
    if run > 1:
        tie += run * (run - 1) * (2 * run + 5)
    var = (n * (n - 1) * (2 * n + 5) - tie) / 18.0
    return s, var, np.median(sl)


@njit(cache=True)
def _z(s, var):
    if var <= 0:
        return 0.0
    if s > 0:
        return (s - 1) / math.sqrt(var)
    if s < 0:
        return (s + 1) / math.sqrt(var)
    return 0.0


@njit(cache=True)
def _rank(x):
    n = len(x)
    order = np.argsort(x)
    r = np.empty(n)
    i = 0
    while i < n:
        j = i
        while j + 1 < n and x[order[j + 1]] == x[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            r[order[k]] = avg
        i = j + 1
    return r


@njit(parallel=True, cache=True)
def scan_monthly(cube):
    """cube: (nyear, 12, ncell) float32 anomalies (complete years, NaN-free cells only).
    Returns per-month Z and Sen slope (per year), plus the all-months seasonal Z using the
    Hirsch-Slack variance and the seasonal Sen slope."""
    ny, nm, nc = cube.shape
    zmon = np.zeros((nm, nc), np.float32)
    smon = np.zeros((nm, nc), np.float32)
    zall = np.zeros(nc, np.float32)
    zall_naive = np.zeros(nc, np.float32)
    sall = np.zeros(nc, np.float32)
    npair = ny * (ny - 1) // 2
    for c in prange(nc):
        x = np.empty((nm, ny))
        ok = True
        for g in range(nm):
            for y in range(ny):
                v = cube[y, g, c]
                if not (v == v):
                    ok = False
                x[g, y] = v
        if not ok:
            zmon[:, c] = np.nan
            smon[:, c] = np.nan
            zall[c] = np.nan
            zall_naive[c] = np.nan
            sall[c] = np.nan
            continue
        stot = 0.0
        vtot = 0.0
        allsl = np.empty(nm * npair)
        ranks = np.empty((nm, ny))
        sgn = np.empty((nm, npair), np.int8)
        for g in range(nm):
            s, var, med = _mk_one(x[g])
            zmon[g, c] = _z(s, var)
            smon[g, c] = med
            stot += s
            vtot += var
            ranks[g] = _rank(x[g])
            k = 0
            for i in range(ny - 1):
                for j in range(i + 1, ny):
                    d = x[g, j] - x[g, i]
                    sgn[g, k] = 1 if d > 0 else (-1 if d < 0 else 0)
                    allsl[g * npair + k] = d / (j - i)
                    k += 1
        cov = 0.0
        for g in range(nm - 1):
            for h in range(g + 1, nm):
                kk = 0.0
                for k in range(npair):
                    kk += sgn[g, k] * sgn[h, k]
                rr = 0.0
                for y in range(ny):
                    rr += ranks[g, y] * ranks[h, y]
                cov += (kk + 4.0 * rr - ny * (ny + 1.0) * (ny + 1.0)) / 3.0
        vcorr = vtot + 2.0 * cov
        if vcorr <= 0:
            vcorr = vtot
        zall[c] = _z(stot, vcorr)
        zall_naive[c] = _z(stot, vtot)
        sall[c] = np.median(allsl)
    return zmon, smon, zall, zall_naive, sall


def p_from_z(z):
    return 2 * (1 - stats.norm.cdf(np.abs(z)))


def fdr_bh(p, alpha=0.05):
    """Benjamini-Hochberg: boolean mask of discoveries among finite p-values (Wilks 2016)."""
    p = np.asarray(p, float)
    flat = p.ravel()
    ok = np.isfinite(flat)
    out = np.zeros(flat.shape, bool)
    pv = flat[ok]
    if pv.size == 0:
        return out.reshape(p.shape), 0.0
    order = np.argsort(pv)
    ranked = pv[order]
    thresh = alpha * (np.arange(1, pv.size + 1) / pv.size)
    below = np.where(ranked <= thresh)[0]
    cut = ranked[below.max()] if below.size else 0.0
    out[np.where(ok)[0]] = pv <= cut if below.size else False
    return out.reshape(p.shape), float(cut)


def monthly_anomalies(cube):
    """cube (nt, ...) starting in January -> anomalies with the mean seasonal cycle removed."""
    nt = cube.shape[0]
    ny = nt // 12
    a = cube[: ny * 12].reshape((ny, 12) + cube.shape[1:]).astype(np.float32)
    clim = np.nanmean(a, axis=0)
    return a - clim, clim


def remove_enso(anom, nino, max_lag=4):
    """anom: (nyear, 12, ncell). Regress each cell on time + lagged Nino 3.4 (best lag per cell)
    and return (adjusted anomalies, enso coefficient, lag, partial correlation)."""
    ny, nm, nc = anom.shape
    y = anom.reshape(ny * nm, nc).astype(np.float64)
    n = y.shape[0]
    t = np.arange(n) / 12.0
    t = t - t.mean()
    best_r = np.zeros(nc)
    best_lag = np.zeros(nc, int)
    best_coef = np.zeros(nc)
    yd = y - np.outer(t, (t @ (y - y.mean(0))) / (t @ t)) - y.mean(0)
    for lag in range(max_lag + 1):
        x = np.full(n, np.nan)
        x[lag:] = nino[: n - lag]
        m = np.isfinite(x)
        X = np.column_stack([np.ones(m.sum()), t[m], x[m]])
        beta, *_ = np.linalg.lstsq(X, y[m], rcond=None)
        xd = x[m] - np.polyval(np.polyfit(t[m], x[m], 1), t[m])
        r = (xd @ yd[m]) / (np.sqrt(xd @ xd) * np.sqrt(np.sum(yd[m] ** 2, axis=0)) + 1e-30)
        upd = np.abs(r) > np.abs(best_r)
        best_r[upd] = r[upd]
        best_lag[upd] = lag
        best_coef[upd] = beta[2, upd]
    adj = y.copy()
    for lag in range(max_lag + 1):
        sel = best_lag == lag
        if not sel.any():
            continue
        x = np.zeros(n)
        x[lag:] = nino[: n - lag]
        x[:lag] = nino[0]
        adj[:, sel] -= np.outer(np.nan_to_num(x), best_coef[sel])
    return adj.reshape(ny, nm, nc).astype(np.float32), best_coef, best_lag, best_r
