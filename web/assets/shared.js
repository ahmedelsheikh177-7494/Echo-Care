'use strict';
/* ECHO CARE – shared constants and helpers (customer + staff pages) */
const CFG = window.ECHO_CONFIG || {};
const SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
const sb = (window.supabase && CFG.supabaseUrl) ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

const SYS=[['central','تدفئة مركزية','Central Heating'],['underfloor','تدفئة أرضية','Underfloor Heating'],['radiator','تدفئة بالردياتير','Radiator Heating'],['boiler','غلاية غاز','Gas Boiler'],['heatpump','مضخة حرارية','Heat Pump'],['hotwater','مياه ساخنة مركزية','Central Hot Water'],['pool','تدفئة حمامات السباحة','Pool Heating'],['other','أخرى','Other']];
const SVC=[['periodic','صيانة دورية','Periodic Maintenance'],['repair','إصلاح عطل','Repair'],['inspection','معاينة فنية','Technical Inspection'],['emergency','صيانة طارئة','Emergency Maintenance']];
const PT=[['technical','عطل فني','Technical Failure'],['periodic','صيانة دورية','Periodic Maintenance'],['installation','مشكلة تركيب','Installation Issue'],['operating','خطأ تشغيل','Operating Error'],['part','قطعة غيار تالفة','Damaged Spare Part'],['other','أخرى','Other']];
const OUT=[['resolved','تم حل المشكلة بالكامل','Resolved'],['partial','تم حل جزء من المشكلة','Partially Resolved'],['not','لم يتم حل المشكلة','Not Resolved'],['followup','يحتاج زيارة أخرى','Requires Follow-up Visit'],['parts','يحتاج قطع غيار','Requires Spare Parts']];
const GOV=['القاهرة','الجيزة','الإسكندرية','القليوبية','الدقهلية','الشرقية','الغربية','المنوفية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','شمال سيناء','جنوب سيناء','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','الوادي الجديد','مطروح'];
const SLOT=[['morning','صباحًا','9 – 12'],['noon','ظهرًا','12 – 4'],['evening','مساءً','4 – 8']];
const PRI=[['normal','عادية'],['high','مرتفعة'],['urgent','عاجلة']];
const ST={new:['جديد','s-new'],pending:['بانتظار التأكيد','s-pending'],confirmed:['مؤكد','s-confirmed'],assigned:['مُسند','s-assigned'],accepted:['تم القبول','s-prog'],on_the_way:['في الطريق','s-prog'],arrived:['وصل الموقع','s-prog'],in_progress:['جاري التنفيذ','s-prog'],completed:['مكتمل','s-done'],needs_follow:['يحتاج متابعة','s-follow'],closed:['مغلق','s-done'],cancelled:['ملغي','s-cancel']};

const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lab=(arr,k)=>{const x=arr.find(a=>a[0]===k);return x?x[1]:(k||'—')};
const LOC='ar-EG-u-nu-latn';
function fmtDT(iso){if(!iso)return '—';const d=new Date(iso);if(isNaN(d))return '—';return d.toLocaleString(LOC,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function fmtD(s){if(!s)return '—';const d=new Date(String(s).length<=10?s+'T00:00':s);if(isNaN(d))return '—';return d.toLocaleDateString(LOC,{weekday:'short',day:'numeric',month:'short'})}
function fmtAppt(a){if(!a)return '—';const d=new Date(a);if(isNaN(d))return '—';return d.toLocaleString(LOC,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
function ago(iso){if(!iso)return '';const m=Math.round((Date.now()-new Date(iso))/60000);if(m<1)return 'الآن';if(m<60)return 'منذ '+m+' دقيقة';const h=Math.round(m/60);if(h<24)return 'منذ '+h+' ساعة';return fmtDT(iso)}
const pad2=n=>String(n).padStart(2,'0');
function localDate(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function today(){return localDate(new Date())}
// timestamptz -> local "YYYY-MM-DDTHH:MM" (so date comparisons happen in the user's time zone)
function toLocalStr(iso){if(!iso)return null;const d=new Date(iso);if(isNaN(d))return null;return localDate(d)+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes())}
function toLatinDigits(s){return String(s||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6F0))}
function normPhone(p){let d=toLatinDigits(p).replace(/[^\d]/g,'');if(d.startsWith('0020'))d=d.slice(4);if(d.startsWith('20')&&d.length===12)d=d.slice(2);if(d.length===10&&d[0]==='1')d='0'+d;return d}
const validPhone=p=>/^01[0125]\d{8}$/.test(p);
const waLink=(phone,text)=>'https://wa.me/20'+String(phone||'').replace(/^0/,'')+'?text='+encodeURIComponent(text);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chip=st=>{const x=ST[st]||[st,'s-new'];return `<span class="chip ${x[1]}">${esc(x[0])}</span>`};
const priChip=p=>p==='urgent'?'<span class="chip s-urgent">عاجل</span>':p==='high'?'<span class="chip s-follow">أولوية مرتفعة</span>':'';
function safeUrl(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:'#'}
function uuid(){return (crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)))}
function randName(ext){const a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')+'.'+ext}

/* form drafts: inputs write into drafts[form][field]; screens re-render from them */
const drafts={};
function getD(f){return drafts[f]||(drafts[f]={})}
function ensure(f,def){if(!drafts[f])drafts[f]=JSON.parse(JSON.stringify(def));return drafts[f]}
const gv=path=>{const i=path.indexOf('.');const f=path.slice(0,i),k=path.slice(i+1);const v=(drafts[f]||{})[k];return v==null?'':v};
const fid=path=>'f_'+path.replace(/[^a-zA-Z0-9]/g,'_');
function I(path,o={}){return `<input id="${fid(path)}" class="inp" type="${o.type||'text'}" data-k="${path}" value="${esc(gv(path))}" placeholder="${esc(o.ph||'')}" ${o.extra||''}>`}
function T(path,ph,rows){return `<textarea id="${fid(path)}" class="inp" rows="${rows||3}" data-k="${path}" placeholder="${esc(ph||'')}">${esc(gv(path))}</textarea>`}
function SEL(path,opts,o={}){const v=gv(path);return `<select id="${fid(path)}" class="inp" data-k="${path}" ${o.extra||''}>${o.blank!=null?`<option value="">${esc(o.blank)}</option>`:''}${opts.map(x=>`<option value="${esc(x[0])}" ${String(x[0])===String(v)?'selected':''}>${esc(x[1])}</option>`).join('')}</select>`}
function mediaThumbs(list,rmPath){return (list||[]).map((m,i)=>`<div class="th">${!m.url?'<span>…</span>':m.kind==='video'?`<a href="${esc(m.url)}" target="_blank" rel="noopener" style="display:block;width:100%;height:100%"><video src="${esc(m.url)}" muted playsinline preload="metadata"></video></a>`:`<a href="${esc(m.url)}" target="_blank" rel="noopener" style="display:block;width:100%;height:100%"><img src="${esc(m.url)}" alt="صورة ${i+1}" loading="lazy"></a>`}${rmPath?`<button type="button" class="x" data-a="rmMedia" data-v="${rmPath}|${i}" aria-label="حذف">×</button>`:''}</div>`).join('')}
function upBox(path,label,accept){return `<label class="up">＋<span>${esc(label)}</span><input type="file" accept="${accept}" multiple data-up="${path}"></label>`}

async function compress(file){
  try{const bmp=await createImageBitmap(file);const max=1280;const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.75));return b||file}catch(e){return file}
}
// uploads files into the private "media" bucket under prefix; returns [{path,url,kind}] (url = local preview)
async function uploadMedia(prefix,files,list,onProgress){
  const imgs=list.filter(m=>m.kind!=='video').length, vids=list.filter(m=>m.kind==='video').length;let addI=0,addV=0;const out=[];const notes=[];
  for(const file of Array.from(files)){
    const isV=file.type.startsWith('video/');
    if(isV){if(vids+addV>=1){notes.push('مسموح بفيديو واحد فقط.');continue}if(file.size>20*1024*1024){notes.push('الفيديو أكبر من 20 ميجا. صوّر فيديو أقصر (حتى 30 ثانية).');continue}}
    else{if(!file.type.startsWith('image/')){notes.push('نوع الملف غير مدعوم.');continue}if(imgs+addI>=5){notes.push('الحد الأقصى 5 صور.');continue}}
    const blob=isV?file:await compress(file);
    const ext=isV?((file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'')||'mp4'):'jpg';
    const path=prefix+randName(ext);
    const {error}=await sb.storage.from('media').upload(path,blob,{contentType:isV?(file.type||'video/mp4'):'image/jpeg',upsert:false});
    if(error){notes.push('تعذّر رفع ملف. حاول مرة أخرى.');continue}
    const item={path,url:URL.createObjectURL(blob),kind:isV?'video':'image'};list.push(item);out.push(item);isV?addV++:addI++;if(onProgress)onProgress();
  }
  return notes;
}

const ERRORS={invalid_name:'اكتب الاسم بالكامل.',invalid_phone:'رقم الموبايل غير صحيح. مثال: 01012345678',invalid_email:'البريد الإلكتروني غير صحيح.',invalid_address:'اكتب المنطقة والعنوان بالتفصيل.',invalid_description:'اكتب وصفًا للمشكلة.',invalid_date:'اختر تاريخًا من اليوم أو بعده.',invalid_media:'أحد الملفات غير صالح. احذفه وارفعه مرة أخرى.',too_many_requests:'تم إرسال طلبات كثيرة من هذا الرقم اليوم. تواصل معنا هاتفيًا.',invalid_state:'لا يمكن تنفيذ هذا الإجراء في حالة الطلب الحالية. حدّث الصفحة.',not_found:'غير موجود.',not_allowed:'ليست لديك صلاحية لهذا الإجراء.',invalid_engineer:'المهندس غير نشط.',report_not_reviewed:'راجع التقرير أولًا.',already_reviewed:'تمت مراجعة التقرير ولا يمكن تعديله الآن.',already_submitted:'تم إرسال التقييم من قبل.',invalid_parts:'اكتب اسم وكمية كل قطعة غيار.',invalid_input:'راجع البيانات المدخلة.',cannot_change_self:'لا يمكنك تغيير صلاحياتك بنفسك.'};
function errMsg(e){const m=String((e&&(e.message||e.error_description||e))||'');for(const k in ERRORS){if(m.includes(k))return ERRORS[k]}if(/Failed to fetch|NetworkError|network/i.test(m))return 'لا يوجد اتصال بالإنترنت. حاول مرة أخرى.';return 'حدث خطأ. حاول مرة أخرى.'}
async function rpc(name,args){const {data,error}=await sb.rpc(name,args||{});if(error)throw error;return data}

/* PWA */
if('serviceWorker' in navigator&&location.protocol==='https:'){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}

/* WhatsApp to Echo customer service, pre-filled */
function waEcho(no,link,desc){const ph=CFG.companyPhone;if(!ph)return '';
  const t=no?`مرحبًا Echo 👋\nأتواصل بخصوص طلب الصيانة.\nرقم الطلب: ${no}\nرابط المتابعة: ${link}\nاستفساري: `
    :`مرحبًا Echo 👋\nأريد التواصل بخصوص صيانة التدفئة.\nالمشكلة: \nرقم الطلب (إن وُجد): \nرابط المتابعة (إن وُجد): `;
  return `<a class="btn gh wa" href="${esc(waLink(normPhone(ph),t))}" target="_blank" rel="noopener">${desc||'واتساب خدمة العملاء'}</a>`}

/* Opening motion shared by every ECHO CARE page: brand splash, then the logo glides into
   the page's own logo (whichever is visible) and the page appears. Tap to skip. */
function introSplash(onReveal){
  if(window.__ecSplash)return;window.__ecSplash=1;
  const rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d=document.createElement('div');d.className='splash';d.setAttribute('aria-hidden','true');
  d.innerHTML='<div class="sp-in"><img class="sp-logo" src="assets/logo-light.svg" alt=""><i class="sp-line"></i><span class="sp-tg">'+'ECHO CARE'.split('').map((c,i)=>'<b style="animation-delay:'+(0.6+i*0.05).toFixed(2)+'s">'+(c===' '?'&nbsp;':c)+'</b>').join('')+'</span></div>';
  document.body.appendChild(d);document.documentElement.classList.add('intro');
  const target=()=>[...document.querySelectorAll('#app img[src*="logo-light"]')].find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight});
  let stage=0,tg=null;
  const reveal=()=>{if(stage>1)return;stage=2;document.documentElement.classList.remove('intro');
    if(tg)tg.style.visibility='';if(onReveal)try{onReveal()}catch(e){}
    d.classList.add('gone');setTimeout(()=>d.remove(),500)};
  const glide=()=>{if(stage)return;stage=1;d.classList.add('leave');
    const lg=d.querySelector('.sp-logo');tg=target();
    if(lg&&tg){lg.style.animation='none';tg.style.visibility='hidden';const a=lg.getBoundingClientRect(),b=tg.getBoundingClientRect();
      lg.style.transform=`translate(${(b.left+b.width/2)-(a.left+a.width/2)}px,${(b.top+b.height/2)-(a.top+a.height/2)}px) scale(${b.height/a.height})`;setTimeout(reveal,750)}
    else{lg.style.transition='opacity .4s';lg.style.opacity='0';setTimeout(reveal,350)}};
  d.addEventListener('click',()=>{stage=1;reveal()});
  if(rm)setTimeout(reveal,300);else setTimeout(glide,1700);
}
