'use strict';
/* ECHO CARE – customer portal: request form, tracking, accept/change appointment, rating */
const S={cv:'home',step:1,tok:'',err:'',busy:false,uploading:false,toast:'',chg:false,last:null,track:null,fb:null,loading:false,folder:uuid()};
const REQ_DEF={name:'',phone:'',email:'',gov:'القاهرة',area:'',address:'',map:'',system:'',service:'',desc:'',media:[],date:'',slot:'',notes:''};
const app=document.getElementById('app');
function toast(t){S.toast=t;render();clearTimeout(toast._t);toast._t=setTimeout(()=>{S.toast='';render()},4000)}
function render(){
  const a=document.activeElement;const id=a&&a.id;let ss=null,se=null;try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}
  const y=window.scrollY;
  const isHome=sb&&(S.cv==='home'||S.cv==='form');const fs=document.querySelector('.fsheet');const fst=fs?fs.scrollTop:0;
  app.innerHTML=`<div class="mob">${isHome?'':`<header class="hdr dk"><a href="./" aria-label="الرئيسية"><img src="assets/logo-light.svg" alt="Echo"></a><span style="font-size:12px;font-weight:500;letter-spacing:.12em;color:var(--s)">ECHO CARE</span></header>`}${view()}</div>${S.toast?`<div class="toast" role="status">${esc(S.toast)}</div>`:''}`;
  if(id){const n=document.getElementById(id);if(n){try{n.focus({preventScroll:true});if(ss!=null&&n.setSelectionRange)n.setSelectionRange(ss,se)}catch(e){}}}
  if(Math.abs(window.scrollY-y)>2)window.scrollTo(0,y);
  const fs2=document.querySelector('.fsheet');if(fs2&&fst&&!S.fTop)fs2.scrollTop=fst;S.fTop=false;
}
function view(){
  if(!sb)return `<div class="pad"><div class="empty">تعذّر تحميل الصفحة. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.</div></div>`;
  if(S.cv==='form')return home()+formSheet();if(S.cv==='success')return success();if(S.cv==='track')return track();if(S.cv==='rate')return rate();return home();
}
function home(){
  const qno=new URLSearchParams(location.search).get('no')||'';
  ensure('trk',{no:qno,phone:''});
  if(S.trkOpen==null)S.trkOpen=!!qno;
  const ph=CFG.companyPhone;const sa=S.sheetAnim;S.sheetAnim=false;
  return `<div class="chero"><div class="ctop"><img src="assets/logo-light.svg" alt="Echo"><span class="tg">ECHO CARE</span></div>
   <div class="cmid"><h1 class="slogan"><img src="assets/stay-warm.webp" alt="Stay Warm" width="840" height="406"></h1>
    <p>أرسل طلبك في دقيقتين، وسيتواصل معك فريقنا لتأكيد السعر والموعد.</p></div>
   <div class="cact"><button type="button" class="btn blk" data-a="newReq">طلب صيانة جديد</button>
    <button type="button" class="btn blk ol" data-a="toggleTrk" aria-expanded="${S.trkOpen}">متابعة طلب سابق</button>
    ${ph?`<div class="ccon"><span>تواصل معنا</span><a href="tel:${esc(ph)}">اتصال</a><i></i>${waEcho('','','واتساب').replace('class="btn gh wa"','class="wa"')}</div>`:''}</div></div>
  ${S.trkOpen?`<div class="sheet-bg${sa?' an':''}" data-a="toggleTrk"></div><section class="sheet${sa?' an':''}" id="trkCard" role="dialog" aria-label="متابعة طلب سابق"><i class="grab"></i>
   <div style="display:flex;justify-content:space-between;align-items:center"><h2>متابعة طلب سابق</h2><button type="button" class="lnk" data-a="toggleTrk">إغلاق</button></div>
   <label class="fld">رقم الطلب${I('trk.no',{ph:'EC-2026-00001',extra:'style="direction:ltr;text-align:right" autocapitalize="characters"'})}</label>
   <label class="fld">رقم الموبايل${I('trk.phone',{type:'tel',ph:'01xxxxxxxxx',extra:'inputmode="tel" style="direction:ltr;text-align:right"'})}</label>
   ${S.err?`<span class="err" role="alert">${esc(S.err)}</span>`:''}
   <button type="button" class="btn" data-a="findReq" ${S.busy?'disabled':''}>عرض حالة الطلب</button></section>`:''}`;
}
function formSheet(){
  const an=S.fAnim;S.fAnim=false;
  return `<div class="sheet-bg${an?' an':''}" data-a="closeReq"></div><section class="sheet fsheet${an?' an':''}" role="dialog" aria-label="طلب صيانة جديد">
   <div class="fhead"><i class="grab"></i><div style="display:flex;justify-content:space-between;align-items:center"><h2>طلب صيانة جديد</h2><button type="button" class="lnk" data-a="closeReq" style="font-size:15px">إلغاء</button></div></div>
   ${form()}</section>`;
}
function form(){
  const F=ensure('req',REQ_DEF);const st=S.step;
  const prog=`<div class="prog">${[1,2,3].map(i=>`<span class="${i<=st?'on':''}"></span>`).join('')}</div><span class="k" style="font-size:13px">الخطوة ${st} من 3</span>`;
  let inner='';
  if(st===1)inner=`<h1>بياناتك</h1>
   <label class="fld">الاسم بالكامل${I('req.name',{ph:'مثال: أحمد محمد علي',extra:'autocomplete="name"'})}</label>
   <label class="fld">رقم الموبايل${I('req.phone',{type:'tel',ph:'01xxxxxxxxx',extra:'autocomplete="tel" inputmode="tel" style="direction:ltr;text-align:right"'})}</label>
   <label class="fld"><span>البريد الإلكتروني <span class="opt">(اختياري)</span></span>${I('req.email',{type:'email',ph:'name@example.com',extra:'autocomplete="email" style="direction:ltr;text-align:right"'})}</label>
   <div class="grid2"><label class="fld">المحافظة${SEL('req.gov',GOV.map(g=>[g,g]))}</label><label class="fld">المنطقة${I('req.area',{ph:'مثال: التجمع الخامس'})}</label></div>
   <label class="fld">العنوان بالتفصيل${T('req.address','الشارع، رقم العمارة، الدور، الشقة',2)}</label>
   <label class="fld"><span>رابط موقعك على خرائط جوجل <span class="opt">(اختياري)</span></span>${I('req.map',{type:'url',ph:'الصق رابط الموقع من تطبيق الخرائط',extra:'style="direction:ltr;text-align:right"'})}</label>
   <button type="button" class="btn gh sm" data-a="gps">استخدم موقعي الحالي</button>`;
  if(st===2)inner=`<h1>نوع النظام والخدمة</h1>
   <fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px"><legend class="fld" style="padding-bottom:8px">نوع نظام التدفئة</legend><div class="grid2">${SYS.map(s=>`<button type="button" class="tile ${F.system===s[0]?'on':''}" data-a="pick" data-v="req.system|${s[0]}" aria-pressed="${F.system===s[0]}"><span>${s[1]}</span><small>${s[2]}</small></button>`).join('')}</div></fieldset>
   <fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px"><legend class="fld" style="padding-bottom:8px">نوع الخدمة</legend><div class="grid2">${SVC.map(s=>`<button type="button" class="tile ${F.service===s[0]?'on':''}" data-a="pick" data-v="req.service|${s[0]}" aria-pressed="${F.service===s[0]}" ${s[0]==='emergency'?'style="border-color:var(--c)"':''}><span ${s[0]==='emergency'?'style="color:var(--c)"':''}>${s[1]}</span><small>${s[2]}</small></button>`).join('')}</div></fieldset>`;
  if(st===3)inner=`<h1>المشكلة والموعد</h1>
   <label class="fld">وصف المشكلة${T('req.desc','اكتب ما تلاحظه: صوت، تسريب، عدم تسخين، رسالة خطأ…',4)}</label>
   <div class="fld"><span>صور أو فيديو <span class="opt">(اختياري · حتى 5 صور وفيديو واحد 30 ثانية)</span></span><div class="media">${mediaThumbs(F.media,'req.media')}${upBox('req.media','إضافة','image/*,video/*')}</div>${S.uploading?'<span class="k">جاري الرفع…</span>':''}</div>
   <label class="fld">الموعد المناسب للزيارة${I('req.date',{type:'date',extra:`min="${today()}"`})}</label>
   <div class="grid3" role="group" aria-label="الفترة">${SLOT.map(s=>`<button type="button" class="tile ${F.slot===s[0]?'on':''}" data-a="pick" data-v="req.slot|${s[0]}" style="align-items:center"><span>${s[1]}</span><small>${s[2]}</small></button>`).join('')}</div>
   <label class="fld"><span>ملاحظات أخرى <span class="opt">(اختياري)</span></span>${T('req.notes','مثال: اتصل قبل الوصول',2)}</label>
   <div class="note">سيراجع فريقنا طلبك ويتصل بك لتأكيد السعر والموعد النهائي.</div>`;
  const nav=`<div style="display:flex;gap:10px;margin-top:4px">${st>1?`<button type="button" class="btn gh" data-a="stepBack">السابق</button>`:''}
   ${st<3?`<button type="button" class="btn" style="flex:1" data-a="stepNext">التالي</button>`:`<button type="button" class="btn" style="flex:1;flex-direction:column;gap:0;min-height:58px" data-a="submitReq" ${S.busy||S.uploading?'disabled':''}><span style="font-size:16px;font-weight:700">${S.busy?'جاري الإرسال…':'إرسال طلب الصيانة'}</span><span style="font-size:10px;letter-spacing:.08em;color:var(--s)">SUBMIT MAINTENANCE REQUEST</span></button>`}</div>`;
  return `<div class="fbody">${prog}${inner}${S.err?`<div class="warn" role="alert">${esc(S.err)}</div>`:''}${nav}</div>`;
}
function success(){
  const L=S.last||{};const link=SITE+'#track-'+(L.token||'');
  return `<div class="pad" style="align-items:center;text-align:center">
   <div style="width:72px;height:72px;border-radius:50%;background:var(--g);display:flex;align-items:center;justify-content:center;margin-top:16px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F4F0EB" stroke-width="2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
   <h1>تم استلام طلبك</h1><p style="margin:0;line-height:1.7;color:#3B4A48">سيتواصل معك فريق Echo لتأكيد السعر والموعد.</p>
   <section class="card" style="width:100%;align-items:center"><span class="k">رقم الطلب</span><b class="ltr" style="font-size:28px;letter-spacing:.04em">${esc(L.no||'')}</b><span class="chip s-new">قيد المراجعة · Pending Review</span></section>
   <div class="note" style="text-align:right;width:100%">احتفظ برقم الطلب ورقم موبايلك لمتابعة الطلب في أي وقت، أو احفظ رابط المتابعة.</div>
   <button type="button" class="btn blk" data-a="openTrack" data-v="${esc(L.token||'')}">متابعة حالة الطلب</button>
   ${CFG.companyPhone?`<div style="width:100%;display:flex;flex-direction:column">${waEcho(L.no||'',link,'إرسال رقم الطلب لخدمة العملاء على واتساب')}</div>`:''}
   <button type="button" class="btn gh blk" data-a="copy" data-v="${esc(link)}">نسخ رابط المتابعة</button>
   <button type="button" class="lnk" data-a="home">العودة للرئيسية</button></div>`;
}
const CUST_LABEL={new:'قيد المراجعة',pending:'بانتظار تأكيدك للسعر والموعد',confirmed:'مؤكد',assigned:'تم تحديد المهندس',accepted:'تم تحديد المهندس',on_the_way:'المهندس في الطريق',arrived:'المهندس وصل',in_progress:'جاري تنفيذ الصيانة',completed:'انتهت الصيانة',needs_follow:'تحتاج زيارة متابعة',closed:'انتهت الصيانة',cancelled:'ملغي'};
