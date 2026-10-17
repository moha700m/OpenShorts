import React from 'react';
import { Sparkles, Zap, Globe, FileVideo, Subtitles, Youtube, Instagram, Shield, Github, ArrowRight, Check, ChevronDown, Monitor, Cpu, Languages, Type, Upload, Scissors, Link2, Bot } from 'lucide-react';
import './landing.css';

const APPARATUS_CALLOUTS = ['المقاس · 9:16', 'المقاطع · 3–15', 'الجذب · تلقائي', 'الترجمة · كلمة بكلمة'];

// Real clips OpenShorts made from Creative Commons (CC BY) sources. `video` is
// the original and the clip side by side, in sync; `vertical` is the clip on
// its own for the hero. The credit is what the licence asks for, so it stays
// next to the video that uses it.
// The six clips OpenShorts cut from that episode with no clip-count setting,
// in source order, with the score the moment picker gave each.
const EPISODE_CLIPS = [
  { n: 1, score: 88, title: 'عرفت إني بتزوجها من ثالث موعد' },
  { n: 2, score: 82, title: 'ليش نسوي كل شي مع بعض' },
  { n: 3, score: 75, title: 'فتّشت كل حساباتي القديمة' },
  { n: 4, score: 85, title: 'كيف كسبنا المزايدة بصورة وحدة' },
  { n: 5, score: 72, title: 'نستخدم ماضينا عشان نساعد غيرنا' },
  { n: 6, score: 78, title: 'المعنى الحقيقي للفوز' },
];

// Mounts the video only once it scrolls near the viewport, so five clip
// previews cost nothing to a visitor who never gets that far.
function LazyLoopVideo({ src, poster }) {
  const ref = React.useRef(null);
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShow(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="aspect-[9/16] w-full">
      {show ? (
        <video src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" className="w-full h-full object-cover block" />
      ) : (
        <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover block" />
      )}
    </div>
  );
}

const DEMOS = [
  {
    id: 'split',
    tab: 'متحدثين اثنين',
    video: '/demo/case-split.mp4',
    poster: '/screens/case-split.webp',
    vertical: '/demo/split-vertical.mp4',
    posterV: '/screens/split-vertical.webp',
    credit: 'Turn the Tables with Dan and Shoshana Jordan',
    creditBy: 'Heritage of Faith',
    creditUrl: 'https://www.youtube.com/watch?v=-KbQj_vboOU',
  },
  {
    id: 'talk',
    tab: 'تتبّع الوجه',
    video: '/demo/case-talk.mp4',
    poster: '/screens/case-talk.webp',
    vertical: '/demo/talk-vertical.mp4',
    posterV: '/screens/talk-vertical.webp',
    credit: 'Mark Bush on How to Overcome Adversity',
    creditBy: 'Foundation for Economic Education',
    creditUrl: 'https://www.youtube.com/watch?v=aqFhllJJzoQ',
  },
];

const SectionHeader = ({ eyebrow, title, children }) => (
  <div className="mb-12">
    <p className="eyebrow mb-3">{eyebrow}</p>
    <h2 className="font-display text-3xl md:text-4xl lowercase text-ink tracking-tight mb-4">{title}</h2>
    {children && <p className="text-muted max-w-2xl leading-relaxed">{children}</p>}
  </div>
);

// Every feature with its real visual: screenshots of the app and clips it
// made. Rotates on its own until the visitor picks a tab.
const SHOWCASE = [
  {
    id: 'moments', tab: 'يلقط اللحظات',
    title: 'كل مقطع له تقييم قبل ما تشوفه',
    body: 'Gemini يقرأ التفريغ كلمة بكلمة وتقطيع المشاهد، ويعطي كل لحظة تقييم من 100، ويكتب العنوان والوصف لكل منصة.',
    media: { type: 'img', src: '/screens/app-clipcard.webp', w: 1153, h: 441, alt: 'مقطع في OpenShorts مع تقييم الانتشار والعناوين وأزرار التعديل' },
  },
  {
    id: 'reframe', tab: 'يضبط أي تخطيط',
    title: 'وجه واحد، متحدثين، أو شاشة كاملة',
    body: 'تتبّع الوجه لشخص واحد، والمتحدثين فوق بعض لو كانوا اثنين، والشاشة كاملة لو كان شرح شاشة. يختار لكل فيديو، بدون أي إعداد.',
    media: { type: 'video', src: '/demo/case-split.mp4', poster: '/screens/case-split.webp', w: 960, h: 540 },
  },
  {
    id: 'captions', tab: '17 ستايل ترجمة',
    title: 'ترجمة الناس فعلًا تقراها',
    body: 'ترجمة كلمة بكلمة محروقة على الفيديو، بـ 17 ستايل: هرمزي، كبسولة، صندوق ليموني، كلمة كلمة، كاريوكي وغيرها. غيّر ستايل أي مقطع بضغطة.',
    media: { type: 'captions' },
  },
  {
    id: 'hook', tab: 'جذب يوقّف التمرير',
    title: 'جملة جذب من أول ثانية',
    body: 'كل مقطع يبدأ بجملة جذب مكتوبة من الكلام اللي فيه. عدّلها، غيّر ستايلها أو حرّكها قبل ما تنشر.',
    media: { type: 'img', src: '/screens/app-hook.webp', w: 548, h: 587, alt: 'محرر الجذب مع النص والستايل والخط والمكان' },
  },
  {
    id: 'editor', tab: 'محرر حقيقي',
    title: 'عدّل أي شي، لين مستوى الكلمة',
    body: 'شاشة المصدر وشاشة النتيجة جنب بعض مع التفريغ كامل: اضغط على كلمة عشان تحدد القص، أضف أجزاء، غيّر التأطير، وصدّر في ثواني.',
    media: { type: 'img', src: '/screens/app-editor.webp', w: 1568, h: 652, alt: 'محرر المقاطع في OpenShorts مع شاشة المصدر والنتيجة والتفريغ والأجزاء' },
  },
  {
    id: 'agents', tab: 'داخل Claude و ChatGPT',
    title: 'قص المقاطع من محادثة',
    body: 'أضف OpenShorts لـ Claude أو ChatGPT برابط واحد واطلب مقاطع. نفس خط المعالجة، شغّال على سيرفرك.',
    media: { type: 'img', src: '/screens/connect-an-agent.webp', w: 684, h: 366, alt: 'ربط OpenShorts بوكيل ذكاء اصطناعي' },
  },
  {
    id: 'ugc', tab: 'فيديوهات UGC بالذكاء الاصطناعي',
    title: 'فيديوهات منتجات بممثلين AI',
    body: 'وصّف منتجك أو حط رابطه: سكربت، وممثل AI بمزامنة شفايف، ولقطات B-roll وترجمة. يحتاج مفاتيحك في fal.ai و ElevenLabs.',
    media: { type: 'img', src: '/screens/app-ugc.webp', w: 1114, h: 612, alt: 'معرض UGC مع فيديوهات ممثلين AI' },
  },
];

const CAPTION_STYLES = [
  ['default', 'الافتراضي'], ['hormozi', 'هرمزي'], ['pill', 'كبسولة'], ['lime', 'صندوق ليموني'], ['oneword', 'كلمة كلمة'],
];

function ShowcaseMedia({ media }) {
  if (media.type === 'video') {
    return (
      <video src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata"
        width={media.w} height={media.h} className="w-full h-auto block rounded-card" />
    );
  }
  if (media.type === 'captions') {
    return (
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {CAPTION_STYLES.map(([id, label]) => (
          <figure key={id} className="m-0 min-w-0">
            <video src={`/demo/caption-${id}.mp4`} poster={`/screens/caption-${id}.webp`} autoPlay muted loop playsInline
              preload="metadata" className="w-full aspect-[9/16] object-cover block rounded-card border border-rule" />
            <figcaption className="readout text-[10px] text-muted mt-2 text-center">{label}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <img src={media.src} alt={media.alt} width={media.w} height={media.h} loading="lazy"
      className="w-full h-auto block rounded-card border border-rule" />
  );
}

function FeatureShowcase() {
  const [active, setActive] = React.useState(0);
  const [auto, setAuto] = React.useState(true);
  React.useEffect(() => {
    if (!auto) return undefined;
    const t = setTimeout(() => setActive((i) => (i + 1) % SHOWCASE.length), 7000);
    return () => clearTimeout(t);
  }, [active, auto]);
  const item = SHOWCASE[active];
  return (
    <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
      <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="الميزات">
        {SHOWCASE.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => { setActive(i); setAuto(false); }}
            className={`relative shrink-0 text-start rounded-card border px-4 py-3 text-sm lowercase transition-colors overflow-hidden ${i === active ? 'border-brass text-ink bg-paper2' : 'border-rule text-muted hover:text-ink'}`}
          >
            {f.tab}
            {i === active && auto && (
              <span key={`p-${active}`} className="showcase-progress absolute start-0 bottom-0 h-0.5 bg-brass" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      <div key={item.id} className="showcase-in min-w-0" role="tabpanel">
        <h3 className="font-display text-3xl md:text-4xl lowercase text-ink mb-3">{item.title}</h3>
        <p className="text-muted max-w-2xl mb-6 leading-relaxed">{item.body}</p>
        <ShowcaseMedia media={item.media} />
      </div>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => {
  const Icon = icon;
  return (
    <div className="card card-hover p-6">
      <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
        <Icon size={18} className="text-brass" />
      </div>
      <h3 className="font-display text-xl lowercase text-ink mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
};

const StepCard = ({ number, title, description }) => (
  <div className="flex gap-5">
    <span className="font-mono text-micro text-brass uppercase pt-1.5 flex-shrink-0">
      {String(number).padStart(2, '0')}
    </span>
    <div>
      <h3 className="text-ink font-medium mb-1">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const ComparisonRow = ({ feature, openshorts, opusclip, kapwing }) => (
  <tr className="border-b border-rule">
    <td className="py-3 px-4 text-sm text-ink2">{feature}</td>
    <td className="py-3 px-4 text-center">{openshorts}</td>
    <td className="py-3 px-4 text-center">{opusclip}</td>
    <td className="py-3 px-4 text-center">{kapwing}</td>
  </tr>
);

const FAQItem = ({ question, answer, isOpen, onClick }) => (
  <div>
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-1 py-5 text-start min-h-[44px]"
    >
      <span className="text-ink font-medium pe-4">{question}</span>
      <ChevronDown size={18} className={`text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="px-1 pb-6">
        <p className="faq-answer text-muted text-sm leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
);

export default function Landing({ onLaunchApp }) {
  const [openFaq, setOpenFaq] = React.useState(null);
  const [heroUrl, setHeroUrl] = React.useState('');
  const [heroDemo, setHeroDemo] = React.useState(0);
  const [cropDemo, setCropDemo] = React.useState(0);
  // Floating CTA: shown once the hero's own input has scrolled away, hidden
  // again near the end where the closing CTA takes over.
  const [stickyCta, setStickyCta] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const form = document.querySelector('.hero-input-row');
      const pastHero = form ? form.getBoundingClientRect().bottom < 0 : window.scrollY > 700;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 1100;
      setStickyCta(pastHero && !nearEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hand the pasted link to the app: MediaInput picks it up on mount, so the
  // user lands with their own video ready.
  const handleHeroSubmit = (e) => {
    e.preventDefault();
    const url = heroUrl.trim();
    if (url) {
      try { localStorage.setItem('os_pending_url', url); } catch { /* ignore */ }
    }
    onLaunchApp();
  };

  const features = [
    { icon: Sparkles, title: 'كشف اللحظات اللي تنتشر', description: 'Google Gemini يقيّم التفريغ والمشاهد ويطلّع أقوى 3 إلى 15 لحظة. قص تلقائي بدون ما تدوّر بنفسك.' },
    { icon: Scissors, title: 'قص طولي ذكي 9:16', description: 'إعادة تأطير بوضعين مع تتبّع الوجه بـ MediaPipe و YOLOv8 كاحتياط.' },
    { icon: Subtitles, title: 'ترجمة تلقائية', description: 'ترجمة faster-whisper بتوقيت لكل كلمة، بستايل تختاره ومحروقة على مقاطعك.' },
    { icon: Languages, title: 'دبلجة بأكثر من 30 لغة', description: 'استخدم مفتاحك في ElevenLabs ودبلج المقطع لأكثر من 30 لغة بنفس صوت المتحدث.' },
    { icon: Type, title: 'نصوص جذب على المقطع', description: 'عناوين جذب يكتبها الذكاء الاصطناعي تمسك المشاهد من أول 3 ثواني.' },
    { icon: Zap, title: 'تأثيرات فيديو بالذكاء الاصطناعي', description: 'فلاتر FFmpeg يولّدها Gemini: تلوين، انتقالات، وتحسينات بصرية.' },
    { icon: Upload, title: 'رفع فيديو من جهازك', description: 'ارفع بودكاست، ويبينار، بث مباشر أو فلوق بدقته الكاملة.' },
    { icon: Shield, title: 'على سيرفرك وبخصوصية تامة', description: 'شغّال بـ Docker على سيرفرك — فيديوهاتك ما تطلع برّا.' },
    { icon: Monitor, title: 'استوديو يوتيوب', description: 'صور مصغّرة بالذكاء الاصطناعي، و10 عناوين مقترحة، وأوصاف تلقائية مع الفصول.' },
    { icon: Globe, title: 'نشر مباشر على المنصات', description: 'انشر على تيك توك وريلز إنستقرام ويوتيوب شورتس من لوحة التحكم.' },
    { icon: Bot, title: 'سيرفر MCP و API وسطر أوامر', description: 'اربط Claude أو ChatGPT أو n8n، أو قص من الطرفية. نفس خط المعالجة بدون لوحة تحكم.' },
    { icon: Sparkles, title: 'مولّد فيديوهات UGC', description: 'الذكاء الاصطناعي يكتب السكربت ويولّد فيديو أفاتار بمزامنة شفايف.' },
    { icon: FileVideo, title: 'ممثلين AI ومزامنة شفايف', description: 'اختر ممثل AI أو ارفع صورة وطلّع فيديو شخص يتكلم.' },
  ];

  const steps = [
    { title: 'ارفع فيديو طويل أو حط رابطه', description: 'أي فيديو تملكه — بودكاست، ويبينار، بث مباشر، مقابلة.' },
    { title: 'الذكاء الاصطناعي يلقط أقوى اللحظات', description: 'Gemini يطلّع من 3 إلى 15 مقطع قوي طول كل واحد من 15 إلى 60 ثانية.' },
    { title: 'قص طولي ذكي 9:16', description: 'يعيد التأطير طولي مع تتبّع الوجه — المتحدث يبقى في النص.' },
    { title: 'ترجمة وجذب وتأثيرات', description: 'ترجمة تلقائية ونصوص جذب وتأثيرات. ودبلجة اختيارية بمفتاحك في ElevenLabs.' },
    { title: 'نزّل أو انشر على المنصات', description: 'نزّل مقاطعك أو انشرها على تيك توك وريلز ويوتيوب شورتس على طول.' },
  ];

  const faqs = [
    {
      question: 'هل هو مجاني فعلًا؟',
      answer: 'إيه، مجاني بالكامل على سيرفرك. هذي نسختك الخاصة من OpenShorts المفتوح المصدر (رخصة MIT): بدون علامة مائية، بدون حدود دقايق، وبدون اشتراك. اللي تحتاجه بس سيرفرك ومفتاح Google Gemini (فيه باقة مجانية). الدبلجة تحتاج مفتاح ElevenLabs، وشورتس AI تحتاج fal.ai، وتكلفتها على حسابك عندهم مباشرة.',
    },
    {
      question: 'كيف أربط الواجهة بسيرفري؟',
      answer: 'اضغط زر «الخادم» تحت الشاشة، وحط عنوان سيرفرك (https) ورمز الوصول، واضغط «اختبار» وبعدين «حفظ وإعادة التحميل». أو افتح رابط جاهز فيه ‎?backend=…&token=…‎ وتنحفظ الإعدادات تلقائيًا.',
    },
    {
      question: 'كيف يحوّل الفيديو الطويل لمقاطع تيك توك وريلز؟',
      answer: 'ارفع الفيديو أو حط رابطه واضغط «طلّع المقاطع». الذكاء الاصطناعي يفرّغ الكلام بـ faster-whisper، ويلقط أقوى اللحظات بـ Google Gemini، ويقصّها طولي 9:16 مع تتبّع الوجه بـ MediaPipe، ويحط الترجمة وجملة الجذب.',
    },
    {
      question: 'كيف يشتغل القص الطولي الذكي؟',
      answer: 'فيه وضعين: وضع التتبّع يستخدم MediaPipe لكشف الوجه (و YOLOv8 كاحتياط) ويلحق شخص واحد بثبات بدون ما الكاميرا تتهز مع كل حركة. والوضع العام للقطات الجماعية والمناظر يحافظ على العرض كامل فوق خلفية مموّهة. ومتتبّع المتحدث يمنع التنقل السريع بين الأشخاص.',
    },
    {
      question: 'يقدر يترجم ويدبلج الفيديوهات؟',
      answer: 'إيه، بمفتاحك في ElevenLabs: حطه في الإعدادات ودبلج أي مقطع لأكثر من 30 لغة بنفس صوت المتحدث. بعد الدبلجة يعيد OpenShorts التفريغ ويحرق الترجمة باللغة الجديدة.',
    },
    {
      question: 'يقدر يولّد عناوين وصور مصغّرة ليوتيوب؟',
      answer: 'إيه. استوديو يوتيوب يقترح 10 عناوين مع محادثة تعدّلها فيها، ويولّد صور مصغّرة بالذكاء الاصطناعي (تقدر ترفع صورة وجهك وخلفية)، ويكتب وصف فيه توقيت الفصول، وتقدر تنشر على يوتيوب مباشرة.',
    },
    {
      question: 'أقدر أشغّله من Claude أو ChatGPT أو n8n؟',
      answer: 'إيه. السيرفر فيه نقطة MCP على ‎/mcp‎ و API، فوكيل الذكاء الاصطناعي يقدر يرسل رابط فيديو، يتابع المعالجة، يعرض المقاطع وينشرها. بس لازم يكون سيرفرك شغّال.',
    },
    {
      question: 'وش يحتاج السيرفر عشان يشغّله؟',
      answer: 'أي جهاز فيه Docker. ننصح بـ 8GB رام أو أكثر ومعالج حديث متعدد الأنوية. كرت NVIDIA اختياري بس يسرّع المعالجة كثير. Docker Compose يركّب كل شي: Python و FFmpeg و YOLOv8 و MediaPipe و faster-whisper ولوحة التحكم.',
    },
  ];

  const checkIcon = <Check size={16} className="text-brass mx-auto" />;
  const checkMuted = <Check size={16} className="text-muted mx-auto" />;
  const paid = <span className="text-muted text-sm">مدفوع</span>;
  const no = <span className="text-muted text-sm">لا</span>;
  const limited = <span className="text-muted text-sm">محدود</span>;
  const cloudOnly = <span className="text-muted text-sm">سحابي بس</span>;

  return (
    <div className="min-h-screen bg-paper text-ink2 overflow-x-clip">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-paper border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5 font-display text-xl text-ink tracking-tight min-h-[44px]">
            <img src="/logo-openshorts.png" alt="شعار OpenShorts" className="w-7 h-7" width="28" height="28" />
            <span dir="ltr">openshorts</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted">
            <a href="#features" className="hover:text-ink transition-colors">الميزات</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">طريقة العمل</a>
            <a href="#comparison" className="hover:text-ink transition-colors">المقارنة</a>
            <a href="#faq" className="hover:text-ink transition-colors">الأسئلة الشائعة</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/moha700m/OpenShorts"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
            >
              <Github size={16} />
              <span>GitHub</span>
            </a>
            <button onClick={onLaunchApp} className="btn-primary px-5 py-2 whitespace-nowrap min-h-[44px]">
              ادخل التطبيق
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-blueprint relative overflow-clip border-b border-rule pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-14 items-center">
          <div className="min-w-0">
            <p className="eyebrow mb-6">00 · مولّد مقاطع بالذكاء الاصطناعي · مفتوح المصدر</p>

            <h1 className="hero-h1 mb-6">
              <span className="block">فيديو طويل يدخل.</span>
              <span className="block"><em>شورتس تنتشر</em> تطلع.</span>
            </h1>

            <p className="hero-description text-muted max-w-2xl mb-8 leading-relaxed">
              حط رابط يوتيوب أو ارفع بودكاست أو بث أو مقابلة. الذكاء الاصطناعي يختار من 3 إلى 15 لحظة تستاهل النشر،
              ويقصّها طولي 9:16 على اللي يتكلمون، ويحرق الترجمة عليها. جاهزة لتيك توك وريلز وشورتس في دقايق.
            </p>

            <form onSubmit={handleHeroSubmit} className="mb-5">
              <div className="hero-input-row flex flex-col sm:flex-row items-stretch gap-3">
                <div className="relative flex-1 min-w-0">
                  <Link2 size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="url"
                    dir="auto"
                    value={heroUrl}
                    onChange={(e) => setHeroUrl(e.target.value)}
                    placeholder="حط رابط المقطع"
                    className="input-field ps-11"
                    aria-label="رابط الفيديو"
                  />
                </div>
                <button type="submit" className="btn-primary whitespace-nowrap">
                  طلّع المقاطع
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={onLaunchApp} className="btn-ghost whitespace-nowrap">
                  <Upload size={16} />
                  ارفع ملف
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-sm">
              <span className="badge-ok whitespace-nowrap">
                <Check size={12} /> مجاني بالكامل على سيرفرك
              </span>
              <span className="text-muted">بدون حدود ولا اشتراكات ولا علامة مائية</span>
            </div>

            <p className="text-sm text-muted">
              المعالجة كلها على سيرفرك الخاص — اربطه من زر «الخادم».{' '}
              <a
                href="https://github.com/moha700m/OpenShorts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink2 underline hover:text-ink transition-colors"
              >
                الكود على GitHub ←
              </a>
            </p>
          </div>

          {/* Apparatus — instrument bezel holding a real 9:16 clip */}
          <figure className="apparatus" aria-label="مثال على مقطع طولي طلّعه OpenShorts">
            <div className="apparatus-shell">
              <span className="apparatus-glow" aria-hidden="true" />
              <div className="apparatus-chamber">
                <video
                  key={DEMOS[heroDemo].id}
                  src={DEMOS[heroDemo].vertical}
                  poster={DEMOS[heroDemo].posterV}
                  autoPlay
                  muted
                  loop={DEMOS.length === 1}
                  onEnded={() => setHeroDemo((i) => (i + 1) % DEMOS.length)}
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
                <span className="apparatus-stencil">OS-9:16</span>
              </div>
            </div>
            <ul className="apparatus-callouts" aria-hidden="true">
              {APPARATUS_CALLOUTS.map((c) => (
                <li key={c}><span className="apparatus-leader" />{c}</li>
              ))}
            </ul>
          </figure>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="01 · الميزات" title="كل اللي يسويه، على مقاطع حقيقية">
            لقطات من التطبيق ومقاطع طلّعها. اختر ميزة، أو خلّها تتقلب لحالها.
          </SectionHeader>
          <FeatureShowcase />
          <details className="mt-12 group">
            <summary className="list-none cursor-pointer text-sm text-muted hover:text-ink min-h-[44px] flex items-center gap-1 [&::-webkit-details-marker]:hidden">
              قائمة الميزات كاملة <ChevronDown size={14} className="inline transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {features.map((feature, i) => (
                <FeatureCard key={i} {...feature} />
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* One video in, many clips out */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-b border-rule">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="02 · فيديو واحد، ست مقاطع" title="حلقة 27 دقيقة تدخل. ست مقاطع جاهزة للنشر تطلع.">
            بدون أوامر ولا إعدادات ولا تدوير: الذكاء الاصطناعي قيّم كل لحظة، وخلّى الست اللي تقوم بنفسها، وقصّها مع الترجمة وجملة الجذب.
          </SectionHeader>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,15rem)_auto_minmax(0,1fr)] gap-6 items-center">
            <figure className="m-0 max-w-[16rem] lg:max-w-none">
              <div className="relative rounded-card overflow-hidden border border-rule">
                <img src="/screens/ep-source.webp" alt="حلقة البودكاست الأصلية 16:9" width="640" height="360" loading="lazy" className="block w-full h-auto" />
                <span className="absolute bottom-2 end-2 readout bg-paper/80 px-2 py-0.5 rounded">26:54</span>
              </div>
              <figcaption className="text-xs text-muted mt-2">الحلقة كاملة، 16:9</figcaption>
            </figure>
            <ArrowRight size={28} className="text-brass mx-auto rotate-90 lg:rotate-0" aria-hidden="true" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {EPISODE_CLIPS.map((c) => (
                <figure key={c.n} className="m-0 min-w-0">
                  <div className="relative rounded-card overflow-hidden border border-rule bg-paper2">
                    <LazyLoopVideo src={`/demo/ep-clip-${c.n}.mp4`} poster={`/screens/ep-clip-${c.n}.webp`} />
                    <span className="absolute top-1.5 start-1.5 readout text-[10px] bg-paper/85 text-ok px-1.5 py-0.5 rounded">التقييم {c.score}</span>
                  </div>
                  <figcaption className="text-xs text-ink2 mt-2 leading-snug">{c.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="mt-6 text-xs text-muted">
            المصدر: <a href="https://www.youtube.com/watch?v=-KbQj_vboOU" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink" dir="ltr">Turn the Tables with Dan and Shoshana Jordan</a>، <span dir="ltr">Heritage of Faith</span>، برخصة CC BY. القص من OpenShorts، والتقييمات مثل ما عطاها الذكاء الاصطناعي.
          </p>
        </div>
      </section>

      {/* Smart crop */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeader eyebrow="03 · القص الذكي" title="فيديو واحد يدخل. اللحظة تطلع بتأطير جديد.">
            نتيجة حقيقية مو تصميم: الذكاء الاصطناعي يختار اللحظة، ويحوّل 16:9 لطولي 9:16، ويحرق الترجمة.
          </SectionHeader>
          {DEMOS.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="أمثلة مقاطع">
              {DEMOS.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={cropDemo === i}
                  onClick={() => setCropDemo(i)}
                  className={`px-4 min-h-[44px] rounded-full border text-sm transition-colors ${cropDemo === i ? 'bg-brass text-brassink border-brass' : 'border-rule text-muted hover:text-ink'}`}
                >
                  {d.tab}
                </button>
              ))}
            </div>
          )}
          <figure className="crop-frame crop-frame-16-9 w-full" aria-label="الفيديو الأصلي جنب المقطع الطولي اللي طلّعه OpenShorts">
            <video
              key={DEMOS[cropDemo].id}
              src={DEMOS[cropDemo].video}
              poster={DEMOS[cropDemo].poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              width="960"
              height="540"
              className="w-full h-auto block"
            />
          </figure>
          <p className="mt-6 text-xs text-muted">
            المصدر: <a href={DEMOS[cropDemo].creditUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink" dir="ltr">{DEMOS[cropDemo].credit}</a>، <span dir="ltr">{DEMOS[cropDemo].creditBy}</span>، برخصة CC BY. القص من OpenShorts.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.querySelector('.hero-input-row input')?.focus({ preventScroll: true });
              }}
              className="btn-primary whitespace-nowrap"
            >
              جرّبه على فيديوك <ArrowRight size={16} />
            </button>
            <span className="text-sm text-muted">مجاني بالكامل على سيرفرك</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-4xl mx-auto">
          <SectionHeader eyebrow="04 · خط المعالجة" title="طريقة العمل">
            من فيديو طويل لمقاطع جاهزة تنتشر في 5 خطوات تلقائية.
          </SectionHeader>
          <div className="space-y-8">
            {steps.map((step, i) => (
              <StepCard key={i} number={i + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* Your own instance */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-4xl mx-auto">
          <SectionHeader eyebrow="05 · التشغيل" title="نسختك الخاصة من OpenShorts">
            نفس البرنامج المفتوح المصدر، شغّال على سيرفرك أنت.
          </SectionHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6 sm:p-8 flex flex-col border-brass">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Shield size={18} className="text-brass" />
                <h3 className="font-display text-2xl text-ink">على سيرفرك</h3>
                <span className="badge-brass">مجاني بالكامل</span>
              </div>
              <ul className="space-y-1.5 mb-6 flex-1">
                {['بدون حدود دقايق ولا علامة مائية', 'فيديوهاتك ومفاتيحك عندك أنت', 'يشتغل على المعالج، وأسرع بكثير مع كرت NVIDIA', 'تستخدم مفاتيحك في Gemini و ElevenLabs و fal.ai'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted"><Check size={14} className="text-ok shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={onLaunchApp} className="btn-primary whitespace-nowrap">
                ادخل التطبيق <ArrowRight size={16} />
              </button>
            </div>
            <div className="card p-6 sm:p-8 flex flex-col">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Cpu size={18} className="text-muted" />
                <h3 className="font-display text-2xl text-ink">اربط الخادم</h3>
                <span className="readout border border-rule rounded-full px-2.5 py-1">Docker</span>
              </div>
              <ul className="space-y-1.5 mb-6 flex-1">
                {['اضغط زر «الخادم» تحت الشاشة', 'حط عنوان سيرفرك (https) ورمز الوصول', 'اضغط «اختبار» وبعدين «حفظ وإعادة التحميل»', 'أو افتح رابط جاهز فيه backend و token'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted"><Check size={14} className="text-ok shrink-0" />{f}</li>
                ))}
              </ul>
              <a href="https://github.com/moha700m/OpenShorts" target="_blank" rel="noopener noreferrer"
                className="btn-ghost whitespace-nowrap">
                <Github size={16} /> شوف الكود على GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-4xl mx-auto">
          <SectionHeader eyebrow="06 · المقارنة" title="مولّد مقاطع مجاني مقابل البدائل المدفوعة">
            OpenShorts على سيرفرك مجاني بالكامل، والبدائل السحابية كلها باشتراكات.
          </SectionHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule2">
                  <th className="py-3 px-4 text-start text-sm text-muted font-medium">الميزة</th>
                  <th className="py-3 px-4 text-center text-sm font-medium">
                    <span className="text-brass">OpenShorts</span>
                  </th>
                  <th className="py-3 px-4 text-center text-sm text-muted font-medium">Opus Clip</th>
                  <th className="py-3 px-4 text-center text-sm text-muted font-medium">Kapwing</th>
                </tr>
              </thead>
              <tbody>
                <ComparisonRow feature="السعر" openshorts={<span className="text-ok font-medium">مجاني</span>} opusclip={paid} kapwing={paid} />
                <ComparisonRow feature="كشف اللحظات اللي تنتشر" openshorts={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="قص طولي ذكي" openshorts={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="ترجمة تلقائية" openshorts={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="دبلجة بأكثر من 30 لغة (بمفتاح ElevenLabs)" openshorts={checkIcon} opusclip={limited} kapwing={no} />
                <ComparisonRow feature="تأثيرات فيديو بالذكاء الاصطناعي" openshorts={checkIcon} opusclip={no} kapwing={checkMuted} />
                <ComparisonRow feature="نصوص جذب على المقطع" openshorts={checkIcon} opusclip={checkMuted} kapwing={checkMuted} />
                <ComparisonRow feature="على سيرفرك / خصوصية" openshorts={checkIcon} opusclip={cloudOnly} kapwing={cloudOnly} />
                <ComparisonRow feature="بدون علامة مائية" openshorts={checkIcon} opusclip={paid} kapwing={paid} />
                <ComparisonRow feature="مفتوح المصدر" openshorts={checkIcon} opusclip={no} kapwing={no} />
                <ComparisonRow feature="صور مصغّرة ليوتيوب بالذكاء الاصطناعي" openshorts={checkIcon} opusclip={no} kapwing={paid} />
                <ComparisonRow feature="عناوين وأوصاف بالذكاء الاصطناعي" openshorts={checkIcon} opusclip={limited} kapwing={paid} />
                <ComparisonRow feature="مولّد فيديوهات UGC" openshorts={checkIcon} opusclip={no} kapwing={no} />
                <ComparisonRow feature="ممثلين AI بمزامنة شفايف" openshorts={checkIcon} opusclip={no} kapwing={no} />
                <ComparisonRow feature="حدود الاستخدام" openshorts={<span className="text-ok text-sm">بدون حدود</span>} opusclip={<span className="text-muted text-sm">حسب الباقة</span>} kapwing={<span className="text-muted text-sm">حسب الباقة</span>} />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-5xl mx-auto">
          <SectionHeader eyebrow="07 · الاستخدامات" title="مين يستفيد منه؟">
            صنّاع المحتوى والمسوّقين والوكالات اللي يبون يكثّرون الفيديوهات القصيرة.
          </SectionHeader>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'صنّاع المحتوى', description: 'حوّل فيديوهاتك الطويلة لمقاطع تيك توك وريلز تلقائيًا.', icon: Youtube },
              { title: 'مدراء السوشال ميديا', description: 'عالج فيديوهات كثيرة وانشرها لأكثر من عميل من لوحة وحدة.', icon: Instagram },
              { title: 'أصحاب البودكاست والمعلّمين', description: 'طلّع أقوى اللحظات من الحلقات والدروس.', icon: FileVideo },
              { title: 'المشاريع والعلامات التجارية', description: 'فيديوهات تسويقية بأسلوب UGC بممثلين AI.', icon: Sparkles },
            ].map((useCase, i) => (
              <div key={i} className="card p-6">
                <useCase.icon size={18} className="text-brass mb-4" />
                <h3 className="font-display text-xl text-ink mb-2">{useCase.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Also included */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="08 · وكمان" title="أداتين زيادة، في نفس التطبيق">
            على نفس سيرفرك، وبنفس الواجهة.
          </SectionHeader>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card p-6 sm:p-8">
              <p className="eyebrow mb-4">01 · شورتس AI</p>
              <Sparkles size={20} className="text-brass mb-4" />
              <h3 className="font-display text-2xl text-ink mb-2">شورتس AI</h3>
              <p className="text-muted text-sm leading-relaxed mb-4">فيديوهات تسويق UGC بممثلين AI لأي مشروع.</p>
              <ul className="space-y-1.5">
                {['توليد ممثل AI + مزامنة شفايف', 'لقطات B-roll + ترجمة بأسلوب تيك توك', 'يحتاج مفاتيحك في fal.ai و ElevenLabs'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted"><Check size={12} className="text-ok shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="card p-6 sm:p-8">
              <p className="eyebrow mb-4">02 · الاستوديو</p>
              <Monitor size={20} className="text-brass mb-4" />
              <h3 className="font-display text-2xl text-ink mb-2">استوديو يوتيوب</h3>
              <p className="text-muted text-sm leading-relaxed mb-4">أدوات يوتيوب بالذكاء الاصطناعي: صور مصغّرة وعناوين وأوصاف.</p>
              <ul className="space-y-1.5">
                {['مولّد صور مصغّرة (مع رفع صورة وجهك)', '10 عناوين مقترحة + محادثة تعديل', 'نشر مباشر على يوتيوب'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted"><Check size={12} className="text-ok shrink-0" />{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-3xl mx-auto">
          <SectionHeader eyebrow="09 · الأسئلة الشائعة" title="أسئلة تتكرر">
            كل اللي تحتاج تعرفه عن نسختك من OpenShorts، من الإعداد للميزات.
          </SectionHeader>
          <div className="divide-y divide-rule border-y border-rule">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Self-hosting details, folded */}
      <section className="py-16 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-5xl mx-auto">
          <details className="group">
            <summary className="list-none cursor-pointer flex items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="eyebrow block mb-3">10 · التشغيل الذاتي</span>
                <span className="font-display text-2xl md:text-3xl text-ink">مفاتيح الـ API والتقنيات المستخدمة</span>
              </span>
              <ChevronDown size={22} className="text-muted shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <section className="pt-12">
              <div className="max-w-5xl mx-auto">
                <SectionHeader eyebrow="مفاتيح API" title="كل خدمة فيها باقة مجانية">
                  تستخدم مفاتيحك أنت، وتنحفظ في متصفحك بس:
                </SectionHeader>
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="card p-6 relative">
                    <span className="badge-brass absolute top-4 end-4">مطلوب</span>
                    <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
                      <Cpu size={18} className="text-brass" />
                    </div>
                    <h3 className="font-display text-xl text-ink mb-1">Google Gemini API</h3>
                    <div className="mb-3"><span className="badge-ok">فيه باقة مجانية</span></div>
                    <p className="text-muted text-sm leading-relaxed">يشغّل كل ميزات الذكاء الاصطناعي: كشف اللحظات، توليد العناوين، التأثيرات، الصور المصغّرة، وكتابة الأوصاف. هو المحرك الأساسي.</p>
                  </div>
                  <div className="card p-6 relative">
                    <span className="readout absolute top-4 end-4 border border-rule rounded-full px-2.5 py-1">اختياري</span>
                    <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
                      <Languages size={18} className="text-brass" />
                    </div>
                    <h3 className="font-display text-xl text-ink mb-1">ElevenLabs API</h3>
                    <div className="mb-3"><span className="badge-ok">فيه باقة مجانية</span></div>
                    <p className="text-muted text-sm leading-relaxed">يشغّل الدبلجة والترجمة الصوتية بأكثر من 30 لغة بنفس صوت المتحدث. المقاطع المدبلجة تنترجم تلقائيًا.</p>
                  </div>
                  <div className="card p-6 relative">
                    <span className="readout absolute top-4 end-4 border border-rule rounded-full px-2.5 py-1">اختياري</span>
                    <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
                      <Globe size={18} className="text-brass" />
                    </div>
                    <h3 className="font-display text-xl text-ink mb-1">Upload-Post API</h3>
                    <div className="mb-3"><span className="badge-ok">فيه باقة مجانية</span></div>
                    <p className="text-muted text-sm leading-relaxed">يخليك تنشر على يوتيوب وتيك توك وريلز إنستقرام مباشرة من لوحة التحكم، بدون ما تطلع من OpenShorts.</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5 mt-5">
                  <div className="card p-6 relative">
                    <span className="readout absolute top-4 end-4 border border-rule rounded-full px-2.5 py-1">شورتس AI</span>
                    <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
                      <Zap size={18} className="text-brass" />
                    </div>
                    <h3 className="font-display text-xl text-ink mb-1">fal.ai API</h3>
                    <div className="mb-3"><span className="badge-ok">تدفع على قد استخدامك</span></div>
                    <p className="text-muted text-sm leading-relaxed">يشغّل شورتس AI: صور الممثلين (Flux)، وفيديوهات المتحدث (Hailuo/Kling)، ومزامنة الشفايف (VEED). تحتاجه بس لمولّد فيديوهات UGC.</p>
                  </div>
                  <div className="card p-6 relative">
                    <span className="readout absolute top-4 end-4 border border-rule rounded-full px-2.5 py-1">شورتس AI</span>
                    <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center mb-4">
                      <Languages size={18} className="text-brass" />
                    </div>
                    <h3 className="font-display text-xl text-ink mb-1">ElevenLabs TTS</h3>
                    <div className="mb-3"><span className="badge-ok">فيه باقة مجانية</span></div>
                    <p className="text-muted text-sm leading-relaxed">يولّد تعليق صوتي طبيعي لشورتس AI من السكربت، مع أصوات رجال ونساء.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-12">
              <div className="max-w-5xl mx-auto">
                <SectionHeader eyebrow="التقنيات" title="مبني بتقنيات مجرّبة">
                  أفضل نماذج الذكاء الاصطناعي والأدوات المفتوحة المصدر في خط معالجة واحد.
                </SectionHeader>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'Google Gemini', desc: 'التحليل' },
                    { name: 'faster-whisper', desc: 'التفريغ' },
                    { name: 'YOLOv8', desc: 'كشف الأجسام' },
                    { name: 'MediaPipe', desc: 'تتبّع الوجه' },
                    { name: 'FFmpeg', desc: 'معالجة الفيديو' },
                    { name: 'ElevenLabs', desc: 'الصوت والدبلجة' },
                    { name: 'fal.ai', desc: 'توليد الفيديو' },
                    { name: 'React + Vite', desc: 'لوحة التحكم' },
                    { name: 'Docker', desc: 'التشغيل' },
                  ].map((tech, i) => (
                    <div key={i} className="border border-rule rounded-input bg-paper2 px-4 py-3 text-center">
                      <div className="readout text-ink2" dir="ltr">{tech.name}</div>
                      <div className="text-xs text-muted mt-1">{tech.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </details>
        </div>
      </section>

      {/* CTA Section — final statement */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 border-t border-rule">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl text-ink tracking-tight mb-5">ابدأ طلّع مقاطعك اليوم.</h2>
          <p className="text-muted mb-10 max-w-xl mx-auto leading-relaxed">مجاني بالكامل على سيرفرك · بدون حدود · بدون علامة مائية.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={onLaunchApp} className="btn-primary whitespace-nowrap">
              ادخل التطبيق
              <ArrowRight size={16} />
            </button>
            <a
              href="https://github.com/moha700m/OpenShorts"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost whitespace-nowrap"
            >
              <Github size={16} />
              الكود على GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Floating CTA, the same form as the hero */}
      <form
        onSubmit={handleHeroSubmit}
        aria-hidden={!stickyCta}
        className={`fixed z-40 bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl flex items-center gap-2 p-2 rounded-full border border-rule bg-paper2/95 backdrop-blur shadow-2xl transition-all duration-300 ${stickyCta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
      >
        <Link2 size={16} className="ms-3 text-muted shrink-0 hidden sm:block" />
        <input
          type="url"
          dir="auto"
          value={heroUrl}
          onChange={(e) => setHeroUrl(e.target.value)}
          placeholder="حط رابط المقطع"
          tabIndex={stickyCta ? 0 : -1}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink placeholder:text-muted px-2 min-h-[44px]"
          aria-label="رابط الفيديو"
        />
        <button type="submit" tabIndex={stickyCta ? 0 : -1} className="btn-primary whitespace-nowrap rounded-full text-sm">
          طلّع المقاطع <ArrowRight size={14} />
        </button>
      </form>

      {/* Footer */}
      <footer className="border-t border-rule py-16 px-4 sm:px-6 pb-24 sm:pb-16">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-3xl md:text-5xl text-ink tracking-tight mb-10">قصّه قبل لا يعدّي.</p>
          <div className="border-t border-rule pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo-openshorts.png" alt="OpenShorts" className="w-6 h-6" />
              <span className="text-sm text-muted">OpenShorts — مولّد مقاطع مفتوح المصدر، على سيرفرك</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
              <a href="https://github.com/moha700m/OpenShorts" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
              <a href="https://github.com/mutonby/openshorts" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">المشروع الأصلي</a>
              <a href="#features" className="hover:text-ink transition-colors">الميزات</a>
              <a href="#faq" className="hover:text-ink transition-colors">الأسئلة الشائعة</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
