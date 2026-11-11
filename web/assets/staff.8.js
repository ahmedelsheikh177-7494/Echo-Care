/* ---------- events ---------- */
app.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const a=el.dataset.a;if(!ACT[a]||el.tagName==='A')return;e.preventDefault();ACT[a](el.dataset.v,el,e)});
app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.tagName==='TR'&&e.target.dataset.a){e.preventDefault();ACT[e.target.dataset.a](e.target.dataset.v)}});
function onInput(e){const t=e.target;
  if(t.dataset.k){const path=t.dataset.k;const i=path.indexOf('.');getD(path.slice(0,i))[path.slice(i+1)]=t.value;if(path.startsWith('flt.')||path.startsWith('cs.')||path.startsWith('an.'))render()}
  else if(t.dataset.part){const [f,i,k]=t.dataset.part.split('|');const R=getD(f);if(R.parts&&R.parts[+i])R.parts[+i][k]=t.value}}
app.addEventListener('input',onInput);
app.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.up&&t.files&&t.files.length){const path=t.dataset.up;const k=path.indexOf('.');const f=path.slice(0,k),key=path.slice(k+1);const d=getD(f);d[key]=d[key]||[];
    const r=reqById(f.replace(/^rep_/,''));if(!r)return;S.uploading=true;render();
    try{const notes=await uploadMedia('reports/'+r.uuid+'/',t.files,d[key],render);if(notes.length)toast(notes[0])}catch(err){toast(errMsg(err))}S.uploading=false;render();return}
  if(t.tagName==='SELECT')onInput(e)});
window.addEventListener('online',()=>{S.offline=false;render();if(D.session)refresh()});
window.addEventListener('offline',()=>{S.offline=true;render()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&D.session)refresh()});

async function start(){
  D.session=undefined;render();
  if(!sb){D.session=null;render();return}
  const {data}=await sb.auth.getSession();D.session=data.session||null;render();
  if(D.session){await refresh();subscribe()}
  sb.auth.onAuthStateChange((ev,session)=>{const had=!!D.session;D.session=session||null;if(session&&!had){D.loaded=false;render();refresh().then(subscribe)}else if(!session){D.loaded=false;render()}});
}
introSplash(()=>{const h=document.querySelector('#app .sauth');if(h)h.classList.add('reveal')});
start();

