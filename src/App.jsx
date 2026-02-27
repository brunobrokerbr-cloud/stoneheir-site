import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";

// ══════════════════════════════════════════════════════════════════
// STONEHEIR — Complete Website + Internal Panel
// Real Estate Intelligence Platform
// ══════════════════════════════════════════════════════════════════

// ── AUTH CONTEXT ──
const AuthCtx = createContext(null);

// ── STORAGE (persistent via window.storage) ──
async function loadStore(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveStore(key, data) {
  try { await window.storage.set(key, JSON.stringify(data)); } catch(e) { console.error(e); }
}

// ── COLORS ──
const C = {
  ds: "#1A1F2E", ch: "#2C3142", st: "#6B7280", wg: "#9CA3AF", sv: "#D1D5DB",
  lg: "#F3F4F6", ow: "#FAFAFA", g: "#C9A84C", gd: "#A68A3E", gl: "#E8D48B",
  nv: "#1E3A5F", w: "#FFFFFF", gr: "#2D7A4F", rd: "#9B2C2C", am: "#B45309",
};

// ── SCORING ENGINE (same as before) ──
const DIMS = {
  localizacao:{label:"Localização",weight:.25,icon:"◉"},liquidez:{label:"Liquidez",weight:.2,icon:"◈"},
  valorizacao:{label:"Valorização",weight:.15,icon:"△"},renda:{label:"Pot. Renda",weight:.15,icon:"◇"},
  qualidade:{label:"Qualidade",weight:.15,icon:"□"},risco:{label:"Risco",weight:.1,icon:"⬡"},
};
const TIER={"vila-nova-conceicao":10,"jardins":9.5,"itaim-bibi":9.3,"higienopolis":9,"moema":8.5,"pinheiros":8.2,"vila-mariana":7.8,"brooklin":7.5,"campo-belo":7.2,"perdizes":7.5,"santana":6.8,"tatuape":6.5,"lapa":6.5,"butanta":6,"ipiranga":5.5,"outro-premium":8,"outro-medio":5.5,"outro-popular":3.5};
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const rs=(v,ranges)=>{for(const[t,s]of ranges)if(v<=t)return s;return ranges[ranges.length-1][1]};
const ms=(v,map,d)=>map[v]??d;
function scoreAll(d){
  const loc=avg([TIER[d.bairro]||5,rs(d.distanciaMetro||500,[[300,10],[500,9],[800,7.5],[1500,5.5],[9e3,3.5]]),d.infraestrutura||5,d.seguranca||5]);
  const ratio=(d.buscasMensais||500)/Math.max(d.estoqueRegiao||100,1);
  const liq=avg([rs(d.tempoVenda||90,[[30,10],[60,8.5],[90,7],[120,5.5],[180,4],[9e3,2.5]]),rs((d.volumeTransacoes||20)*-1,[[-50,9.5],[-30,8],[-15,6.5],[-5,4.5],[0,3]]),rs(ratio*-1,[[-10,10],[-5,8],[-2,6],[-1,4],[0,2.5]])]);
  const diff=((d.precoM2||0)-(d.mediaM2Bairro||d.precoM2||1))/Math.max(d.mediaM2Bairro||1,1)*100;
  const val=avg([rs((d.valorizacao12m||0)*-1,[[-15,10],[-10,8.5],[-7,7],[-4,5.5],[0,4],[99,2]]),rs((d.valorizacao24m||0)*-1,[[-25,10],[-18,8.5],[-12,7],[-6,5],[99,3]]),rs(diff,[[-10,9.5],[-5,8.5],[0,7.5],[5,6],[10,4.5],[99,3]]),ms(d.tendenciaBairro||"estavel",{"alta-forte":10,"alta-moderada":8,"estavel":5.5,"queda-moderada":3,"queda-forte":1.5},5.5)]);
  const yb=((d.aluguelMensal||0)*12)/Math.max(d.valorImovel||1,1)*100;
  const yt=yb+(d.valorizacao12m||0);const selic=d.selic||11.25;
  const ren=avg([rs(yb*-1,[[-8,10],[-6.5,8.5],[-5,7],[-4,5.5],[-3,4],[0,2.5]]),yt>=selic*1.3?10:yt>=selic*1.1?8:yt>=selic?6:yt>=selic*.8?4:2.5,rs(d.vacancia||5,[[3,10],[5,8],[8,6],[12,4],[99,2]]),ms(d.demandaLocacao||"media",{"muito-alta":10,"alta":8,"media":5.5,"baixa":3,"muito-baixa":1.5},5.5)]);
  const idade=2026-(d.anoConstrucao||2015);
  const qual=avg([rs(idade,[[3,10],[7,8.5],[15,7],[25,5],[40,3.5],[99,2]]),ms(d.padrao||"medio",{"ultra-luxo":10,"alto":8.5,"medio-alto":7,"medio":5.5,"economico":3.5},5.5),ms(d.conservacao||"bom",{"novo":10,"excelente":9,"bom":7,"regular":4.5,"precisa-reforma":2.5},5),d.notaCondominio||5]);
  const risk=avg([ms(d.diversificacaoDemanda||"media",{"alta":9,"media":6.5,"baixa":3.5},6.5),ms(d.riscoAmbiental||"baixo",{"nenhum":10,"baixo":8,"medio":5,"alto":2},5),ms(d.dependenciaFator||"baixa",{"nenhuma":9.5,"baixa":7.5,"media":5,"alta":2.5},5),ms(d.documentacao||"completa",{"completa":10,"parcial":5,"pendente":2},5)]);
  const dims={localizacao:loc,liquidez:liq,valorizacao:val,renda:ren,qualidade:qual,risco:risk};
  let f=0;for(const[k,v]of Object.entries(dims))f+=v*DIMS[k].weight;
  return{dims,final:f,yb,yl:yb*(1-(d.vacancia||5)/100)*.85};
}
function classify(s){if(s>=9)return{l:"EXCEPCIONAL",c:C.gr,bg:"#F0FDF4"};if(s>=8)return{l:"EXCELENTE",c:"#2D7A4F",bg:"#F0FDF4"};if(s>=7)return{l:"MUITO BOM",c:"#65A30D",bg:"#F7FEE7"};if(s>=6)return{l:"BOM",c:C.g,bg:"#FEFCE8"};if(s>=5)return{l:"MODERADO",c:C.am,bg:"#FFFBEB"};if(s>=4)return{l:"ABAIXO DA MÉDIA",c:"#EA580C",bg:"#FFF7ED"};return{l:"RISCO ELEVADO",c:C.rd,bg:"#FEF2F2"};}
function recommend(s){if(s>=8)return"AQUISIÇÃO FAVORÁVEL";if(s>=7)return"COM RESSALVAS";if(s>=5.5)return"AVALIAR COM CAUTELA";if(s>=4)return"NÃO RECOMENDADO";return"ALTO RISCO";}

// ── SAMPLE DATA ──
const SAMPLE_PROPERTIES = [
  {id:1,endereco:"R. Oscar Freire, 1842",bairro:"jardins",areaUtil:187,dormitorios:3,vagas:3,anoConstrucao:2019,padrao:"alto",conservacao:"excelente",valorImovel:3200000,aluguelMensal:16500,precoM2:17100,mediaM2Bairro:16540,tempoVenda:68,volumeTransacoes:52,estoqueRegiao:78,buscasMensais:2100,valorizacao12m:11.8,valorizacao24m:20,tendenciaBairro:"alta-moderada",distanciaMetro:350,infraestrutura:9,seguranca:8.5,vacancia:4.2,demandaLocacao:"alta",selic:11.25,notaCondominio:9,diversificacaoDemanda:"alta",riscoAmbiental:"nenhum",dependenciaFator:"nenhuma",documentacao:"completa",andar:18,cliente:"Ricardo Mendes",status:"ativo"},
  {id:2,endereco:"Al. Santos, 2200",bairro:"jardins",areaUtil:120,dormitorios:2,vagas:2,anoConstrucao:2021,padrao:"alto",conservacao:"novo",valorImovel:1850000,aluguelMensal:9500,precoM2:15400,mediaM2Bairro:16540,tempoVenda:68,volumeTransacoes:52,estoqueRegiao:78,buscasMensais:2100,valorizacao12m:11.8,valorizacao24m:20,tendenciaBairro:"alta-moderada",distanciaMetro:200,infraestrutura:9,seguranca:8.5,vacancia:4.2,demandaLocacao:"alta",selic:11.25,notaCondominio:8.5,diversificacaoDemanda:"alta",riscoAmbiental:"nenhum",dependenciaFator:"nenhuma",documentacao:"completa",andar:8,cliente:"Ana Ferreira",status:"ativo"},
  {id:3,endereco:"R. Joaquim Floriano, 466",bairro:"itaim-bibi",areaUtil:95,dormitorios:2,vagas:1,anoConstrucao:2017,padrao:"medio-alto",conservacao:"bom",valorImovel:1200000,aluguelMensal:6800,precoM2:12630,mediaM2Bairro:17200,tempoVenda:72,volumeTransacoes:41,estoqueRegiao:65,buscasMensais:1500,valorizacao12m:14.2,valorizacao24m:24,tendenciaBairro:"alta-forte",distanciaMetro:600,infraestrutura:8.5,seguranca:7.5,vacancia:3.8,demandaLocacao:"muito-alta",selic:11.25,notaCondominio:7,diversificacaoDemanda:"alta",riscoAmbiental:"baixo",dependenciaFator:"baixa",documentacao:"completa",andar:5,cliente:"Carlos Souza",status:"avaliacao"},
];

const SAMPLE_CLIENTS = [
  {id:1,nome:"Ricardo Mendes",email:"ricardo@email.com",tel:"(11) 99999-1234",tipo:"Investidor",imoveis:1,status:"ativo",desde:"2025-08"},
  {id:2,nome:"Ana Ferreira",email:"ana@email.com",tel:"(11) 98888-5678",tipo:"Proprietária",imoveis:1,status:"ativo",desde:"2025-10"},
  {id:3,nome:"Carlos Souza",email:"carlos@email.com",tel:"(11) 97777-4321",tipo:"Investidor",imoveis:1,status:"ativo",desde:"2026-01"},
  {id:4,nome:"Mariana Costa",email:"mariana@email.com",tel:"(11) 96666-8765",tipo:"Licenciada RC",imoveis:0,status:"lead",desde:"2026-02"},
];

const SAMPLE_ARTICLES = [
  {id:1,title:"Jardins registra menor estoque em 5 anos",date:"2026-02-20",category:"Mercado",excerpt:"O bairro mais valorizado de São Paulo viu seu estoque de unidades disponíveis cair 8.3% no último trimestre..."},
  {id:2,title:"Yield de locação supera CDI pela primeira vez desde 2019",date:"2026-02-15",category:"Análise",excerpt:"Quando somamos o yield de locação à valorização do imóvel, o retorno total supera a taxa Selic..."},
  {id:3,title:"Vila Mariana e Brooklin: os bairros para ficar de olho em 2026",date:"2026-02-10",category:"Tendência",excerpt:"Dados da Stoneheir apontam aceleração de preços combinada com yields acima da média nestes dois bairros..."},
  {id:4,title:"Como a IA está transformando a avaliação imobiliária",date:"2026-02-05",category:"Tecnologia",excerpt:"A metodologia S.T.O.N.E. Framework utiliza machine learning para processar milhares de transações..."},
];

// ── SHARED COMPONENTS ──
const mono = "'JetBrains Mono',monospace";
const serif = "'Source Serif 4',Georgia,serif";
const display = "'Playfair Display',Georgia,serif";

function GoldLine({w}) { return <div style={{height:2,background:C.g,width:w||"100%",margin:"8px 0"}}/>; }

function ScoreGauge({score,size=160}) {
  const cls = classify(score);
  const ang = (score/10)*180;
  const r = size*.38, cx = size/2, cy = size*.52;
  const arc = (s,e) => {
    const p = d => ({x:cx+r*Math.cos(Math.PI*(180+d)/180),y:cy+r*Math.sin(Math.PI*(180+d)/180)});
    const a=p(s),b=p(e);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${b.x} ${b.y}`;
  };
  return (
    <svg width={size} height={size*.65} viewBox={`0 0 ${size} ${size*.65}`}>
      <path d={arc(0,180)} fill="none" stroke="#E5E7EB" strokeWidth={size*.06} strokeLinecap="round"/>
      {score>0&&<path d={arc(0,Math.min(ang,179.5))} fill="none" stroke={cls.c} strokeWidth={size*.06} strokeLinecap="round" style={{transition:"all 0.8s ease"}}/>}
      <text x={cx} y={cy-2} textAnchor="middle" fontFamily={mono} fontSize={size*.2} fontWeight="700" fill={C.ds}>{score.toFixed(1)}</text>
      <text x={cx} y={cy+size*.1} textAnchor="middle" fontFamily={serif} fontSize={size*.055} fill={C.st}>de 10.0</text>
    </svg>
  );
}

function Badge({score}) {
  const cls = classify(score);
  return <span style={{display:"inline-block",padding:"3px 10px",background:cls.bg,borderRadius:3,fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:cls.c}}>{cls.l}</span>;
}

function Btn({children,gold,outline,small,onClick,disabled,style:s2}) {
  const base = {padding:small?"6px 14px":"10px 24px",border:"none",borderRadius:4,fontFamily:serif,fontSize:small?11:13,cursor:"pointer",transition:"all 0.2s",display:"inline-flex",alignItems:"center",gap:6,...s2};
  if(gold) Object.assign(base,{background:C.g,color:C.ds,fontWeight:600});
  else if(outline) Object.assign(base,{background:"transparent",border:`1px solid ${C.sv}`,color:C.st});
  else Object.assign(base,{background:C.ds,color:C.ow});
  if(disabled) base.opacity=.4;
  return <button style={base} onClick={disabled?undefined:onClick}>{children}</button>;
}

function Input({label,hint,value,onChange,type="text",suffix,options,slider,min,max,step}) {
  const iStyle = {width:"100%",padding:"9px 12px",border:`1px solid ${C.sv}`,borderRadius:4,fontFamily:mono,fontSize:12,color:C.ds,background:C.ow,outline:"none",paddingRight:suffix?40:12};
  if(slider) return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><label style={{fontFamily:serif,fontSize:11,fontWeight:600,color:C.ch}}>{label}</label><span style={{fontFamily:mono,fontSize:13,fontWeight:700,color:C.g}}>{(value||0).toFixed(1)}</span></div>
      {hint&&<div style={{fontFamily:serif,fontSize:9,color:C.wg,marginBottom:2}}>{hint}</div>}
      <input type="range" min={min||0} max={max||10} step={step||.5} value={value||5} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:"100%",accentColor:C.g}}/>
    </div>
  );
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontFamily:serif,fontSize:11,fontWeight:600,color:C.ch,marginBottom:2}}>{label}</label>
      {hint&&<div style={{fontFamily:serif,fontSize:9,color:C.wg,marginBottom:2}}>{hint}</div>}
      <div style={{position:"relative"}}>
        {options ? <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...iStyle,cursor:"pointer",appearance:"none"}}><option value="">Selecione...</option>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
        : <input type={type} value={value||""} min={min} max={max} step={step} onChange={e=>onChange(type==="number"?parseFloat(e.target.value)||0:e.target.value)} style={iStyle} onFocus={e=>e.target.style.borderColor=C.g} onBlur={e=>e.target.style.borderColor=C.sv}/>}
        {suffix&&<span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontFamily:mono,fontSize:10,color:C.wg}}>{suffix}</span>}
      </div>
    </div>
  );
}

function Card({children,style:s2,onClick}) {
  return <div style={{background:C.w,borderRadius:8,border:"1px solid #E5E7EB",overflow:"hidden",transition:"box-shadow 0.2s",cursor:onClick?"pointer":"default",...s2}} onClick={onClick}>{children}</div>;
}

function StatCard({value,label,change,small}) {
  return (
    <div style={{textAlign:"center",padding:small?"10px":"16px 12px",background:C.ow,borderRadius:6}}>
      <div style={{fontFamily:mono,fontSize:small?16:22,fontWeight:700,color:C.ds}}>{value}</div>
      <div style={{fontFamily:mono,fontSize:7,letterSpacing:"0.12em",color:C.st,marginTop:2}}>{label}</div>
      {change&&<div style={{fontFamily:mono,fontSize:9,fontWeight:700,color:change.startsWith("+")?C.gr:change.startsWith("-")?C.rd:C.am,marginTop:2}}>{change}</div>}
    </div>
  );
}

const bairroOpts = [
  {v:"vila-nova-conceicao",l:"Vila Nova Conceição"},{v:"jardins",l:"Jardins"},{v:"itaim-bibi",l:"Itaim Bibi"},
  {v:"higienopolis",l:"Higienópolis"},{v:"moema",l:"Moema"},{v:"pinheiros",l:"Pinheiros"},
  {v:"vila-mariana",l:"Vila Mariana"},{v:"brooklin",l:"Brooklin"},{v:"campo-belo",l:"Campo Belo"},
  {v:"perdizes",l:"Perdizes"},{v:"santana",l:"Santana"},{v:"tatuape",l:"Tatuapé"},
  {v:"outro-premium",l:"Outro — Premium"},{v:"outro-medio",l:"Outro — Médio"},{v:"outro-popular",l:"Outro — Popular"},
];

// ══════════════════════════════════════════════════════════════════
// PUBLIC PAGES
// ══════════════════════════════════════════════════════════════════

function PublicNav({page,setPage,onLogin}) {
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>50);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  const link = (id,label) => <a onClick={()=>setPage(id)} style={{fontFamily:serif,fontSize:12,letterSpacing:"0.1em",textTransform:"uppercase",color:page===id?C.g:C.wg,textDecoration:"none",cursor:"pointer",transition:"color 0.3s"}}>{label}</a>;
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:scrolled?"10px 40px":"16px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",background:scrolled?"rgba(26,31,46,0.95)":"rgba(26,31,46,0.8)",backdropFilter:"blur(20px)",borderBottom:`1px solid rgba(201,168,76,${scrolled?.25:.1})`,transition:"all 0.3s"}}>
      <div style={{cursor:"pointer"}} onClick={()=>setPage("home")}>
        <div style={{fontFamily:display,fontWeight:700,fontSize:16,letterSpacing:"0.3em",color:C.ow}}>STONEHEIR<span style={{color:C.g}}>.</span></div>
        <div style={{fontFamily:display,fontStyle:"italic",fontSize:9,color:C.g,letterSpacing:"0.08em"}}>Real Estate Intelligence</div>
      </div>
      <div style={{display:"flex",gap:24,alignItems:"center"}}>
        {link("home","Início")}{link("services","Serviços")}{link("methodology","Metodologia")}{link("blog","Insights")}
        <a onClick={onLogin} style={{fontFamily:serif,fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",color:C.ds,background:C.g,padding:"8px 20px",cursor:"pointer",textDecoration:"none",transition:"all 0.3s"}}>Painel</a>
      </div>
    </nav>
  );
}

function HeroSection({setPage}) {
  return (
    <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center",padding:"100px 24px 60px",position:"relative",background:C.ds}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 60%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:800}}>
        <div style={{fontFamily:mono,fontSize:10,letterSpacing:"0.5em",color:C.g,marginBottom:32,opacity:0,animation:"fadeUp 1s 0.3s forwards"}}>INTELIGÊNCIA IMOBILIÁRIA POR IA</div>
        <h1 style={{fontFamily:display,fontWeight:700,fontSize:"clamp(48px, 8vw, 96px)",letterSpacing:"0.15em",color:C.ow,lineHeight:1,marginBottom:16,opacity:0,animation:"fadeUp 1s 0.5s forwards"}}>STONEHEIR</h1>
        <div style={{width:80,height:2,background:C.g,margin:"20px auto",opacity:0,animation:"fadeUp 0.8s 0.8s forwards"}}/>
        <div style={{fontFamily:display,fontStyle:"italic",fontSize:"clamp(16px, 2.5vw, 24px)",color:C.g,letterSpacing:"0.08em",marginBottom:12,opacity:0,animation:"fadeUp 1s 1s forwards"}}>Real Estate Intelligence</div>
        <p style={{fontFamily:serif,fontSize:15,color:C.wg,maxWidth:500,margin:"0 auto 32px",lineHeight:1.7,fontWeight:300,opacity:0,animation:"fadeUp 1s 1.2s forwards"}}>
          Convertendo dados imobiliários complexos em inteligência estratégica para decisões de alto impacto.
        </p>
        <div style={{display:"flex",gap:16,justifyContent:"center",opacity:0,animation:"fadeUp 1s 1.4s forwards"}}>
          <Btn gold onClick={()=>setPage("services")}>Nossos Serviços</Btn>
          <Btn outline style={{color:C.g,borderColor:C.g+"66"}} onClick={()=>setPage("blog")}>Market Insights</Btn>
        </div>
      </div>
      {/* Stats bar */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:`1px solid rgba(201,168,76,0.15)`}}>
        {[["2.340+","Transações analisadas"],["R$ 4.2B","Em ativos avaliados"],["97.3%","Precisão nas estimativas"],["15","Cidades monitoradas"]].map(([v,l],i)=>
          <div key={i} style={{textAlign:"center",padding:"24px 16px",borderRight:i<3?`1px solid rgba(201,168,76,0.08)`:"none"}}>
            <div style={{fontFamily:mono,fontSize:24,fontWeight:500,color:C.g}}>{v}</div>
            <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.15em",color:C.st,marginTop:4}}>{l.toUpperCase()}</div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </section>
  );
}

function ServicesPage() {
  const services = [
    {n:"01",t:"Property Valuation Report",d:"Avaliação completa com comparativos, projeção de valorização e score de investimento.",tag:"Avaliação"},
    {n:"02",t:"Rental Yield Analysis",d:"Yield bruto e líquido, benchmarks, fluxo de caixa e cenários projetados.",tag:"Rentabilidade"},
    {n:"03",t:"Market Intelligence Report",d:"Relatório trimestral com tendências, volume e indicadores macro.",tag:"Mercado"},
    {n:"04",t:"Portfolio Dashboard",d:"Painel consolidado com performance por ativo e recomendações.",tag:"Carteira"},
    {n:"05",t:"Due Diligence Brief",d:"Relatório executivo de 2-3 páginas para decisão rápida.",tag:"Decisão"},
    {n:"06",t:"Consultoria Personalizada",d:"Análises sob demanda para necessidades específicas.",tag:"Sob Medida"},
  ];
  return (
    <section style={{padding:"120px 40px 80px",background:C.ds,minHeight:"100vh"}}>
      <div style={{textAlign:"center",maxWidth:600,margin:"0 auto 48px"}}>
        <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.5em",color:C.g,marginBottom:16}}>O QUE ENTREGAMOS</div>
        <h2 style={{fontFamily:display,fontSize:36,fontWeight:600,color:C.ow,lineHeight:1.2,marginBottom:12}}>Inteligência sob medida para cada decisão</h2>
        <p style={{fontFamily:serif,fontSize:14,color:C.wg,lineHeight:1.7}}>Cinco produtos desenhados para cobrir todo o ciclo de investimento imobiliário.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,maxWidth:1100,margin:"0 auto",background:`rgba(201,168,76,0.1)`}}>
        {services.map((s,i)=>
          <div key={i} style={{background:C.ds,padding:"32px 28px",transition:"background 0.3s",cursor:"default",position:"relative"}}>
            <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.3em",color:C.gd,marginBottom:16}}>{s.n}</div>
            <h3 style={{fontFamily:display,fontSize:18,fontWeight:600,color:C.ow,marginBottom:10}}>{s.t}</h3>
            <p style={{fontFamily:serif,fontSize:13,color:C.wg,lineHeight:1.6}}>{s.d}</p>
            <div style={{display:"inline-block",marginTop:14,fontFamily:mono,fontSize:8,letterSpacing:"0.15em",color:C.st,padding:"4px 10px",border:`1px solid ${C.st}33`}}>{s.tag.toUpperCase()}</div>
          </div>
        )}
      </div>
    </section>
  );
}

function MethodologyPage() {
  const steps = [{l:"S",t:"Source",s:"Coleta de Dados",d:"Múltiplas fontes: registros públicos, portais, IBGE e pesquisas proprietárias."},{l:"T",t:"Transform",s:"Processamento por IA",d:"Modelos de ML limpam, normalizam e cruzam dados do mercado brasileiro."},{l:"O",t:"Outline",s:"Estruturação Analítica",d:"Framework padronizado que garante consistência e comparabilidade."},{l:"N",t:"Narrate",s:"Tradução em Narrativa",d:"Dados se transformam em narrativa acionável com visualizações elegantes."},{l:"E",t:"Evaluate",s:"Controle de Qualidade",d:"Checklist de 15 pontos antes da publicação. Selo de verificação em cada relatório."}];
  return (
    <section style={{padding:"120px 40px 80px",background:C.ch,minHeight:"100vh"}}>
      <div style={{textAlign:"center",maxWidth:600,margin:"0 auto 48px"}}>
        <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.5em",color:C.g,marginBottom:16}}>NOSSA METODOLOGIA</div>
        <h2 style={{fontFamily:display,fontSize:36,fontWeight:600,color:C.ow,marginBottom:12}}>S.T.O.N.E. Framework</h2>
        <p style={{fontFamily:serif,fontSize:14,color:C.wg,lineHeight:1.7}}>Cinco etapas que garantem rigor, consistência e clareza.</p>
      </div>
      <div style={{maxWidth:700,margin:"0 auto"}}>
        {steps.map((s,i)=>
          <div key={i} style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:24,marginBottom:32}}>
            <div style={{width:56,height:56,border:`2px solid ${C.g}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:display,fontSize:22,fontWeight:700,color:C.g,background:C.ds}}>{s.l}</div>
            <div>
              <h3 style={{fontFamily:display,fontSize:18,fontWeight:600,color:C.ow}}>{s.t} <span style={{fontFamily:mono,fontSize:9,color:C.gd,letterSpacing:"0.15em",marginLeft:8}}>{s.s.toUpperCase()}</span></h3>
              <p style={{fontFamily:serif,fontSize:13,color:C.wg,lineHeight:1.7,marginTop:4}}>{s.d}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BlogPage() {
  return (
    <section style={{padding:"120px 40px 80px",background:C.ds,minHeight:"100vh"}}>
      <div style={{textAlign:"center",maxWidth:600,margin:"0 auto 48px"}}>
        <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.5em",color:C.g,marginBottom:16}}>MARKET INSIGHTS</div>
        <h2 style={{fontFamily:display,fontSize:36,fontWeight:600,color:C.ow,marginBottom:12}}>Análises e Tendências</h2>
        <p style={{fontFamily:serif,fontSize:14,color:C.wg,lineHeight:1.7}}>Inteligência de mercado publicada pela equipe Stoneheir.</p>
      </div>
      <div style={{maxWidth:800,margin:"0 auto",display:"flex",flexDirection:"column",gap:1,background:`rgba(201,168,76,0.08)`,borderRadius:8,overflow:"hidden"}}>
        {SAMPLE_ARTICLES.map(a=>
          <div key={a.id} style={{background:C.ds,padding:"28px 32px",cursor:"pointer",transition:"background 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
              <span style={{fontFamily:mono,fontSize:9,letterSpacing:"0.12em",color:C.g,padding:"2px 8px",border:`1px solid ${C.g}33`}}>{a.category.toUpperCase()}</span>
              <span style={{fontFamily:mono,fontSize:9,color:C.st}}>{new Date(a.date).toLocaleDateString("pt-BR")}</span>
            </div>
            <h3 style={{fontFamily:display,fontSize:18,fontWeight:600,color:C.ow,marginBottom:6}}>{a.title}</h3>
            <p style={{fontFamily:serif,fontSize:13,color:C.wg,lineHeight:1.6}}>{a.excerpt}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function PublicFooter() {
  return (
    <footer style={{padding:"48px 40px 24px",borderTop:`1px solid rgba(201,168,76,0.1)`,background:C.ds}}>
      <div style={{maxWidth:1000,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:32}}>
        <div>
          <div style={{fontFamily:display,fontWeight:700,fontSize:14,letterSpacing:"0.2em",color:C.ow}}>STONEHEIR</div>
          <div style={{fontFamily:display,fontStyle:"italic",fontSize:10,color:C.g,marginBottom:12}}>Real Estate Intelligence</div>
          <div style={{fontFamily:serif,fontSize:11,color:C.st,lineHeight:1.6}}>Inteligência imobiliária independente.<br/>Uma empresa do ecossistema Realty Concierge.</div>
        </div>
        <div>
          <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.3em",color:C.g,marginBottom:12}}>RELATÓRIOS</div>
          {["Property Valuation","Rental Yield Analysis","Market Intelligence","Portfolio Dashboard"].map(t=><div key={t} style={{fontFamily:serif,fontSize:12,color:C.wg,marginBottom:6,cursor:"pointer"}}>{t}</div>)}
        </div>
        <div>
          <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.3em",color:C.g,marginBottom:12}}>EMPRESA</div>
          {["Sobre a Stoneheir","Metodologia S.T.O.N.E.","Contato","LinkedIn"].map(t=><div key={t} style={{fontFamily:serif,fontSize:12,color:C.wg,marginBottom:6,cursor:"pointer"}}>{t}</div>)}
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:32,paddingTop:16,borderTop:`1px solid ${C.st}22`}}>
        <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.1em",color:C.st}}>© 2026 STONEHEIR — Real Estate Intelligence. Todos os direitos reservados.</div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════
function LoginPage({onLogin}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const handleLogin = () => {
    if(email&&pass.length>=4){onLogin({email,name:email.split("@")[0]});setErr("");}
    else setErr("Preencha email e senha (mín. 4 caracteres)");
  };
  return (
    <div style={{minHeight:"100vh",background:C.ds,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.w,borderRadius:8,width:400,overflow:"hidden"}}>
        <div style={{background:C.ds,padding:"32px",textAlign:"center",borderBottom:`2px solid ${C.g}`}}>
          <div style={{fontFamily:display,fontWeight:700,fontSize:22,letterSpacing:"0.25em",color:C.ow}}>STONEHEIR<span style={{color:C.g}}>.</span></div>
          <div style={{fontFamily:display,fontStyle:"italic",fontSize:11,color:C.g}}>Real Estate Intelligence</div>
          <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.2em",color:C.st,marginTop:12}}>ACESSO AO PAINEL</div>
        </div>
        <div style={{padding:32}}>
          <Input label="Email" type="email" value={email} onChange={setEmail}/>
          <Input label="Senha" type="password" value={pass} onChange={setPass}/>
          {err&&<div style={{fontFamily:serif,fontSize:11,color:C.rd,marginBottom:12}}>{err}</div>}
          <Btn gold style={{width:"100%",justifyContent:"center",marginTop:8}} onClick={handleLogin}>Entrar</Btn>
          <div style={{textAlign:"center",marginTop:16}}>
            <span style={{fontFamily:mono,fontSize:8,color:C.sv,letterSpacing:"0.1em"}}>POWERED BY S.T.O.N.E. FRAMEWORK v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INTERNAL PANEL
// ══════════════════════════════════════════════════════════════════

function PanelNav({section,setSection,user,onLogout}) {
  const items = [{id:"dashboard",l:"Dashboard",i:"◉"},{id:"scoring",l:"Scoring",i:"◈"},{id:"properties",l:"Imóveis",i:"□"},{id:"clients",l:"Clientes",i:"◇"},{id:"reports",l:"Relatórios",i:"△"}];
  return (
    <aside style={{width:220,background:C.ds,minHeight:"100vh",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,bottom:0,zIndex:50}}>
      <div style={{padding:"20px 20px 16px",borderBottom:`1px solid ${C.g}33`}}>
        <div style={{fontFamily:display,fontWeight:700,fontSize:14,letterSpacing:"0.2em",color:C.ow}}>STONEHEIR<span style={{color:C.g}}>.</span></div>
        <div style={{fontFamily:display,fontStyle:"italic",fontSize:9,color:C.g}}>Real Estate Intelligence</div>
      </div>
      <div style={{flex:1,padding:"16px 0"}}>
        {items.map(it=>
          <div key={it.id} onClick={()=>setSection(it.id)} style={{padding:"10px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:section===it.id?`${C.g}15`:"transparent",borderLeft:section===it.id?`2px solid ${C.g}`:"2px solid transparent",transition:"all 0.2s"}}>
            <span style={{fontFamily:mono,fontSize:14,color:section===it.id?C.g:C.st}}>{it.i}</span>
            <span style={{fontFamily:serif,fontSize:13,color:section===it.id?C.ow:C.wg,fontWeight:section===it.id?600:400}}>{it.l}</span>
          </div>
        )}
      </div>
      <div style={{padding:"16px 20px",borderTop:`1px solid ${C.ch}`}}>
        <div style={{fontFamily:serif,fontSize:11,color:C.wg,marginBottom:4}}>{user?.name}</div>
        <div style={{fontFamily:mono,fontSize:8,color:C.st,marginBottom:8}}>{user?.email}</div>
        <div onClick={onLogout} style={{fontFamily:mono,fontSize:9,color:C.g,cursor:"pointer",letterSpacing:"0.1em"}}>SAIR →</div>
      </div>
    </aside>
  );
}

function DashboardSection({properties}) {
  const totalValue = properties.reduce((s,p)=>s+p.valorImovel,0);
  const avgScore = properties.length ? properties.reduce((s,p)=>s+scoreAll(p).final,0)/properties.length : 0;
  const avgYield = properties.length ? properties.reduce((s,p)=>s+scoreAll(p).yb,0)/properties.length : 0;
  return (
    <div>
      <h2 style={{fontFamily:display,fontSize:24,fontWeight:600,color:C.ds,marginBottom:4}}>Dashboard</h2>
      <GoldLine w={60}/>
      <p style={{fontFamily:serif,fontSize:13,color:C.st,marginBottom:24}}>Visão geral da operação Stoneheir</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:32}}>
        <StatCard value={properties.length} label="IMÓVEIS NA CARTEIRA" change="+2 este mês"/>
        <StatCard value={`R$ ${(totalValue/1e6).toFixed(1)}M`} label="VALOR TOTAL AVALIADO"/>
        <StatCard value={avgScore.toFixed(1)} label="SCORE MÉDIO" change={avgScore>=7?`● ${classify(avgScore).l}`:""}/>
        <StatCard value={`${avgYield.toFixed(1)}%`} label="YIELD MÉDIO BRUTO"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
        <Card>
          <div style={{padding:"16px 20px",borderBottom:`1px solid #E5E7EB`}}>
            <span style={{fontFamily:mono,fontSize:9,letterSpacing:"0.15em",color:C.g}}>IMÓVEIS RECENTES</span>
          </div>
          <div>
            {properties.slice(0,5).map(p=>{
              const sc=scoreAll(p);
              return (
                <div key={p.id} style={{padding:"12px 20px",borderBottom:`1px solid ${C.lg}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:serif,fontSize:12,fontWeight:600,color:C.ds}}>{p.endereco}</div>
                    <div style={{fontFamily:mono,fontSize:9,color:C.st}}>{bairroOpts.find(b=>b.v===p.bairro)?.l} • {p.areaUtil}m² • R$ {(p.valorImovel/1e6).toFixed(1)}M</div>
                  </div>
                  <Badge score={sc.final}/>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div style={{padding:"16px 20px",borderBottom:`1px solid #E5E7EB`}}>
            <span style={{fontFamily:mono,fontSize:9,letterSpacing:"0.15em",color:C.g}}>SCORE POR DIMENSÃO (MÉDIA)</span>
          </div>
          <div style={{padding:20}}>
            {Object.entries(DIMS).map(([k,cfg])=>{
              const avgDim = properties.length ? properties.reduce((s,p)=>s+scoreAll(p).dims[k],0)/properties.length : 0;
              const cls = classify(avgDim);
              return (
                <div key={k} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontFamily:serif,fontSize:11,color:C.ch}}><span style={{color:C.g,marginRight:6}}>{cfg.icon}</span>{cfg.label}</span>
                    <span style={{fontFamily:mono,fontSize:12,fontWeight:700,color:cls.c}}>{avgDim.toFixed(1)}</span>
                  </div>
                  <div style={{height:5,background:C.lg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${avgDim*10}%`,background:cls.c,borderRadius:3,transition:"width 0.5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScoringSection({properties,setProperties}) {
  const empty={endereco:"",bairro:"jardins",areaUtil:100,dormitorios:2,vagas:1,anoConstrucao:2020,padrao:"medio-alto",conservacao:"bom",valorImovel:1000000,aluguelMensal:5000,precoM2:10000,mediaM2Bairro:10000,tempoVenda:90,volumeTransacoes:20,estoqueRegiao:100,buscasMensais:500,valorizacao12m:8,valorizacao24m:15,tendenciaBairro:"alta-moderada",distanciaMetro:500,infraestrutura:7,seguranca:7,vacancia:5,demandaLocacao:"media",selic:11.25,notaCondominio:7,diversificacaoDemanda:"media",riscoAmbiental:"baixo",dependenciaFator:"baixa",documentacao:"completa",andar:5,cliente:"",status:"avaliacao"};
  const [d,setD]=useState(empty);
  const up=(f,v)=>setD(p=>({...p,[f]:v}));
  const sc=useMemo(()=>scoreAll(d),[d]);
  const cls=classify(sc.final);
  const save=()=>{const newP={...d,id:Date.now()};setProperties(p=>[...p,newP]);setD(empty);};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
        <h2 style={{fontFamily:display,fontSize:24,fontWeight:600,color:C.ds}}>Investment Score Engine</h2>
        <Btn gold small onClick={save}>Salvar Imóvel</Btn>
      </div>
      <GoldLine w={60}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24,marginTop:20}}>
        <Card style={{padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 20px"}}>
            <Input label="Endereço" value={d.endereco} onChange={v=>up("endereco",v)} type="text"/>
            <Input label="Bairro" options={bairroOpts} value={d.bairro} onChange={v=>up("bairro",v)}/>
            <Input label="Valor" type="number" value={d.valorImovel} onChange={v=>up("valorImovel",v)} suffix="R$"/>
            <Input label="Área" type="number" value={d.areaUtil} onChange={v=>up("areaUtil",v)} suffix="m²"/>
            <Input label="Aluguel Mensal" type="number" value={d.aluguelMensal} onChange={v=>up("aluguelMensal",v)} suffix="R$"/>
            <Input label="Ano Construção" type="number" value={d.anoConstrucao} onChange={v=>up("anoConstrucao",v)}/>
            <Input label="Padrão" options={[{v:"ultra-luxo",l:"Ultra Luxo"},{v:"alto",l:"Alto"},{v:"medio-alto",l:"Médio-Alto"},{v:"medio",l:"Médio"},{v:"economico",l:"Econômico"}]} value={d.padrao} onChange={v=>up("padrao",v)}/>
            <Input label="Conservação" options={[{v:"novo",l:"Novo"},{v:"excelente",l:"Excelente"},{v:"bom",l:"Bom"},{v:"regular",l:"Regular"},{v:"precisa-reforma",l:"Reforma"}]} value={d.conservacao} onChange={v=>up("conservacao",v)}/>
            <Input label="Tendência" options={[{v:"alta-forte",l:"Alta forte"},{v:"alta-moderada",l:"Alta moderada"},{v:"estavel",l:"Estável"},{v:"queda-moderada",l:"Queda"},{v:"queda-forte",l:"Queda forte"}]} value={d.tendenciaBairro} onChange={v=>up("tendenciaBairro",v)}/>
            <Input label="Valorização 12m" type="number" value={d.valorizacao12m} onChange={v=>up("valorizacao12m",v)} suffix="%"/>
            <Input label="Tempo Venda" type="number" value={d.tempoVenda} onChange={v=>up("tempoVenda",v)} suffix="dias"/>
            <Input label="Vacância" type="number" value={d.vacancia} onChange={v=>up("vacancia",v)} suffix="%"/>
            <Input label="Demanda Locação" options={[{v:"muito-alta",l:"Muito alta"},{v:"alta",l:"Alta"},{v:"media",l:"Média"},{v:"baixa",l:"Baixa"}]} value={d.demandaLocacao} onChange={v=>up("demandaLocacao",v)}/>
            <Input label="Documentação" options={[{v:"completa",l:"Completa"},{v:"parcial",l:"Parcial"},{v:"pendente",l:"Pendente"}]} value={d.documentacao} onChange={v=>up("documentacao",v)}/>
            <Input label="Cliente" value={d.cliente} onChange={v=>up("cliente",v)} type="text"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginTop:8}}>
            <Input label="Infraestrutura" slider value={d.infraestrutura} onChange={v=>up("infraestrutura",v)}/>
            <Input label="Segurança" slider value={d.seguranca} onChange={v=>up("seguranca",v)}/>
            <Input label="Condomínio" slider value={d.notaCondominio} onChange={v=>up("notaCondominio",v)}/>
          </div>
        </Card>
        {/* Score sidebar */}
        <div>
          <Card>
            <div style={{background:C.ds,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontFamily:mono,fontSize:8,letterSpacing:"0.3em",color:C.g}}>INVESTMENT SCORE</div>
            </div>
            <div style={{padding:"16px",textAlign:"center"}}>
              <ScoreGauge score={sc.final} size={150}/>
              <div style={{margin:"6px 0 12px"}}><Badge score={sc.final}/></div>
              <div style={{fontFamily:mono,fontSize:10,fontWeight:700,color:cls.c,marginBottom:14}}>{recommend(sc.final)}</div>
              {Object.entries(DIMS).map(([k,cfg])=>{
                const s=sc.dims[k];const dc=classify(s);
                return <div key={k} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontFamily:serif,fontSize:10,color:C.ch}}><span style={{color:C.g,marginRight:4}}>{cfg.icon}</span>{cfg.label}</span>
                    <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:dc.c}}>{s.toFixed(1)}</span>
                  </div>
                  <div style={{height:4,background:C.lg,borderRadius:2}}><div style={{height:"100%",width:`${s*10}%`,background:dc.c,borderRadius:2,transition:"width 0.5s"}}/></div>
                </div>;
              })}
            </div>
            <div style={{borderTop:`1px solid #E5E7EB`,display:"grid",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{padding:10,textAlign:"center",borderRight:`1px solid #E5E7EB`}}>
                <div style={{fontFamily:mono,fontSize:7,color:C.st}}>YIELD</div>
                <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:C.ds}}>{sc.yb.toFixed(1)}%</div>
              </div>
              <div style={{padding:10,textAlign:"center"}}>
                <div style={{fontFamily:mono,fontSize:7,color:C.st}}>R$/M²</div>
                <div style={{fontFamily:mono,fontSize:15,fontWeight:700,color:C.ds}}>R$ {Math.round(d.valorImovel/(d.areaUtil||1)).toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PropertiesSection({properties,setProperties}) {
  return (
    <div>
      <h2 style={{fontFamily:display,fontSize:24,fontWeight:600,color:C.ds,marginBottom:4}}>Gestão de Imóveis</h2>
      <GoldLine w={60}/>
      <p style={{fontFamily:serif,fontSize:13,color:C.st,marginBottom:20}}>{properties.length} imóveis na carteira</p>
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.ds}}>
              {["ENDEREÇO","BAIRRO","ÁREA","VALOR","SCORE","YIELD","CLIENTE","STATUS"].map(h=><th key={h} style={{padding:"10px 12px",fontFamily:mono,fontSize:8,letterSpacing:"0.12em",color:C.g,textAlign:"left"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {properties.map((p,i)=>{
              const sc=scoreAll(p);const cls=classify(sc.final);
              return <tr key={p.id} style={{background:i%2===0?C.ow:C.w,borderBottom:`1px solid ${C.lg}`}}>
                <td style={{padding:"10px 12px",fontFamily:serif,fontSize:12,fontWeight:600,color:C.ds}}>{p.endereco||"—"}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:11,color:C.ch}}>{bairroOpts.find(b=>b.v===p.bairro)?.l}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:11,color:C.ch}}>{p.areaUtil}m²</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:11,color:C.ds,fontWeight:600}}>R$ {(p.valorImovel/1e6).toFixed(2)}M</td>
                <td style={{padding:"10px 12px"}}><Badge score={sc.final}/></td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:11,color:C.ds}}>{sc.yb.toFixed(1)}%</td>
                <td style={{padding:"10px 12px",fontFamily:serif,fontSize:11,color:C.ch}}>{p.cliente||"—"}</td>
                <td style={{padding:"10px 12px"}}>
                  <span style={{fontFamily:mono,fontSize:8,padding:"3px 8px",borderRadius:3,background:p.status==="ativo"?"#F0FDF4":p.status==="avaliacao"?"#FEFCE8":"#F3F4F6",color:p.status==="ativo"?C.gr:p.status==="avaliacao"?C.am:C.st}}>{(p.status||"ativo").toUpperCase()}</span>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ClientsSection({clients,setClients}) {
  return (
    <div>
      <h2 style={{fontFamily:display,fontSize:24,fontWeight:600,color:C.ds,marginBottom:4}}>Gestão de Clientes</h2>
      <GoldLine w={60}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        <StatCard value={clients.length} label="TOTAL DE CLIENTES" small/>
        <StatCard value={clients.filter(c=>c.status==="ativo").length} label="ATIVOS" small/>
        <StatCard value={clients.filter(c=>c.tipo==="Investidor").length} label="INVESTIDORES" small/>
        <StatCard value={clients.filter(c=>c.status==="lead").length} label="LEADS" small/>
      </div>
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.ds}}>
              {["NOME","EMAIL","TELEFONE","TIPO","IMÓVEIS","STATUS","DESDE"].map(h=><th key={h} style={{padding:"10px 12px",fontFamily:mono,fontSize:8,letterSpacing:"0.12em",color:C.g,textAlign:"left"}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {clients.map((c,i)=>
              <tr key={c.id} style={{background:i%2===0?C.ow:C.w,borderBottom:`1px solid ${C.lg}`}}>
                <td style={{padding:"10px 12px",fontFamily:serif,fontSize:12,fontWeight:600,color:C.ds}}>{c.nome}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:10,color:C.ch}}>{c.email}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:10,color:C.ch}}>{c.tel}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:9,color:C.st}}>{c.tipo}</td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:11,color:C.ds,fontWeight:700,textAlign:"center"}}>{c.imoveis}</td>
                <td style={{padding:"10px 12px"}}><span style={{fontFamily:mono,fontSize:8,padding:"3px 8px",borderRadius:3,background:c.status==="ativo"?"#F0FDF4":"#FEFCE8",color:c.status==="ativo"?C.gr:C.am}}>{c.status.toUpperCase()}</span></td>
                <td style={{padding:"10px 12px",fontFamily:mono,fontSize:10,color:C.st}}>{c.desde}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ReportsSection({properties}) {
  const [sel,setSel]=useState(null);
  const [type,setType]=useState("pvr");
  return (
    <div>
      <h2 style={{fontFamily:display,fontSize:24,fontWeight:600,color:C.ds,marginBottom:4}}>Gerador de Relatórios</h2>
      <GoldLine w={60}/>
      <p style={{fontFamily:serif,fontSize:13,color:C.st,marginBottom:20}}>Selecione um imóvel e o tipo de relatório para gerar.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
        <Card style={{padding:24}}>
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.15em",color:C.g,marginBottom:12}}>1. SELECIONE O IMÓVEL</div>
          {properties.map(p=>
            <div key={p.id} onClick={()=>setSel(p)} style={{padding:"12px 16px",borderRadius:4,marginBottom:6,border:`1px solid ${sel?.id===p.id?C.g:"#E5E7EB"}`,background:sel?.id===p.id?"#F9F5EB":C.w,cursor:"pointer",transition:"all 0.2s"}}>
              <div style={{fontFamily:serif,fontSize:12,fontWeight:600,color:C.ds}}>{p.endereco||"Imóvel sem endereço"}</div>
              <div style={{fontFamily:mono,fontSize:9,color:C.st}}>{bairroOpts.find(b=>b.v===p.bairro)?.l} • R$ {(p.valorImovel/1e6).toFixed(1)}M</div>
            </div>
          )}
          <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.15em",color:C.g,marginTop:20,marginBottom:12}}>2. TIPO DE RELATÓRIO</div>
          {[{v:"pvr",l:"Property Valuation Report",d:"Avaliação completa com score"},{v:"rya",l:"Rental Yield Analysis",d:"Análise de rentabilidade"},{v:"ddb",l:"Due Diligence Brief",d:"Resumo executivo para decisão"}].map(t=>
            <div key={t.v} onClick={()=>setType(t.v)} style={{padding:"12px 16px",borderRadius:4,marginBottom:6,border:`1px solid ${type===t.v?C.g:"#E5E7EB"}`,background:type===t.v?"#F9F5EB":C.w,cursor:"pointer"}}>
              <div style={{fontFamily:serif,fontSize:12,fontWeight:600,color:C.ds}}>{t.l}</div>
              <div style={{fontFamily:mono,fontSize:9,color:C.st}}>{t.d}</div>
            </div>
          )}
        </Card>
        <div>
          {sel ? (()=>{
            const sc=scoreAll(sel); const cls=classify(sc.final); const pm2=sel.valorImovel/(sel.areaUtil||1);
            return (
              <Card>
                <div style={{background:C.ds,padding:"20px 24px",borderBottom:`2px solid ${C.g}`}}>
                  <div style={{fontFamily:display,fontWeight:700,fontSize:12,letterSpacing:"0.2em",color:C.ow}}>STONEHEIR<span style={{color:C.g}}>.</span></div>
                  <div style={{fontFamily:mono,fontSize:8,color:C.st,marginTop:6,letterSpacing:"0.1em"}}>PRÉ-VISUALIZAÇÃO — {type.toUpperCase()}</div>
                </div>
                <div style={{padding:24}}>
                  <div style={{textAlign:"center",marginBottom:20}}>
                    <ScoreGauge score={sc.final} size={140}/>
                    <div style={{marginTop:4}}><Badge score={sc.final}/></div>
                    <div style={{fontFamily:mono,fontSize:10,fontWeight:700,color:cls.c,marginTop:6}}>{recommend(sc.final)}</div>
                  </div>
                  <div style={{fontFamily:serif,fontSize:14,fontWeight:600,color:C.ds,marginBottom:4}}>{sel.endereco}</div>
                  <div style={{fontFamily:mono,fontSize:9,color:C.st,marginBottom:16}}>{bairroOpts.find(b=>b.v===sel.bairro)?.l} • {sel.areaUtil}m² • {sel.dormitorios} dorms</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    <StatCard value={`R$ ${(sel.valorImovel/1e6).toFixed(1)}M`} label="VALOR" small/>
                    <StatCard value={`R$ ${Math.round(pm2).toLocaleString("pt-BR")}`} label="R$/M²" small/>
                    <StatCard value={`${sc.yb.toFixed(1)}%`} label="YIELD BRUTO" small/>
                    <StatCard value={`+${sel.valorizacao12m}%`} label="VALORIZ. 12M" small/>
                  </div>
                  <div style={{fontFamily:mono,fontSize:9,letterSpacing:"0.12em",color:C.g,marginBottom:8}}>DIMENSÕES</div>
                  {Object.entries(DIMS).map(([k,cfg])=>{
                    const s=sc.dims[k];const dc=classify(s);
                    return <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.lg}`}}>
                      <span style={{fontFamily:serif,fontSize:10,color:C.ch}}>{cfg.icon} {cfg.label}</span>
                      <span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:dc.c}}>{s.toFixed(1)}</span>
                    </div>;
                  })}
                  <div style={{marginTop:20,textAlign:"center"}}>
                    <Btn gold>Gerar Relatório PDF</Btn>
                  </div>
                  <div style={{textAlign:"center",marginTop:12,fontFamily:mono,fontSize:7,color:C.sv}}>SH-2026-{type.toUpperCase()}-{String(sel.id).padStart(4,"0")}</div>
                </div>
              </Card>
            );
          })() : (
            <Card style={{padding:48,textAlign:"center"}}>
              <div style={{fontFamily:mono,fontSize:40,color:C.sv,marginBottom:12}}>□</div>
              <div style={{fontFamily:serif,fontSize:14,color:C.st}}>Selecione um imóvel para pré-visualizar o relatório</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════

export default function StoneHeirApp() {
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("home");
  const [section,setSection]=useState("dashboard");
  const [properties,setProperties]=useState(SAMPLE_PROPERTIES);
  const [clients,setClients]=useState(SAMPLE_CLIENTS);
  const [authChecked,setAuthChecked]=useState(false);

  // Load persisted auth
  useEffect(()=>{
    loadStore("sh_user",null).then(u=>{setUser(u);setAuthChecked(true);});
  },[]);

  // Save auth on change
  useEffect(()=>{if(authChecked) saveStore("sh_user",user);},[user,authChecked]);

  // Save properties
  useEffect(()=>{saveStore("sh_properties",properties);},[properties]);
  useEffect(()=>{loadStore("sh_properties",SAMPLE_PROPERTIES).then(p=>{if(p.length)setProperties(p);});},[]);

  const handleLogin=(u)=>{setUser(u);setPage("panel");};
  const handleLogout=()=>{setUser(null);setPage("home");};

  if(!authChecked) return <div style={{minHeight:"100vh",background:C.ds,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:display,fontSize:18,color:C.g,letterSpacing:"0.2em"}}>STONEHEIR...</div></div>;

  // Login page
  if(page==="login") return <LoginPage onLogin={handleLogin}/>;

  // Internal Panel
  if(page==="panel"&&user) {
    return (
      <div style={{display:"flex",minHeight:"100vh",background:C.lg}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
        <PanelNav section={section} setSection={setSection} user={user} onLogout={handleLogout}/>
        <main style={{marginLeft:220,flex:1,padding:32}}>
          {section==="dashboard"&&<DashboardSection properties={properties}/>}
          {section==="scoring"&&<ScoringSection properties={properties} setProperties={setProperties}/>}
          {section==="properties"&&<PropertiesSection properties={properties} setProperties={setProperties}/>}
          {section==="clients"&&<ClientsSection clients={clients} setClients={setClients}/>}
          {section==="reports"&&<ReportsSection properties={properties}/>}
        </main>
      </div>
    );
  }

  // Public site
  return (
    <div style={{background:C.ds}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      <PublicNav page={page} setPage={setPage} onLogin={()=>user?setPage("panel"):setPage("login")}/>
      {page==="home"&&<><HeroSection setPage={setPage}/><ServicesPage/><MethodologyPage/><PublicFooter/></>}
      {page==="services"&&<><ServicesPage/><PublicFooter/></>}
      {page==="methodology"&&<><MethodologyPage/><PublicFooter/></>}
      {page==="blog"&&<><BlogPage/><PublicFooter/></>}
    </div>
  );
}
