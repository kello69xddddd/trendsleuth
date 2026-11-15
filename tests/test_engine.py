"""Validation of the Evidence Engine: reference implementation + synthetic truth."""
import numpy as np, pymannkendall as pmk, pytest, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from trendsleuth import engine as E

rng = np.random.default_rng(42)

def synth(years=45, trend=0.0, sigma=1.0, phi=0.0, enso_coef=0.0, nino=None, seas=3.0):
    n = years * 12
    e = np.zeros(n); w = rng.normal(0, sigma, n)
    for i in range(n):
        e[i] = (phi * e[i - 1] if i else 0) + w[i]
    t = np.arange(n) / 12
    y = 10 + seas * np.sin(2 * np.pi * np.arange(n) / 12) + trend * t + e
    if nino is not None:
        y = y + enso_coef * nino[:n]
    return y

def fake_nino(n):
    x = np.zeros(n); w = rng.normal(0, 0.25, n)
    for i in range(1, n):
        x[i] = 0.93 * x[i - 1] + w[i]
    return x

def test_matches_pymannkendall_seasonal():
    y = synth(trend=0.03)
    a, _ = E.anomalies(y)
    mine = E.seasonal_mann_kendall(a, correlated=False)
    ref = pmk.seasonal_test(a, period=12)
    assert mine["S"] == pytest.approx(ref.s)
    assert mine["var"] == pytest.approx(ref.var_s)
    assert mine["p"] == pytest.approx(ref.p, abs=1e-9)

def test_matches_pymannkendall_correlated():
    y = synth(trend=0.02, phi=0.5)
    a, _ = E.anomalies(y)
    mine = E.seasonal_mann_kendall(a, correlated=True)
    ref = pmk.correlated_seasonal_test(a, period=12)
    assert mine["S"] == pytest.approx(ref.s)
    assert mine["var"] == pytest.approx(ref.var_s, rel=1e-9)

def test_matches_pymannkendall_sen():
    y = synth(trend=0.05)
    a, _ = E.anomalies(y)
    assert E.seasonal_sen_slope(a)["slope"] == pytest.approx(pmk.seasonal_sens_slope(a, period=12).slope)

def test_recovers_known_trend():
    y = synth(trend=0.04, sigma=0.5)
    c = E.analyze(y)
    assert c["detection"]["sen_per_decade"] == pytest.approx(0.4, abs=0.06)
    assert c["detection"]["sen_lo"] < 0.4 < c["detection"]["sen_hi"]
    assert c["verdict"]["level"] in ("STRONG", "MODERATE")

def test_false_positive_rate_with_autocorrelation():
    """No trend + AR(1)=0.6 noise: naive test over-rejects, corrected test stays near 5 %."""
    naive = corrected = 0; N = 300
    for _ in range(N):
        a, _ = E.anomalies(synth(years=40, phi=0.6))
        m = E.seasonal_mann_kendall(a)
        corrected += m["p"] < 0.05
        naive += E._p_from_z(E._z_from_s(m["S"], m["var_independent"])) < 0.05
    print(f"\nfalse-positive rate  naive={naive/N:.2%}  corrected={corrected/N:.2%}")
    assert naive / N > 0.15
    assert corrected / N < 0.10

def test_enso_separation_and_end_bias():
    """Series = pure ENSO response, no trend, ending in a strong El Nino: raw trend is inflated,
    ENSO-adjusted trend is not."""
    n = 45 * 12; fp = 0; N = 60; raw_bias = []; adj_bias = []
    for _ in range(N):
        nino = fake_nino(n); nino[-18:] += np.linspace(0.5, 2.5, 18)      # super El Nino at the end
        y = synth(sigma=0.6, enso_coef=1.2, nino=nino)
        c = E.analyze(y, nino=nino)
        raw_bias.append(c["detection"]["sen_per_decade"]); adj_bias.append(c["enso"]["trend_adj_per_decade"])
        fp += c["verdict"]["level"] in ("STRONG", "MODERATE")
        assert c["enso"]["coefs"][0] == pytest.approx(1.2, abs=0.35)
    print(f"\nmean |trend| raw={np.mean(np.abs(raw_bias)):.3f} adj={np.mean(np.abs(adj_bias)):.3f}  false verdicts={fp}/{N}")
    assert np.mean(np.abs(adj_bias)) < np.mean(np.abs(raw_bias))
    assert fp / N <= 0.10

def test_hidden_trend_revealed():
    """A real trend masked by ENSO noise: adjusting for ENSO raises the detection rate."""
    n = 45 * 12; raw = adj = 0; N = 60
    for _ in range(N):
        nino = fake_nino(n)
        y = synth(trend=0.012, sigma=0.4, enso_coef=1.5, nino=nino)
        c = E.analyze(y, nino=nino)
        raw += c["detection"]["mk_p"] < 0.05; adj += c["enso"]["mk_p_adj"] < 0.05
    print(f"\ndetection rate raw={raw/N:.0%} enso-adjusted={adj/N:.0%}")
    assert adj > raw

def test_precheck_blocks_bad_series():
    y = synth(years=8)
    assert E.analyze(y)["verdict"]["level"] == "NO VERDICT"
    y = synth(); y[100:200] = np.nan
    assert E.analyze(y)["verdict"]["level"] == "NO VERDICT"

def test_weatherhead():
    assert E.weatherhead_years(0.05, 1.0, 0.0) == pytest.approx((3.3 / 0.05) ** (2 / 3))
    assert E.weatherhead_years(0.05, 1.0, 0.5) > E.weatherhead_years(0.05, 1.0, 0.0)

def test_opposite_months_flagged():
    n = 45 * 12; t = np.arange(n) / 12; mon = np.arange(n) % 12
    y = synth(sigma=0.3) + np.where(mon < 6, 0.05, -0.05) * t
    c = E.analyze(y)
    assert c["verdict"]["seasonal_conflict"] and c["robustness"]["homogeneity_p"] < 0.01
