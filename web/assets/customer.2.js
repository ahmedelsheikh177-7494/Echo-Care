function stage(st){const m={new:0,pending:0,confirmed:1,assigned:2,accepted:2,on_the_way:3,arrived:3,in_progress:4,completed:5,needs_follow:5,closed:5};return m[st]==null?0:m[st]}
function track(){
  const r=S.track;
  if(S.loading&&!r)return `<div class="pad"><div class="empty">جاري التحميل…</div></div>`;
  if(!r)return `<div class="pad"><div class="empty">لم نجد هذا الطلب. ربما تغيّر رابط المتابعة. استخدم رقم الطلب ورقم الموبايل من الصفحة الرئيسية.</div><button class="btn gh" data-a="home">الرئيسية</button></div>`;
  const stg=stage(r.status);
  const steps=['تم استلام الطلب','تأكيد السعر والموعد','تحديد المهندس','المهندس في الطريق','جاري تنفيذ الصيانة',r.status==='needs_follow'?'تحتاج زيارة متابعة':'انتهت الصيانة'];
  return `<div class="pad">
   <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px"><div><span class="k">طلب رقم</span><div class="ltr" style="font-size:22px;font-weight:700">${esc(r.request_no)}</div></div><span class="chip ${(ST[r.status]||[])[1]}">${esc(CUST_LABEL[r.status]||'')}</span></div>
   ${r.status==='cancelled'?`<div class="warn">تم إلغاء هذا الطلب.${r.cancel_reason?' السبب: '+esc(r.cancel_reason):''}</div>`:''}
   ${r.price!=null&&r.appointment&&r.status!=='cancelled'?`<section class="card" style="background:var(--g);color:var(--w);border:0"><span style="color:var(--s);font-size:13px">${r.status==='pending'?'السعر والموعد المقترحان':'موعد الزيارة'}</span><b style="font-size:18px">${esc(fmtAppt(r.appointment))}</b><div style="height:1px;background:#3F5654"></div><div style="display:flex;justify-content:space-between"><span>سعر الزيارة</span><b style="font-size:18px">${esc(Number(r.price))} ج.م</b></div>${r.status==='pending'&&!r.change_request?'<span style="font-size:13px;color:var(--s40)">راجع السعر والموعد، ثم اضغط «أوافق» أو اطلب موعدًا آخر.</span>':''}</section>${decision(r)}`:''}
   ${r.feedback_pending?`<button type="button" class="btn blk" data-a="rateFromTrack" style="min-height:54px" ${S.busy?'disabled':''}>قيّم الخدمة</button>`:''}
   ${r.status!=='cancelled'?`<section class="card"><h2>حالة الطلب</h2><div class="tl">${steps.map((s,i)=>`<div><i style="${i<=stg?'':'background:#fff;border:1.5px solid var(--s)'}${i===stg&&r.status==='needs_follow'?';background:var(--c)':''}"></i><span class="grow" style="${i<=stg?'font-weight:500':'color:var(--m)'}">${s}</span></div>`).join('')}</div></section>`:''}
   <section class="card"><div class="kv"><div><span class="k">النظام</span>${esc(lab(SYS,r.system))}</div><div><span class="k">الخدمة</span>${esc(lab(SVC,r.service))}</div><div><span class="k">الموعد المطلوب</span>${r.preferred_date?esc(fmtD(r.preferred_date))+' · '+esc(lab(SLOT,r.preferred_slot)):'يحدده فريقنا'}</div></div></section>
   <section class="card"><h2>الإشعارات</h2>${(r.notifications||[]).length?r.notifications.map(n=>`<div style="display:flex;flex-direction:column;gap:2px;font-size:14px;line-height:1.6"><span>${esc(n.body)}</span><span class="k">${esc(ago(n.at))}</span></div>`).join(''):'<span class="k">لا توجد إشعارات.</span>'}</section>
   ${CFG.companyPhone?`<div class="cta2"><a class="btn gh" href="tel:${esc(CFG.companyPhone)}">اتصال</a>${waEcho(r.request_no,location.href,'واتساب')}</div>`:''}
   <button type="button" class="btn gh" data-a="home">الرئيسية</button></div>`;
}
function decision(r){
  if(r.status!=='pending')return r.status==='confirmed'&&r.confirmed_by==='customer'?`<div class="note">وافقت على السعر والموعد. سيصلك إشعار هنا عند تحرك المهندس.</div>`:'';
  if(r.change_request)return `<div class="note">أرسلت طلب تغيير الموعد إلى <b>${esc(fmtD(r.change_request.date))} · ${esc(lab(SLOT,r.change_request.slot))}</b>. سيتواصل معك فريقنا لتحديد الموعد الجديد.</div>`;
  if(S.chg){ensure('chg',{date:'',slot:'',note:''});const C=getD('chg');
    return `<section class="card hl"><h2>اطلب موعدًا آخر</h2>
     <label class="fld">التاريخ المناسب${I('chg.date',{type:'date',extra:`min="${today()}"`})}</label>
     <div class="grid3" role="group" aria-label="الفترة">${SLOT.map(x=>`<button type="button" class="tile ${C.slot===x[0]?'on':''}" data-a="pick" data-v="chg.slot|${x[0]}" style="align-items:center"><span>${x[1]}</span><small>${x[2]}</small></button>`).join('')}</div>
     <label class="fld"><span>ملاحظة <span class="opt">(اختياري)</span></span>${T('chg.note','مثال: أفضّل بعد الساعة 5',2)}</label>
     ${S.err?`<div class="warn" role="alert">${esc(S.err)}</div>`:''}
     <div style="display:flex;gap:10px"><button type="button" class="btn gh" data-a="chgCancel">رجوع</button><button type="button" class="btn" style="flex:1" data-a="chgSend" ${S.busy?'disabled':''}>إرسال طلب تغيير الموعد</button></div></section>`}
  return `<div style="display:flex;flex-direction:column;gap:10px"><button type="button" class="btn blk" style="min-height:54px;font-size:16px" data-a="accept" ${S.busy?'disabled':''}>أوافق على السعر والموعد</button><button type="button" class="btn gh blk" data-a="chg">أريد تغيير الموعد</button></div>`;
}
function rate(){
  const fb=S.fb;
  if(S.loading&&!fb)return `<div class="pad"><div class="empty">جاري التحميل…</div></div>`;
  if(!fb)return `<div class="pad"><div class="empty">رابط التقييم غير صحيح أو انتهت صلاحيته.</div><button class="btn gh" data-a="home">الرئيسية</button></div>`;
  if(fb.submitted)return `<div class="pad" style="align-items:center;text-align:center;padding-top:60px"><img src="assets/icon-sand.svg" alt="" style="height:70px"><h1>شكرًا لتقييمك</h1><p style="margin:0;line-height:1.7">تم حفظ تقييمك. نتمنى لك دفئًا دائمًا مع Echo.</p></div>`;
  const R=ensure('rate',{q:0,p:0,pr:0,o:0,comment:''});
  const rows=[['q','جودة الخدمة'],['p','التزام المهندس بالموعد'],['pr','احترافية المهندس'],['o','التجربة العامة']];
  return `<div class="pad"><h1>كيف كانت تجربتك؟</h1><p style="margin:0;color:#3B4A48">طلب <span class="ltr">${esc(fb.request_no)}</span></p>
   <section class="card" style="gap:4px">${rows.map(([k,l])=>`<div style="padding:8px 0"><span style="font-weight:500">${l}</span><div class="stars" role="group" aria-label="${l}">${[1,2,3,4,5].map(n=>`<button type="button" class="star ${n<=R[k]?'on':''}" data-a="star" data-v="${k}|${n}" aria-label="${n} من 5">★</button>`).join('')}</div></div>`).join('')}</section>
   <label class="fld"><span>تعليق <span class="opt">(اختياري)</span></span>${T('rate.comment','اكتب ملاحظتك هنا',3)}</label>
   ${S.err?`<div class="warn" role="alert">${esc(S.err)}</div>`:''}
   <button type="button" class="btn" data-a="submitRate" ${S.busy?'disabled':''}>إرسال التقييم</button></div>`;
}

async function run(fn){if(S.busy)return;S.busy=true;S.err='';render();try{await fn()}catch(e){console.error(e);S.err=errMsg(e);toast(S.err)}finally{S.busy=false;render()}}
async function loadTrack(){if(!S.tok)return;try{S.track=await rpc('get_tracking',{p_token:S.tok})}catch(e){if(!S.track)S.track=null}S.loading=false;render()}
async function loadRate(){try{S.fb=await rpc('get_feedback',{p_token:S.tok})}catch(e){S.fb=null}S.loading=false;render()}
const ACT={
  toggleTrk(){S.trkOpen=!S.trkOpen;S.err='';render();if(S.trkOpen){const c=document.getElementById('trkCard');if(c){c.scrollIntoView({behavior:'smooth',block:'start'});const n=c.querySelector('input');if(n)try{n.focus({preventScroll:true})}catch(e){}}}},
  home(){S.cv='home';S.err='';S.track=null;S.fb=null;if(location.hash)history.replaceState(null,'',location.pathname+location.search);render();window.scrollTo(0,0)},
  newReq(){S.cv='form';S.step=1;S.err='';ensure('req',REQ_DEF);render();window.scrollTo(0,0)},
  pick(v){const [path,val]=v.split('|');const i=path.indexOf('.');getD(path.slice(0,i))[path.slice(i+1)]=val;S.err='';render()},
  gps(){if(!navigator.geolocation){toast('تحديد الموقع غير متاح على هذا الجهاز. الصق رابط الموقع بدلًا من ذلك.');return}
    navigator.geolocation.getCurrentPosition(p=>{getD('req').map='https://www.google.com/maps?q='+p.coords.latitude.toFixed(6)+','+p.coords.longitude.toFixed(6);toast('تم تحديد موقعك.');render()},()=>toast('لم نتمكن من تحديد موقعك. الصق رابط الموقع بدلًا من ذلك.'),{enableHighAccuracy:true,timeout:15000})},
  stepBack(){S.step--;S.err='';render();window.scrollTo(0,0)},
  stepNext(){const F=getD('req');S.err='';
    if(S.step===1){F.phone=normPhone(F.phone);if(F.name.trim().length<3)S.err='اكتب الاسم بالكامل.';else if(!validPhone(F.phone))S.err='رقم الموبايل غير صحيح. مثال: 01012345678';else if(F.email&&!/^\S+@\S+\.\S+$/.test(F.email))S.err='البريد الإلكتروني غير صحيح.';else if(!F.area.trim())S.err='اكتب المنطقة.';else if(F.address.trim().length<8)S.err='اكتب العنوان بالتفصيل.'}
    if(S.step===2){if(!F.system)S.err='اختر نوع نظام التدفئة.';else if(!F.service)S.err='اختر نوع الخدمة.'}
    if(!S.err){S.step++;window.scrollTo(0,0)}render()},
  submitReq(){const F=getD('req');S.err='';
    if(F.desc.trim().length<5)S.err='اكتب وصفًا للمشكلة.';else if(!F.date||F.date<today())S.err='اختر الموعد المناسب للزيارة (اليوم أو بعده).';else if(!F.slot)S.err='اختر الفترة المناسبة.';
    if(S.err){render();return}
    run(async()=>{const res=await rpc('submit_request',{p:{name:F.name.trim(),phone:F.phone,email:F.email.trim(),governorate:F.gov,area:F.area.trim(),address:F.address.trim(),map_url:F.map.trim(),system:F.system,service:F.service,description:F.desc.trim(),date:F.date,slot:F.slot,notes:F.notes.trim(),media:F.media.map(m=>m.path)}});
      S.last={no:res.request_no,token:res.token};S.cv='success';drafts.req=null;S.folder=uuid();window.scrollTo(0,0)})},
  openTrack(v){location.hash='track-'+v},
  copy(v){navigator.clipboard.writeText(v).then(()=>toast('تم نسخ الرابط.')).catch(()=>toast('انسخ الرابط: '+v))},
  findReq(){const F=getD('trk');const no=toLatinDigits(F.no).trim().toUpperCase();const ph=normPhone(F.phone);S.err='';
    if(!no||!validPhone(ph)){S.err='اكتب رقم الطلب ورقم الموبايل.';render();return}
    run(async()=>{const tok=await rpc('find_request',{p_request_no:no,p_phone:ph});if(!tok){S.err='لم نجد طلبًا بهذا الرقم ورقم الموبايل.';return}location.hash='track-'+tok})},
  accept(){run(async()=>{await rpc('customer_accept',{p_token:S.tok});await loadTrack();toast('شكرًا، تم تأكيد الموعد.')})},
  chg(){S.chg=true;S.err='';render()},
  chgCancel(){S.chg=false;S.err='';render()},
  chgSend(){const C=getD('chg');S.err='';if(!C.date||C.date<today()){S.err='اختر تاريخًا من اليوم أو بعده.';render();return}if(!C.slot){S.err='اختر الفترة المناسبة.';render();return}
    run(async()=>{await rpc('customer_change',{p_token:S.tok,p_date:C.date,p_slot:C.slot,p_note:(C.note||'').trim()});S.chg=false;drafts.chg=null;await loadTrack();toast('تم إرسال طلبك. سيتواصل معك فريقنا.')})},
  rateFromTrack(){run(async()=>{const t=await rpc('feedback_token_from_tracking',{p_token:S.tok});if(!t){toast('تم إرسال التقييم من قبل.');await loadTrack();return}location.hash='rate-'+t})},
  star(v){const [k,n]=v.split('|');getD('rate')[k]=parseInt(n,10);render()},
  submitRate(){const R=getD('rate');if(!R.q||!R.p||!R.pr||!R.o){S.err='قيّم البنود الأربعة من 1 إلى 5.';render();return}S.err='';
    run(async()=>{await rpc('submit_feedback',{p_token:S.tok,p_quality:R.q,p_punctuality:R.p,p_professionalism:R.pr,p_overall:R.o,p_comment:(R.comment||'').trim()});S.fb=Object.assign({},S.fb,{submitted:true});drafts.rate=null})},
  rmMedia(v){const [path,i]=v.split('|');const k=path.indexOf('.');const arr=getD(path.slice(0,k))[path.slice(k+1)];if(arr)arr.splice(+i,1);render()}
};
