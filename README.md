# ECHO CARE – النسخة الحقيقية

نظام إدارة طلبات الصيانة لشركة ECHO HEATING SOLUTIONS.

## الصفحات

| الرابط | لمين |
| --- | --- |
| `/` (index.html) | العملاء: طلب صيانة، متابعة الطلب، الموافقة على السعر والموعد، التقييم |
| `/staff.html` | فريق العمل: مدير الصيانة ومهندسو الصيانة (تسجيل دخول) |

## مكان البيانات

- قاعدة البيانات والصور على Supabase، في مشروع **ECHO CARE** داخل حساب ECHO HEATING SOLUTIONS.
- ملف `supabase/schema.sql` فيه قاعدة البيانات كاملة: الجداول والصلاحيات والوظائف والتخزين. الملف ده متطبّق على المشروع بالفعل، ومحفوظ هنا كمرجع.
- كل الصلاحيات متطبقة جوه قاعدة البيانات نفسها. المفتاح اللي في `config.js` مفتاح عام، وده طبيعي وآمن.

## الروابط الرسمية

- العملاء: https://care.echoheatingsolutions.com
- فريق العمل: https://care.echoheatingsolutions.com/staff.html

## الاستضافة: Cloudflare Pages (مجاني)

- المشروع اسمه `echo-care` على Cloudflare Pages، ومربوط بالمستودع ده على GitHub (فرع `main`).
- الإعدادات: Root directory = `web`، ومفيش Build command.
- أي تعديل يتعمله push على `main` بيتنشر لوحده خلال دقيقة.
- الدومين `care.echoheatingsolutions.com` مربوط بسطر CNAME في cPanel ← Zone Editor بيشاور على `echo-care.pages.dev`. متمسحش السطر ده.

## إعدادات Supabase المطلوبة مرة واحدة

من لوحة Supabase، افتح مشروع ECHO CARE:

1. **Authentication ← Sign In / Providers ← Email**: اقفل «Confirm email». مفيش أي حساب جديد بيشوف بيانات قبل موافقة مدير الصيانة، وخدمة البريد المجانية في Supabase محدودة جدًا.
2. **Authentication ← URL Configuration**: Site URL = `https://care.echoheatingsolutions.com`.

## أول مدير صيانة

1. افتح `staff.html`، واختار «مهندس جديد؟ أنشئ حسابك»، وسجّل حسابك.
2. شغّل الأمر ده في Supabase من SQL Editor، بعد ما تحط بريدك مكان البريد اللي فيه:
   ```sql
   update public.profiles set role = 'manager', is_active = true where email = 'your@email.com';
   ```
3. بعد كده، أي مهندس ينشئ حسابه من نفس الرابط، وانت توافق عليه من صفحة «المهندسون».

## نسيان كلمة المرور

من Supabase افتح Authentication ← Users، واختار المستخدم، وبعدين Send password recovery أو غيّر كلمة المرور.

## الشغل اليومي

- تطبيق الويب ده بيتحمّل مرة واحدة ومش محتاج سيرفر خاص.
- الخطة المجانية في Supabase بتوقّف المشروع لو فضل أسبوع من غير أي استخدام، والنسخ الاحتياطي اليومي موجود في خطة Pro بس. مع بداية الاستخدام الفعلي مع العملاء، يُفضّل الترقية لـ Pro.
