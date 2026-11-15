/* Runs the full rhythm analysis on the nine case files and prints: verdict (stored vs recomputed with all rhythms),
   ranking of rhythms, rhythm scan, decade comparison and event comparison.  Usage: node tests/insights_check.js */
global.window=globalThis;
globalThis.TSEngine=require('../web/js/engine.js');
const load=f=>JSON.parse(require('fs').readFileSync(__dirname+'/../web/data/'+f+'.json','utf8'));
globalThis.TS_CASES=load('cases'); globalThis.TS_NINO=load('nino'); globalThis.TS_DRIVERS=load('drivers');
eval(require('fs').readFileSync(__dirname+'/../web/js/insights.js','utf8'));
const I=TSInsights, nz=a=>a.map(v=>v==null?NaN:v);
console.log(I.status().map(s=>s.d.short+': '+s.value+' '+s.word+' '+s.date).join(' | '));
for(const c of TS_CASES.cases){
  const y=nz(c.series.y); const t0=Date.now();
  const opts={startYear:c.start_year}; if(c.series.second) opts.second={series:nz(c.series.second),start:[c.series.second_start,1]};
  const r=I.analyze(y,opts); const rh=I.rhythms(y,c.start_year,r); const sp=I.spectrum(nz(c.series.anomaly)); const dc=I.decades(y,c.start_year); const ev=I.events(y,c.start_year,(c.enso&&c.cycle_matters)?c.enso.index:'Nino 3.4');
  console.log('\n'+c.id,'| PRE',c.verdict.level,c.verdict.trend_per_decade.toFixed(3),c.enso.index,c.cycle_matters,'| NEW',r.verdict.level,r.verdict.trend_per_decade.toFixed(3),r.enso.index,r.cycle_matters,(Date.now()-t0)+'ms');
  console.log('  rhythms:',rh.list.slice(0,5).map(x=>x.meta.short+' '+(x.share*100).toFixed(0)+'%'+(x.significant?'*':'')+(x.slow?'(slow)':'')).join(', '),'seasons',(rh.seasons*100).toFixed(0)+'%');
  console.log('  spectrum peaks:',sp&&sp.peaks.map(p=>p.years.toFixed(1)+'y x'+p.ratio.toFixed(1)).join(', '));
  console.log('  decades:',dc&&[dc.then.label,dc.then.mean.toFixed(2),dc.now.label,dc.now.mean.toFixed(2),dc.pct.toFixed(1)+'%','p='+dc.p.toFixed(3)].join(' '));
  console.log('  events:',ev&&(ev.none?'none':[ev.phase,ev.then.years,ev.then.peak.toFixed(2),ev.then.anom.toFixed(2),ev.then.pct.toFixed(0)+'%','|',ev.now.years,ev.now.peak.toFixed(2),ev.now.anom.toFixed(2),ev.now.pct.toFixed(0)+'%',ev.now.ongoing,ev.decadeApart].join(' ')));
}
