/* ---------- actions ---------- */
const ACT={
  authMode(v){S.auth=v;S.err='';render()},
  async login(){const L=getD('login');S.err='';if(!L.email||!L.password){S.err='اكتب البريد وكلمة المرور.';render();return}
    S.busy=true;render();const {error}=await sb.auth.signInWithPassword({email:L.email.trim(),password:L.password});S.busy=false;
    if(error){S.err=/confirm/i.test(error.message)?'لم يتم تأكيد البريد بعد.':'البريد أو كلمة المرور غير صحيحة.';render();return}drafts.login=null},
  async signup(){const U=getD('signup');S.err='';const ph=normPhone(U.phone);
    if((U.name||'').trim().length<3)S.err='اكتب الاسم بالكامل.';else if(!validPhone(ph))S.err='رقم الموبايل غير صحيح.';else if(!/^\S+@\S+\.\S+$/.test(U.email||''))S.err='البريد الإلكتروني غير صحيح.';else if((U.password||'').length<8)S.err='كلمة المرور 8 أحرف على الأقل.';
    if(S.err){render();return}
    S.busy=true;render();const {data,error}=await sb.auth.signUp({email:U.email.trim(),password:U.password,options:{data:{full_name:U.name.trim(),phone:ph}}});S.busy=false;
    if(error){S.err=/registered|exists/i.test(error.message)?'هذا البريد مسجل بالفعل. سجّل الدخول.':'تعذّر إنشاء الحساب: '+error.message;render();return}
    drafts.signup=null;if(!data.session){S.auth='login';S.err='';toast('تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.')}},
  async logout(){await sb.auth.signOut();D.loaded=false;D.me=null;render()},
  reload(){refresh()},
  print(){window.print()},
  copy(v){navigator.clipboard.writeText(v).then(()=>toast('تم نسخ الرابط.')).catch(()=>toast('انسخ الرابط: '+v))},
  pick(v){const [path,val]=v.split('|');const i=path.indexOf('.');getD(path.slice(0,i))[path.slice(i+1)]=val;S.err='';render()},
  mv(v){S.mv=v;S.err='';S.mEdit=null;if(v==='customers')S.selCust=null;render();window.scrollTo(0,0)},
  kpi(g){const F=ensure('flt',{q:'',from:'',to:'',area:'',service:'',eng:'',st:''});F.st=g==='all'?'':g;S.mv='reqs';render();window.scrollTo(0,0)},
  setSt(g){getD('flt').st=g;render()},
  openReq(id){S.mv='req';S.sel=id;S.confirmDel=null;render();window.scrollTo(0,0)},
  openRep(id){S.mv='reports';S.selRep=id;S.mEdit=null;render();window.scrollTo(0,0)},
  selRep(id){S.selRep=id;S.confirmDel=null;render()},
  openCust(p){S.mv='customers';S.selCust=p;render();window.scrollTo(0,0)},
  custList(){S.selCust=null;render()},
  anP(v){getD('an').p=v;render()},
  useChg(id){const r=reqById(id);const F=getD('rq_'+id);F.date=r.changeReq.date;F.time={morning:'10:00',noon:'13:00',evening:'17:00'}[r.changeReq.slot]||F.time;render();toast('تم وضع الموعد المطلوب. راجع الساعة ثم اضغط «تحديث السعر والموعد».')},
  savePrice(id){const r=R_(id);const F=getD('rq_'+id);const price=parseFloat(toLatinDigits(F.price));
    if(!(price>=0)){toast('اكتب سعر الزيارة.');return}if(!F.date||!F.time){toast('حدد تاريخ وساعة الزيارة.');return}
    const appt=new Date(F.date+'T'+F.time);run(async()=>{await rpc('set_price_appointment',{p_request:r.uuid,p_price:price,p_appointment:appt.toISOString()});toast('تم الحفظ. ابعت السعر والموعد للعميل.')})},
  confirmReq(id){const r=R_(id);run(async()=>{await rpc('confirm_request',{p_request:r.uuid});toast('تم تأكيد الطلب. اختر المهندس الآن.')})},
  assign(id){const r=R_(id);const F=getD('rq_'+id);if(!F.eng){toast('اختر المهندس.');return}run(async()=>{await rpc('assign_request',{p_request:r.uuid,p_engineer:F.eng,p_notes:F.notes||'',p_confirm_first:false});toast(F.eng===r.engId?'تم تحديث الملاحظات.':'تم الإسناد. ظهر الطلب عند '+engName(F.eng)+' ووصله إشعار.')})},
  assignQuick(id){const r=R_(id);const F=getD('as_'+id);if(!F.eng){toast('اختر المهندس.');return}run(async()=>{await rpc('assign_request',{p_request:r.uuid,p_engineer:F.eng,p_notes:F.notes||'',p_confirm_first:r.status==='pending'});drafts['as_'+id]=null;toast('تم الإسناد. ظهر الطلب عند '+engName(F.eng)+' ووصله إشعار.')})},
  moveJob(id){const r=R_(id);const F=getD('mv_'+id);if(!F.eng){toast('اختر المهندس.');return}run(async()=>{await rpc('assign_request',{p_request:r.uuid,p_engineer:F.eng,p_notes:r.mgrNotes||'',p_confirm_first:false});drafts['mv_'+id]=null;toast('تم التحويل إلى '+engName(F.eng)+'.')})},
  setPri(v){const [id,p]=v.split('|');const r=R_(id);if(r.priority===p)return;run(()=>rpc('set_priority',{p_request:r.uuid,p_priority:p}))},
  cancelReq(id){const r=R_(id);const F=getD('rq_'+id);if(!(F.reason||'').trim()){toast('اكتب سبب الإلغاء.');return}run(()=>rpc('cancel_request',{p_request:r.uuid,p_reason:F.reason.trim()}))},
  reviewRep(id){const r=R_(id);run(async()=>{await rpc('review_report',{p_request:r.uuid});toast('تمت المراجعة.')})},
  closeAndRate(id){const r=R_(id);run(async()=>{const t=await rpc('close_and_request_feedback',{p_request:r.uuid});S.fbLinks[id]=t;toast('تم إغلاق الطلب. أرسل رابط التقييم للعميل.')})},
  renewFb(id){const r=R_(id);run(async()=>{S.fbLinks[id]=await rpc('renew_feedback_link',{p_request:r.uuid})})},
  closeReq(id){const r=R_(id);run(()=>rpc('close_request',{p_request:r.uuid}))},
  followUp(id){const r=R_(id);run(async()=>{const res=await rpc('create_follow_up',{p_request:r.uuid});S.sel=res.request_no;toast('تم إنشاء زيارة المتابعة '+res.request_no)})},
  delRep(id){if(S.confirmDel!==id){S.confirmDel=id;render();return}S.confirmDel=null;const r=R_(id);run(async()=>{await rpc('delete_report',{p_request:r.uuid});toast('تم حذف التقرير (محفوظ في السجل).')})},
  mEditRep(id){S.mv='reports';S.mEdit=id;drafts['rep_'+id]=null;render();window.scrollTo(0,0)},
  cancelEdit(){S.mEdit=null;render()},
  approve(v){const [id,role]=v.split('|');run(async()=>{await rpc('set_staff',{p_user:id,p_role:role,p_active:true});toast('تمت الموافقة على الحساب.')})},
  toggleEng(id){const e=D.engs.find(x=>x.id===id);run(()=>rpc('set_staff',{p_user:id,p_role:'technician',p_active:!e.active}))},
  toggleMgr(id){const p=D.staff.find(x=>x.id===id);run(()=>rpc('set_staff',{p_user:id,p_role:'manager',p_active:!p.is_active}))},
  readAll(){const to=isMgr()?'manager':'eng:'+D.me.id;const ids=D.notifs.filter(n=>n.to===to&&!n.read).map(n=>n.id);if(ids.length)run(()=>rpc('mark_notifications_read',{p_ids:ids}))},
  openNotif(id){const n=D.notifs.find(x=>x.id===id);if(!n)return;if(!n.read){n.read=true;rpc('mark_notifications_read',{p_ids:[id]}).catch(()=>{})}
    if(isMgr()){if(n.reqId&&reqById(n.reqId)){S.mv='req';S.sel=n.reqId}}else{const r=reqById(n.reqId);if(r&&r.engId===D.me.id){S.tv='job';S.sel=r.id}}render();window.scrollTo(0,0)},
  tv(v){S.tv=v;S.err='';render();window.scrollTo(0,0)},
  ttab(v){S.ttab=v;S.ttabTouched=true;render()},
  openJob(id){S.tv='job';S.sel=id;render();window.scrollTo(0,0)},
  techNext(id){const r=R_(id);run(()=>rpc('tech_advance',{p_request:r.uuid}))},
  openReport(id){S.tv='report';S.sel=id;drafts['rep_'+id]=null;S.err='';render();window.scrollTo(0,0)},
  partsYN(v){const [f,b]=v.split('|');const R=getD(f);R.partsChanged=b==='1';if(R.partsChanged&&!(R.parts||[]).length)R.parts=[{name:'',qty:'1',notes:''}];render()},
  addPart(f){getD(f).parts.push({name:'',qty:'1',notes:''});render()},
  rmPart(v){const [f,i]=v.split('|');const R=getD(f);R.parts.splice(+i,1);if(!R.parts.length)R.partsChanged=false;render()},
  rmMedia(v){const [path,i]=v.split('|');const k=path.indexOf('.');const arr=getD(path.slice(0,k))[path.slice(k+1)];if(arr)arr.splice(+i,1);render()},
  submitRep(id){const f='rep_'+id;const R=getD(f);const r=R_(id);const ex=D.reps[id];const isEdit=ex&&!ex.deletedAt;S.err='';
    if(!R.problemType)S.err='اختر نوع المشكلة.';else if(!R.workDone.trim())S.err='اكتب الأعمال المنفذة.';else if(R.partsChanged==null)S.err='حدد هل تم تغيير قطع غيار.';else if(R.partsChanged&&R.parts.some(p=>!p.name.trim()||!(parseInt(p.qty,10)>0)))S.err='اكتب اسم وكمية كل قطعة غيار.';else if(!R.outcome)S.err='اختر نتيجة الصيانة.';
    if(S.err){render();return}
    const p={problem_type:R.problemType,problem_description:R.problemDesc.trim(),work_done:R.workDone.trim(),engineer_notes:R.engNotes.trim(),parts_replaced:!!R.partsChanged,parts:R.partsChanged?R.parts.map(x=>({name:x.name.trim(),qty:parseInt(x.qty,10),notes:(x.notes||'').trim()})):[],outcome:R.outcome,before:R.before.map(m=>m.path),after:R.after.map(m=>m.path)};
    run(async()=>{await rpc('save_report',{p_request:r.uuid,p});drafts[f]=null;
      if(isMgr()){S.mEdit=null;toast('تم حفظ التعديلات وتسجيلها.')}else{S.tv='job';toast(isEdit?'تم حفظ التعديلات وتسجيلها.':'تم إرسال التقرير للمدير.')}})}
};

