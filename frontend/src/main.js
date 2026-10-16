import './style.css';

const $ = (s) => document.querySelector(s);
const KEY = 'openshorts.backend';
const DEFAULT = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
let backend = (localStorage.getItem(KEY) || DEFAULT).replace(/\/$/, '');
let tab = 'url';

const PLATFORM = { youtube_shorts: 'YouTube Shorts', tiktok: 'TikTok', reels: 'Instagram Reels' };
const STATE_AR = { queued: 'في الانتظار', running: 'قيد المعالجة', done: 'اكتمل', error: 'خطأ' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function checkHealth() {
  const el = $('#status');
  el.className = 'pill';
  el.textContent = 'جارٍ الاتصال…';
  try {
    const r = await fetch(`${backend}/api/health`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    el.className = 'pill ok';
    el.textContent = j.llm ? 'متصل · تقييم ذكي' : 'متصل · وضع تلقائي';
    return true;
  } catch {
    el.className = 'pill bad';
    el.textContent = 'الخادم غير متاح';
    return false;
  }
}

// tabs
document.querySelectorAll('.tab').forEach((b) =>
  b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tab').forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-selected', x === b);
    });
    document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab));
  })
);
$('#file').addEventListener('change', (e) => {
  const f = e.target.files[0];
  $('#fileName').textContent = f ? `${f.name} (${(f.size / 1048576).toFixed(1)} MB)` : 'اسحب الملف هنا أو اضغط للاختيار';
});

// settings
const dlg = $('#settings');
$('#openSettings').addEventListener('click', () => {
  $('#backendUrl').value = backend;
  dlg.showModal();
});
dlg.addEventListener('close', () => {
  if (dlg.returnValue === 'save') {
    backend = ($('#backendUrl').value.trim() || DEFAULT).replace(/\/$/, '');
    localStorage.setItem(KEY, backend);
    checkHealth();
  }
});

function showError(msg) {
  const e = $('#formError');
  e.textContent = msg;
  e.hidden = !msg;
}

$('#jobForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  showError('');
  const f = ev.target;
  const fd = new FormData();
  if (tab === 'url') {
    const url = f.url.value.trim();
    if (!/^https?:\/\//.test(url)) return showError('أدخل رابطًا صحيحًا يبدأ بـ https://');
    fd.append('url', url);
  } else {
    const file = f.file.files[0];
    if (!file) return showError('اختر ملف فيديو أولًا');
    fd.append('file', file);
  }
  for (const k of ['platform', 'num_clips', 'min_len', 'max_len', 'language']) fd.append(k, f[k].value);
  fd.append('subtitles', f.subtitles.checked);
  fd.append('face_crop', f.face_crop.checked);

  const btn = $('#submit');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'جارٍ الإرسال…';
  try {
    const r = await fetch(`${backend}/api/jobs`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
    const { id } = await r.json();
    poll(id);
  } catch (e) {
    showError(`تعذّر الاتصال بالخادم (${backend}). تأكد من تشغيله ومن إعدادات CORS. ${e.message || ''}`);
    btn.disabled = false;
    btn.querySelector('span').textContent = 'ابدأ إنشاء المقاطع';
  }
});

async function poll(id) {
  $('#progress').hidden = false;
  $('#results').hidden = true;
  $('#progress').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const btn = $('#submit');
  while (true) {
    let j;
    try {
      j = await (await fetch(`${backend}/api/jobs/${id}`)).json();
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    $('#jobState').textContent = STATE_AR[j.status] || j.status;
    $('#jobState').className = 'pill ' + (j.status === 'done' ? 'ok' : j.status === 'error' ? 'bad' : '');
    $('#log').innerHTML = j.log.map((l) => `<li>${esc(l)}</li>`).join('');
    if (j.status === 'done' || j.status === 'error') {
      $('#progress').classList.add('finished');
      btn.disabled = false;
      btn.querySelector('span').textContent = 'ابدأ إنشاء المقاطع';
      if (j.status === 'error') showError(`فشلت المعالجة: ${j.error}`);
      else render(id, j.result);
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function render(id, res) {
  $('#results').hidden = false;
  $('#resultMeta').textContent = `${res.clips.length} مقطع · ${PLATFORM[res.platform]} · ${res.scoring === 'llm' ? 'تقييم ذكي' : 'تقييم تلقائي'} · ${res.elapsed_sec} ث`;
  const fileUrl = (n) => `${backend}/api/jobs/${id}/files/${encodeURIComponent(n)}`;
  $('#clips').innerHTML = res.clips
    .map((c, i) => {
      const tags = (c.hashtags || []).join(' ');
      const caption = `${c.title}\n\n${c.description}\n\n${tags}`;
      return `<article class="clip card">
        <video src="${fileUrl(c.file)}" controls preload="metadata" playsinline></video>
        <div class="clip-body">
          <div class="row between"><strong>مقطع ${i + 1}</strong><span class="score" title="درجة الانتشار">${c.score ?? '-'}</span></div>
          <p class="muted small" dir="ltr">${c.start.toFixed(1)}s → ${c.end.toFixed(1)}s · ${c.duration}s</p>
          <h3>${esc(c.title)}</h3>
          <p class="small">${esc(c.description)}</p>
          <p class="tags" dir="ltr">${esc(tags)}</p>
          <div class="row gap wrapline">
            <a class="btn primary sm" href="${fileUrl(c.file)}" download>تنزيل MP4</a>
            <button class="btn ghost sm" type="button" data-copy="${esc(caption)}">نسخ الوصف</button>
          </div>
        </div>
      </article>`;
    })
    .join('');
  $('#clips').querySelectorAll('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = 'تم النسخ';
      setTimeout(() => (b.textContent = 'نسخ الوصف'), 1500);
    })
  );
}

checkHealth();
