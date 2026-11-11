app.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el||el.disabled)return;const a=el.dataset.a;if(!ACT[a]||el.tagName==='A')return;e.preventDefault();ACT[a](el.dataset.v,el,e)});
app.addEventListener('input',e=>{const t=e.target;if(t.dataset.k){const p=t.dataset.k;const i=p.indexOf('.');getD(p.slice(0,i))[p.slice(i+1)]=t.value}});
app.addEventListener('change',async e=>{const t=e.target;
  if(t.dataset.k){const p=t.dataset.k;const i=p.indexOf('.');getD(p.slice(0,i))[p.slice(i+1)]=t.value}
  if(t.dataset.up&&t.files&&t.files.length){const path=t.dataset.up;const k=path.indexOf('.');const d=getD(path.slice(0,k));d[path.slice(k+1)]=d[path.slice(k+1)]||[];
    S.uploading=true;render();try{const notes=await uploadMedia('incoming/'+S.folder+'/',t.files,d[path.slice(k+1)],render);if(notes.length)toast(notes[0])}catch(err){toast(errMsg(err))}S.uploading=false;render()}});
let poll=null;
function route(){const h=location.hash.slice(1);clearInterval(poll);S.err='';S.chg=false;if(h){S.trkOpen=false;document.body.style.overflow=''}
  if(h.startsWith('track-')){S.cv='track';S.tok=h.slice(6);S.track=null;S.loading=true;loadTrack();poll=setInterval(()=>{if(!document.hidden&&!S.busy&&!S.chg)loadTrack()},30000)}
  else if(h.startsWith('rate-')){S.cv='rate';S.tok=h.slice(5);S.fb=null;S.loading=true;loadRate()}
  else if(S.cv==='track'||S.cv==='rate')S.cv='home';
  render();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.cv==='track')loadTrack()});
introSplash(()=>{const h=document.querySelector('#app .chero');if(h)h.classList.add('reveal')});
route();

