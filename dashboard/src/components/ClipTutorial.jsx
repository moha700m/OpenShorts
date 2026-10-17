import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutDashboard, Sparkles } from 'lucide-react';
import Modal from './ui/Modal';

const TOUR = [
  {
    target: '[data-tutorial="nav-clips"]',
    title: "مولّد المقاطع",
    body: "هذي الأداة الأساسية: فيديو طويل يدخل، وشورتس طولية تطلع. باقي القوائم تنقفل لين تخلّص أول تشغيل.",
  },
  {
    target: '[data-tutorial="source-tabs"]',
    title: "ارفع ملف أو حط رابط",
    body: "حط ملف MP4، أو حوّل لـ \"رابط فيديو\" وحط رابط يوتيوب أو تيك توك أو إنستقرام…",
  },
  {
    target: '[data-tutorial="drop-zone"]',
    title: "فيديوك",
    body: "اضغط على المربع أو حط الرابط هنا. خلّ الملفات أقل من 500MB.",
  },
  {
    target: '[data-tutorial="output-format"]',
    title: "مقاس الإخراج",
    body: "9:16 هو مقاس تيك توك وريلز وشورتس. خلّه مثل ما هو إلا لو تبي مربع أو عرضي.",
  },
  {
    target: '[data-tutorial="generate"]',
    title: "طلّع المقاطع",
    body: "أكّد إن عندك حقوق الفيديو، وبعدين طلّع المقاطع. وبس، هذا أول تشغيل.",
  },
];

function visibleTarget(selector) {
  return [...document.querySelectorAll(selector)].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }) || null;
}

function placeTip(rect, tipW, tipH, vw, vh) {
  const m = 12;
  const gap = 12;
  const mobile = vw < 640;
  if (mobile) {
    return {
      top: Math.max(m, vh - tipH - m - 8),
      left: m,
      width: vw - m * 2,
    };
  }
  let top = rect.bottom + gap;
  if (top + tipH > vh - m) top = rect.top - gap - tipH;
  if (top < m) top = m;
  let left = rect.left + rect.width / 2 - tipW / 2;
  left = Math.max(m, Math.min(left, vw - m - tipW));
  return { top, left, width: tipW };
}

/**
 * First-login Clip Generator tutorial.
 *  - intro: blocking modal
 *  - coach: Next/Back spotlight on each Clip Generator control
 *  - celebrate: modal after the first successful job
 *
 * QA: #app?tutorial=1
 */
export default function ClipTutorial({ phase, jobStatus, errorText, onStart, onSkip, onDismissCelebrate }) {
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);

  useEffect(() => {
    if (phase === 'coach') setStep(0);
  }, [phase]);

  useLayoutEffect(() => {
    if (phase !== 'coach' || jobStatus === 'processing' || jobStatus === 'error') {
      setSpot(null);
      return;
    }
    const measure = () => {
      const spec = TOUR[step];
      if (!spec) { setSpot(null); return; }
      const el = visibleTarget(spec.target);
      if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const rect = el ? el.getBoundingClientRect() : null;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const r = (n) => Math.round(n);
      const mobile = vw < 640;
      const tipW = Math.min(360, vw - 24);
      const tipH = 220;
      const hole = rect
        ? { top: r(rect.top - 6), left: r(rect.left - 6), width: r(rect.width + 12), height: r(rect.height + 12) }
        : null;
      const rawTip = hole
        ? placeTip({ top: hole.top, bottom: hole.top + hole.height, left: hole.left, width: hole.width }, tipW, tipH, vw, vh)
        : { top: mobile ? vh - 240 : vh / 2 - 80, left: 12, width: vw - 24 };
      const tip = { top: r(rawTip.top), left: r(rawTip.left), width: r(rawTip.width) };
      setSpot((prev) => {
        const next = { hole, tip, mobile };
        try {
          if (prev && JSON.stringify(prev) === JSON.stringify(next)) return prev;
        } catch (_) { /* ignore */ }
        return next;
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [phase, step, jobStatus]);

  if (phase === 'intro') {
    return (
      <Modal isOpen hideClose eyebrow="أول المقاطع" title="يلا نطلّع أول شورتس لك" size="md">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center shrink-0">
            <LayoutDashboard size={18} className="text-brass" />
          </div>
          <p className="text-sm text-ink2 leading-relaxed">
            الأداة الأساسية هنا <b className="text-ink font-medium">مولّد المقاطع</b>: فيديو طويل يدخل، وشورتس طولية تطلع. بنوريك الشاشة، وبعدين تشغّل فيديو واحد.
          </p>
        </div>
        <button type="button" onClick={onStart} className="btn-primary w-full">
          ورّني المكان <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full mt-2 text-muted hover:text-ink text-sm lowercase py-2 transition-colors"
        >
          بستكشف بعدين
        </button>
      </Modal>
    );
  }

  if (phase === 'coach' && (jobStatus === 'processing' || jobStatus === 'error')) {
    return (
      <div
        className="fixed z-[80] start-3 end-3 md:start-auto md:end-6 md:w-[22rem]
          bottom-3 md:bottom-6 card p-4"
        role="status"
      >
        <p className="eyebrow mb-2">أول المقاطع</p>
        <p className={`text-sm leading-relaxed ${jobStatus === 'error' ? 'text-danger' : 'text-muted'}`}>
          {jobStatus === 'error'
            ? `${errorText ? `ما قدرنا نقص هالفيديو: ${errorText}` : "التشغيل فشل."} جرّب فيديو ثاني. باقي الأدوات تنفتح أول ما تخلص مهمة وحدة.`
            : "لحظات — مولّد المقاطع يدوّر على أقوى اللحظات ويقصّها شورتس طولية."}
        </p>
      </div>
    );
  }

  if (phase === 'coach') {
    const last = step >= TOUR.length - 1;
    const spec = TOUR[step] || TOUR[0];
    const onLast = () => setStep(TOUR.length);

    if (step >= TOUR.length) {
      return (
        <div
          className="fixed z-[80] inset-x-3 bottom-3 md:inset-x-auto md:end-6 md:bottom-6 md:max-w-sm
            card px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          role="status"
        >
          <p className="text-sm text-muted leading-snug flex-1 min-w-0">
            دورك — أضف فيديو وطلّع المقاطع.
          </p>
          <button type="button" onClick={onSkip} className="text-xs lowercase text-muted hover:text-ink shrink-0">
            تخطّي
          </button>
        </div>
      );
    }

    const hole = spot?.hole;
    const tip = spot?.tip;

    return (
      <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="شرح مولّد المقاطع">
        {!hole && <div className="absolute inset-0 bg-black/55" />}
        {hole && (
          <div
            className="absolute rounded-input pointer-events-none border border-brass/70"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}
          />
        )}
        <div
          className="absolute card p-4 max-h-[min(70vh,24rem)] overflow-y-auto"
          style={{
            top: tip?.top ?? 16,
            left: tip?.left ?? 12,
            width: tip?.width ?? undefined,
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <p className="eyebrow mb-2">{String(step + 1).padStart(2, '0')} / {String(TOUR.length).padStart(2, '0')}</p>
          <h3 className="font-display lowercase text-lg text-ink leading-tight mb-2">{spec.title}</h3>
          <p className="text-sm text-muted leading-relaxed mb-4">{spec.body}</p>
          <div className="flex flex-wrap items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-ghost text-sm px-3">
                <ArrowLeft size={14} /> رجوع
              </button>
            )}
            <button
              type="button"
              onClick={last ? onLast : () => setStep((s) => s + 1)}
              className="btn-primary text-sm px-4 ms-auto"
            >
              {last ? "تمام" : "التالي"} <ArrowRight size={14} />
            </button>
          </div>
          <button type="button" onClick={onSkip} className="mt-3 text-xs lowercase text-muted hover:text-ink transition-colors">
            تخطّي — افتح الباقي
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'celebrate') {
    return (
      <Modal isOpen onClose={onDismissCelebrate} hideClose eyebrow="خلصنا" title="طلّعت أول مقاطعك" size="sm">
        <div className="text-center py-2">
          <div className="inline-flex p-3 bg-paper3 rounded-full text-ok mb-4">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-ink2 leading-relaxed mb-1">
            هذا المنتج كله، على فيديو واحد.
          </p>
          <p className="text-sm text-muted leading-relaxed mb-6">
            باقي الأدوات انفتحت. ارجع لمولّد المقاطع متى ما صار عندك فيديو طويل ثاني.
          </p>
          <button type="button" onClick={onDismissCelebrate} className="btn-primary w-full">
            <Sparkles size={16} /> شوف مقاطعي
          </button>
        </div>
      </Modal>
    );
  }

  return null;
}
