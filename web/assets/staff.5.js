function mEngineers(){
  const pend=D.staff.filter(p=>p.role==='pending');const mgrs=D.staff.filter(p=>p.role==='manager');
  const st=id=>{const R=D.reqs.filter(r=>r.engId===id);const open=R.filter(r=>ACTIVE_TECH.includes(r.status)).length;const td=R.filter(r=>r.appt&&r.appt.slice(0,10)===today()&&r.status!=='cancelled').length;const f=Object.values(D.fbs).filter(x=>x.engId===id&&x.submittedAt);const avg=f.length?(f.reduce((s,x)=>s+avgFb(x),0)/f.length).toFixed(1):'—';return {open,td,avg}};
  const staffLink=SITE+'staff.html';
  return `<h1 style="font-size:26px">المهندسون</h1>
  <section class="card"><h2>إضافة مهندس</h2><span style="line-height:1.7">ابعت للمهندس رابط فريق العمل، ينشئ حسابه بالبريد وكلمة مرور، وبعدها يظهر هنا لتوافق عليه.</span>
   <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b class="ltr" style="font-weight:500">${esc(staffLink)}</b><button type="button" class="btn gh sm" data-a="copy" data-v="${esc(staffLink)}">نسخ الرابط</button><a class="btn gh sm" href="${esc('https://wa.me/?text='+encodeURIComponent('رابط تطبيق ECHO CARE لفريق الصيانة. أنشئ حسابك من هنا: '+staffLink))}" target="_blank" rel="noopener">مشاركة عبر واتساب</a></div></section>
  ${pend.length?`<section class="card hl"><h2>حسابات بانتظار الموافقة (${pend.length})</h2>${pend.map(p=>`<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;border-top:1px solid var(--s20);padding-top:10px"><span style="flex:1 1 220px;display:flex;flex-direction:column"><b style="font-weight:500">${esc(p.full_name||'—')}</b><span class="k"><span class="ltr">${esc(p.email)}</span> · <span class="ltr">${esc(p.phone)}</span> · ${esc(ago(p.created_at))}</span></span><button type="button" class="btn sm" data-a="approve" data-v="${esc(p.id)}|technician" ${S.busy?'disabled':''}>موافقة كمهندس صيانة</button><button type="button" class="btn gh sm" data-a="approve" data-v="${esc(p.id)}|manager" ${S.busy?'disabled':''}>موافقة كمدير صيانة</button></div>`).join('')}<span class="k">لو مش عارف صاحب الحساب، ما توافقش عليه. الحساب غير الموافق عليه ما بيشوفش أي بيانات.</span></section>`:''}
  ${D.engs.length?`<div class="tbl"><table><thead><tr><th>المهندس</th><th>الموبايل</th><th>البريد</th><th>زيارات اليوم</th><th>مهام مفتوحة</th><th>متوسط التقييم</th><th>الحالة</th><th></th></tr></thead><tbody>${D.engs.map(e=>{const s=st(e.id);return `<tr ${e.active?'':'style="color:var(--m)"'}><td style="font-weight:500">${esc(e.name)}</td><td><span class="ltr">${esc(e.phone)}</span></td><td><span class="ltr">${esc(e.email)}</span></td><td>${s.td}</td><td>${s.open}</td><td>${s.avg}</td><td><span class="chip ${e.active?'s-confirmed':'s-cancel'}">${e.active?'نشط':'معطّل'}</span></td><td><button type="button" class="lnk" data-a="toggleEng" data-v="${esc(e.id)}" ${e.active?'style="color:var(--c)"':''}>${e.active?'تعطيل':'تفعيل'}</button></td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">لا يوجد مهندسون بعد.</div>`}
  <section class="card"><h2>مديرو الصيانة</h2>${mgrs.map(p=>`<div style="display:flex;gap:10px;align-items:center"><span style="flex:1">${esc(p.full_name||p.email)} <span class="k ltr">${esc(p.email)}</span></span><span class="chip ${p.is_active?'s-confirmed':'s-cancel'}">${p.is_active?'نشط':'معطّل'}</span>${p.id!==D.me.id?`<button type="button" class="lnk" data-a="toggleMgr" data-v="${esc(p.id)}">${p.is_active?'تعطيل':'تفعيل'}</button>`:''}</div>`).join('')}</section>`;
}
function mAnalytics(){
  const F=ensure('an',{p:'30',from:'',to:''});
  let from=null,to=null;
  if(F.p==='custom'){from=F.from||null;to=F.to||null}else if(F.p!=='all'){const d=new Date();d.setDate(d.getDate()-parseInt(F.p,10));from=localDate(d)}
  const R=D.reqs.filter(r=>{const d=toLocalStr(r.createdAt).slice(0,10);return (!from||d>=from)&&(!to||d<=to)});
  const done=R.filter(r=>['completed','closed'].includes(r.status));
  const pending=R.filter(r=>!['completed','closed','cancelled'].includes(r.status));
  const durs=R.map(r=>{const p=D.reps[r.id];return p&&!p.deletedAt&&p.submittedAt?(new Date(p.submittedAt)-new Date(r.createdAt)):null}).filter(x=>x!=null&&x>=0);
  const avgMs=durs.length?durs.reduce((a,b)=>a+b,0)/durs.length:null;
  const avgTxt=avgMs==null?'—':avgMs<36e5*24?(avgMs/36e5).toFixed(1)+' ساعة':(avgMs/864e5).toFixed(1)+' يوم';
  const byEng=D.engs.map(e=>{const n=R.filter(r=>r.engId===e.id).length;const f=R.map(r=>D.fbs[r.id]).filter(x=>x&&x.submittedAt&&x.engId===e.id);const avg=f.length?(f.reduce((s,x)=>s+avgFb(x),0)/f.length):null;return {name:e.name,n,avg,c:f.length}}).sort((a,b)=>b.n-a.n);
  const tally=fn=>{const m={};R.forEach(r=>{const k=fn(r);if(k)m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,6)};
  const areas=tally(r=>(r.gov||'')+(r.area?' · '+r.area:'')), svcs=tally(r=>lab(SVC,r.service)), syss=tally(r=>lab(SYS,r.system));
  const bars=(arr,color)=>{const mx=Math.max(1,...arr.map(x=>x[1]));return arr.length?arr.map(([k,n])=>`<div class="bar"><span>${esc(k)}</span><div class="trk"><i style="width:${Math.round(n/mx*100)}%;background:${color||'var(--g)'}"></i></div><b style="text-align:left">${n}</b></div>`).join(''):'<span class="k">لا توجد بيانات في هذه الفترة.</span>'};
  const mxE=Math.max(1,...byEng.map(x=>x.n));
  return `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between"><h1 style="font-size:26px">التحليلات</h1>
   <div class="seg" role="radiogroup" aria-label="الفترة">${[['7','آخر 7 أيام'],['30','آخر 30 يومًا'],['90','آخر 3 شهور'],['all','الكل'],['custom','فترة مخصصة']].map(([v,l])=>`<button type="button" class="${F.p===v?'on':''}" data-a="anP" data-v="${v}">${l}</button>`).join('')}</div></div>
  ${F.p==='custom'?`<div class="filters" style="max-width:420px"><label>من${I('an.from',{type:'date'})}</label><label>إلى${I('an.to',{type:'date'})}</label></div>`:''}
  <div class="kpis"><div class="kpi" style="cursor:default"><span class="k">إجمالي الطلبات</span><b>${R.length}</b></div><div class="kpi" style="cursor:default"><span class="k">طلبات منفذة</span><b>${done.length}</b></div><div class="kpi" style="cursor:default"><span class="k">طلبات معلقة</span><b>${pending.length}</b></div><div class="kpi dk" style="cursor:default"><span class="k">متوسط وقت التنفيذ</span><b style="font-size:22px">${avgTxt}</b><span style="font-size:11px;color:var(--s40)">من إنشاء الطلب حتى التقرير</span></div></div>
  <div class="row">
   <section class="card" style="flex:1 1 420px"><h2>الطلبات والتقييم لكل مهندس</h2>${byEng.length?`<div class="tbl" style="border:0"><table><thead><tr><th>المهندس</th><th style="width:45%">عدد الطلبات</th><th>متوسط التقييم</th></tr></thead><tbody>${byEng.map(e=>`<tr><td style="font-weight:500">${esc(e.name)}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="trk" style="flex:1"><i style="width:${Math.round(e.n/mxE*100)}%"></i></div><b>${e.n}</b></div></td><td>${e.avg==null?'—':'<b>'+e.avg.toFixed(1)+'</b> <span class="k">/ 5 · '+e.c+' تقييم</span>'}</td></tr>`).join('')}</tbody></table></div>`:'<span class="k">لا يوجد مهندسون.</span>'}</section>
   <section class="card" style="flex:1 1 420px"><h2>أكثر المناطق طلبًا للصيانة</h2>${bars(areas,'var(--s)')}</section>
   <section class="card" style="flex:1 1 420px"><h2>أكثر أنواع الصيانة طلبًا</h2>${bars(svcs)}</section>
   <section class="card" style="flex:1 1 420px"><h2>أكثر الأنظمة طلبًا</h2>${bars(syss,'var(--g40)')}</section></div>`;
}
function notifList(to){
  const L=D.notifs.filter(n=>n.to===to);
  return L.length?L.map(n=>`<button type="button" class="notif ${n.read?'':'unread'}" data-a="openNotif" data-v="${esc(n.id)}"><span class="d" style="${n.read?'background:transparent':''}"></span><span style="flex:1;display:flex;flex-direction:column;gap:2px;line-height:1.6"><span>${esc(n.text)}</span><span class="k">${esc(ago(n.at))}</span></span></button>`).join(''):'<div class="empty" style="margin:12px">لا توجد إشعارات.</div>';
}
function mNotifs(){
  const un=D.notifs.filter(n=>n.to==='manager'&&!n.read).length;
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h1 style="font-size:26px">الإشعارات</h1>${un?`<button type="button" class="btn gh sm" data-a="readAll">تحديد الكل كمقروء</button>`:''}</div><section class="card" style="padding:0;gap:0;overflow:hidden">${notifList('manager')}</section>`;
}

