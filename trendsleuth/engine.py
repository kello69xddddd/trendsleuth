"""
TrendSleuth Evidence Engine
===========================
Turns a monthly Earth-science time series into a verdict backed by evidence.

Layers
  0. precheck        coverage, gaps, units, period, seasonality strength
  1. detection       seasonal Mann-Kendall (Hirsch et al. 1982) with the Hirsch-Slack (1984)
                     serial-dependence correction, seasonal Sen slope + distribution-free CI,
                     OLS trend with AR(1)-adjusted t-test (Santer et al. 2008) as a control
  2. robustness      per-calendar-month trends + van Belle-Hughes homogeneity test,
                     end-point sensitivity, recent-vs-full period, optional second dataset
  3. trend vs cycle  regression of anomalies on time + lagged Nino 3.4 (Foster & Rahmstorf 2011)
  4. association     sign/strength of the link with ENSO (never called "cause")
  verdict            CASE STRENGTH: STRONG / MODERATE / WEAK / NOT YET (+ years of data needed,
                     Weatherhead et al. 1998)

All functions take plain numpy arrays. `y` is a monthly series that starts in January
(`start_month` can shift that) and may contain NaN.
"""
from __future__ import annotations
import math
import numpy as np
from scipy import stats

Z95 = 1.959963984540054


# --------------------------------------------------------------------------- helpers
def _as_matrix(y, period=12, start_month=1):
    """Reshape a monthly series into (years, period); pads with NaN."""
    y = np.asarray(y, dtype=float)
    lead = start_month - 1
    n = lead + len(y)
    nyear = int(math.ceil(n / period))
    full = np.full(nyear * period, np.nan)
    full[lead:lead + len(y)] = y
    return full.reshape(nyear, period)


def anomalies(y, period=12, start_month=1, baseline=None):
    """Remove the mean seasonal cycle. Returns (anomaly, climatology[period])."""
    m = _as_matrix(y, period, start_month)
    base = m if baseline is None else m[baseline[0]:baseline[1]]
    with np.errstate(invalid="ignore"):
        clim = np.nanmean(base, axis=0)
    anom = (m - clim).ravel()[start_month - 1: start_month - 1 + len(y)]
    return anom, clim


def _mk_s_var(x):
    """Mann-Kendall S and Var(S) (tie-corrected) for one series with NaN allowed."""
    x = x[np.isfinite(x)]
    n = len(x)
    if n < 4:
        return 0.0, 0.0, n
    d = np.sign(x[None, :] - x[:, None])
    s = float(np.sum(np.triu(d, 1)))
    _, counts = np.unique(x, return_counts=True)
    var = (n * (n - 1) * (2 * n + 5) - np.sum(counts * (counts - 1) * (2 * counts + 5))) / 18.0
    return s, float(var), n


def _z_from_s(s, var):
    if var <= 0:
        return 0.0
    if s > 0:
        return (s - 1) / math.sqrt(var)
    if s < 0:
        return (s + 1) / math.sqrt(var)
    return 0.0


def _p_from_z(z):
    return float(2 * (1 - stats.norm.cdf(abs(z))))


def _ranks_with_missing(col):
    """Hirsch-Slack ranks: missing values get the mid-rank (n_g + 1) / 2."""
    ok = np.isfinite(col)
    r = np.full(len(col), (ok.sum() + 1) / 2.0)
    if ok.any():
        r[ok] = stats.rankdata(col[ok])
    return r, int(ok.sum())


# --------------------------------------------------------------------------- layer 1
def seasonal_mann_kendall(y, period=12, start_month=1, correlated=True):
    """Seasonal Kendall test. With `correlated=True` the variance includes the between-season
    covariances of Hirsch & Slack (1984), which protects against serial dependence."""
    m = _as_matrix(y, period, start_month)
    nyear = m.shape[0]
    s_g, var_g, n_g = np.zeros(period), np.zeros(period), np.zeros(period, int)
    for g in range(period):
        s_g[g], var_g[g], n_g[g] = _mk_s_var(m[:, g])
    s_tot = float(s_g.sum())
    var_ind = float(var_g.sum())
    var_tot = var_ind
    if correlated:
        ranks = np.zeros_like(m)
        for g in range(period):
            ranks[:, g], _ = _ranks_with_missing(m[:, g])
        iu = np.triu_indices(nyear, 1)
        sgn = np.zeros((period, len(iu[0])))
        for g in range(period):
            d = m[iu[1], g] - m[iu[0], g]
            sgn[g] = np.where(np.isfinite(d), np.sign(d), 0.0)
        cov = 0.0
        for g in range(period - 1):
            for h in range(g + 1, period):
                k = float(np.sum(sgn[g] * sgn[h]))
                cov += (k + 4.0 * float(np.sum(ranks[:, g] * ranks[:, h]))
                        - nyear * (n_g[g] + 1) * (n_g[h] + 1)) / 3.0
        var_tot = var_ind + 2.0 * cov
        if var_tot <= 0:                       # numerical guard
            var_tot = var_ind
    z = _z_from_s(s_tot, var_tot)
    z_month = np.array([_z_from_s(s_g[g], var_g[g]) for g in range(period)])
    return dict(S=s_tot, var=var_tot, var_independent=var_ind, Z=z, p=_p_from_z(z),
                Z_month=z_month, p_month=np.array([_p_from_z(v) for v in z_month]),
                S_month=s_g, n_month=n_g)


def seasonal_sen_slope(y, period=12, start_month=1, var_s=None, alpha=0.05):
    """Seasonal Kendall slope (median of same-month pairwise slopes), per year, with the
    distribution-free confidence interval of Gilbert (1987) using Var(S)."""
    m = _as_matrix(y, period, start_month)
    nyear = m.shape[0]
    iu = np.triu_indices(nyear, 1)
    dt = (iu[1] - iu[0]).astype(float)
    slopes, per_month = [], np.full(period, np.nan)
    for g in range(period):
        d = (m[iu[1], g] - m[iu[0], g]) / dt
        d = d[np.isfinite(d)]
        if len(d):
            per_month[g] = np.median(d)
            slopes.append(d)
    if not slopes:
        return dict(slope=np.nan, lo=np.nan, hi=np.nan, slope_month=per_month)
    allsl = np.sort(np.concatenate(slopes))
    slope = float(np.median(allsl))
    lo = hi = np.nan
    if var_s is not None and var_s > 0:
        c = stats.norm.ppf(1 - alpha / 2) * math.sqrt(var_s)
        npairs = len(allsl)
        m1 = int(round((npairs - c) / 2.0)) - 1
        m2 = int(round((npairs + c) / 2.0))
        if 0 <= m1 < npairs and 0 <= m2 < npairs:
            lo, hi = float(allsl[m1]), float(allsl[m2])
    return dict(slope=slope, lo=lo, hi=hi, slope_month=per_month)


def ar1(x):
    x = np.asarray(x, float)
    ok = np.isfinite(x[:-1]) & np.isfinite(x[1:])
    if ok.sum() < 8:
        return 0.0
    a, b = x[:-1][ok], x[1:][ok]
    a = a - a.mean(); b = b - b.mean()
    den = math.sqrt(float(a @ a) * float(b @ b))
    return float(a @ b) / den if den > 0 else 0.0


def ols_ar1(anom, extra=None, t_years=None):
    """OLS of anomalies on time (years) [+ extra regressors]; standard errors inflated for
    lag-1 autocorrelation of the residuals (effective sample size, Santer et al. 2008)."""
    y = np.asarray(anom, float)
    n = len(y)
    t = np.arange(n) / 12.0 if t_years is None else np.asarray(t_years, float)
    cols = [np.ones(n), t - np.nanmean(t)]
    if extra is not None:
        extra = np.atleast_2d(np.asarray(extra, float))
        if extra.shape[0] != n:
            extra = extra.T
        cols += [extra[:, k] for k in range(extra.shape[1])]
    X = np.column_stack(cols)
    ok = np.isfinite(y) & np.all(np.isfinite(X), axis=1)
    Xo, yo = X[ok], y[ok]
    nobs, k = Xo.shape
    if nobs < k + 8:
        return None
    beta, *_ = np.linalg.lstsq(Xo, yo, rcond=None)
    resid_full = np.full(n, np.nan)
    resid_full[ok] = yo - Xo @ beta
    r1 = max(min(ar1(resid_full), 0.99), -0.99)
    neff = max(nobs * (1 - r1) / (1 + r1), k + 2.0) if r1 > 0 else float(nobs)
    sse = float(np.nansum(resid_full ** 2))
    s2 = sse / max(neff - k, 1.0)
    xtx_inv = np.linalg.inv(Xo.T @ Xo)
    se = np.sqrt(np.diag(xtx_inv) * s2)
    dof = max(neff - k, 1.0)
    tstat = beta / se
    p = 2 * (1 - stats.t.cdf(np.abs(tstat), dof))
    tcrit = stats.t.ppf(0.975, dof)
    sst = float(np.sum((yo - yo.mean()) ** 2))
    return dict(beta=beta, se=se, t=tstat, p=p, lo=beta - tcrit * se, hi=beta + tcrit * se,
                r1=r1, neff=neff, n=nobs, dof=dof, resid=resid_full,
                r2=1 - sse / sst if sst > 0 else 0.0, sigma=math.sqrt(sse / max(nobs - k, 1)))


# --------------------------------------------------------------------------- layer 3
def best_enso_lag(anom, nino, max_lag=6):
    """Lag (months, ENSO leading) that maximises |corr| between detrended anomalies and Nino 3.4."""
    a = np.asarray(anom, float)
    n = len(a)
    t = np.arange(n, dtype=float)
    ok = np.isfinite(a)
    if ok.sum() < 36:
        return 0, 0.0
    coef = np.polyfit(t[ok], a[ok], 1)
    det = a - np.polyval(coef, t)
    best, best_r = 0, 0.0
    for lag in range(0, max_lag + 1):
        x = np.full(n, np.nan)
        x[lag:] = nino[: n - lag] if lag else nino[:n]
        m = np.isfinite(det) & np.isfinite(x)
        if m.sum() < 36:
            continue
        r = np.corrcoef(det[m], x[m])[0, 1]
        if abs(r) > abs(best_r):
            best, best_r = lag, float(r)
    return best, best_r


def lagged(x, lag, n):
    out = np.full(n, np.nan)
    x = np.asarray(x, float)
    if lag == 0:
        out[: min(n, len(x))] = x[:n]
    else:
        out[lag:] = x[: n - lag]
    return out


def enso_design(nino, lag, n, start_month=1, seasonal=True):
    """ENSO regressors. With `seasonal=True` the sensitivity is allowed to change through the
    year: c(m) = c0 + c1 cos(2 pi m / 12) + c2 sin(2 pi m / 12)  (El Nino matters in some months only)."""
    x = lagged(nino, lag, n)
    if not seasonal:
        return x[:, None]
    m = (np.arange(n) + start_month - 1) % 12
    return np.column_stack([x, x * np.cos(2 * np.pi * m / 12.0), x * np.sin(2 * np.pi * m / 12.0)])


def enso_sensitivity_by_month(coefs):
    m = np.arange(12)
    if len(coefs) == 1:
        return np.full(12, coefs[0])
    return coefs[0] + coefs[1] * np.cos(2 * np.pi * m / 12.0) + coefs[2] * np.sin(2 * np.pi * m / 12.0)


def weatherhead_years(slope_per_year, sigma_noise, phi):
    """Years of monthly data needed to detect a trend of this size with 90 % probability at the
    95 % confidence level (Weatherhead et al. 1998, eq. 3)."""
    if not np.isfinite(slope_per_year) or slope_per_year == 0 or sigma_noise <= 0:
        return float("inf")
    phi = min(max(phi, 0.0), 0.98)
    return float(((3.3 * sigma_noise / abs(slope_per_year)) * math.sqrt((1 + phi) / (1 - phi))) ** (2.0 / 3.0))


# --------------------------------------------------------------------------- layer 0
def precheck(y, period=12, start_month=1, min_years=15, min_coverage=0.9):
    y = np.asarray(y, float)
    n = len(y)
    fin = np.isfinite(y)
    coverage = float(fin.mean()) if n else 0.0
    gaps, run = 0, 0
    for v in fin:
        run = 0 if v else run + 1
        gaps = max(gaps, run)
    anom, clim = anomalies(y, period, start_month)
    var_tot = float(np.nanvar(y)) if fin.sum() > 2 else 0.0
    seas = 1 - float(np.nanvar(anom)) / var_tot if var_tot > 0 else 0.0
    years = n / period
    issues = []
    if years < min_years:
        issues.append(f"record is short ({years:.1f} yr < {min_years})")
    if coverage < min_coverage:
        issues.append(f"coverage {coverage:.0%} < {min_coverage:.0%}")
    if gaps > 6:
        issues.append(f"gap of {gaps} consecutive months")
    if var_tot == 0:
        issues.append("series is constant")
    return dict(ok=not issues, issues=issues, n_months=n, years=years, coverage=coverage,
                longest_gap=gaps, seasonality_share=max(seas, 0.0), climatology=clim)


def _enso_layer(anom, nino, n, start_month, detect, max_lag):
    """Fit anomalies ~ time + seasonally-modulated lagged index. Returns (summary, adjusted, fit)."""
    nino = np.asarray(nino, float)[:n]
    if len(nino) < n:
        nino = np.concatenate([nino, np.full(n - len(nino), np.nan)])
    enso = adj_out = fit_out = None
    lag, r = best_enso_lag(anom, nino, max_lag)
    X = enso_design(nino, lag, n, start_month)
    fit = ols_ar1(anom, extra=X)
    if fit is not None:
        coefs = fit["beta"][2:]
        contrib = np.where(np.all(np.isfinite(X), axis=1), X @ coefs, 0.0)
        adj = anom - contrib
        smk_a = seasonal_mann_kendall(adj, start_month=start_month)
        sen_a = seasonal_sen_slope(adj, start_month=start_month, var_s=smk_a["var"])
        last = nino[-12:]
        recent_state = float(np.nanmean(last)) if np.isfinite(last).any() else 0.0
        raw_tr = detect["sen_per_decade"]
        adj_tr = sen_a["slope"] * 10
        share = abs(raw_tr - adj_tr) / abs(raw_tr) if raw_tr else 0.0
        # joint F-test for the three ENSO terms (effective sample size)
        ok = np.isfinite(anom) & np.all(np.isfinite(X), axis=1)
        sse1 = float(np.nansum(fit["resid"] ** 2))
        r0 = ols_ar1(np.where(ok, anom, np.nan))
        sse0 = float(np.nansum(r0["resid"] ** 2))
        q = X.shape[1]
        dof = max(fit["neff"] - (2 + q), 1.0)
        fstat = max((sse0 - sse1) / q, 0.0) / (sse1 / dof)
        p_enso = float(1 - stats.f.cdf(fstat, q, dof))
        sens = enso_sensitivity_by_month(coefs)
        peak = int(np.argmax(np.abs(sens)))
        var_enso = float(np.var(contrib[ok]))
        enso = dict(lag_months=int(lag), r_detrended=r, coefs=[float(c) for c in coefs],
                    sensitivity_by_month=[float(v) for v in sens], peak_month=peak + 1,
                    peak_sensitivity=float(sens[peak]), coef=float(sens[peak]), coef_p=p_enso,
                    variance_share=var_enso / float(np.nanvar(anom[ok])) if np.nanvar(anom[ok]) > 0 else 0.0,
                    trend_adj_per_decade=adj_tr, adj_lo=sen_a["lo"] * 10, adj_hi=sen_a["hi"] * 10,
                    mk_p_adj=smk_a["p"], ols_adj_per_decade=float(fit["beta"][1] * 10), ols_adj_p=float(fit["p"][1]),
                    trend_change_share=share, nino_last12=recent_state,
                    end_bias_alert=bool(abs(recent_state) >= 0.5 and p_enso < 0.05),
                    direction=("higher" if sens[peak] > 0 else "lower") + " during El Nino")
        adj_out = adj
        fit_out = fit
    return enso, adj_out, fit_out


# --------------------------------------------------------------------------- full case
def analyze(y, nino=None, start_year=1981, start_month=1, units="", name="",
            second=None, second_start=None, alpha=0.05, max_lag=6, alpha_driver=None):
    """Run every layer on one monthly series and return a JSON-friendly case file.

    y       monthly values (NaN allowed), first value = start_year/start_month
    nino    monthly Nino 3.4 anomaly aligned with y (same start, same length) or None
    second  optional independent dataset for the same quantity; `second_start` = (year, month)
    """
    y = np.asarray(y, float)
    n = len(y)
    pc = precheck(y, start_month=start_month)
    case = dict(name=name, units=units, start=f"{start_year}-{start_month:02d}",
                end=_ym(start_year, start_month, n - 1), precheck={k: (v.tolist() if isinstance(v, np.ndarray) else v) for k, v in pc.items()})
    if not pc["ok"]:
        case["verdict"] = dict(level="NO VERDICT", reason="; ".join(pc["issues"]), checks=[])
        return case

    anom, clim = anomalies(y, start_month=start_month)
    # ---- layer 1: detection
    smk = seasonal_mann_kendall(anom, start_month=start_month)
    sen = seasonal_sen_slope(anom, start_month=start_month, var_s=smk["var"], alpha=alpha)
    ols = ols_ar1(anom)
    mean_abs = float(np.nanmean(np.abs(y)))
    detect = dict(mk_Z=smk["Z"], mk_p=smk["p"], mk_p_naive=_p_from_z(_z_from_s(smk["S"], smk["var_independent"])),
                  sen_per_decade=sen["slope"] * 10, sen_lo=sen["lo"] * 10, sen_hi=sen["hi"] * 10,
                  ols_per_decade=float(ols["beta"][1] * 10), ols_lo=float(ols["lo"][1] * 10), ols_hi=float(ols["hi"][1] * 10),
                  ols_p=float(ols["p"][1]), ar1=ols["r1"], n_eff=ols["neff"],
                  pct_per_decade=(sen["slope"] * 10 / mean_abs * 100) if mean_abs > 0 else None,
                  total_change=sen["slope"] * n / 12.0)
    case["detection"] = detect

    # ---- layer 2: robustness
    hom_chi2 = float(np.sum(smk["Z_month"] ** 2) - 12 * np.mean(smk["Z_month"]) ** 2)
    hom_p = float(1 - stats.chi2.cdf(hom_chi2, 11))
    months = [dict(month=g + 1, sen_per_decade=float(sen["slope_month"][g] * 10), Z=float(smk["Z_month"][g]),
                   p=float(smk["p_month"][g])) for g in range(12)]
    cut = 24
    end_sens = None
    if n > 15 * 12 + cut:
        s2 = seasonal_mann_kendall(anom[:-cut], start_month=start_month)
        sl2 = seasonal_sen_slope(anom[:-cut], start_month=start_month)
        end_sens = dict(months_removed=cut, sen_per_decade=sl2["slope"] * 10, mk_p=s2["p"])
    recent = None
    nrec = 15 * 12
    if n >= 2 * nrec:
        lead = (start_month - 1 + n - nrec) % 12
        r_an = anom[-nrec:]
        s3 = seasonal_mann_kendall(r_an, start_month=lead + 1)
        sl3 = seasonal_sen_slope(r_an, start_month=lead + 1, var_s=s3["var"])
        recent = dict(years=15, sen_per_decade=sl3["slope"] * 10, lo=sl3["lo"] * 10, hi=sl3["hi"] * 10, mk_p=s3["p"])
    robust = dict(homogeneity_chi2=hom_chi2, homogeneity_p=hom_p, months=months,
                  end_sensitivity=end_sens, recent=recent)
    case["robustness"] = robust

    # ---- layer 3/4: trend vs cycle, association
    enso = None
    if nino is not None:
        cands = nino if isinstance(nino, dict) else {"Nino 3.4": nino}
        tried = []
        for label, series_ in cands.items():
            res, adj, fit = _enso_layer(anom, series_, n, start_month, detect, max_lag)
            if res is None:
                continue
            res["index"] = label
            tried.append((res, adj, fit))
        if tried:
            tried.sort(key=lambda t: -t[0]["variance_share"])
            enso, case["_adjusted"], case["_enso_fit"] = tried[0]
            enso["alternatives"] = [dict(index=t[0]["index"], variance_share=t[0]["variance_share"], p=t[0]["coef_p"],
                                         peak_month=t[0]["peak_month"], peak_sensitivity=t[0]["peak_sensitivity"]) for t in tried[1:]]
    case["enso"] = enso
    # alpha_driver: Bonferroni level when many rhythms are screened (same option as alphaDriver in web/engine.js)
    use_adj = bool(enso and enso["coef_p"] < (alpha_driver or alpha) and enso["variance_share"] >= 0.10)
    case["cycle_matters"] = use_adj
    if enso:
        idx = np.asarray(cands[enso["index"]], float)[:n]
        # model-free check: trend using only the months when the index is neutral (|index| < 0.5)
        neut = np.where(np.abs(lagged(idx, enso["lag_months"], n)) < 0.5, anom, np.nan)
        mkn = seasonal_mann_kendall(neut, start_month=start_month)
        sln = seasonal_sen_slope(neut, start_month=start_month, var_s=mkn["var"])
        enso["neutral"] = dict(n_months=int(np.isfinite(neut).sum()), sen_per_decade=sln["slope"] * 10,
                               lo=sln["lo"] * 10, hi=sln["hi"] * 10, mk_p=mkn["p"])
        if use_adj and n > 15 * 12 + cut:
            adj = case["_adjusted"]
            s4 = seasonal_mann_kendall(adj[:-cut], start_month=start_month)
            sl4 = seasonal_sen_slope(adj[:-cut], start_month=start_month)
            robust["end_sensitivity_adj"] = dict(months_removed=cut, sen_per_decade=sl4["slope"] * 10, mk_p=s4["p"])
    if second is not None:
        drv = None
        if use_adj:
            off = (start_year * 12 + start_month - 1)
            drv = dict(series=np.asarray(cands[enso["index"]], float), start=off, lag=enso["lag_months"])
        robust["second"] = compare_second(y, (start_year, start_month), second, second_start, driver=drv)

    # ---- noise model + detectability
    base_fit = case.pop("_enso_fit") if enso else ols
    sigma, phi = base_fit["sigma"], max(base_fit["r1"], 0.0)
    slope_for_n = (enso["trend_adj_per_decade"] if enso else detect["sen_per_decade"]) / 10.0
    nstar = weatherhead_years(slope_for_n, sigma, phi)
    case["detectability"] = dict(noise_sigma=sigma, noise_ar1=phi, years_needed=nstar,
                                 years_available=n / 12.0, years_missing=max(nstar - n / 12.0, 0.0))

    case["verdict"] = verdict(case, alpha)
    case["_anomaly"] = anom
    return case


def compare_second(y, start, second, second_start, driver=None):
    """Agreement between two datasets over their common period (same sign, overlapping CI).
    With `driver` (climate index aligned with y) both series are ENSO-adjusted first."""
    y = np.asarray(y, float); z = np.asarray(second, float)
    a0 = start[0] * 12 + start[1] - 1
    b0 = second_start[0] * 12 + second_start[1] - 1
    lo = max(a0, b0); hi = min(a0 + len(y), b0 + len(z))
    lo += (-lo) % 12                                  # start the common period in January
    if hi - lo < 15 * 12:
        return dict(available=False, reason="common period shorter than 15 years")
    ya, zb = y[lo - a0: hi - a0], z[lo - b0: hi - b0]
    out = dict(available=True, common_start=f"{lo // 12}-{lo % 12 + 1:02d}", common_years=(hi - lo) / 12.0,
               enso_adjusted=driver is not None)
    res, anoms = [], []
    for s_ in (ya, zb):
        an, _ = anomalies(s_)
        raw = an
        if driver is not None:
            d = np.asarray(driver["series"], float)
            seg = d[lo - driver["start"]: lo - driver["start"] + len(an)]
            seg = np.concatenate([seg, np.full(len(an) - len(seg), np.nan)])
            X = enso_design(seg, driver["lag"], len(an), 1)
            fit = ols_ar1(an, extra=X)
            if fit is not None:
                an = an - np.where(np.all(np.isfinite(X), axis=1), X @ fit["beta"][2:], 0.0)
        mk = seasonal_mann_kendall(an)
        sl = seasonal_sen_slope(an, var_s=mk["var"])
        res.append(dict(sen_per_decade=sl["slope"] * 10, lo=sl["lo"] * 10, hi=sl["hi"] * 10, mk_p=mk["p"]))
        anoms.append(raw)
    ok = np.isfinite(anoms[0]) & np.isfinite(anoms[1])
    out.update(primary=res[0], second=res[1], anomaly_corr=float(np.corrcoef(anoms[0][ok], anoms[1][ok])[0, 1]),
               same_sign=bool(np.sign(res[0]["sen_per_decade"]) == np.sign(res[1]["sen_per_decade"])),
               ci_overlap=bool(res[0]["lo"] <= res[1]["hi"] and res[1]["lo"] <= res[0]["hi"]))
    return out


def verdict(case, alpha=0.05):
    """Transparent rule-based verdict. Every rule that was applied is listed in the case file.
    When a climate cycle (ENSO) explains a significant share of the variance, the trend is judged on
    the cycle-adjusted series and must be confirmed by the model-free neutral-months test."""
    d, r, e = case["detection"], case["robustness"], case.get("enso")
    use_adj = bool(case.get("cycle_matters"))
    checks = []

    def add(key, passed, text):
        checks.append(dict(key=key, passed=None if passed is None else bool(passed), text=text))

    raw_sig = d["mk_p"] < alpha
    if use_adj:
        trend, lo, hi, p_mk, p_ols = e["trend_adj_per_decade"], e["adj_lo"], e["adj_hi"], e["mk_p_adj"], e["ols_adj_p"]
        ols_tr, tag = e["ols_adj_per_decade"], f" after removing {e['index']}"
    else:
        trend, lo, hi, p_mk, p_ols = d["sen_per_decade"], d["sen_lo"], d["sen_hi"], d["mk_p"], d["ols_p"]
        ols_tr, tag = d["ols_per_decade"], ""
    sig_mk = p_mk < alpha
    sig_ols = p_ols < alpha and np.sign(ols_tr) == np.sign(trend)
    ci_ok = bool(np.isfinite(lo) and (lo > 0 or hi < 0))
    add("mk", sig_mk, f"Seasonal Mann-Kendall, serial-correlation corrected{tag}: p = {p_mk:.3g}")
    add("ols", sig_ols, f"Linear-trend t-test with AR(1)-adjusted errors{tag}: p = {p_ols:.3g}")
    add("ci", ci_ok, f"95% confidence interval [{lo:.3g}, {hi:.3g}] per decade excludes zero")
    extra = []
    if e and use_adj:
        nt = e["neutral"]
        neut_ok = (np.sign(nt["sen_per_decade"]) == np.sign(trend)) and nt["mk_p"] < 0.10
        add("neutral", neut_ok, f"Model-free check, neutral months only ({nt['n_months']} months): "
                                f"{nt['sen_per_decade']:.3g} per decade, p = {nt['mk_p']:.3g}")
        extra.append(neut_ok)
    elif e:
        enso_ok = e["mk_p_adj"] < alpha and np.sign(e["trend_adj_per_decade"]) == np.sign(d["sen_per_decade"])
        add("enso", enso_ok, f"Unchanged after removing {e['index']} (p = {e['mk_p_adj']:.3g}; "
                             f"the cycle explains {e['variance_share']:.0%} of the variance)")
        extra.append(enso_ok)
        neut_ok = None
    else:
        neut_ok = None
    es = r.get("end_sensitivity_adj") if use_adj else r.get("end_sensitivity")
    if es:
        end_ok = (np.sign(es["sen_per_decade"]) == np.sign(trend) and abs(es["sen_per_decade"]) >= 0.5 * abs(trend))
        add("end", end_ok, f"Stable when the last 24 months are removed ({es['sen_per_decade']:.3g} per decade)")
        extra.append(end_ok)
    sec = r.get("second")
    disputed = False
    if sec and sec.get("available"):
        # confirmed = same sign, overlapping CIs and the second source at least suggestive (p < 0.10)
        sec_ok = sec["same_sign"] and sec["ci_overlap"] and sec["second"]["mk_p"] < 0.10
        disputed = not sec["same_sign"]
        add("second", sec_ok, f"Independent dataset over {sec['common_start'][:4]}-: "
                              f"{sec['primary']['sen_per_decade']:.3g} vs {sec['second']['sen_per_decade']:.3g} per decade"
                              + (" (opposite sign)" if disputed else " (confirmed)" if sec_ok else " (not confirmed)"))
        extra.append(sec_ok)
    core = [sig_mk, sig_ols, ci_ok]
    if all(core) and all(extra):
        level = "STRONG"
    elif sig_mk and sum(core) >= 2 and sum(extra) >= len(extra) - 1 and neut_ok is not False:
        level = "MODERATE"
    elif sig_mk or sig_ols or p_mk < 0.10:
        level = "WEAK"
    else:
        level = "NOT YET"
    if disputed and level in ("STRONG", "MODERATE"):
        level = "WEAK"                                   # two NASA sources point in opposite directions
    hidden = bool(use_adj and not raw_sig and sig_mk)
    faked = bool(use_adj and raw_sig and not sig_mk)
    det = case["detectability"]
    note = None
    if level in ("NOT YET", "WEAK") and np.isfinite(det["years_needed"]):
        note = (f"A trend of this size needs about {det['years_needed']:.0f} years of data to be detected; "
                f"{det['years_available']:.0f} are available.")
    return dict(level=level, direction="increasing" if trend > 0 else "decreasing", trend_per_decade=trend,
                trend_lo=lo, trend_hi=hi, judged_on="cycle-adjusted series" if use_adj else "raw anomalies",
                checks=checks, hidden_by_enso=hidden, explained_by_enso=faked, sources_disagree=disputed,
                seasonal_conflict=bool(r["homogeneity_p"] < 0.05), note=note)


def _ym(y0, m0, k):
    t = y0 * 12 + (m0 - 1) + k
    return f"{t // 12}-{t % 12 + 1:02d}"


def clean(case):
    """Drop private arrays and convert numpy types so the case file can be dumped as JSON."""
    def conv(o):
        if isinstance(o, dict):
            return {k: conv(v) for k, v in o.items() if not k.startswith("_")}
        if isinstance(o, (list, tuple)):
            return [conv(v) for v in o]
        if isinstance(o, np.ndarray):
            return [conv(v) for v in o.tolist()]
        if isinstance(o, (np.floating, float)):
            return None if not np.isfinite(o) else float(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.bool_,)):
            return bool(o)
        return o
    return conv(case)
