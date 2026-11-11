function mReqs(){
  const F=ensure('flt',{q:'',from:'',to:'',area:'',service:'',eng:'',st:''});
  const areas=[...new Set(D.reqs.map(r=>r.area).filter(Boolean))].sort();
  const q=toLatinDigits(F.q).trim().toLowerCase();
  const R=D.reqs.filter(r=>{
    if(F.st&&!inGroup(r,F.st))return false;if(F.area&&r.area!==F.area)return false;if(F.service&&r.service!==F.service)return false;if(F.eng&&r.engId!==F.eng)return false;
    const d=toLocalStr(r.createdAt).slice(0,10);if(F.from&&d<F.from)return false;if(F.to&&d>F.to)return false;
    if(q){const hay=[r.id,r.customer.name,r.customer.phone].join(' ').toLowerCase();if(!hay.includes(q))return false}
    return true});
  const tabs=[['','الكل',D.reqs.length]].concat(Object.keys(GROUPS).map(g=>[g,GROUP_LABEL[g],D.reqs.filter(r=>inGroup(r,g)).length]));
  return `<h1 style="font-size:26px">الطلبات</h1>
  <div class="seg" role="tablist">${tabs.map(([g,l,n])=>`<button type="button" class="${F.st===g?'on':''}" data-a="setSt" data-v="${g}">${l} <b>${n}</b></button>`).join('')}</div>
  <section class="filters" aria-label="فلاتر"><label>اسم العميل أو الموبايل أو رقم الطلب${I('flt.q',{type:'search',ph:'بحث'})}</label><label>من تاريخ${I('flt.from',{type:'date'})}</label><label>إلى تاريخ${I('flt.to',{type:'date'})}</label><label>المنطقة${SEL('flt.area',areas.map(a=>[a,a]),{blank:'كل المناطق'})}</label><label>نوع الخدمة${SEL('flt.service',SVC.map(s=>[s[0],s[1]]),{blank:'كل الخدمات'})}</label><label>المهندس${SEL('flt.eng',D.engs.map(e=>[e.id,e.name]),{blank:'كل المهندسين'})}</label></section>
  ${R.length?`<div class="tbl"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الموبايل</th><th>الخدمة</th><th>المنطقة</th><th>الموعد المطلوب</th><th>الموعد النهائي</th><th>السعر</th><th>المهندس</th><th>الحالة</th></tr></thead><tbody>${R.map(r=>`<tr class="click" data-a="openReq" data-v="${esc(r.id)}" tabindex="0"><td><b class="ltr">${esc(r.id)}</b></td><td style="font-weight:500">${esc(r.customer.name)}</td><td><span class="ltr">${esc(r.customer.phone)}</span></td><td ${r.service==='emergency'?'style="color:var(--c);font-weight:700"':''}>${esc(lab(SVC,r.service))}</td><td>${esc(r.area)}</td><td>${r.prefDate?esc(fmtD(r.prefDate))+' · '+esc(lab(SLOT,r.slot)):'—'}</td><td>${esc(fmtAppt(r.appt))}</td><td>${r.price!=null?esc(r.price)+' ج.م':'—'}</td><td>${esc(r.engId?engName(r.engId):'—')}</td><td>${chip(r.status)} ${priChip(r.priority)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">${D.reqs.length?'لا توجد طلبات تطابق الفلاتر.':'لا توجد طلبات بعد. تظهر هنا فور إرسال العملاء لطلباتهم.'}</div>`}`;
}
function mReq(){
  const r=reqById(S.sel);if(!r)return `<div class="empty">الطلب غير موجود.</div>`;
  const c=r.customer;
  const prevCount=D.reqs.filter(x=>x.customer.phone===c.phone&&x.id!==r.id).length;
  const F=ensure('rq_'+r.id,{price:r.price!=null?String(r.price):'',date:r.appt?r.appt.slice(0,10):(r.prefDate||''),time:r.appt?r.appt.slice(11,16):({morning:'10:00',noon:'13:00',evening:'17:00'}[r.slot]||''),eng:r.engId||'',notes:r.mgrNotes||'',reason:''});
  const rep=D.reps[r.id];const fb=D.fbs[r.id];
  const findLink=SITE+'?no='+encodeURIComponent(r.id);
  const priceMsg=r.price!=null&&r.appt?`مرحبًا ${c.name}، بخصوص طلب الصيانة ${r.id} من Echo: سعر الزيارة ${r.price} ج.م، والموعد ${fmtAppt(r.appt)}. للموافقة أو طلب موعد آخر افتح الرابط واكتب رقم موبايلك: ${findLink}`:'';
  const closed=['completed','closed','cancelled','needs_follow','in_progress'].includes(r.status);
  const activeEngs=D.engs.filter(e=>e.active);
  const loadDay=id=>D.reqs.filter(x=>x.engId===id&&x.appt&&x.appt.slice(0,10)===(F.date||today())&&ACTIVE_TECH.includes(x.status)).length;
  const fbTok=S.fbLinks[r.id];
  return `<button type="button" class="lnk" data-a="mv" data-v="reqs" style="align-self:flex-start;font-size:14px">→ كل الطلبات</button>
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px"><h1 class="ltr" style="font-size:26px">${esc(r.id)}</h1>${chip(r.status)}${priChip(r.priority)}<span class="k">أُرسل ${esc(fmtDT(r.createdAt))}</span>${r.followUpOf?`<span class="k">زيارة متابعة للطلب <button type="button" class="lnk" data-a="openReq" data-v="${esc(r.followUpOf)}">${esc(r.followUpOf)}</button></span>`:''}${r.followUpId?`<span class="k">زيارة المتابعة: <button type="button" class="lnk" data-a="openReq" data-v="${esc(r.followUpId)}">${esc(r.followUpId)}</button></span>`:''}</div>
  ${r.changeReq?`<div class="warn" role="alert"><b>العميل طلب تغيير الموعد</b> إلى ${esc(fmtD(r.changeReq.date))} · ${esc(lab(SLOT,r.changeReq.slot))}${r.changeReq.note?' — «'+esc(r.changeReq.note)+'»':''}. حدّث الموعد في خانة «السعر والموعد النهائي» واحفظ، وسيظهر للعميل ليوافق عليه. <button type="button" class="btn sm" style="margin-top:6px" data-a="useChg" data-v="${esc(r.id)}">استخدم الموعد المطلوب</button></div>`:''}
  ${r.confirmedBy==='customer'&&r.status==='confirmed'?`<div class="note">العميل وافق على السعر والموعد من صفحة المتابعة.</div>`:''}
  ${r.status==='cancelled'?`<div class="warn">الطلب ملغي.${r.cancelReason?' السبب: '+esc(r.cancelReason):''}</div>`:''}
  <div class="row">
   <div class="col" style="flex:3 1 440px">
    <section class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h2>العميل</h2><button type="button" class="lnk" data-a="openCust" data-v="${esc(c.phone)}">ملف العميل${prevCount?' · '+prevCount+' طلب سابق':''}</button></div>
     <div class="kv"><div><span class="k">الاسم</span><b style="font-weight:500">${esc(c.name)}</b></div><div><span class="k">الموبايل</span><b class="ltr" style="font-weight:500">${esc(c.phone)}</b></div><div><span class="k">البريد</span>${esc(c.email||'—')}</div><div><span class="k">المحافظة / المنطقة</span>${esc(r.gov)} · ${esc(r.area)}</div></div>
     <div><span class="k">العنوان</span><div style="line-height:1.7">${esc(r.address)}</div></div>
     <div style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn gh sm" href="tel:${esc(c.phone)}">اتصال <span class="ltr">${esc(c.phone)}</span></a><a class="btn gh sm" href="${esc(waLink(c.phone,'مرحبًا '+c.name+'، معك فريق Echo بخصوص طلب الصيانة '+r.id+'.'))}" target="_blank" rel="noopener">واتساب</a>${r.map?`<a class="btn gh sm" href="${esc(safeUrl(r.map))}" target="_blank" rel="noopener">الموقع على الخريطة</a>`:''}</div></section>
    <section class="card"><h2>تفاصيل المشكلة</h2>
     <div class="kv"><div><span class="k">نوع النظام</span>${esc(lab(SYS,r.system))}</div><div><span class="k">نوع الخدمة</span><span ${r.service==='emergency'?'style="color:var(--c);font-weight:700"':''}>${esc(lab(SVC,r.service))}</span></div><div><span class="k">الموعد المطلوب</span>${r.prefDate?esc(fmtD(r.prefDate))+' · '+esc(lab(SLOT,r.slot)):'يحدده المدير'}</div></div>
     <div><span class="k">وصف العميل</span><p style="margin:0;line-height:1.8;white-space:pre-wrap">${esc(r.desc)}</p></div>
     ${r.media.length?`<div class="media">${mediaThumbs(r.media)}</div>`:''}
     ${r.notes?`<div><span class="k">ملاحظات العميل</span><p style="margin:0;line-height:1.7">${esc(r.notes)}</p></div>`:''}</section>
    ${rep&&!rep.deletedAt?reportCard(rep,r,'manager'):''}
    <section class="card"><h2>سجل الطلب</h2><div class="tl">${r.history.slice().reverse().map(h=>`<div><i></i><span class="grow">${esc(ST[h.s]?ST[h.s][0]:h.s)}${h.note?' · '+esc(h.note):''} <span class="k">· ${esc(h.by)}</span></span><span class="k">${esc(fmtDT(h.at))}</span></div>`).join('')}</div></section>
   </div>
   <div class="col" style="flex:2 1 320px">
    ${r.status==='needs_follow'?`<section class="card" style="border:2px solid var(--c)"><h2 style="color:var(--c)">الطلب يحتاج متابعة</h2><span style="line-height:1.6">نتيجة التقرير: ${esc(lab(OUT,rep&&rep.outcome))}. لم يُغلق الطلب تلقائيًا.</span><button type="button" class="btn dn" data-a="followUp" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>إنشاء زيارة متابعة</button><button type="button" class="btn gh" data-a="closeReq" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>إغلاق الطلب بدون متابعة</button></section>`:''}
    ${r.status==='completed'?`<section class="card hl"><h2>إغلاق الطلب</h2>${rep&&rep.review==='reviewed'?`<span style="line-height:1.6">تمت مراجعة التقرير. أغلق الطلب وأرسل للعميل رابط التقييم.</span><button type="button" class="btn" data-a="closeAndRate" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>إغلاق الطلب وإنشاء رابط التقييم</button>`:'<span class="k">راجع التقرير أولًا (زر «تمت المراجعة»).</span>'}</section>`:''}
    ${fb?`<section class="card"><h2>تقييم العميل</h2>${fb.submittedAt?`<div class="kv"><div><span class="k">جودة الخدمة</span>${'★'.repeat(fb.q)}</div><div><span class="k">الالتزام بالموعد</span>${'★'.repeat(fb.p)}</div><div><span class="k">الاحترافية</span>${'★'.repeat(fb.pr)}</div><div><span class="k">التجربة العامة</span>${'★'.repeat(fb.o)}</div></div>${fb.comment?`<p style="margin:0;line-height:1.7">«${esc(fb.comment)}»</p>`:''}`:fbTok?`<span class="k">أرسل الرابط للعميل الآن:</span><div style="display:flex;flex-wrap:wrap;gap:8px"><a class="btn sm" href="${esc(waLink(c.phone,'شكرًا لاختيارك Echo. نرجو تقييم زيارة الصيانة '+r.id+' من هنا: '+SITE+'#rate-'+fbTok))}" target="_blank" rel="noopener">إرسال الرابط عبر واتساب</a><button type="button" class="btn gh sm" data-a="copy" data-v="${esc(SITE+'#rate-'+fbTok)}">نسخ الرابط</button></div>`:`<span class="k">أُنشئ رابط التقييم ${esc(ago(fb.sentAt))} ولم يقيّم العميل بعد. يقدر العميل يقيّم من صفحة متابعة الطلب أيضًا.</span><button type="button" class="btn gh sm" data-a="renewFb" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>إنشاء رابط تقييم جديد</button>`}</section>`:''}
    ${!closed?`<section class="card ${['new','pending'].includes(r.status)?'hl':''}"><h2>1 · السعر والموعد النهائي</h2>
     <label class="fld">سعر الزيارة (ج.م)${I('rq_'+r.id+'.price',{type:'number',extra:'min="0" inputmode="numeric" style="direction:ltr;text-align:right"'})}</label>
     <div class="grid2"><label class="fld">التاريخ${I('rq_'+r.id+'.date',{type:'date'})}</label><label class="fld">الساعة${I('rq_'+r.id+'.time',{type:'time'})}</label></div>
     <button type="button" class="btn ${r.status==='new'?'':'gh'}" data-a="savePrice" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>${r.status==='new'?'حفظ · بانتظار تأكيد العميل':'تحديث السعر والموعد'}</button>
     ${priceMsg?`<a class="btn gh" href="${esc(waLink(c.phone,priceMsg))}" target="_blank" rel="noopener">إرسال السعر والموعد عبر واتساب</a>`:''}
     ${r.status==='pending'&&!r.changeReq?`<button type="button" class="btn" data-a="confirmReq" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>العميل وافق · تأكيد الطلب</button>`:''}</section>
    <section class="card ${r.status==='confirmed'?'hl':''}" ${REASSIGNABLE.includes(r.status)?'':'style="opacity:.55"'}><h2>2 · إسناد مهندس الصيانة</h2>
     ${activeEngs.length?`<label class="fld">المهندس${SEL('rq_'+r.id+'.eng',activeEngs.map(e=>[e.id,e.name+' — '+loadDay(e.id)+' زيارة في نفس اليوم']),{blank:'اختر المهندس',extra:REASSIGNABLE.includes(r.status)?'':'disabled'})}</label>`:`<span class="k">لا يوجد مهندسون نشطون.</span>`}
     <label class="fld"><span>ملاحظات للمهندس <span class="opt">(تظهر له في تفاصيل المهمة)</span></span>${T('rq_'+r.id+'.notes','',2)}</label>
     <button type="button" class="btn" data-a="assign" data-v="${esc(r.id)}" ${S.busy||!REASSIGNABLE.includes(r.status)?'disabled':''}>${r.engId?'تغيير المهندس / تحديث الملاحظات':'إسناد وإرسال للمهندس'}</button>
     ${REASSIGNABLE.includes(r.status)?'':`<span class="k">${['new','pending'].includes(r.status)?'يُفعَّل بعد تأكيد الطلب.':'لا يمكن تغيير المهندس بعد وصوله للموقع.'}</span>`}</section>`:''}
    <section class="card"><h2>الأولوية</h2><div class="seg" role="radiogroup" aria-label="الأولوية">${PRI.map(p=>`<button type="button" class="${r.priority===p[0]?'on':''} ${p[0]==='urgent'?'dn':''}" data-a="setPri" data-v="${esc(r.id)}|${p[0]}" ${['closed','cancelled'].includes(r.status)?'disabled':''}>${p[1]}</button>`).join('')}</div></section>
    ${CANCELLABLE.includes(r.status)?`<section class="card"><h2>إلغاء الطلب</h2><label class="fld">سبب الإلغاء${I('rq_'+r.id+'.reason',{ph:'مثال: العميل اعتذر'})}</label><button type="button" class="btn gh dn" data-a="cancelReq" data-v="${esc(r.id)}" ${S.busy?'disabled':''}>إلغاء الطلب</button></section>`:''}
    ${!rep||rep.deletedAt?`<section class="card" style="background:var(--s20);border-style:dashed"><h2>تقرير الصيانة</h2><span class="k">يظهر هنا فور إرسال المهندس للتقرير.</span></section>`:''}
   </div></div>`;
}
