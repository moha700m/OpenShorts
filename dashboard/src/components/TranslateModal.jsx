import React, { useState } from 'react';
import { Loader2, Languages, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';

const LANGUAGES = {
    "es": "الإسبانية",
    "fr": "الفرنسية",
    "de": "الألمانية",
    "it": "الإيطالية",
    "pt": "البرتغالية",
    "pl": "البولندية",
    "hi": "الهندية",
    "ja": "اليابانية",
    "ko": "الكورية",
    "zh": "الصينية",
    "ar": "العربية",
    "ru": "الروسية",
    "tr": "التركية",
    "nl": "الهولندية",
    "sv": "السويدية",
    "id": "الإندونيسية",
    "fil": "الفلبينية",
    "ms": "الملايوية",
    "vi": "الفيتنامية",
    "th": "التايلندية",
    "uk": "الأوكرانية",
    "el": "اليونانية",
    "cs": "التشيكية",
    "fi": "الفنلندية",
    "ro": "الرومانية",
    "da": "الدنماركية",
    "bg": "البلغارية",
    "hr": "الكرواتية",
    "sk": "السلوفاكية",
    "ta": "التاميلية",
    "en": "الإنجليزية",
};

export default function TranslateModal({ isOpen, onClose, onTranslate, isProcessing, videoUrl, hasApiKey }) {
    const [targetLanguage, setTargetLanguage] = useState('es');

    if (!isOpen) return null;

    const handleSubmit = () => {
        console.log('[TranslateModal] handleSubmit called, targetLanguage:', targetLanguage);
        onTranslate({ targetLanguage });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={isProcessing ? undefined : onClose}
            eyebrow="الدبلجة"
            title="دبلج الصوت"
            size="md"
            footer={
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="btn-ghost flex-1"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !hasApiKey}
                        className="btn-primary flex-1"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                جاري الدبلجة...
                            </>
                        ) : (
                            <>
                                <Languages size={16} />
                                دبلج الصوت
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-input bg-paper3 flex items-center justify-center shrink-0">
                    <Languages size={18} className="text-brass" />
                </div>
                <p className="text-xs text-muted">ترجمة صوتية بالذكاء الاصطناعي من ElevenLabs</p>
            </div>

            {!hasApiKey && (
                <div className="mb-4 flex items-start gap-2">
                    <span className="badge-warn shrink-0"><AlertCircle size={12} /> المفتاح ناقص</span>
                    <p className="text-sm text-muted">اضبط مفتاح ElevenLabs من الإعدادات أول.</p>
                </div>
            )}

            {/* Preview */}
            <div className="mb-5 rounded-card overflow-hidden bg-black aspect-video">
                <video
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                />
            </div>

            {/* Language Selection */}
            <div className="mb-5">
                <label className="eyebrow block mb-2">
                    اللغة المطلوبة
                </label>
                <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="input-field appearance-none cursor-pointer"
                    disabled={isProcessing}
                >
                    {Object.entries(LANGUAGES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                        <option key={code} value={code}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Info */}
            <p className="text-xs text-muted leading-relaxed mb-2">
                الصوت بيتدبلج بصوت مولّد بالذكاء الاصطناعي باللغة اللي اخترتها، وبنفس طابع صوت المتحدث الأصلي.
            </p>

            {/* AI Act art. 50: we mark the file, the person publishing it is the
                one who owes the audience the disclosure. Saying so here is the
                only place they will read it. */}
            <p className="text-xs text-muted leading-relaxed mb-2">
                الملف المدبلج عليه علامة إنه محتوى مولّد بالذكاء الاصطناعي. لما تنشره، وضّح إن الصوت اصطناعي.
            </p>

            {/* Processing State */}
            {isProcessing && (
                <div className="mt-4 p-3 bg-paper3 rounded-input">
                    <div className="flex items-center gap-3">
                        <Loader2 size={18} className="text-brass animate-spin" />
                        <div>
                            <p className="text-sm text-ink font-medium lowercase">جاري دبلجة الصوت...</p>
                            <p className="text-xs text-muted lowercase">ممكن ياخذ كم دقيقة</p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
