(function(){
const DIAS=['Seg','Ter','Qua','Qui','Sex','Sáb'];
const SH={
  T1:{ini:'08:00',fim:'16:40',lunch:true,nome:'Abertura'},
  T2:{ini:'08:50',fim:'17:30',lunch:true,nome:'Fechamento'},
  TL:{ini:'07:50',fim:'17:30',lunch:true,nome:'Longo abertura'},
  TLF:{ini:'08:00',fim:'17:40',lunch:true,nome:'Longo fechamento'},
  SAB:{ini:'08:00',fim:'12:00',lunch:false,nome:'Sábado'},
  F:null
};
const FN={caixa:{n:'Caixa',c:'var(--c-caixa)'},balcao:{n:'Balconista',c:'var(--c-balcao)'},estoque:{n:'Estoquista',c:'var(--c-estoque)'},apoio:{n:'Apoio Balcão/Estoque',c:'var(--c-apoio)'}};
const DEF={
  people:[
    {id:'C1',nome:'Caixa 1',fn:'caixa',almoco:'11:00',cx:false},
    {id:'C2',nome:'Caixa 2',fn:'caixa',almoco:'12:20',cx:false},
    {id:'B1',nome:'Balconista 1',fn:'balcao',almoco:'11:00',cx:false},
    {id:'B2',nome:'Balconista 2',fn:'balcao',almoco:'13:00',cx:false},
    {id:'B3',nome:'Balconista 3',fn:'balcao',almoco:'12:20',cx:false},
    {id:'E1',nome:'Estoquista',fn:'estoque',almoco:'13:00',cx:false},
    {id:'A1',nome:'Apoio',fn:'apoio',almoco:'11:40',cx:true}
  ],
  weeks:{
    A:{C1:['TL','TL','F','TL','TL','SAB'],C2:['T2','T2','T2','T2','T2','F'],B1:['TL','F','TL','TL','TL','SAB'],B2:['TL','TL','TL','F','TL','SAB'],B3:['T2','T2','T2','T2','T2','F'],E1:['T1','T1','T1','T1','T1','F'],A1:['T1','T1','T1','T1','T1','F']},
    B:{C1:['T2','T2','T2','T2','T2','F'],C2:['TL','TL','F','TL','TL','SAB'],B1:['T1','T1','T1','T1','T1','F'],B2:['T2','T2','T2','T2','T2','F'],B3:['TL','F','TL','TL','TL','SAB'],E1:['T1','T1','T1','T1','T1','F'],A1:['TL','TL','TL','F','TL','SAB']}
  },
  picos:[['08:00','10:00'],['16:00','17:30']], pkMin:2, baseMin:1, calStart:'2026-12-05'
};
const KEY='unidos-escala-v1';
function clone(o){return JSON.parse(JSON.stringify(o));}
function load(){try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null;}catch(e){return null;}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
let S=load()||clone(DEF);
let V={week:'A',day:0};

const m=t=>{const [h,mm]=String(t).split(':').map(Number);return h*60+(mm||0);};
const f=x=>String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');
const fh=x=>Math.floor(x/60)+'h'+String(x%60).padStart(2,'0');
const LUNCH=40, SLOT=10, T0=m('07:50'), T1=m('17:40');
const OPEN=d=>d<5?[m('08:00'),m('17:30')]:[m('08:00'),m('12:00')];

function work(code){const s=SH[code];if(!s)return 0;const d=m(s.fim)-m(s.ini);return d-(s.lunch?LUNCH:0);}
function present(p,code,t){const s=SH[code];if(!s)return false;if(t<m(s.ini)||t>=m(s.fim))return false;
  if(s.lunch){const l=m(p.almoco);if(t>=l&&t<l+LUNCH)return false;}return true;}
function isPeak(t){return S.picos.some(([a,b])=>t>=m(a)&&t<m(b));}

function coverage(w,d){
  const out=[];const wk=S.weeks[w];
  for(let t=T0;t<T1;t+=SLOT){
    const [o,c]=OPEN(d);const open=t>=o&&t<c;
    const pres=S.people.filter(p=>present(p,wk[p.id][d],t));
    let cx=pres.filter(p=>p.fn==='caixa').length;let backup=null;
    if(cx===0){backup=pres.find(p=>p.fn!=='caixa'&&p.cx)||null;if(backup)cx=1;}
    const bal=pres.filter(p=>(p.fn==='balcao'||p.fn==='apoio')&&p!==backup).length;
    const est=pres.filter(p=>p.fn==='estoque').length;
    const pk=d===5?true:isPeak(t);const need=pk?S.pkMin:S.baseMin;
    out.push({t,open,pk,cx,backup,bal,est,need,
      sCx:!open?'closed':(cx===0?'gap':(backup?'warn':'ok')),
      sBal:!open?'closed':(bal<need?'gap':'ok'),
      sEst:!open?'closed':(d===5?'closed':(est===0?'warn':'ok'))});
  }
  return out;
}

function personStats(p,w){
  const arr=S.weeks[w][p.id];let mins=0,maxD=0,folgas=1;const issues=[];
  arr.forEach((c,d)=>{if(c==='F'){folgas++;return;}const h=work(c);mins+=h;maxD=Math.max(maxD,h);
    const s=SH[c];if(s.lunch){const l=m(p.almoco);if(l<m(s.ini)+60||l+LUNCH>m(s.fim)-60)issues.push(DIAS[d]+': intervalo fora do turno');}
    if(d===5&&c!=='SAB')issues.push('Sáb: use SAB');if(d<5&&c==='SAB')issues.push(DIAS[d]+': SAB só no sábado');});
  for(let d=0;d<5;d++){const a=arr[d],b=arr[d+1];if(a!=='F'&&b!=='F'){const gap=1440-m(SH[a].fim)+m(SH[b].ini);if(gap<660)issues.push('Interjornada < 11h ('+DIAS[d]+'→'+DIAS[d+1]+')');}}
  if(maxD>600)issues.push('Dia acima de 10h');
  return {mins,maxD,folgas,issues};
}

/* ---------- render grid ---------- */
function renderGrid(){
  const w=V.week;const g=document.getElementById('grid');
  let h='<tr><th>Colaborador</th>'+DIAS.map(d=>'<th>'+d+'</th>').join('')+'<th>Dom</th><th>Intervalo</th><th>Cobre caixa</th><th class="num">Horas</th><th>Folgas</th><th>Status</th></tr>';
  S.people.forEach((p,i)=>{
    const st=personStats(p,w);
    h+='<tr><td><span class="dot" style="background:'+FN[p.fn].c+'"></span><input type="text" data-name="'+i+'" value="'+p.nome.replace(/"/g,'&quot;')+'"><div class="fn">'+FN[p.fn].n+'</div></td>';
    S.weeks[w][p.id].forEach((c,d)=>{
      const opts=d===5?['SAB','F']:['T1','T2','TL','TLF','F'];
      h+='<td><select class="'+c+'" data-p="'+p.id+'" data-d="'+d+'">'+opts.map(o=>'<option'+(o===c?' selected':'')+'>'+o+'</option>').join('')+'</select></td>';
    });
    h+='<td class="dsr">DSR</td>';
    let lo='';for(let t=m('10:30');t<=m('14:20');t+=10){lo+='<option'+(f(t)===p.almoco?' selected':'')+'>'+f(t)+'</option>';}
    h+='<td><select data-lunch="'+i+'">'+lo+'</select></td>';
    h+='<td><input type="checkbox" data-cx="'+i+'"'+(p.cx?' checked':'')+(p.fn==='caixa'?' disabled':'')+'></td>';
    const hcls=st.mins===2400?'ok-t':(st.mins>2400?'bad-t':'warn-t');
    h+='<td class="num '+hcls+'">'+fh(st.mins)+'</td>';
    h+='<td class="mono '+(st.folgas>=2?'ok-t':'bad-t')+'">'+st.folgas+'</td>';
    let pills=[];
    if(st.mins>2400)pills.push('<span class="pill gap">+'+fh(st.mins-2400)+' HE</span>');
    else if(st.mins<2400)pills.push('<span class="pill warn">−'+fh(2400-st.mins)+'</span>');
    if(st.folgas<2)pills.push('<span class="pill gap">1 folga</span>');
    st.issues.forEach(x=>pills.push('<span class="pill gap" title="'+x+'">'+x+'</span>'));
    if(!pills.length)pills.push('<span class="pill ok">OK</span>');
    h+='<td style="text-align:left">'+pills.join(' ')+'</td></tr>';
  });
  g.innerHTML=h;
  g.querySelectorAll('select[data-p]').forEach(s=>s.onchange=e=>{S.weeks[w][s.dataset.p][+s.dataset.d]=s.value;changed();});
  g.querySelectorAll('select[data-lunch]').forEach(s=>s.onchange=()=>{S.people[+s.dataset.lunch].almoco=s.value;changed();});
  g.querySelectorAll('input[data-cx]').forEach(s=>s.onchange=()=>{S.people[+s.dataset.cx].cx=s.checked;changed();});
  g.querySelectorAll('input[data-name]').forEach(s=>s.onchange=()=>{S.people[+s.dataset.name].nome=s.value||S.people[+s.dataset.name].id;changed();});
}

/* ---------- timeline ---------- */
const AX0=m('07:30'),AX1=m('18:00');const pct=t=>((t-AX0)/(AX1-AX0)*100);
function renderTimeline(){
  const w=V.week,d=V.day;const wk=S.weeks[w];
  let ax='';for(let t=m('08:00');t<=m('18:00');t+=60)ax+='<span style="left:'+pct(t)+'%">'+f(t)+'</span>';
  document.getElementById('axis').innerHTML=ax;
  const [o,c]=OPEN(d);
  const band='<div class="openband" style="left:'+pct(o)+'%;width:'+(pct(c)-pct(o))+'%"></div>';
  let h='';
  S.people.forEach(p=>{
    const code=wk[p.id][d];const s=SH[code];let bars='';
    if(s){bars+='<div class="bar" style="left:'+pct(m(s.ini))+'%;width:'+(pct(m(s.fim))-pct(m(s.ini)))+'%;background:'+FN[p.fn].c+'"></div>';
      if(s.lunch){const l=m(p.almoco);bars+='<div class="bar lunch" style="left:'+pct(l)+'%;width:'+(pct(l+LUNCH)-pct(l))+'%;background:var(--panel)"></div>';}}
    h+='<div class="tl-row"><div class="lab"><span class="dot" style="background:'+FN[p.fn].c+'"></span>'+esc(p.nome)+' <span class="mono" style="color:var(--muted);font-size:11px">'+(code==='F'?'folga':code+(s&&s.lunch?' · int '+p.almoco:''))+'</span></div><div class="track">'+band+bars+'</div></div>';
  });
  const cov=coverage(w,d);
  // coverage strips aligned: slots start at T0 within axis
  const left=pct(T0),width=pct(T1)-pct(T0);
  const strip=(key,val)=>'<div class="track" style="background:transparent"><div class="cov" style="position:absolute;left:'+left+'%;width:'+width+'%;top:0;bottom:0">'+
    cov.map(x=>'<div class="'+x[key]+(x.pk&&x.open&&d<5?' pk':'')+'" title="'+f(x.t)+' · '+val(x)+'">'+(x[key]==='closed'?'':val(x))+'</div>').join('')+'</div></div>';
  h+='<div style="height:10px"></div>';
  h+='<div class="tl-row"><div class="lab"><b>Caixa</b></div>'+strip('sCx',x=>x.cx+(x.backup?'*':''))+'</div>';
  h+='<div class="tl-row"><div class="lab"><b>Balcão</b> <span class="mono" style="font-size:11px;color:var(--muted)">mín '+(d===5?S.pkMin:S.baseMin+'/'+S.pkMin)+'</span></div>'+strip('sBal',x=>x.bal)+'</div>';
  h+='<div class="tl-row"><div class="lab"><b>Estoque</b></div>'+strip('sEst',x=>x.est)+'</div>';
  document.getElementById('timeline').innerHTML=h;
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- diagnostics ---------- */
function ranges(cov,pred){const r=[];let cur=null;cov.forEach(x=>{if(pred(x)){if(!cur){cur={a:x.t,b:x.t+SLOT,x};r.push(cur);}else cur.b=x.t+SLOT;}else cur=null;});return r;}
function diagnose(){
  const r=computeDiag();const items=r.items;
  const ul=document.getElementById('diag');
  ul.innerHTML=items.length?items.map(i=>'<li><span class="pill '+i.k+'">'+(i.k==='gap'?'Lacuna':'Atenção')+'</span><span>'+i.t+'</span></li>').join(''):'<li><span class="pill ok">OK</span><span>Nenhuma lacuna nas duas semanas.</span></li>';
  return r;
}
function computeDiag(){
  const items=[];let gaps=0,warns=0;
  ['A','B'].forEach(w=>{for(let d=0;d<6;d++){const cov=coverage(w,d);
    ranges(cov,x=>x.sCx==='gap').forEach(r=>{gaps++;items.push({k:'gap',t:'Sem. '+w+' · '+DIAS[d]+' · '+f(r.a)+'–'+f(r.b)+': <b>sem caixa</b>'});});
    ranges(cov,x=>x.sBal==='gap').forEach(r=>{gaps++;items.push({k:'gap',t:'Sem. '+w+' · '+DIAS[d]+' · '+f(r.a)+'–'+f(r.b)+': balcão abaixo do mínimo ('+r.x.bal+'/'+r.x.need+')'});});
    ranges(cov,x=>x.sCx==='warn').forEach(r=>{warns++;items.push({k:'warn',t:'Sem. '+w+' · '+DIAS[d]+' · '+f(r.a)+'–'+f(r.b)+': caixa coberto por '+esc(r.x.backup.nome)});});
  }});
  let hrsOk=0,tot=0;['A','B'].forEach(w=>S.people.forEach(p=>{tot++;const s=personStats(p,w);if(s.mins===2400&&s.folgas>=2&&!s.issues.length)hrsOk++;else items.unshift({k:'gap',t:'Sem. '+w+' · '+esc(p.nome)+': '+fh(s.mins)+', '+s.folgas+' folga(s)'+(s.issues.length?' · '+s.issues.join('; '):'')});}));
  return {items,gaps,warns,hrsOk,tot};
}

function renderKpis(r){
  const satA=S.people.filter(p=>S.weeks.A[p.id][5]==='SAB').length,satB=S.people.filter(p=>S.weeks.B[p.id][5]==='SAB').length;
  document.getElementById('kpis').innerHTML=
   '<div class="kpi"><div class="v '+(r.hrsOk===r.tot?'ok-t':'bad-t')+'">'+r.hrsOk+'/'+r.tot+'</div><div class="l">Pessoa-semanas com 40h e 2 folgas</div></div>'+
   '<div class="kpi"><div class="v '+(r.gaps?'bad-t':'ok-t')+'">'+r.gaps+'</div><div class="l">Lacunas de cobertura no ciclo</div></div>'+
   '<div class="kpi"><div class="v '+(r.warns?'warn-t':'ok-t')+'">'+r.warns+'</div><div class="l">Faixas com caixa coberto por polivalente</div></div>'+
   '<div class="kpi"><div class="v">'+satA+' / '+satB+'</div><div class="l">Equipe de sábado (Sem. A / Sem. B)</div></div>';
}

/* ---------- calendar ---------- */
function renderCal(){
  const el=document.getElementById('cal');const st=S.calStart;let base=new Date(st+'T12:00:00');
  if(isNaN(base)){el.innerHTML='';return;}
  let h='';for(let i=0;i<8;i++){const dt=new Date(base);dt.setDate(base.getDate()+7*i);const w=i%2===0?'A':'B';
    const team=S.people.filter(p=>S.weeks[w][p.id][5]==='SAB').map(p=>esc(p.nome));
    h+='<div class="d"><span class="wk">SEM '+w+'</span><b>'+dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+'</b><div>'+(team.join('<br>')||'<i>ninguém</i>')+'</div></div>';}
  el.innerHTML=h;
}

/* ---------- seg controls ---------- */
function renderSegs(){
  document.querySelectorAll('#weekSeg button').forEach(b=>b.classList.toggle('on',b.dataset.w===V.week));
  document.getElementById('daySeg').innerHTML=DIAS.map((d,i)=>'<button data-d="'+i+'" class="'+(i===V.day?'on':'')+'">'+d+'</button>').join('');
  document.querySelectorAll('#daySeg button').forEach(b=>b.onclick=()=>{V.day=+b.dataset.d;renderSegs();renderTimeline();});
}
document.querySelectorAll('#weekSeg button').forEach(b=>b.onclick=()=>{V.week=b.dataset.w;renderAll();});

function bindParams(){
  const ids=[['p1a',0,0],['p1b',0,1],['p2a',1,0],['p2b',1,1]];
  ids.forEach(([id,i,j])=>{const el=document.getElementById(id);el.value=S.picos[i][j];el.onchange=()=>{if(/^\d{2}:\d{2}$/.test(el.value)){S.picos[i][j]=el.value;changed();}else el.value=S.picos[i][j];};});
  const pk=document.getElementById('pkMin'),bm=document.getElementById('baseMin');pk.value=S.pkMin;bm.value=S.baseMin;
  pk.onchange=()=>{S.pkMin=Math.max(0,+pk.value||0);changed();};bm.onchange=()=>{S.baseMin=Math.max(0,+bm.value||0);changed();};
  const cs=document.getElementById('calStart');cs.value=S.calStart;cs.onchange=()=>{S.calStart=cs.value;changed();};
}

/* ---------- troca de escala ---------- */
const $=id=>document.getElementById(id);
function swapWeeks(w){return w==='AB'?['A','B']:[w];}
function applySwap(st,o){
  swapWeeks(o.w).forEach(w=>{const a=st.weeks[w][o.p1],b=st.weeks[w][o.p2];
    if(o.mode==='semana'){st.weeks[w][o.p1]=b.slice();st.weeks[w][o.p2]=a.slice();}
    else{const t=a[o.day];a[o.day]=b[o.day];b[o.day]=t;}});
}
function withState(st,fn){const sv=S;S=st;try{return fn();}finally{S=sv;}}
function readSwap(){return {w:$('swW').value,mode:$('swMode').value,day:+$('swDay').value,p1:$('swP1').value,p2:$('swP2').value,mot:$('swMot').value.trim()};}
function pName(id,st){return (st||S).people.find(p=>p.id===id).nome;}
function swapDesc(o){return (o.mode==='semana'?'Semana inteira':DIAS[o.day])+' · '+(o.w==='AB'?'Sem. A e B':'Sem. '+o.w)+' · '+esc(pName(o.p1))+' ⇄ '+esc(pName(o.p2))+(o.mot?' · <i>'+esc(o.mot)+'</i>':'');}
function openSwap(){
  const opts=S.people.map(p=>'<option value="'+p.id+'">'+esc(p.nome)+' ('+FN[p.fn].n+')</option>').join('');
  $('swP1').innerHTML=opts;$('swP2').innerHTML=opts;$('swP2').selectedIndex=1;
  $('swDay').innerHTML=DIAS.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('');$('swDay').value=V.day;
  $('swW').value=V.week;$('swMot').value='';
  syncSwap();$('swapModal').classList.add('on');$('swapModal').setAttribute('aria-hidden','false');
}
function closeSwap(){$('swapModal').classList.remove('on');$('swapModal').setAttribute('aria-hidden','true');}
function syncSwap(){
  const o=readSwap();$('swDayL').style.display=o.mode==='dia'?'':'none';
  const prev=$('swPrev'),ok=$('swOk');
  if(o.p1===o.p2){prev.innerHTML='<div class="verdict warn">Escolha dois colaboradores diferentes.</div>';ok.disabled=true;return;}
  const cand=clone(S);applySwap(cand,o);
  let changed=false;
  let h='<div class="prev scroll"><table><tr><th>Semana</th><th>Colaborador</th><th></th>'+DIAS.map(d=>'<th>'+d+'</th>').join('')+'<th class="num">Horas</th><th>Folgas</th></tr>';
  swapWeeks(o.w).forEach(w=>[o.p1,o.p2].forEach(id=>{
    const p=S.people.find(x=>x.id===id);const bA=S.weeks[w][id],aA=cand.weeks[w][id];
    const sb=personStats(p,w),sa=withState(cand,()=>personStats(cand.people.find(x=>x.id===id),w));
    const cls=v=>v===2400?'ok-t':(v>2400?'bad-t':'warn-t');
    h+='<tr><td class="mono" rowspan="2">'+w+'</td><td rowspan="2">'+esc(p.nome)+'</td><td style="color:var(--muted);font-size:12px">antes</td>'+bA.map(c=>'<td class="mono">'+c+'</td>').join('')+'<td class="num '+cls(sb.mins)+'">'+fh(sb.mins)+'</td><td class="mono">'+sb.folgas+'</td></tr>';
    h+='<tr><td style="font-size:12px;font-weight:600">depois</td>'+aA.map((c,d)=>{const ch=c!==bA[d];if(ch)changed=true;return '<td class="mono'+(ch?' chg':'')+'">'+c+'</td>';}).join('')+'<td class="num '+cls(sa.mins)+'">'+fh(sa.mins)+'</td><td class="mono '+(sa.folgas>=2?'ok-t':'bad-t')+'">'+sa.folgas+'</td></tr>';
  }));
  h+='</table></div>';
  const rb=computeDiag(),ra=withState(cand,computeDiag);
  const msgs=[];let lvl='ok';
  const p1=S.people.find(x=>x.id===o.p1),p2=S.people.find(x=>x.id===o.p2);
  if(!changed){msgs.push('Os dois têm a mesma escala nesse período. Nada muda.');lvl='warn';}
  if(ra.hrsOk<rb.hrsOk){msgs.push('Alguém deixa de fechar 40h ou fica com menos de 2 folgas.');lvl='gap';}
  if(ra.gaps>rb.gaps){msgs.push('A cobertura piora: lacunas passam de '+rb.gaps+' para '+ra.gaps+'.');lvl='gap';}
  else if(ra.gaps<rb.gaps)msgs.push('A cobertura melhora: lacunas passam de '+rb.gaps+' para '+ra.gaps+'.');
  if(ra.warns>rb.warns){msgs.push('Aumenta o uso de polivalente no caixa ('+rb.warns+' → '+ra.warns+' faixas).');if(lvl==='ok')lvl='warn';}
  if(p1.fn!==p2.fn&&changed){msgs.push('Funções diferentes ('+FN[p1.fn].n+' × '+FN[p2.fn].n+'): a cobertura de cada função muda.');if(lvl==='ok')lvl='warn';}
  if(lvl==='ok'&&changed&&!msgs.length)msgs.push('Troca neutra: horas, folgas e cobertura continuam OK.');
  h+='<div class="verdict '+lvl+'">'+msgs.join('<br>')+'</div>';
  prev.innerHTML=h;ok.disabled=!changed;ok.textContent=lvl==='gap'?'Confirmar mesmo assim':'Confirmar troca';
}
function confirmSwap(){
  const o=readSwap();if(o.p1===o.p2)return;
  if(!S.hist)S.hist=[];
  S.hist.push({ts:new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),desc:swapDesc(o),before:clone(S.weeks)});
  applySwap(S,o);if(o.w!=='AB')V.week=o.w;if(o.mode==='dia')V.day=o.day;
  closeSwap();changed();flash('Troca aplicada');
}
function renderHist(){
  const h=S.hist||[];$('histCard').style.display=h.length?'':'none';
  $('hist').innerHTML=h.slice().reverse().map(x=>'<li><span class="mono" style="color:var(--muted);font-size:12px;white-space:nowrap">'+x.ts+'</span><span>'+x.desc+'</span></li>').join('');
}
$('btnSwap').onclick=openSwap;$('swapClose').onclick=closeSwap;$('swCancel').onclick=closeSwap;$('swOk').onclick=confirmSwap;
$('swapModal').addEventListener('click',e=>{if(e.target.id==='swapModal')closeSwap();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSwap();});
['swW','swMode','swDay','swP1','swP2'].forEach(id=>$(id).onchange=syncSwap);
$('btnUndo').onclick=()=>{const h=S.hist||[];if(!h.length)return;const last=h.pop();S.weeks=last.before;changed();flash('Troca desfeita');};

function renderAll(){renderSegs();renderGrid();renderTimeline();const r=diagnose();renderKpis(r);renderCal();renderHist();renderCover(r);}
function changed(){save();renderAll();}

document.getElementById('btnReset').onclick=()=>{S=clone(DEF);save();bindParams();renderAll();flash('Modelo restaurado');};
document.getElementById('btnCopy').onclick=async()=>{
  let t='Semana\tColaborador\tFunção\t'+DIAS.join('\t')+'\tDom\tIntervalo\tHoras\n';
  ['A','B'].forEach(w=>S.people.forEach(p=>{const arr=S.weeks[w][p.id].map(c=>c==='F'?'FOLGA':c+' ('+SH[c].ini+'-'+SH[c].fim+')');t+=w+'\t'+p.nome+'\t'+FN[p.fn].n+'\t'+arr.join('\t')+'\tDSR\t'+p.almoco+'-'+f(m(p.almoco)+LUNCH)+'\t'+fh(personStats(p,w).mins)+'\n';}));
  try{await navigator.clipboard.writeText(t);flash('Copiado. Cole no Excel.');}catch(e){const b=document.getElementById('copybox');b.style.display='block';b.value=t;b.select();flash('Selecione e copie (Ctrl+C)');}
};
function flash(msg){const el=document.getElementById('toast');el.textContent=msg;setTimeout(()=>el.textContent='',2500);}

/* ---------- calculadora ---------- */
function calc(){
  const s=+document.getElementById('sal').value||0,du=+document.getElementById('du').value||0;
  const h44=s/220,h40=s/200,sup=du*20/60,ind=sup*h40*1.5;
  const R=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  document.getElementById('calcT').innerHTML=
   '<tr><td>Valor-hora em 44h (÷220)</td><td class="num">'+R(h44)+'</td></tr>'+
   '<tr><td>Valor-hora em 40h (÷200)</td><td class="num">'+R(h40)+' <span class="warn-t">(+10%)</span></td></tr>'+
   '<tr><td>Hora extra 50% (÷200)</td><td class="num">'+R(h40*1.5)+'</td></tr>'+
   '<tr><td>Exposição por intervalo sem ACT, por pessoa/mês<br><span style="font-size:12px;color:var(--muted)">20 min × '+du+' dias × 1,5</span></td><td class="num">'+R(ind)+'</td></tr>'+
   '<tr><td><b>Exposição da equipe (7) por ano</b></td><td class="num"><b>'+R(ind*7*12)+'</b></td></tr>';
}
document.getElementById('sal').oninput=calc;document.getElementById('du').oninput=calc;

/* ---------- routing ---------- */
const VIEWS=['dimensionamento','escala','riscos','melhorias'];
function route(){const h=(location.hash||'').slice(1);
  const cover=!VIEWS.includes(h);document.body.classList.toggle('on-cover',cover);
  if(cover){window.scrollTo(0,0);return;}
  VIEWS.forEach(x=>{document.getElementById('v-'+x).classList.toggle('on',x===h);});
  document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+h));
  window.scrollTo(0,0);}
window.addEventListener('hashchange',route);

/* ---------- capa: dados ---------- */
function renderCover(r){
  $('cvGaps').textContent=r.gaps;
  const base=new Date(S.calStart+'T12:00:00');const now=new Date();now.setHours(12,0,0,0);
  const sat=new Date(now);sat.setDate(now.getDate()+((6-now.getDay()+7)%7));
  let idx=0;if(!isNaN(base)){if(sat<base){sat.setTime(base.getTime());}idx=Math.round((sat-base)/864e5/7)%2;}
  const w=idx===0?'A':'B';const team=S.people.filter(p=>S.weeks[w][p.id][5]==='SAB').map(p=>p.nome);
  $('cvSatT').textContent='Sábado '+sat.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' · Sem. '+w;
  $('cvSat').textContent=team.join(', ')||'ninguém escalado';
}

/* ---------- capa: rolamento animado ---------- */
(function(){
  const cage=$('cage'),inner=$('inner'),N=11,R=161;let h='';
  for(let i=0;i<N;i++){const a=i/N*Math.PI*2;h+='<g transform="translate('+(Math.cos(a)*R).toFixed(1)+' '+(Math.sin(a)*R).toFixed(1)+')"><circle r="31" fill="url(#gBall)" stroke="#6d6f73" stroke-opacity=".35"/><ellipse cx="-9" cy="-11" rx="9" ry="6" fill="#fff" opacity=".85"/></g>';}
  cage.innerHTML='<circle r="'+R+'" fill="none" stroke="#231f20" stroke-opacity=".18" stroke-width="3"/>'+h;
  const phrase='Escala 5x2 • 40 horas • 2 folgas • Cobertura total • Zero contratações • ';
  const tps=document.querySelectorAll('.tp');tps.forEach(t=>t.textContent=phrase.repeat(5));
  let L=0;const measure=()=>{try{const v=tps[0].parentNode.getComputedTextLength()/5;if(v>0&&isFinite(v))L=v;}catch(e){}};
  const stage=$('cvStage'),cards=[...document.querySelectorAll('.cv-card')];
  let speed=1,target=1,angIn=0,angCage=0,off=0,last=performance.now(),mx=0,my=0,px=0,py=0;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.addEventListener('mousemove',e=>{const b=stage.getBoundingClientRect();mx=(e.clientX-b.left)/b.width-.5;my=(e.clientY-b.top)/b.height-.5;target=1+3.2*(1-Math.min(1,Math.hypot(mx,my)*1.6));});
  stage.addEventListener('mouseleave',()=>{target=1;mx=0;my=0;});
  $('cvStage').querySelector('svg').addEventListener('click',()=>{speed+=8;});
  function tick(t){const dt=Math.min(50,t-last)/1000;last=t;
    if(!document.body.classList.contains('on-cover')){requestAnimationFrame(tick);return;}
    if(!L){measure();if(!L){requestAnimationFrame(tick);return;}}
    speed+=(target-speed)*Math.min(1,dt*2.5);
    angIn+=dt*speed*38;angCage+=dt*speed*15;off=(off+dt*speed*45)%L;
    inner.setAttribute('transform','rotate('+angIn.toFixed(2)+')');cage.setAttribute('transform','rotate('+angCage.toFixed(2)+')');
    tps.forEach(tp=>tp.setAttribute('startOffset',(-L+off).toFixed(1)));
    px+=(mx-px)*Math.min(1,dt*5);py+=(my-py)*Math.min(1,dt*5);
    cards.forEach((c,i)=>{const d=+c.dataset.depth;const fl=Math.sin(t/1000*0.9+i*1.7)*5;c.style.transform='translate('+(px*d).toFixed(1)+'px,'+(py*d+fl).toFixed(1)+'px)';});
    requestAnimationFrame(tick);}
  if(reduce){tps.forEach(tp=>tp.setAttribute('startOffset',0));}else requestAnimationFrame(tick);
})();

bindParams();renderAll();calc();route();
})();
