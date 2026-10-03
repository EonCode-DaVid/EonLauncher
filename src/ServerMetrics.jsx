import { useEffect, useState } from 'react';

function Chart({ title, unit, points, field, ceiling, fresh }) {
  const values=points.filter(p=>Number.isFinite(p[field]));
  const last=values.at(-1);
  const max=Math.max(ceiling,...values.map(p=>p[field]));
  const first=points[0]?.at || 0, duration=Math.max(60000,(points.at(-1)?.at||0)-first);
  const line=values.map(p=>`${8+(p.at-first)/duration*304},${94-p[field]/max*80}`).join(' ');
  return <article className="metric-chart"><div><span>{title}</span><strong>{fresh&&last?last[field].toFixed(field==='cpu'?1:0):'—'} <small>{unit}</small></strong></div><svg viewBox="0 0 320 108" role="img" aria-label={`${title}: ${values.length} pomiarów`}><path d="M8 14H312 M8 54H312 M8 94H312" className="chart-grid"/>{values.length>1&&<polyline points={line} className="chart-line"/>}{values.length===1&&<circle cx="8" cy={94-last[field]/max*80} r="3" fill="#63baff"/>}</svg><footer><span>{values.length?new Date(first).toLocaleTimeString('pl-PL'):'Oczekiwanie na pomiary'}</span><span>{Math.round(max)} {unit}</span></footer></article>;
}
export default function ServerMetrics({ server }) {
  const [metrics,setMetrics]=useState({});
  useEffect(()=>{
    let alive=true, inFlight=false;
    const load=async()=>{if(inFlight||!window.eon?.devMetrics)return;inFlight=true;try{const data=await window.eon.devMetrics();if(alive)setMetrics(data);}finally{inFlight=false;}};
    load().catch(()=>{});const timer=setInterval(()=>load().catch(()=>{}),5000);
    return()=>{alive=false;clearInterval(timer);};
  },[]);
  const entry=server?metrics[server.id]:null, points=entry?.points||[];
  const fresh=server?.running && entry?.running && Date.now()-(points.at(-1)?.at||0)<15000;
  return <section className="server-monitor"><div className="monitor-heading"><h3>Wydajność procesu</h3><span>{fresh?'Pomiar co 5 s':server?.running?'Oczekiwanie na dane':'Uruchom serwer, aby rozpocząć pomiar'}</span></div><div className="monitor-charts"><Chart title="Procesor" unit="%" field="cpu" ceiling={100} points={points} fresh={fresh}/><Chart title="Pamięć RAM" unit="MB" field="ramMb" ceiling={(server?.ram||1)*1024} points={points} fresh={fresh}/></div><p>CPU jako udział w mocy całego komputera. RAM to pamięć procesu, nie tylko sterta Javy. TPS i MSPT wymagają telemetrii z serwera.</p></section>;
}
