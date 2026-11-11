function reportCard(rep,r,ctx){
  const parts=rep.partsChanged?(rep.parts||[]):[];const edits=rep.edits||[];
  return `<section class="card" style="${rep.outcome==='resolved'?'':'border:2px solid var(--c)'}">
   <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><h2 style="flex:1">تقرير الصيانة</h2>${outChip(rep.outcome)}<span class="chip ${rep.review==='reviewed'?'s-cancel':'s-new'}">${rep.review==='reviewed'?'Reviewed · تمت المراجعة':'بانتظار المراجعة'}</span></div>
   <div class="kv"><div><span class="k">المهندس</span>${esc(engName(rep.engId))}</div><div><span class="k">وقت الإرسال</span>${esc(fmtDT(rep.submittedAt))}</div><div><span class="k">نوع المشكلة</span>${esc(lab(PT,rep.problemType))}</div><div><span class="k">نتيجة الصيانة</span>${esc(lab(OUT,rep.outcome))}</div></div>
   <div><span class="k">وصف المشكلة</span><p style="margin:0;line-height:1.8;white-space:pre-wrap">${esc(rep.problemDesc||'—')}</p></div>
   <div><span class="k">الأعمال المنفذة</span><p style="margin:0;line-height:1.8;white-space:pre-wrap">${esc(rep.workDone||'—')}</p></div>
   <div><span class="k">ملاحظات وتوصيات المهندس</span><p style="margin:0;line-height:1.8;white-space:pre-wrap">${esc(rep.engNotes||'—')}</p></div>
   <div><span class="k">قطع الغيار</span>${parts.length?`<div class="tbl" style="margin-top:4px"><table><thead><tr><th>القطعة</th><th>الكمية</th><th>ملاحظات</th></tr></thead><tbody>${parts.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.qty)}</td><td>${esc(p.notes||'—')}</td></tr>`).join('')}</tbody></table></div>`:'<div>لم يتم تغيير قطع غيار.</div>'}</div>
   ${rep.before.length||rep.after.length?`<div class="row"><div><span class="k">قبل الصيانة</span><div class="media">${mediaThumbs(rep.before)||'<span class="k">—</span>'}</div></div><div><span class="k">بعد الصيانة</span><div class="media">${mediaThumbs(rep.after)||'<span class="k">—</span>'}</div></div></div>`:''}
   ${ctx==='manager'?`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${rep.review!=='reviewed'?`<button type="button" class="btn" data-a="reviewRep" data-v="${esc(rep.id)}" ${S.busy?'disabled':''}>تمت المراجعة · Reviewed</button>`:''}<button type="button" class="btn gh sm" data-a="mEditRep" data-v="${esc(rep.id)}">تعديل التقرير</button><button type="button" class="btn gh dn sm" data-a="delRep" data-v="${esc(rep.id)}" ${S.busy?'disabled':''}>حذف التقرير</button><button type="button" class="btn gh sm" data-a="print">طباعة</button>${S.confirmDel===rep.id?`<span class="err">اضغط «حذف التقرير» مرة أخرى للتأكيد.</span>`:''}</div>`:''}
   ${edits.length?`<details><summary class="k" style="cursor:pointer">سجل التعديلات (${edits.length})</summary><div class="tl" style="margin-top:8px">${edits.slice().reverse().map(e=>`<div><i style="background:var(--s)"></i><span class="grow">${esc(e.by)} عدّل: ${esc((e.changed||[]).join('، ')||'—')}</span><span class="k">${esc(fmtDT(e.at))}</span></div>`).join('')}</div></details>`:''}
  </section>`;
}
function mReports(){
  const all=Object.values(D.reps).filter(x=>!x.deletedAt).sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const pend=all.filter(x=>x.review!=='reviewed'), done=all.filter(x=>x.review==='reviewed');
  if(S.mEdit){return `<button type="button" class="lnk" data-a="cancelEdit" style="align-self:flex-start">→ رجوع</button><h1>تعديل التقرير <span class="ltr">${esc(S.mEdit)}</span></h1><div style="max-width:560px">${reportForm(S.mEdit)}</div>`}
  const sel=S.selRep&&D.reps[S.selRep]&&!D.reps[S.selRep].deletedAt?D.reps[S.selRep]:pend[0]||done[0];
  const item=x=>{const r=reqById(x.id)||{customer:{}};return `<button type="button" class="list-item" data-a="selRep" data-v="${esc(x.id)}" style="padding:12px;border-radius:12px;${sel&&sel.id===x.id?'background:var(--g20)':''}"><span style="flex:1;display:flex;flex-direction:column;gap:2px"><b class="ltr" style="text-align:right">${esc(x.id)}</b><span style="font-size:14px">${esc(r.customer.name)} · ${esc(engName(x.engId))}</span><span class="k">${esc(ago(x.submittedAt))}</span></span>${outChip(x.outcome)}</button>`};
  if(!all.length)return `<h1 style="font-size:26px">تقارير الصيانة</h1><div class="empty">لا توجد تقارير بعد. تظهر هنا فور إرسال المهندس لتقريره.</div>`;
  const r=sel?reqById(sel.id):null;
  return `<h1 style="font-size:26px">تقارير الصيانة</h1><div class="row">
   <aside class="card" style="flex:1 1 280px;max-width:380px;padding:10px;gap:0"><span class="k" style="padding:6px">بانتظار المراجعة (${pend.length})</span>${pend.map(item).join('')}<span class="k" style="padding:14px 6px 6px">تمت مراجعتها (${done.length})</span>${done.map(item).join('')}</aside>
   <div class="col" style="flex:3 1 480px">${sel&&r?`<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span>الطلب <button type="button" class="lnk" data-a="openReq" data-v="${esc(r.id)}">${esc(r.id)}</button> · ${esc(r.customer.name)}</span>${chip(r.status)}</div>${r.status==='needs_follow'?`<div class="warn">النتيجة «${esc(lab(OUT,sel.outcome))}» — لم يُغلق الطلب تلقائيًا. افتح الطلب لإنشاء زيارة متابعة.</div>`:''}${reportCard(sel,r,'manager')}`:''}</div></div>`;
}
function customersIndex(){
  const m={};D.reqs.forEach(r=>{const p=r.customer.phone;if(!p)return;(m[p]=m[p]||{phone:p,name:r.customer.name,email:r.customer.email,area:r.area,gov:r.gov,reqs:[]}).reqs.push(r)});
  return Object.values(m).sort((a,b)=>String(b.reqs[0].createdAt).localeCompare(String(a.reqs[0].createdAt)));
}
function mCustomers(){
  const list=customersIndex();
  if(S.selCust){const c=list.find(x=>x.phone===S.selCust);if(c)return mCustomer(c)}
  const F=ensure('cs',{q:''});const q=toLatinDigits(F.q).trim().toLowerCase();
  const L=list.filter(c=>!q||(c.name+' '+c.phone).toLowerCase().includes(q));
  return `<h1 style="font-size:26px">العملاء</h1><label class="fld" style="max-width:420px">بحث${I('cs.q',{type:'search',ph:'الاسم أو رقم الموبايل'})}</label>
  ${L.length?`<div class="tbl"><table><thead><tr><th>العميل</th><th>الموبايل</th><th>المنطقة</th><th>عدد الطلبات</th><th>آخر طلب</th></tr></thead><tbody>${L.map(c=>`<tr class="click" data-a="openCust" data-v="${esc(c.phone)}" tabindex="0"><td style="font-weight:500">${esc(c.name)}</td><td><span class="ltr">${esc(c.phone)}</span></td><td>${esc(c.gov)} · ${esc(c.area)}</td><td>${c.reqs.length}</td><td>${esc(fmtDT(c.reqs[0].createdAt))}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">لا يوجد عملاء بعد.</div>`}`;
}
const avgFb=f=>(f.q+f.p+f.pr+f.o)/4;
function mCustomer(c){
  const reqs=c.reqs;const parts=reqs.reduce((n,r)=>{const p=D.reps[r.id];return n+(p&&!p.deletedAt&&p.partsChanged?(p.parts||[]).length:0)},0);
  const fbs=reqs.map(r=>D.fbs[r.id]).filter(f=>f&&f.submittedAt);const avg=fbs.length?(fbs.reduce((s,f)=>s+avgFb(f),0)/fbs.length).toFixed(1):'—';
  const last=reqs.map(r=>r.appt).filter(Boolean).sort().pop();
  return `<button type="button" class="lnk" data-a="custList" style="align-self:flex-start">→ كل العملاء</button>
  <section class="card" style="background:var(--g);color:var(--w);border:0;flex-direction:row;flex-wrap:wrap;align-items:center;gap:16px"><span style="width:56px;height:56px;border-radius:50%;background:var(--s);color:var(--b);font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center">${esc((c.name||'?').trim()[0]||'?')}</span><div style="flex:1 1 220px;display:flex;flex-direction:column;gap:4px"><b style="font-size:20px">${esc(c.name)}</b><span style="color:var(--s40)"><span class="ltr">${esc(c.phone)}</span> · ${esc(c.gov)}، ${esc(c.area)}${c.email?' · '+esc(c.email):''}</span></div><a class="btn gh sm" href="tel:${esc(c.phone)}">اتصال</a></section>
  <div class="kpis"><div class="kpi" style="cursor:default"><span class="k">إجمالي الطلبات</span><b>${reqs.length}</b></div><div class="kpi" style="cursor:default"><span class="k">آخر زيارة</span><b style="font-size:16px">${esc(last?fmtAppt(last):'—')}</b></div><div class="kpi" style="cursor:default"><span class="k">قطع غيار مستبدلة</span><b>${parts}</b></div><div class="kpi" style="cursor:default"><span class="k">متوسط تقييمه</span><b>${avg}</b></div></div>
  <h2>سجل الصيانة</h2>
  ${reqs.map(r=>{const p=D.reps[r.id];const rp=p&&!p.deletedAt?p:null;const f=D.fbs[r.id];return `<section class="card"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><button type="button" class="lnk" data-a="openReq" data-v="${esc(r.id)}" style="font-weight:700;font-size:15px">${esc(r.id)}</button><span class="k">${esc(fmtAppt(r.appt||r.createdAt))} · ${esc(lab(SYS,r.system))} · ${esc(lab(SVC,r.service))}</span><span class="spacer"></span>${chip(r.status)}</div>
   <div class="kv"><div><span class="k">المهندس</span>${esc(r.engId?engName(r.engId):'—')}</div><div><span class="k">العطل</span>${rp?esc(lab(PT,rp.problemType))+' · '+esc(lab(OUT,rp.outcome)):'—'}</div><div><span class="k">قطع الغيار</span>${rp&&rp.partsChanged&&rp.parts.length?rp.parts.map(x=>esc(x.name)+' × '+esc(x.qty)).join('، '):'—'}</div><div><span class="k">التقييم</span>${f&&f.submittedAt?'★'.repeat(Math.round(avgFb(f)))+' '+avgFb(f).toFixed(1):'—'}</div></div></section>`}).join('')}`;
}
