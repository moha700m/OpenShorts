// Floating "Backend / الخادم" settings panel (Arabic RTL). moha700m/OpenShorts addition.
// Lets a phone user point the static Cloudflare Pages dashboard at their own backend + access token.
import { API_BASE_URL, ACCESS_TOKEN, saveBackendSettings } from './config';

const css = `
#os-backend-btn{position:fixed;inset-inline-start:14px;bottom:14px;z-index:99999;font:600 14px 'IBM Plex Sans Arabic',system-ui,sans-serif;
 background:#0f172a;color:#fbbf24;border:1px solid #334155;border-radius:999px;padding:10px 16px;min-height:44px;cursor:pointer;box-shadow:0 6px 20px rgb(0 0 0/.3)}
#os-backend-dlg{direction:rtl;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;border:1px solid #334155;border-radius:14px;background:#0f172a;color:#f1f5f9;padding:22px;width:min(440px,92vw)}
#os-backend-dlg::backdrop{background:rgb(0 0 0/.55)}
#os-backend-dlg label{display:block;margin:12px 0 6px;font-weight:500}
#os-backend-dlg input{width:100%;box-sizing:border-box;font:inherit;direction:ltr;background:#020617;color:inherit;border:1px solid #334155;border-radius:10px;padding:11px 12px;min-height:44px}
#os-backend-dlg .row{display:flex;gap:10px;margin-top:18px}
#os-backend-dlg button{font:inherit;min-height:44px;border-radius:10px;padding:8px 16px;cursor:pointer;border:1px solid #334155;background:transparent;color:inherit}
#os-backend-dlg button.p{background:#f59e0b;color:#0f172a;border-color:#f59e0b;font-weight:700}
#os-backend-dlg p{color:#94a3b8;margin:6px 0 0;font-size:14px;line-height:1.7}
#os-backend-dlg .st{margin-top:10px;font-size:14px}`;

function mount() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const btn = document.createElement('button');
  btn.id = 'os-backend-btn';
  btn.type = 'button';
  btn.textContent = 'الخادم';
  btn.setAttribute('aria-haspopup', 'dialog');
  const dlg = document.createElement('dialog');
  dlg.id = 'os-backend-dlg';
  dlg.setAttribute('aria-label', 'إعدادات الخادم');
  dlg.innerHTML = `<form method="dialog">
    <h2 style="margin:0;font-size:20px">إعدادات الخادم</h2>
    <p>المعالجة تتم على خادم OpenShorts الخاص بك. ضع عنوانه (https) ورمز الوصول ثم احفظ.</p>
    <label for="os-b">عنوان الخادم</label><input id="os-b" type="url" placeholder="https://..." autocomplete="off">
    <label for="os-t">رمز الوصول</label><input id="os-t" type="password" autocomplete="off" placeholder="OPENSHORTS_ACCESS_TOKEN">
    <div class="st" id="os-st" role="status"></div>
    <div class="row"><button class="p" value="save">حفظ وإعادة التحميل</button><button type="button" id="os-test">اختبار</button><button value="cancel">إغلاق</button></div>
  </form>`;
  document.body.append(btn, dlg);
  const $ = (id) => dlg.querySelector(id);
  btn.onclick = () => { $('#os-b').value = API_BASE_URL; $('#os-t').value = ACCESS_TOKEN; $('#os-st').textContent = ''; dlg.showModal(); };
  $('#os-test').onclick = async () => {
    const b = $('#os-b').value.trim().replace(/\/$/, '');
    const st = $('#os-st');
    st.textContent = 'جارٍ الاختبار…';
    try {
      const h = await fetch(`${b}/health`);
      if (!h.ok) throw new Error(h.status);
      const r = await fetch(`${b}/api/saasshorts/gallery?limit=1`, { headers: { 'X-OpenShorts-Token': $('#os-t').value.trim() } });
      st.textContent = r.status === 401 ? 'الخادم متصل لكن رمز الوصول غير صحيح' : 'متصل بنجاح ✓';
    } catch (e) { st.textContent = `تعذّر الاتصال بالخادم (${e.message || e})`; }
  };
  dlg.addEventListener('close', () => {
    if (dlg.returnValue === 'save') { saveBackendSettings($('#os-b').value, $('#os-t').value); location.reload(); }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
}
