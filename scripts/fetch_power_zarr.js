/* Data acquisition (run in a browser console on any page of https://power.larc.nasa.gov).
   Downloads the raw Zarr chunks of one variable from the public NASA POWER bucket (no login needed)
   and saves them as a single .tspk file. scripts/reduce_packs.py turns the packs into compact cubes.
   Example:
     TS.queue([['merra2/temporal/power_merra2_monthly_temporal_utc.zarr','PRECTOTCORR','ts_m2_PRECTOTCORR.tspk']])
   IMERG is split in 6 latitude bands: see the last lines. */
window.TS = { status: {}, base: 'https://nasa-power.s3.amazonaws.com/' };
TS.listKeys = async function (prefix) { const keys = []; let token = null; do { const u = TS.base + '?list-type=2&prefix=' + encodeURIComponent(prefix) + (token ? '&continuation-token=' + encodeURIComponent(token) : ''); const x = await (await fetch(u)).text(); for (const m of x.matchAll(/<Key>([^<]+)<\/Key>.*?<Size>(\d+)<\/Size>/g)) keys.push([m[1], +m[2]]); const t = x.match(/<NextContinuationToken>([^<]+)</); token = t ? t[1] : null; } while (token); return keys; };
TS.fetchBuf = async function (url) { for (let i = 0; i < 5; i++) { try { const r = await fetch(url); if (!r.ok) throw new Error('http ' + r.status); return new Uint8Array(await r.arrayBuffer()); } catch (e) { if (i === 4) throw e; await new Promise(s => setTimeout(s, 1000 * (i + 1))); } } };
TS.pack = async function (store, v, fname, filter) {
  const st = TS.status[fname] = { state: 'listing', done: 0, total: 0, bytes: 0 };
  let keys = await TS.listKeys(store + '/' + v + '/'); if (filter) keys = keys.filter(k => k[0].includes('/.z') || filter(k[0].split('/').pop()));
  st.total = keys.length; st.state = 'fetching'; const bufs = new Array(keys.length); let idx = 0;
  const worker = async () => { while (idx < keys.length) { const i = idx++; bufs[i] = await TS.fetchBuf(TS.base + keys[i][0]); st.done++; st.bytes += bufs[i].length; } };
  await Promise.all(Array.from({ length: 10 }, worker));
  let off = 0; const entries = keys.map((k, i) => { const e = { key: k[0].slice(store.length + 1), offset: off, length: bufs[i].length }; off += bufs[i].length; return e; });
  const header = new TextEncoder().encode(JSON.stringify({ store, var: v, source: TS.base + store, fetched: new Date().toISOString(), entries }));
  const hl = new Uint8Array(4); new DataView(hl.buffer).setUint32(0, header.length, true);
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([new TextEncoder().encode('TSPK'), hl, header, ...bufs])); a.download = fname; document.body.appendChild(a); a.click(); st.state = 'downloaded';
};
TS.queue = async function (jobs) { for (const j of jobs) await TS.pack(...j); };
/* What was fetched for this project (14 Nov 2026 UTC):
const M='merra2/temporal/power_merra2_monthly_temporal_utc.zarr', I='imerg/temporal/power_imerg_monthly_temporal_utc.zarr', S='syn1deg/temporal/power_syn1deg_monthly_temporal_utc.zarr';
MERRA-2: PRECTOTCORR T2M T2M_MAX T2M_MIN TS GWETROOT GWETTOP EVLAND QV2M RH2M WS10M TQV   -> ts_m2_<VAR>.tspk
CERES SYN1deg: ALLSKY_SFC_SW_DWN CLOUD_AMT CLRSKY_SFC_SW_DWN AOD_55_ADJ                    -> ts_syn_<VAR>.tspk
IMERG: for (b=0..5) TS.pack(I,'IMERG_PRECTOT','ts_imerg_PRECTOT_part'+b+'.tspk', n => { const li=+n.split('.')[1]; return li>=b*6 && li<b*6+6; })
*/
