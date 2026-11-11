'use strict';
/* ECHO CARE – staff app: maintenance manager + maintenance engineers */
const GROUPS={new:['new'],pending:['pending'],confirmed:['confirmed'],assigned:['assigned'],inprog:['accepted','on_the_way','arrived','in_progress','needs_follow'],done:['completed','closed'],cancelled:['cancelled']};
const GROUP_LABEL={new:'جديد',pending:'بانتظار التأكيد',confirmed:'مؤكد',assigned:'مُسند',inprog:'قيد التنفيذ',done:'مكتمل',cancelled:'ملغي'};
const ACTIVE_TECH=['assigned','accepted','on_the_way','arrived','in_progress'];
const REASSIGNABLE=['confirmed','assigned','accepted','on_the_way'];
const CANCELLABLE=['new','pending','confirmed','assigned','accepted','on_the_way','arrived'];
const NEXT={assigned:['accepted','قبول المهمة'],accepted:['on_the_way','بدأت التحرك'],on_the_way:['arrived','وصلت الموقع'],arrived:['in_progress','بدء التنفيذ']};
const TECH_STEPS=[['assigned','مُسند'],['accepted','تم القبول'],['on_the_way','في الطريق'],['arrived','وصلت'],['in_progress','جاري التنفيذ'],['done','اكتمل']];
const REP_FIELDS={problem_type:'نوع المشكلة',problem_description:'وصف المشكلة',work_done:'الأعمال المنفذة',engineer_notes:'ملاحظات المهندس',parts_replaced:'قطع الغيار',parts:'قطع الغيار',outcome:'نتيجة الصيانة',deleted_at:'حذف التقرير'};

const D={session:null,me:null,staff:[],engs:[],reqs:[],reps:{},fbs:{},notifs:[],loaded:false,err:''};
const S={auth:'login',mv:'dash',tv:'jobs',sel:null,selRep:null,selCust:null,mEdit:null,toast:'',busy:false,err:'',uploading:false,ttab:'today',confirmDel:null,fbLinks:{},offline:!navigator.onLine};
const urlCache={};
const app=document.getElementById('app');

const engName=id=>{const p=D.staff.find(x=>x.id===id);return p?p.full_name:''};
const reqById=id=>D.reqs.find(r=>r.id===id);
const isMgr=()=>D.me&&D.me.role==='manager'&&D.me.is_active;
const isTech=()=>D.me&&D.me.role==='technician'&&D.me.is_active;
function toast(t){S.toast=t;render();clearTimeout(toast._t);toast._t=setTimeout(()=>{S.toast='';render()},4000)}

/* ---------- data ---------- */
function normalize(s){
  const staff=s.staff||[];D.me=s.me||null;D.staff=staff;
  D.engs=staff.filter(p=>p.role==='technician').map(p=>({id:p.id,name:p.full_name,phone:p.phone,email:p.email,active:p.is_active,createdAt:p.created_at}));
  const noOf={};(s.requests||[]).forEach(r=>noOf[r.id]=r.request_no);
  const att={};(s.attachments||[]).forEach(a=>{(att[a.request_id]=att[a.request_id]||[]).push({path:a.storage_path,kind:a.mime&&a.mime.startsWith('video/')||/\.(mp4|mov|webm|quicktime)$/i.test(a.storage_path)?'video':'image',type:a.kind,url:urlCache[a.storage_path]&&urlCache[a.storage_path].url||''})});
  const hist={};(s.history||[]).forEach(h=>{(hist[h.request_id]=hist[h.request_id]||[]).push({s:h.to_status,at:h.created_at,by:h.actor_name,note:h.note})});
  D.reqs=(s.requests||[]).map(r=>({uuid:r.id,id:r.request_no,customer:{name:r.customer_name,phone:r.customer_phone,email:r.customer_email},gov:r.governorate,area:r.area,address:r.address,map:r.map_url,system:r.system_type,service:r.service_type,desc:r.description,
    media:(att[r.id]||[]).filter(m=>m.type==='customer'),prefDate:r.preferred_date,slot:r.preferred_slot||'',notes:r.customer_notes,status:r.status,priority:r.priority,price:r.price==null?null:Number(r.price),appt:toLocalStr(r.appointment),
    engId:r.assigned_engineer_id||'',mgrNotes:r.manager_notes||'',followUpOf:noOf[r.follow_up_of]||'',followUpId:noOf[r.follow_up_id]||'',cancelReason:r.cancel_reason,changeReq:r.change_request,confirmedBy:r.confirmed_by,
    history:hist[r.id]||[],createdAt:r.created_at,updatedAt:r.updated_at}));
  const audit={};(s.audit||[]).forEach(l=>{const no=noOf[l.request_id];if(!no)return;const changed=l.action==='delete'?['حذف التقرير']:l.action==='hard_delete'?['استبدال تقرير محذوف']:Object.keys(REP_FIELDS).filter(k=>k!=='deleted_at'&&l.old&&l.new&&JSON.stringify(l.old[k])!==JSON.stringify(l.new[k])).map(k=>REP_FIELDS[k]);(audit[no]=audit[no]||[]).push({at:l.created_at,by:l.actor_name,changed:[...new Set(changed)]})});
  D.reps={};(s.reports||[]).forEach(p=>{const no=noOf[p.request_id];if(!no)return;const a=att[p.request_id]||[];
    D.reps[no]={id:no,engId:p.engineer_id,problemType:p.problem_type,problemDesc:p.problem_description,workDone:p.work_done,engNotes:p.engineer_notes,partsChanged:p.parts_replaced,parts:(p.parts||[]).map(x=>({name:x.name,qty:x.qty,notes:x.notes||''})),outcome:p.outcome,before:a.filter(m=>m.type==='before'),after:a.filter(m=>m.type==='after'),submittedAt:p.submitted_at,review:p.review_status,deletedAt:p.deleted_at,edits:audit[no]||[]}});
  D.fbs={};(s.feedback||[]).forEach(f=>{const no=noOf[f.request_id];if(no)D.fbs[no]={id:no,engId:f.engineer_id,sentAt:f.sent_at,q:f.service_quality,p:f.punctuality,pr:f.professionalism,o:f.overall,comment:f.comment,submittedAt:f.submitted_at}});
  D.notifs=(s.notifications||[]).map(n=>({id:n.id,to:n.audience==='manager'?'manager':'eng:'+n.recipient_id,text:n.body,reqId:noOf[n.request_id]||'',read:!!n.read_at,at:n.created_at}));
}
async function signUrls(){
  const all=[];D.reqs.forEach(r=>{r.media.forEach(m=>all.push(m));const p=D.reps[r.id];if(p){p.before.forEach(m=>all.push(m));p.after.forEach(m=>all.push(m))}});
  const now=Date.now();const need=[...new Set(all.filter(m=>!urlCache[m.path]||urlCache[m.path].exp<now).map(m=>m.path))];
  if(need.length){for(let i=0;i<need.length;i+=100){const {data}=await sb.storage.from('media').createSignedUrls(need.slice(i,i+100),3600);(data||[]).forEach(x=>{if(x.signedUrl)urlCache[x.path]={url:x.signedUrl,exp:now+50*60000}})}}
  all.forEach(m=>{if(urlCache[m.path])m.url=urlCache[m.path].url});
}
let refreshing=null,again=false;
async function refresh(){
  if(refreshing){again=true;return refreshing}
  refreshing=(async()=>{try{const s=await rpc('staff_snapshot');normalize(s);D.loaded=true;D.err='';render();await signUrls();render()}catch(e){console.error(e);D.err=errMsg(e);render()}finally{refreshing=null;if(again){again=false;refresh()}}})();
  return refreshing;
}
let rtTimer=null,channel=null;
function subscribe(){
  if(channel)return;
  const kick=()=>{clearTimeout(rtTimer);rtTimer=setTimeout(refresh,400)};
  channel=sb.channel('echo-care-staff');
  ['requests','notifications','service_reports','profiles','feedback'].forEach(t=>channel.on('postgres_changes',{event:'*',schema:'public',table:t},kick));
  channel.subscribe();
  setInterval(()=>{if(!document.hidden)refresh()},60000);
}
async function run(fn){if(S.busy)return;S.busy=true;S.err='';render();try{await fn();await refresh()}catch(e){console.error(e);toast(errMsg(e))}finally{S.busy=false;render()}}
const R_=id=>{const r=reqById(id);if(!r)throw new Error('not_found');return r};

/* ---------- render ---------- */
function render(){
  const a=document.activeElement;const id=a&&a.id;let ss=null,se=null;try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}
  const y=window.scrollY;
  app.innerHTML=(S.offline?'<div class="offline">لا يوجد اتصال بالإنترنت. سيتم التحديث عند عودة الاتصال.</div>':'')+body()+(S.toast?`<div class="toast" role="status">${esc(S.toast)}</div>`:'');
  if(id){const n=document.getElementById(id);if(n){try{n.focus({preventScroll:true});if(ss!=null&&n.setSelectionRange)n.setSelectionRange(ss,se)}catch(e){}}}
  if(Math.abs(window.scrollY-y)>2)window.scrollTo(0,y);
}
function body(){
  if(!sb)return `<div class="pad" style="max-width:560px;margin:0 auto"><div class="empty">تعذّر تحميل الصفحة. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.</div></div>`;
  if(D.session===undefined)return `<div class="pad"><div class="empty">جاري التحميل…</div></div>`;
  if(!D.session)return authView();
  if(!D.loaded)return `<div class="pad" style="max-width:560px;margin:0 auto"><div class="empty">${D.err?esc(D.err):'جاري تحميل البيانات…'}</div></div>`;
  if(isMgr())return managerView();
  if(isTech())return techView();
  return `<div class="auth"><div class="hero"><img src="assets/logo-light.svg" alt="Echo"><span style="font-size:13px;letter-spacing:.14em;color:var(--s)">ECHO CARE</span></div><div class="pad">
   <h1>حسابك بانتظار الموافقة</h1><p style="margin:0;line-height:1.7">${D.me&&D.me.role!=='pending'?'هذا الحساب معطّل حاليًا.':'تم إنشاء حسابك. سيوافق عليه مدير الصيانة، وبعدها تظهر لك مهامك هنا تلقائيًا.'}</p>
   <button type="button" class="btn gh" data-a="reload">تحديث</button><button type="button" class="lnk" data-a="logout">تسجيل الخروج</button></div></div>`;
}
function authView(){
  const L=ensure('login',{email:'',password:''}),U=ensure('signup',{name:'',phone:'',email:'',password:''});
  const up=S.auth==='signup';
  return `<div class="auth"><div class="hero"><img src="assets/logo-light.svg" alt="Echo"><span style="font-size:13px;letter-spacing:.14em;color:var(--s)">ECHO CARE</span><span style="font-size:14px;color:var(--s40)">Smart Maintenance Management</span></div>
  <form onsubmit="return false">
   <div style="display:flex;flex-direction:column;gap:6px"><h1>${up?'إنشاء حساب لفريق العمل':'تسجيل الدخول'}</h1><span class="k" style="font-size:14px">${up?'بعد إنشاء الحساب يوافق عليه مدير الصيانة.':'لفريق Echo فقط: مدير الصيانة ومهندسو الصيانة.'}</span></div>
   ${up?`<label class="fld">الاسم بالكامل${I('signup.name',{extra:'autocomplete="name"'})}</label><label class="fld">رقم الموبايل${I('signup.phone',{type:'tel',extra:'inputmode="tel" style="direction:ltr;text-align:right"'})}</label><label class="fld">البريد الإلكتروني${I('signup.email',{type:'email',extra:'autocomplete="username" style="direction:ltr;text-align:right"'})}</label><label class="fld"><span>كلمة المرور <span class="opt">(8 أحرف على الأقل)</span></span>${I('signup.password',{type:'password',extra:'autocomplete="new-password"'})}</label>`
   :`<label class="fld">البريد الإلكتروني${I('login.email',{type:'email',extra:'autocomplete="username" style="direction:ltr;text-align:right"'})}</label><label class="fld">كلمة المرور${I('login.password',{type:'password',extra:'autocomplete="current-password"'})}</label>`}
   ${S.err?`<div class="warn" role="alert">${esc(S.err)}</div>`:''}
   <button type="submit" class="btn" style="min-height:52px" data-a="${up?'signup':'login'}" ${S.busy?'disabled':''}>${up?'إنشاء الحساب':'دخول'}</button>
   <button type="button" class="lnk" data-a="authMode" data-v="${up?'login':'signup'}">${up?'لديّ حساب بالفعل · تسجيل الدخول':'مهندس جديد؟ أنشئ حسابك'}</button>
   <span class="k" style="text-align:center;line-height:1.6;margin-top:auto">نسيت كلمة المرور؟ تواصل مع مدير الصيانة.</span></form></div>`;
}
