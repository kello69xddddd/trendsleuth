import sys, numpy as np, json
sys.path.insert(0, '.')
from scipy import ndimage
from trendsleuth import grid as G
def L(tag): return np.load(f'out/scan/{tag}.npz')
im = L('imerg_PRECTOT_1998_2025'); m2 = L('m2_PRECTOTCORR_1998_2025'); gw = L('m2_GWETROOT_1981_2025')
lat, lon = m2['lat'], m2['lon']
land = np.isfinite(gw['zall']) & (np.abs(lat)[:, None] < 60)
area = np.cos(np.deg2rad(lat))[:, None] * np.ones((1, len(lon))) * (111.2 * 1.0) * (111.2 * 1.25) / 1e6  # Mkm2
MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()
def regions(mask, minarea=0.15):
    lab, n = ndimage.label(mask)
    out = []
    for k in range(1, n + 1):
        sel = lab == k; a = area[sel].sum()
        if a >= minarea:
            ii, jj = np.where(sel)
            out.append((a, sel, lat[ii].mean(), lon[jj].mean(), lat[ii].min(), lat[ii].max(), lon[jj].min(), lon[jj].max()))
    return sorted(out, key=lambda r: -r[0])
def show(title, zi, zm, si, sm, mean_i, thr=1.96, top=14, minarea=0.15):
    for sign, nm in ((1, 'WETTER'), (-1, 'DRIER')):
        mask = land & (sign * zi > thr) & (sign * zm > thr)
        regs = regions(mask, minarea)
        for a, sel, la, lo, la0, la1, lo0, lo1 in regs[:top]:
            pct = 100 * 10 * np.nanmean(si[sel]) / np.nanmean(mean_i[sel])
            print(f"{title:8s} {nm:6s} area={a:5.2f}Mkm2 center=({la:6.1f},{lo:7.1f}) box=[{la0:.0f},{la1:.0f}]x[{lo0:.0f},{lo1:.0f}] IMERG {10*np.nanmean(si[sel]):+.2f} mm/d/dec ({pct:+.0f}%/dec) MERRA2 {10*np.nanmean(sm[sel]):+.2f} zI={np.nanmean(zi[sel]):+.1f} zM={np.nanmean(zm[sel]):+.1f}")
if __name__ == '__main__':
    print('== all months, ENSO-adjusted, both sources |z|>1.96, land <60deg')
    show('ALL', im['zall_adj'], m2['zall_adj'], im['sall_adj'], m2['sall_adj'], im['mean'])
    for g in range(12):
        show(MON[g], im['zmon_adj'][g], m2['zmon_adj'][g], im['smon_adj'][g], m2['smon_adj'][g], im['clim'][g], thr=2.58, top=4, minarea=0.25)
