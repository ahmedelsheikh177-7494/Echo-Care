/* ---------- technician ---------- */
function techView(){
  const me=D.me;const to='eng:'+me.id;
  const unread=D.notifs.filter(n=>n.to===to&&!n.read).length;
  let c='';
  if(S.tv==='job')c=tJob(me);else if(S.tv==='report')c=`<div class="pad"><button type="button" class="lnk" data-a="tv" data-v="job" style="align-self:flex-start">→ رجوع للمهمة</button><h1>تقرير الصيانة</h1><span class="k ltr" style="text-align:right">${esc(S.sel)}</span>${reportForm(S.sel)}</div>`;
  else if(S.tv==='notifs')c=`<div class="pad" style="padding-inline:0">${unread?`<button type="button" class="btn gh sm" style="margin:0 16px" data-a="readAll">تحديد الكل كمقروء</button>`:''}<div class="card" style="padding:0;gap:0;margin:0 16px;overflow:hidden">${notifList(to)}</div></div>`;else c=tJobs(me);
  return `<div class="mob"><header class="hdr dk"><img src="assets/logo-light.svg" alt="Echo"><span style="display:flex;align-items:center;gap:8px;font-size:14px">${esc(me.full_name)}<button type="button" class="rb" data-a="logout">خروج</button></span></header><div style="flex:1">${c}</div><nav class="bnav"><button type="button" class="${['jobs','job','report'].includes(S.tv)?'on':''}" data-a="tv" data-v="jobs">مهامي</button><button type="button" class="${S.tv==='notifs'?'on':''}" data-a="tv" data-v="notifs">الإشعارات ${unread?`<span class="badge r" style="margin:0">${unread}</span>`:''}</button></nav></div>`;
}
function tJobs(me){
  const mine=D.reqs.filter(r=>r.engId===me.id&&r.status!=='cancelled');
  const td=today();const active=mine.filter(r=>ACTIVE_TECH.includes(r.status));
  const tday=active.filter(r=>!r.appt||r.appt.slice(0,10)<=td).sort((a,b)=>String(a.appt).localeCompare(String(b.appt)));
  const up=active.filter(r=>r.appt&&r.appt.slice(0,10)>td).sort((a,b)=>String(a.appt).localeCompare(String(b.appt)));
  const done=mine.filter(r=>!ACTIVE_TECH.includes(r.status)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  if(S.ttab==='today'&&!tday.length&&up.length&&!S.ttabTouched)S.ttab='up';
  const L=S.ttab==='up'?up:S.ttab==='done'?done:tday;
  const card=r=>`<button type="button" class="job" data-a="openJob" data-v="${esc(r.id)}" ${r.status==='assigned'?'style="border:2px solid var(--g)"':''}><span style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:8px"><b>${esc(fmtAppt(r.appt))}</b>${r.status==='assigned'?'<span class="chip s-assigned">جديد · مُسند</span>':chip(r.status)}</span><span style="font-size:16px;font-weight:700">${esc(r.customer.name)}</span><span style="font-size:14px;${r.service==='emergency'?'color:var(--c);font-weight:500':''}">${esc(lab(SYS,r.system))} · ${esc(lab(SVC,r.service))}</span><span class="k">${esc(r.gov)} · ${esc(r.area)}</span>${priChip(r.priority)}</button>`;
  return `<div class="pad"><div><span class="k">أهلًا،</span><h1>${esc(me.full_name)}</h1><span class="k">${tday.length?'لديك '+tday.length+' مهمة اليوم':'لا توجد مهام اليوم'}</span></div>
   <div class="seg" role="tablist"><button type="button" class="${S.ttab==='today'?'on':''}" data-a="ttab" data-v="today">اليوم · ${tday.length}</button><button type="button" class="${S.ttab==='up'?'on':''}" data-a="ttab" data-v="up">القادمة · ${up.length}</button><button type="button" class="${S.ttab==='done'?'on':''}" data-a="ttab" data-v="done">المنتهية</button></div>
   ${L.length?L.map(card).join(''):'<div class="empty">لا توجد مهام هنا.</div>'}</div>`;
}
function tJob(me){
  const r=reqById(S.sel);if(!r||r.engId!==me.id)return `<div class="pad"><div class="empty">هذه المهمة لم تعد مسندة إليك.</div><button type="button" class="btn gh" data-a="tv" data-v="jobs">مهامي</button></div>`;
  const c=r.customer;const rep=D.reps[r.id];const hasRep=rep&&!rep.deletedAt;
  const idx=r.status==='in_progress'?4:TECH_STEPS.findIndex(s=>s[0]===r.status);
  const doneSt=['completed','needs_follow','closed'].includes(r.status);const cur=doneSt?5:idx;
  const nx=NEXT[r.status];const last=r.history.slice(-1)[0];
  return `<div class="pad">
   <div style="display:flex;align-items:center;gap:8px"><button type="button" class="lnk" data-a="tv" data-v="jobs">→ مهامي</button><span class="spacer"></span><b class="ltr">${esc(r.id)}</b></div>
   <section class="card hl"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="color:var(--g)">حالة التنفيذ</b><span class="k">${last?esc((ST[last.s]||[last.s])[0])+' · '+esc(fmtDT(last.at)):''}</span></div>
    <div class="steps">${TECH_STEPS.map((s,i)=>`<div class="${i<=cur?'on':''} ${i===cur?'cur':''}"><span></span>${s[1]}</div>`).join('')}</div>
    ${nx?`<button type="button" class="btn" style="min-height:56px;font-size:17px" data-a="techNext" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>${nx[1]}</button>`:''}
    ${r.status==='in_progress'?`<button type="button" class="btn" style="min-height:56px;font-size:17px" data-a="openReport" data-v="${esc(r.id)}">إنهاء الصيانة وكتابة التقرير</button>`:''}
    ${doneSt?`<div class="note">تم إرسال التقرير ${hasRep?esc(ago(rep.submittedAt)):''}.${hasRep&&rep.review!=='reviewed'?' يمكنك تعديله حتى يراجعه المدير.':hasRep?' تمت مراجعته من المدير.':''}</div>${hasRep&&rep.review!=='reviewed'?`<button type="button" class="btn gh" data-a="openReport" data-v="${esc(r.id)}">تعديل التقرير</button>`:''}`:''}</section>
   <section class="card"><div><span class="k">العميل</span><div style="font-size:18px;font-weight:700">${esc(c.name)}</div><span class="ltr">${esc(c.phone)}</span></div><div><span class="k">العنوان</span><div style="line-height:1.7">${esc(r.gov)}، ${esc(r.area)} — ${esc(r.address)}</div></div>
    <div class="grid2"><a class="btn gh" href="tel:${esc(c.phone)}">اتصال</a>${r.map?`<a class="btn gh" href="${esc(safeUrl(r.map))}" target="_blank" rel="noopener">الخريطة</a>`:`<a class="btn gh" href="${esc('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.address+' '+r.area+' '+r.gov))}" target="_blank" rel="noopener">البحث في الخريطة</a>`}</div></section>
   <section class="card"><div class="kv"><div><span class="k">موعد الزيارة</span><b>${esc(fmtAppt(r.appt))}</b></div><div><span class="k">النظام</span><b>${esc(lab(SYS,r.system))}</b></div><div><span class="k">الخدمة</span><span ${r.service==='emergency'?'style="color:var(--c);font-weight:700"':''}>${esc(lab(SVC,r.service))}</span></div><div><span class="k">الأولوية</span>${esc(lab(PRI,r.priority))}</div></div>
    <div><span class="k">وصف المشكلة</span><p style="margin:0;line-height:1.7;white-space:pre-wrap">${esc(r.desc)}</p></div>${r.media.length?`<div class="media">${mediaThumbs(r.media)}</div>`:''}${r.notes?`<div><span class="k">ملاحظات العميل</span><div>${esc(r.notes)}</div></div>`:''}</section>
   ${r.mgrNotes?`<section class="note"><b>ملاحظات الإدارة</b><div style="white-space:pre-wrap">${esc(r.mgrNotes)}</div></section>`:''}
  </div>`;
}
function reportForm(id){
  const ex=D.reps[id];const f='rep_'+id;
  const R=ensure(f,ex&&!ex.deletedAt?{problemType:ex.problemType,problemDesc:ex.problemDesc||'',workDone:ex.workDone||'',engNotes:ex.engNotes||'',partsChanged:!!ex.partsChanged,parts:ex.parts.map(p=>Object.assign({},p)),outcome:ex.outcome,before:ex.before.slice(),after:ex.after.slice()}:{problemType:'',problemDesc:'',workDone:'',engNotes:'',partsChanged:null,parts:[{name:'',qty:'1',notes:''}],outcome:'',before:[],after:[]});
  if(R.partsChanged&&!R.parts.length)R.parts.push({name:'',qty:'1',notes:''});
  const n=(i,t)=>`<span style="display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--g)"><span style="width:22px;height:22px;border-radius:50%;background:var(--g);color:var(--w);font-size:12px;display:inline-flex;align-items:center;justify-content:center">${i}</span>${t}</span>`;
  return `<div style="display:flex;flex-direction:column;gap:20px">
   <div class="fld">${n(1,'نوع المشكلة')}<div style="display:flex;flex-wrap:wrap;gap:8px">${PT.map(p=>`<button type="button" class="tile ${R.problemType===p[0]?'on':''}" style="min-height:42px;border-radius:999px;padding:0 14px;align-items:center" data-a="pick" data-v="${f}.problemType|${p[0]}">${p[1]}</button>`).join('')}</div></div>
   <label class="fld">${n(2,'وصف المشكلة')}${T(f+'.problemDesc','تفاصيل العطل كما وجدته',3)}</label>
   <label class="fld">${n(3,'الأعمال المنفذة')}${T(f+'.workDone','ما تم تنفيذه',3)}</label>
   <label class="fld">${n(4,'ملاحظات وتوصيات فنية')}${T(f+'.engNotes','',2)}</label>
   <div class="fld">${n(5,'هل تم تغيير قطع غيار؟')}<div class="grid2"><button type="button" class="tile ${R.partsChanged===true?'on':''}" style="align-items:center" data-a="partsYN" data-v="${f}|1">نعم</button><button type="button" class="tile ${R.partsChanged===false?'on':''}" style="align-items:center" data-a="partsYN" data-v="${f}|0">لا</button></div>
    ${R.partsChanged?`<div class="card" style="padding:12px;gap:8px">${R.parts.map((p,i)=>`<div class="part"><input id="${fid(f+'.p'+i+'n')}" class="inp" aria-label="اسم القطعة" placeholder="اسم القطعة" data-part="${f}|${i}|name" value="${esc(p.name)}"><input id="${fid(f+'.p'+i+'q')}" class="inp" aria-label="الكمية" type="number" min="1" data-part="${f}|${i}|qty" value="${esc(p.qty)}" style="text-align:center"><button type="button" class="btn gh sm" style="padding:0" data-a="rmPart" data-v="${f}|${i}" aria-label="حذف القطعة">×</button></div><input id="${fid(f+'.p'+i+'x')}" class="inp" aria-label="ملاحظات القطعة" placeholder="ملاحظات إضافية (اختياري)" data-part="${f}|${i}|notes" value="${esc(p.notes||'')}">`).join('')}<button type="button" class="btn gh sm" data-a="addPart" data-v="${f}">+ إضافة قطعة أخرى</button></div>`:''}</div>
   <div class="fld">${n(6,'نتيجة الصيانة')}${OUT.map(o=>`<button type="button" class="radio ${R.outcome===o[0]?'on':''}" data-a="pick" data-v="${f}.outcome|${o[0]}" role="radio" aria-checked="${R.outcome===o[0]}"><span class="dot"></span><span style="display:flex;flex-direction:column"><span>${o[1]}</span><small class="k ltr" style="text-align:right">${o[2]}</small></span></button>`).join('')}
    ${R.outcome&&R.outcome!=='resolved'?'<span class="err">لن يُغلق الطلب. سيصل للمدير لتحديد المتابعة.</span>':''}</div>
   <div class="fld">${n(7,'الصور')}<span class="k">قبل الصيانة</span><div class="media">${mediaThumbs(R.before,f+'.before')}${upBox(f+'.before','إضافة','image/*')}</div><span class="k">بعد الصيانة</span><div class="media">${mediaThumbs(R.after,f+'.after')}${upBox(f+'.after','إضافة','image/*')}</div>${S.uploading?'<span class="k">جاري الرفع…</span>':''}</div>
   ${S.err?`<div class="warn" role="alert">${esc(S.err)}</div>`:''}
   <button type="button" class="btn" style="min-height:60px;flex-direction:column;gap:0" data-a="submitRep" data-v="${esc(id)}" ${S.busy||S.uploading?'disabled':''}><span style="font-size:17px;font-weight:700">${ex&&!ex.deletedAt?'حفظ التعديلات':'إرسال التقرير'}</span><span style="font-size:10px;letter-spacing:.08em;color:var(--s)">SUBMIT SERVICE REPORT</span></button></div>`;
}

