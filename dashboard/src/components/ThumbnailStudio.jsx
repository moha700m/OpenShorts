import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image, Loader2, Send, Check, Download, ArrowRight, ArrowLeft, Sparkles, Video, Type, X, Plus, MessageSquare, FileText, Youtube, AlertCircle, Settings } from 'lucide-react';
import { getApiUrl } from '../config';
import { apiFetch, QuotaError, openQuotaWall } from '../lib/api';
import StepIndicator from './ui/StepIndicator';
import SegmentedControl from './ui/SegmentedControl';

const STEPS = ["المدخلات", "العناوين", "التوليد", "الوصف", "النشر"];

function DragDropZone({ label, accept, onFile, file, onClear, icon }) {
  const Icon = icon;
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  if (file) {
    return (
      <div className="relative border border-rule2 rounded-card p-3 bg-paper3">
        <div className="flex items-center gap-3">
          {file.type?.startsWith('image/') ? (
            <img src={URL.createObjectURL(file)} className="w-12 h-12 rounded-input object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-input bg-paper2 border border-rule flex items-center justify-center">
              <Icon size={18} className="text-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink truncate">{file.name}</p>
            <p className="readout mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button onClick={onClear} className="text-muted hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brass bg-paper3' : 'border-rule2 hover:border-brass'
        }`}
    >
      <Icon size={18} className="mx-auto text-muted mb-2" />
      <p className="text-sm text-ink2 lowercase">{label}</p>
      <p className="text-xs text-muted mt-1 lowercase">اسحب الملف هنا أو اضغط عشان ترفع</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}

export default function ThumbnailStudio({ geminiApiKey, uploadPostKey, uploadUserId, managed = false, onCreateClips = null }) {
  // Managed (hosted plan): Gemini runs server-side via the bearer token, no BYOK key.
  // Only send X-Gemini-Key for self-host BYOK. apiFetch attaches the bearer token.
  const keyHeader = geminiApiKey ? { 'X-Gemini-Key': geminiApiKey } : {};
  const needsKey = !geminiApiKey && !managed;
  // Step management
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(null); // 'video' or 'manual'

  // Step 1 state
  const [videoFile, setVideoFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Step 2 state
  const [sessionId, setSessionId] = useState(null);
  const [titles, setTitles] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isRefining, setIsRefining] = useState(false);
  const [recommended, setRecommended] = useState([]); // [{index, reason}]
  const [thumbnailTexts, setThumbnailTexts] = useState([]); // hook text paired with each title

  // Step 3 state
  const [faceImage, setFaceImage] = useState(null);
  const [bgImage, setBgImage] = useState(null);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [thumbnailCount, setThumbnailCount] = useState(3);
  const [burnText, setBurnText] = useState(true); // crisp PIL text vs model-rendered text
  const [frames, setFrames] = useState(null); // null = not fetched yet
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedThumbnails, setGeneratedThumbnails] = useState([]);

  // Description state
  const [description, setDescription] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);

  // Step 4 (Publish) state
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // Background preprocessing state
  const [preprocessSessionId, setPreprocessSessionId] = useState(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Background Pre-upload (starts Whisper immediately) ---
  const handlePreUpload = async (file) => {
    setPreprocessSessionId(null);
    setIsPreprocessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch('/api/thumbnail/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setPreprocessSessionId(data.session_id);
        console.log(`🎙️ Background Whisper started: ${data.session_id}`);
      }
    } catch (e) {
      console.error('Pre-upload failed:', e);
    } finally {
      setIsPreprocessing(false);
    }
  };

  // --- Step 1: Analyze Video ---
  const handleAnalyze = async () => {
    if (needsKey) return alert("حط مفتاح Gemini من الإعدادات أول.");
    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      if (preprocessSessionId) {
        // Use pre-uploaded session (Whisper already running/done in background)
        formData.append('session_id', preprocessSessionId);
      } else if (videoFile) {
        formData.append('file', videoFile);
      } else {
        return alert("ارفع ملف فيديو.");
      }

      const res = await apiFetch('/api/thumbnail/analyze', {
        method: 'POST',
        headers: keyHeader,
        body: formData
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setTitles(data.titles || []);
      setThumbnailTexts(data.thumbnail_texts || []);
      setRecommended(data.recommended || []);
      setChatHistory([{
        role: 'assistant',
        content: `هذي 10 عناوين مقترحة تنتشر مبنية على فيديوك. العناوين اللي عليها "الأفضل" هي أقوى اختياراتي. اضغط على واحد عشان تختاره، أو قول لي كيف أعدّلها.`
      }]);
      setStep(1);
    } catch (e) {
      alert(`فشل التحليل: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualMode = () => {
    setMode('manual');
    setStep(1);
  };

  // --- Step 2: Title Selection / Refinement ---
  const handleSelectTitle = (title) => {
    setSelectedTitle(title);
  };

  const handleConfirmTitle = () => {
    if (mode === 'manual' && manualTitle) {
      setSelectedTitle(manualTitle);
      // Create session for manual mode
      const newSessionId = sessionId || crypto.randomUUID();
      setSessionId(newSessionId);
      apiFetch('/api/thumbnail/titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...keyHeader
        },
        body: JSON.stringify({ title: manualTitle, session_id: newSessionId })
      }).catch(() => { });
    }
    if (selectedTitle || (mode === 'manual' && manualTitle)) {
      setStep(2);
    }
  };

  const handleRefine = async () => {
    if (!chatInput.trim() || !sessionId) return;
    setIsRefining(true);

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await apiFetch('/api/thumbnail/titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...keyHeader
        },
        body: JSON.stringify({ session_id: sessionId, message: userMsg })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setTitles(data.titles || []);
      setThumbnailTexts(data.thumbnail_texts || []);
      setRecommended([]);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `هذي عناوين معدّلة على حسب ملاحظاتك. اضغط على واحد عشان تختاره.`
      }]);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `ما قدرنا نعدّلها: ${e.message}`
      }]);
    } finally {
      setIsRefining(false);
    }
  };

  // --- Step 3: Generate Thumbnails ---
  const handleGenerate = async () => {
    if (needsKey) return alert("حط مفتاح Gemini من الإعدادات أول.");
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert("اختر عنوان أو اكتبه أول.");

    setIsGenerating(true);
    setGeneratedThumbnails([]);

    try {
      const formData = new FormData();
      formData.append('session_id', sessionId || 'manual');
      formData.append('title', finalTitle);
      formData.append('extra_prompt', extraPrompt);
      formData.append('count', thumbnailCount);
      formData.append('burn_text', burnText ? 'true' : 'false');
      if (selectedFrame && !faceImage) formData.append('frame', selectedFrame);
      if (faceImage) formData.append('face', faceImage);
      if (bgImage) formData.append('background', bgImage);

      const res = await apiFetch('/api/thumbnail/generate', {
        method: 'POST',
        headers: keyHeader,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `خطأ في السيرفر ${res.status}`);
      }

      const data = await res.json();
      if (!data.thumbnails || data.thumbnails.length === 0) {
        throw new Error("ما انولّدت أي صورة مصغّرة. ممكن مفتاح Gemini حقك ما عنده صلاحية توليد الصور.");
      }
      setGeneratedThumbnails(data.thumbnails);
    } catch (e) {
      if (e instanceof QuotaError) { openQuotaWall(e, 'thumbnails'); return; }
      alert(`فشل التوليد: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Frames with a big, sharp face from the uploaded video: one click replaces
  // the face upload nobody makes. Fetched once when the generate step opens.
  // `frames` is deliberately not a dependency: setting it inside the effect
  // would re-run it and the cleanup would discard the response in flight.
  const framesRequestedFor = useRef(null);
  useEffect(() => {
    if (step !== 2 || mode !== 'video' || !sessionId) return;
    if (framesRequestedFor.current === sessionId) return;
    framesRequestedFor.current = sessionId;
    setFrames([]);
    setFramesLoading(true);
    apiFetch(`/api/thumbnail/frames/${sessionId}`)
      .then(res => (res.ok ? res.json() : { frames: [] }))
      .then(data => setFrames(data.frames || []))
      .catch(() => setFrames([]))
      .finally(() => setFramesLoading(false));
  }, [step, mode, sessionId]);

  const handleDownload = async (url) => {
    try {
      const response = await fetch(getApiUrl(url));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = url.split('/').pop() || 'thumbnail.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab if fetch fails
      window.open(getApiUrl(url), '_blank');
    }
  };

  // --- Description Generation ---
  const handleGenerateDescription = async () => {
    if (needsKey) return alert("حط مفتاح Gemini من الإعدادات أول.");
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert("اختر عنوان أول.");
    if (!sessionId) return alert("ما فيه جلسة متاحة.");

    setIsDescribing(true);
    try {
      const res = await apiFetch('/api/thumbnail/describe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...keyHeader
        },
        body: JSON.stringify({ session_id: sessionId, title: finalTitle })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      setDescription(data.description || '');
    } catch (e) {
      alert(`فشل توليد الوصف: ${e.message}`);
    } finally {
      setIsDescribing(false);
    }
  };

  // --- Publish to YouTube ---
  const handlePublish = async () => {
    if (!managed && (!uploadPostKey || !uploadUserId)) return alert("اضبط مفتاح Upload-Post والمستخدم من الإعدادات أول.");
    const finalTitle = selectedTitle || manualTitle;
    if (!finalTitle) return alert("ما اخترت عنوان.");
    if (!selectedThumbnail) return alert("اختر صورة مصغّرة أول.");
    if (!description) return alert("ولّد وصف أو اكتبه أول.");

    setIsPublishing(true);
    setPublishResult(null);
    try {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('title', finalTitle);
      formData.append('description', description);
      formData.append('thumbnail_url', selectedThumbnail);
      formData.append('api_key', uploadPostKey);
      formData.append('user_id', uploadUserId);

      // Submit the publish job — returns immediately with a publish_id
      const res = await apiFetch('/api/thumbnail/publish', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const { publish_id } = await res.json();

      // Poll for status every 2 seconds (upload can take minutes for large videos)
      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await apiFetch(`/api/thumbnail/publish/status/${publish_id}`);
            if (!statusRes.ok) { clearInterval(interval); reject(new Error("فشل فحص الحالة")); return; }
            const statusData = await statusRes.json();

            if (statusData.status === 'done') {
              clearInterval(interval);
              setPublishResult({ success: true, data: statusData.result });
              resolve();
            } else if (statusData.status === 'failed') {
              clearInterval(interval);
              reject(new Error(statusData.error || "فشل الرفع"));
            }
            // 'uploading' → keep polling
          } catch (e) {
            clearInterval(interval);
            reject(e);
          }
        }, 2000);
      });

    } catch (e) {
      setPublishResult({ success: false, error: e.message });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setMode(null);
    setVideoFile(null);
    setSessionId(null);
    setTitles([]);
    setSelectedTitle('');
    setManualTitle('');
    setChatInput('');
    setChatHistory([]);
    setFaceImage(null);
    setFrames(null);
    framesRequestedFor.current = null;
    setSelectedFrame(null);
    setThumbnailTexts([]);
    setBgImage(null);
    setExtraPrompt('');
    setGeneratedThumbnails([]);
    setDescription('');
    setIsDescribing(false);
    setSelectedThumbnail(null);
    setIsPublishing(false);
    setPublishResult(null);
    setPreprocessSessionId(null);
    setIsPreprocessing(false);
    setRecommended([]);
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 animate-fade">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="eyebrow mb-2">06 · استوديو يوتيوب</p>
            <h1 className="font-display lowercase text-2xl text-ink flex items-center gap-3">
              <span className="w-10 h-10 rounded-card bg-paper3 flex items-center justify-center">
                <Image size={18} className="text-brass" />
              </span>
              استوديو يوتيوب
            </h1>
          </div>
          {step > 0 && (
            <button onClick={handleReset} className="text-xs lowercase text-muted hover:text-ink transition-colors flex items-center gap-1">
              <Plus size={12} /> مشروع جديد
            </button>
          )}
        </div>
        <p className="text-sm lowercase text-muted mb-6">ولّد عناوين تنتشر، وصور مصغّرة بالذكاء الاصطناعي، وأوصاف، وانشر على يوتيوب مباشرة</p>

        <div className="mb-8">
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {/* Gemini API Key Warning (self-host BYOK only; managed uses server key) */}
        {needsKey && (
          <div className="mb-6 p-5 bg-warn/10 rounded-card flex items-start gap-3">
            <AlertCircle size={18} className="text-warn shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warn lowercase">مفتاح Gemini مطلوب</p>
              <p className="text-xs text-muted mt-1">استوديو يوتيوب يحتاج مفتاح Google Gemini عشان يشتغل. اضبطه من تبويب <strong>الإعدادات</strong> قبل ما تستخدم هالميزة. باقة Gemini المجانية فيها 1,500 طلب باليوم.</p>
            </div>
          </div>
        )}

        {/* ===== STEP 0: Input Mode Selection ===== */}
        {step === 0 && (
          <div className={`grid md:grid-cols-2 gap-6 ${needsKey ? 'opacity-50 pointer-events-none select-none' : ''}`}>
            {/* Mode A: Video Analysis */}
            <div className="card card-hover p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-input bg-paper3 flex items-center justify-center">
                  <Video size={16} className="text-brass" />
                </div>
                <div>
                  <p className="eyebrow">أ · حلّل الفيديو</p>
                  <p className="text-xs text-muted mt-0.5">الذكاء الاصطناعي يقترح عناوين تنتشر من محتواك</p>
                </div>
              </div>

              <DragDropZone
                label="ارفع ملف فيديو"
                accept="video/*"
                onFile={(f) => { setVideoFile(f); setMode('video'); handlePreUpload(f); }}
                file={videoFile}
                onClear={() => { setVideoFile(null); setPreprocessSessionId(null); }}
                icon={Video}
              />

              {isPreprocessing && (
                <div className="flex items-center gap-2 text-xs lowercase text-muted bg-paper3 rounded-input px-3 py-2">
                  <Loader2 size={12} className="animate-spin text-brass" />
                  نجهّز الفيديو (بدأ تفريغ Whisper)...
                </div>
              )}
              {preprocessSessionId && !isPreprocessing && (
                <div className="flex items-center gap-2 text-xs lowercase text-ok bg-ok/10 rounded-input px-3 py-2">
                  <Check size={12} />
                  انرفع الفيديو — التفريغ شغّال بالخلفية
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !videoFile}
                className="w-full btn-primary"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري تحليل الفيديو...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="hidden sm:block" />
                    <span className="whitespace-nowrap">حلّل وطلّع عناوين</span>
                  </>
                )}
              </button>
            </div>

            {/* Mode B: Manual Title */}
            <div className="card card-hover p-6 space-y-4 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-input bg-paper3 flex items-center justify-center">
                  <Type size={16} className="text-brass" />
                </div>
                <div>
                  <p className="eyebrow">ب · اكتب عنوانك</p>
                  <p className="text-xs text-muted mt-0.5">تخطّى التحليل، واكتب عنوانك مباشرة</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="اكتب عنوان يوتيوب..."
                  className="input-field text-sm mb-4"
                  maxLength={70}
                />
                <p className="readout mb-4">{manualTitle.length} / 70</p>
              </div>

              <button
                onClick={handleManualMode}
                disabled={!manualTitle.trim()}
                className="w-full btn-ghost disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <ArrowRight size={16} />
                استخدم هالعنوان
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 1: Title Selection ===== */}
        {step === 1 && (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left: Chat / Controls */}
            <div className="md:col-span-2 flex flex-col gap-4">
              {mode === 'manual' ? (
                <div className="card p-6 space-y-4">
                  <p className="eyebrow">عنوانك</p>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="input-field text-sm"
                    maxLength={70}
                  />
                  <p className="readout">{manualTitle.length} / 70</p>
                  <button
                    onClick={handleConfirmTitle}
                    disabled={!manualTitle.trim()}
                    className="w-full btn-primary"
                  >
                    <ArrowRight size={16} />
                    كمّل للصور المصغّرة
                  </button>
                </div>
              ) : (
                <div className="card p-4 flex flex-col h-[500px]">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-rule">
                    <MessageSquare size={14} className="text-brass" />
                    <span className="eyebrow">محادثة تعديل العناوين</span>
                  </div>

                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar mb-3">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] px-3 py-2 rounded-card text-xs ${msg.role === 'user'
                          ? 'bg-paper3 text-ink2'
                          : 'border border-rule text-ink2'
                          }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleRefine()}
                      placeholder="خلّها تشد أكثر..."
                      className="input-field text-xs flex-1"
                      disabled={isRefining}
                    />
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !chatInput.trim()}
                      className="btn-quiet px-3 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {isRefining ? <Loader2 size={14} className="animate-spin text-brass" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {mode !== 'manual' && selectedTitle && (
                <button
                  onClick={handleConfirmTitle}
                  className="w-full btn-primary"
                >
                  <ArrowRight size={16} />
                  استخدم العنوان المحدد
                </button>
              )}
            </div>

            {/* Right: Title Cards */}
            <div className="md:col-span-3 space-y-3">
              {selectedTitle && (
                <div className="p-3 bg-ok/10 rounded-card flex items-center gap-2 text-sm">
                  <Check size={14} className="text-ok shrink-0" />
                  <span className="text-ok font-medium truncate">المحدد: {selectedTitle}</span>
                </div>
              )}

              {titles.length > 0 && (
                <div className="space-y-2">
                  {titles.map((title, i) => {
                    const rec = recommended.find(r => r.index === i);
                    const recRank = recommended.findIndex(r => r.index === i);
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectTitle(title)}
                        className={`w-full text-start p-4 rounded-card border transition-colors duration-200 text-sm ${selectedTitle === title
                          ? 'bg-paper3 border-brass text-ink'
                          : 'border-rule text-ink2 hover:bg-paper3 hover:border-rule2'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-micro shrink-0 mt-0.5 ${selectedTitle === title ? 'bg-brass border-brass text-brassink' :
                            rec ? 'border-rule2 text-brass' :
                              'border-rule text-muted'
                            }`}>
                            {selectedTitle === title ? <Check size={10} /> : rec ? '★' : i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="leading-relaxed">{title}</span>
                              {rec && (
                                <span className="badge-brass shrink-0">
                                  {recRank === 0 ? "الأفضل" : "الثاني"}
                                </span>
                              )}
                            </div>
                            {rec && (
                              <p className="text-xs text-muted mt-1.5 leading-relaxed">{rec.reason}</p>
                            )}
                            {thumbnailTexts[i] && (
                              <p className="readout mt-1.5">الصورة المصغّرة: {thumbnailTexts[i]}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {isRefining && (
                <div className="flex items-center justify-center py-8 text-muted">
                  <Loader2 size={18} className="animate-spin me-2 text-brass" />
                  <span className="text-sm lowercase">جاري تعديل العناوين...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 2: Thumbnail Generation ===== */}
        {step === 2 && (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left: Controls */}
            <div className="md:col-span-2 space-y-4">
              <div className="card p-6 space-y-4">
                <p className="eyebrow mb-1">العنوان</p>
                <div className="p-3 bg-paper3 border border-rule rounded-input text-sm text-ink">
                  {selectedTitle || manualTitle}
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="text-xs lowercase text-muted hover:text-ink transition-colors flex items-center gap-1"
                >
                  <ArrowLeft size={12} /> غيّر العنوان
                </button>
              </div>

              {mode === 'video' && frames !== null && (
                <div className="card p-6 space-y-3">
                  <p className="eyebrow">وجهك من الفيديو</p>
                  {frames.length === 0 ? (
                    <p className="text-xs text-muted lowercase">{framesLoading ? "ندوّر على لقطات واضحة فيها وجه..." : "ما لقينا وجه واضح في الفيديو."}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {frames.map((f) => (
                          <button
                            key={f.url}
                            type="button"
                            onClick={() => setSelectedFrame(selectedFrame === f.url ? null : f.url)}
                            className={`relative rounded-input overflow-hidden border-2 transition-colors ${selectedFrame === f.url ? 'border-brass' : 'border-transparent hover:border-rule2'}`}
                          >
                            <img src={getApiUrl(f.url)} alt="" className="w-full aspect-video object-cover" />
                            <span className="absolute bottom-1 end-1 readout bg-black/60 text-white px-1 rounded">
                              {Math.floor(f.time / 60)}:{String(Math.floor(f.time % 60)).padStart(2, '0')}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted lowercase">
                        {selectedFrame ? "هاللقطة هي مرجع الشخص (لو رفعت صورة تحت بتاخذ مكانها)." : "اختر لقطة عشان الصورة المصغّرة تطلع فيها أنت، مو شخص غريب."}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="card p-6 space-y-4">
                <p className="eyebrow">صورة الوجه · اختياري</p>
                <DragDropZone
                  label="ارفع صورة وجه / شخص"
                  accept="image/*"
                  onFile={setFaceImage}
                  file={faceImage}
                  onClear={() => setFaceImage(null)}
                  icon={Upload}
                />
              </div>

              <div className="card p-6 space-y-4">
                <p className="eyebrow">الخلفية · اختياري</p>
                <DragDropZone
                  label="ارفع صورة خلفية"
                  accept="image/*"
                  onFile={setBgImage}
                  file={bgImage}
                  onClear={() => setBgImage(null)}
                  icon={Image}
                />
              </div>

              <div className="card p-6 space-y-4">
                <p className="eyebrow">تعليمات · اختياري</p>
                <textarea
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  placeholder="مثلًا: استخدم أحمر وأسود، إضاءة درامية، حط إيموجي فلوس..."
                  className="input-field text-sm resize-none h-20"
                />
              </div>

              <div className="card p-6 space-y-4">
                <p className="eyebrow">النص على الصورة</p>
                <SegmentedControl
                  options={[{ value: true, label: "واضح" }, { value: false, label: "مرسوم بالـ AI" }]}
                  value={burnText}
                  onChange={setBurnText}
                  size="sm"
                />
                <p className="text-xs text-muted lowercase">
                  {burnText ? "النص ينكتب بخط عريض بعد ما تنرسم الصورة: دايم مكتوب صح." : "نموذج الصور يرسم النص بنفسه: مندمج أكثر، بس أحيانًا فيه أخطاء إملائية."}
                </p>
              </div>

              <div className="card p-6 space-y-4">
                <p className="eyebrow">العدد</p>
                <SegmentedControl
                  options={[1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))}
                  value={thumbnailCount}
                  onChange={setThumbnailCount}
                  size="sm"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full btn-primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري توليد الصور المصغّرة...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    ولّد الصور المصغّرة
                  </>
                )}
              </button>

            </div>

            {/* Right: Generated Thumbnails */}
            <div className="md:col-span-3">
              {generatedThumbnails.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm lowercase text-muted">الصور المصغّرة الجاهزة — اضغط عشان تختار وحدة للنشر</p>
                  <div className="grid gap-4">
                    {generatedThumbnails.map((thumb, i) => {
                      const url = thumb.url;
                      return (
                      <div
                        key={url}
                        onClick={() => setSelectedThumbnail(url)}
                        className={`glass-panel overflow-hidden group relative cursor-pointer transition-colors duration-200 ${selectedThumbnail === url ? 'border-2 border-brass' : ''
                          }`}
                      >
                        <img
                          src={getApiUrl(url)}
                          alt={`صورة مصغّرة ${i + 1}`}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                            className="btn-quiet"
                          >
                            <Download size={14} />
                            تنزيل
                          </button>
                        </div>
                        <div className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs lowercase text-muted flex items-center gap-2">
                              صورة مصغّرة {i + 1}{thumb.text ? ` · "${thumb.text}"` : ''}
                              {selectedThumbnail === url && (
                                <span className="text-brass flex items-center gap-1"><Check size={10} /> محددة</span>
                              )}
                            </span>
                            {thumb.why && <p className="text-xs text-muted mt-1 truncate">{thumb.why}</p>}
                            {thumb.fallback && <p className="text-xs text-warn mt-1">Gemini رفض يرسم هالشخص (الشخصيات العامة ممنوعة)، فطلعت الصورة بدونه.</p>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                            className="text-xs lowercase text-muted hover:text-ink transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Download size={12} /> حفظ
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* How it reads in the feed on a phone, where the click is decided */}
                  <div className="card p-4 space-y-3">
                    <p className="eyebrow">معاينة الجوال</p>
                    <div className="space-y-3">
                      {generatedThumbnails.map((thumb) => (
                        <div key={thumb.url} className="flex gap-3 items-start">
                          <img src={getApiUrl(thumb.url)} alt="" className="w-[168px] h-[94px] object-cover rounded-input shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-ink leading-snug line-clamp-2">{selectedTitle || manualTitle}</p>
                            <p className="text-xs text-muted mt-1">قناتك · 1.2 ألف مشاهدة · قبل ساعتين</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Regenerate */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full btn-ghost"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-brass" />
                        جاري التوليد من جديد...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        ولّد من جديد
                      </>
                    )}
                  </button>

                  {/* Proceed to Description */}
                  {selectedThumbnail && (
                    <button
                      onClick={() => setStep(3)}
                      className="w-full btn-primary"
                    >
                      <ArrowRight size={16} />
                      التالي: الوصف
                    </button>
                  )}
                </div>
              ) : isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-muted space-y-4 min-h-[400px]">
                  <div className="w-16 h-16 rounded-full border-2 border-rule2 border-t-brass animate-spin" />
                  <div className="text-center">
                    <p className="text-sm lowercase font-medium text-ink2">جاري توليد الصور المصغّرة...</p>
                    <p className="text-xs lowercase text-muted mt-1">ممكن تاخذ دقيقة لكل صورة</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted space-y-4 min-h-[400px]">
                  <div className="w-20 h-20 rounded-card bg-paper3 border border-rule flex items-center justify-center">
                    <Image size={28} className="text-muted" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm lowercase text-ink2">صورك المصغّرة بتطلع هنا</p>
                    <p className="text-xs lowercase text-muted mt-1">اضبط الخيارات واضغط "ولّد"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 3: YouTube Description ===== */}
        {step === 3 && (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left: Context & Controls */}
            <div className="md:col-span-2 space-y-4">
              <button
                onClick={() => setStep(2)}
                className="text-xs lowercase text-muted hover:text-ink transition-colors flex items-center gap-1 mb-2"
              >
                <ArrowLeft size={12} /> ارجع للتوليد
              </button>

              {/* Selected Thumbnail Preview */}
              {selectedThumbnail && (
                <div className="glass-panel overflow-hidden">
                  <img
                    src={getApiUrl(selectedThumbnail)}
                    alt="الصورة المصغّرة المحددة"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-3">
                    <span className="text-xs lowercase text-brass flex items-center gap-1"><Check size={10} /> الصورة المصغّرة المحددة</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="glass-panel p-6 space-y-3">
                <p className="eyebrow">العنوان</p>
                <div className="p-3 bg-paper3 border border-rule rounded-input text-sm text-ink">
                  {selectedTitle || manualTitle}
                </div>
              </div>

              {/* Generate Description Button */}
              {mode === 'video' && (
                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow flex items-center gap-2">
                      <Sparkles size={14} className="text-brass" />
                      وصف بالذكاء الاصطناعي
                    </p>
                    <span className="readout">مع الفصول</span>
                  </div>
                  <p className="text-xs text-muted">
                    ولّد وصف يوتيوب فيه توقيت الفصول من تفريغ فيديوك.
                  </p>
                  <button
                    onClick={handleGenerateDescription}
                    disabled={isDescribing}
                    className="w-full btn-ghost"
                  >
                    {isDescribing ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-brass" />
                        جاري توليد الوصف...
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        {description ? "ولّد الوصف من جديد" : "ولّد الوصف"}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Next: Publish */}
              {description && (
                <button
                  onClick={() => setStep(4)}
                  className="w-full btn-primary"
                >
                  <ArrowRight size={16} />
                  التالي: النشر
                </button>
              )}
            </div>

            {/* Right: Editable Description */}
            <div className="md:col-span-3 space-y-4">
              <div className="glass-panel p-6 space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="eyebrow flex items-center gap-2">
                    <FileText size={14} className="text-muted" />
                    وصف يوتيوب
                  </p>
                  <span className="readout">{description.length} / 5000</span>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={mode === 'video'
                    ? "اضغط \"ولّد الوصف\" عشان يتولّد مع الفصول، أو اكتبه بنفسك..."
                    : "اكتب وصف فيديو يوتيوب هنا..."
                  }
                  className="input-field text-sm resize-none flex-1 min-h-[500px] font-mono custom-scrollbar"
                  maxLength={5000}
                />

                {!description && (
                  <p className="text-xs text-muted">
                    {mode === 'video'
                      ? "الذكاء الاصطناعي بيكتب وصف يشد مع توقيت الفصول من تفريغ Whisper لفيديوك."
                      : "اكتب وصف لفيديو يوتيوب. تقدر تكمّل للنشر أول ما يكون عندك وصف."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Publish to YouTube ===== */}
        {step === 4 && (
          <div className="grid md:grid-cols-5 gap-6">
            {/* Left: Summary & Publish */}
            <div className="md:col-span-2 space-y-4">
              <button
                onClick={() => setStep(3)}
                className="text-xs lowercase text-muted hover:text-ink transition-colors flex items-center gap-1 mb-2"
              >
                <ArrowLeft size={12} /> ارجع للوصف
              </button>

              {/* Selected Thumbnail Preview */}
              {selectedThumbnail && (
                <div className="glass-panel overflow-hidden">
                  <img
                    src={getApiUrl(selectedThumbnail)}
                    alt="الصورة المصغّرة المحددة"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-3">
                    <span className="text-xs lowercase text-brass flex items-center gap-1"><Check size={10} /> الصورة المصغّرة المحددة</span>
                  </div>
                </div>
              )}

              {/* Editable Title */}
              <div className="glass-panel p-6 space-y-3">
                <p className="eyebrow">العنوان</p>
                <input
                  type="text"
                  value={selectedTitle || manualTitle}
                  onChange={(e) => selectedTitle ? setSelectedTitle(e.target.value) : setManualTitle(e.target.value)}
                  className="input-field text-sm"
                  maxLength={100}
                />
              </div>

              {/* Publish Button */}
              {(!managed && (!uploadPostKey || !uploadUserId)) ? (
                <div className="glass-panel p-6 space-y-3">
                  <div className="flex items-center gap-2 text-warn">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium lowercase">Upload-Post مو مضبوط</span>
                  </div>
                  <p className="text-xs text-muted">
                    عشان تنشر على يوتيوب مباشرة، اضبط مفتاح Upload-Post واربط حساب من الإعدادات.
                  </p>
                  <button
                    onClick={() => { }}
                    className="text-xs lowercase text-brass hover:underline flex items-center gap-1"
                  >
                    <Settings size={12} /> روح للإعدادات
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="w-full btn-primary"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جاري النشر على يوتيوب...
                    </>
                  ) : (
                    <>
                      <Youtube size={16} />
                      انشر على يوتيوب
                    </>
                  )}
                </button>
              )}

              {/* Polling status */}
              {isPublishing && (
                <div className="readout flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-brass" />
                  جاري الرفع — نتابع الحالة كل ثانيتين
                </div>
              )}

              {/* Publish Result */}
              {publishResult && (
                <div className="glass-panel p-4">
                  {publishResult.success ? (
                    <div className="space-y-2">
                      <span className="badge-ok">انتشر</span>
                      <p className="text-sm lowercase font-medium text-ink">انتشر بنجاح!</p>
                      <p className="text-xs text-muted">فيديوك ينرفع على يوتيوب بالخلفية.</p>
                      {onCreateClips && sessionId && (
                        <button
                          onClick={() => onCreateClips(sessionId)}
                          className="btn-primary px-4 py-2 text-xs mt-1"
                          title="أرسل هالفيديو وتفريغه لمولّد المقاطع"
                        >
                          <Video size={14} />
                          طلّع مقاطع من هالفيديو
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="badge-danger">فشل</span>
                      <p className="text-sm lowercase font-medium text-danger">فشل النشر</p>
                      <p className="text-xs text-muted">{publishResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Description Preview (read-only feel, still editable) */}
            <div className="md:col-span-3 space-y-4">
              <div className="glass-panel p-6 space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <p className="eyebrow flex items-center gap-2">
                    <FileText size={14} className="text-muted" />
                    وصف يوتيوب
                  </p>
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs lowercase text-muted hover:text-ink flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft size={10} /> تعديل
                  </button>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field text-sm resize-none flex-1 min-h-[500px] font-mono custom-scrollbar"
                  maxLength={5000}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
