function topbar(){return `<div class="topbar"><span class="lab">ECHO CARE</span><span class="who"><span>${esc(D.me.full_name||D.me.email)} · ${isMgr()?'مدير الصيانة':'مهندس الصيانة'}</span><button type="button" class="rb" data-a="logout">خروج</button></span></div>`}

/* ---------- manager ---------- */
function managerView(){
  const unread=D.notifs.filter(n=>n.to==='manager'&&!n.read).length;
  const newC=D.reqs.filter(r=>r.status==='new').length;
  const repC=Object.values(D.reps).filter(r=>!r.deletedAt&&r.review!=='reviewed').length;
  const readyC=D.reqs.filter(r=>isReady(r)).length;
  const pendC=D.staff.filter(p=>p.role==='pending').length;
  const items=[['dash','اللوحة الرئيسية'],['reqs','الطلبات',newC],['assign','توزيع المهام',readyC],['reports','تقارير الصيانة',repC],['customers','العملاء'],['engineers','المهندسون',pendC,true],['analytics','التحليلات'],['notifs','الإشعارات',unread,true]];
  const nav=items.map(([k,l,c,red])=>`<button type="button" class="nav ${S.mv===k||(S.mv==='req'&&k==='reqs')?'on':''}" data-a="mv" data-v="${k}">${l}${c?`<span class="badge ${red?'r':''}">${c}</span>`:''}</button>`).join('');
  let c='';
  switch(S.mv){case 'reqs':c=mReqs();break;case 'assign':c=mAssign();break;case 'req':c=mReq();break;case 'reports':c=mReports();break;case 'customers':c=mCustomers();break;case 'engineers':c=mEngineers();break;case 'analytics':c=mAnalytics();break;case 'notifs':c=mNotifs();break;default:c=mDash()}
  return topbar()+`<div class="shell"><nav class="side" aria-label="القائمة"><img src="assets/logo-light.svg" alt="Echo"><span class="tag">ECHO CARE · Smart Maintenance Management</span>${nav}</nav><main class="main">${c}</main></div>`;
}
const isReady=r=>r.status==='confirmed'||(r.status==='pending'&&!r.changeReq);
function inGroup(r,g){return (GROUPS[g]||[]).includes(r.status)}
function outChip(o){const ok=o==='resolved';return `<span class="chip ${ok?'s-done':'s-follow'}">${esc(lab(OUT,o))}</span>`}
function mDash(){
  const R=D.reqs;const cnt=g=>R.filter(r=>inGroup(r,g)).length;
  const k=[['all','إجمالي الطلبات',R.length,true],['new','طلبات جديدة',cnt('new')],['pending','بانتظار التأكيد',cnt('pending')],['confirmed','مؤكدة',cnt('confirmed')],['assigned','مُسندة',cnt('assigned')],['inprog','قيد التنفيذ',cnt('inprog')],['done','مكتملة',cnt('done')],['cancelled','ملغاة',cnt('cancelled')]];
  const news=R.filter(r=>r.status==='new').slice(0,6);
  const reps=Object.values(D.reps).filter(x=>!x.deletedAt&&x.review!=='reviewed').sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const td=today();const visits=R.filter(r=>r.appt&&r.appt.slice(0,10)===td&&r.status!=='cancelled').sort((a,b)=>a.appt.localeCompare(b.appt));
  const follow=R.filter(r=>r.status==='needs_follow');const chg=R.filter(r=>r.changeReq&&r.status==='pending');const ready=R.filter(isReady).length;
  const pend=D.staff.filter(p=>p.role==='pending');
  return `<h1 style="font-size:26px">اللوحة الرئيسية</h1>
  ${!D.engs.some(e=>e.active)?`<div class="note">لا يوجد مهندسون نشطون بعد. ابعت لكل مهندس رابط فريق العمل ليُنشئ حسابه، ثم وافق عليه من صفحة <button type="button" class="lnk" data-a="mv" data-v="engineers">المهندسون</button>.</div>`:''}
  ${pend.length?`<div class="card hl" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px"><b style="flex:1">${pend.length} حساب جديد بانتظار موافقتك</b><button type="button" class="btn sm" data-a="mv" data-v="engineers">مراجعة الحسابات</button></div>`:''}
  ${ready?`<div class="card hl" style="flex-direction:row;flex-wrap:wrap;align-items:center;gap:12px"><b style="flex:1">${ready} طلب جاهز للتوزيع على المهندسين</b><button type="button" class="btn sm" data-a="mv" data-v="assign">توزيع المهام</button></div>`:''}
  ${chg.length?`<section class="card" style="border:2px solid var(--c)"><h2 style="color:var(--c)">طلبات تغيير موعد من العملاء (${chg.length})</h2>${chg.map(r=>`<button type="button" class="list-item" data-a="openReq" data-v="${esc(r.id)}"><span style="flex:1;display:flex;flex-direction:column"><b style="font-weight:500">${esc(r.customer.name)} · <span class="ltr">${esc(r.id)}</span></b><span class="k">الموعد المطلوب: ${esc(fmtD(r.changeReq.date))} · ${esc(lab(SLOT,r.changeReq.slot))}</span></span><span class="chip s-follow">تغيير موعد</span></button>`).join('')}</section>`:''}
  <section class="kpis" aria-label="المؤشرات">${k.map(([g,l,n,dk])=>`<button type="button" class="kpi ${dk?'dk':''}" data-a="kpi" data-v="${g}"><span class="k">${l}</span><b>${n}</b></button>`).join('')}</section>
  <div class="row">
   <section class="card" style="flex:3 1 380px"><h2>طلبات جديدة تحتاج مراجعة</h2>${news.length?news.map(r=>`<button type="button" class="list-item" data-a="openReq" data-v="${esc(r.id)}"><span style="width:4px;height:40px;border-radius:2px;background:${r.priority==='urgent'?'var(--c)':'var(--s)'}"></span><span style="flex:1;display:flex;flex-direction:column"><b style="font-weight:500">${esc(r.customer.name)} · ${esc(lab(SVC,r.service))}</b><span class="k">${esc(lab(SYS,r.system))} · ${esc(r.area)} · ${esc(ago(r.createdAt))}</span></span>${priChip(r.priority)}${chip(r.status)}</button>`).join(''):'<span class="k">لا توجد طلبات جديدة.</span>'}</section>
   <section class="card" style="flex:2 1 300px"><h2>تقارير بانتظار المراجعة</h2>${reps.length?reps.map(x=>{const r=reqById(x.id)||{customer:{}};return `<button type="button" class="list-item" data-a="openRep" data-v="${esc(x.id)}"><span style="flex:1;display:flex;flex-direction:column"><b class="ltr" style="font-weight:500;text-align:right">${esc(x.id)}</b><span class="k">${esc(r.customer.name)} · ${esc(engName(x.engId))} · ${esc(ago(x.submittedAt))}</span></span>${outChip(x.outcome)}</button>`}).join(''):'<span class="k">لا توجد تقارير جديدة.</span>'}
   ${follow.length?`<h2 style="margin-top:8px;color:var(--c)">تحتاج متابعة (${follow.length})</h2>${follow.map(r=>`<button type="button" class="list-item" data-a="openReq" data-v="${esc(r.id)}"><span style="flex:1"><b class="ltr">${esc(r.id)}</b> · ${esc(r.customer.name)}</span>${chip(r.status)}</button>`).join('')}`:''}</section>
  </div>
  <section class="card"><h2>زيارات اليوم</h2>${visits.length?visits.map(r=>`<button type="button" class="list-item" data-a="openReq" data-v="${esc(r.id)}"><b class="ltr" style="width:60px">${esc(r.appt.slice(11,16))}</b><span style="flex:1;display:flex;flex-direction:column"><span style="font-weight:500">${esc(r.customer.name)} · ${esc(r.area)}</span><span class="k">${esc(r.engId?engName(r.engId):'لم يُسند بعد')}</span></span>${chip(r.status)}</button>`).join(''):'<span class="k">لا توجد زيارات اليوم.</span>'}</section>`;
}
function mAssign(){
  const engs=D.engs.filter(e=>e.active);
  const pr={urgent:0,high:1,normal:2};
  const ready=D.reqs.filter(isReady).sort((a,b)=>(pr[a.priority]-pr[b.priority])||String(a.appt).localeCompare(String(b.appt)));
  const newC=D.reqs.filter(r=>r.status==='new').length;
  const dayLoad=(id,day)=>D.reqs.filter(x=>x.engId===id&&x.appt&&x.appt.slice(0,10)===day&&ACTIVE_TECH.includes(x.status)).length;
  const engOpts=r=>engs.map(e=>[e.id,e.name+' — '+dayLoad(e.id,(r.appt||'').slice(0,10)||today())+' زيارة في نفس اليوم']);
  const readyRow=r=>{ensure('as_'+r.id,{eng:'',notes:r.mgrNotes||''});return `<div class="card" style="gap:10px;${r.priority==='urgent'?'border:2px solid var(--c)':''}">
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button type="button" class="lnk" data-a="openReq" data-v="${esc(r.id)}" style="font-weight:700;font-size:15px">${esc(r.id)}</button><b style="font-weight:500">${esc(r.customer.name)}</b><span class="k">${esc(r.gov)} · ${esc(r.area)} · ${esc(lab(SYS,r.system))} · <span ${r.service==='emergency'?'style="color:var(--c);font-weight:700"':''}>${esc(lab(SVC,r.service))}</span></span><span class="spacer"></span>${priChip(r.priority)}${chip(r.status)}</div>
    <div class="k" style="font-size:13px">الموعد: <b style="color:var(--b)">${esc(fmtAppt(r.appt))}</b> · السعر: <b style="color:var(--b)">${r.price!=null?esc(r.price)+' ج.م':'—'}</b></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;align-items:end">
     <label class="fld">المهندس${SEL('as_'+r.id+'.eng',engOpts(r),{blank:'اختر المهندس'})}</label>
     <label class="fld"><span>ملاحظات للمهندس <span class="opt">(اختياري)</span></span>${I('as_'+r.id+'.notes',{ph:'تظهر له في تفاصيل المهمة'})}</label>
     <button type="button" class="btn" data-a="assignQuick" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>${r.status==='pending'?'تأكيد وإسناد':'إسناد للمهندس'}</button></div>
    ${r.status==='pending'?'<span class="k">«تأكيد وإسناد» يعني إن العميل وافق على السعر والموعد بالتليفون.</span>':''}</div>`};
  const board=e=>{const jobs=D.reqs.filter(r=>r.engId===e.id&&ACTIVE_TECH.includes(r.status)).sort((a,b)=>String(a.appt).localeCompare(String(b.appt)));
    return `<section class="card" style="flex:1 1 280px;gap:8px"><div style="display:flex;align-items:center;gap:8px"><h2 style="flex:1">${esc(e.name)}</h2><span class="chip s-confirmed">${dayLoad(e.id,today())} اليوم</span><span class="chip s-new">${jobs.length} مفتوحة</span></div>
     ${jobs.length?jobs.map(r=>{ensure('mv_'+r.id,{eng:''});const can=REASSIGNABLE.includes(r.status);return `<div style="border-top:1px solid var(--s20);padding-top:8px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="lnk" data-a="openReq" data-v="${esc(r.id)}" style="font-weight:700">${esc(r.id)}</button><span style="font-size:14px">${esc(r.customer.name)}</span><span class="spacer"></span>${chip(r.status)}</div>
      <span class="k">${esc(fmtAppt(r.appt))} · ${esc(r.area)}</span>
      ${can&&engs.length>1?`<div style="display:flex;gap:6px">${SEL('mv_'+r.id+'.eng',engs.filter(x=>x.id!==e.id).map(x=>[x.id,x.name]),{blank:'تحويل إلى…',extra:'style="height:38px;font-size:13px"'})}<button type="button" class="btn gh sm" data-a="moveJob" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>تحويل</button></div>`:''}</div>`}).join(''):'<span class="k">لا توجد مهام مفتوحة.</span>'}</section>`};
  return `<h1 style="font-size:26px">توزيع المهام</h1>
  ${!engs.length?`<div class="note">لا يوجد مهندسون نشطون. وافق على حساباتهم من صفحة <button type="button" class="lnk" data-a="mv" data-v="engineers">المهندسون</button>.</div>`:''}
  ${newC?`<div class="note">${newC} طلب جديد يحتاج تحديد السعر والموعد قبل التوزيع. <button type="button" class="lnk" data-a="kpi" data-v="new">عرضها</button></div>`:''}
  <h2>طلبات جاهزة للإسناد (${ready.length})</h2>
  ${ready.length?ready.map(readyRow).join(''):'<div class="empty">لا توجد طلبات جاهزة للإسناد الآن.</div>'}
  <h2 style="margin-top:8px">مهام كل مهندس</h2>
  <div class="row">${engs.map(board).join('')||'<span class="k">—</span>'}</div>`;
}
