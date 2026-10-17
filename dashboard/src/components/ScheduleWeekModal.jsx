import React, { useState, useMemo } from 'react';
import { Loader2, Calendar, CheckCircle, AlertCircle, Video, Instagram, Youtube, ChevronLeft, ChevronRight, Circle, ExternalLink } from 'lucide-react';
import { apiFetch } from '../lib/api';
import Modal from './ui/Modal';
import SegmentedControl from './ui/SegmentedControl';
import TikTokDraftNotice from './TikTokDraftNotice';

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const TIMEZONES = [
    { value: 'Pacific/Midway', label: "(GMT-11:00) ميدواي" },
    { value: 'Pacific/Honolulu', label: "(GMT-10:00) هونولولو" },
    { value: 'America/Anchorage', label: "(GMT-09:00) ألاسكا" },
    { value: 'America/Los_Angeles', label: "(GMT-08:00) لوس أنجلوس" },
    { value: 'America/Denver', label: "(GMT-07:00) دنفر" },
    { value: 'America/Mexico_City', label: "(GMT-06:00) مكسيكو سيتي" },
    { value: 'America/Chicago', label: "(GMT-06:00) شيكاغو" },
    { value: 'America/New_York', label: "(GMT-05:00) نيويورك" },
    { value: 'America/Bogota', label: "(GMT-05:00) بوغوتا" },
    { value: 'America/Caracas', label: "(GMT-04:00) كاراكاس" },
    { value: 'America/Santiago', label: "(GMT-04:00) سانتياغو" },
    { value: 'America/Argentina/Buenos_Aires', label: "(GMT-03:00) بوينس آيرس" },
    { value: 'America/Sao_Paulo', label: "(GMT-03:00) ساو باولو" },
    { value: 'Atlantic/Azores', label: "(GMT-01:00) الأزور" },
    { value: 'UTC', label: "(GMT+00:00) UTC" },
    { value: 'Europe/London', label: "(GMT+00:00) لندن" },
    { value: 'Europe/Madrid', label: "(GMT+01:00) مدريد" },
    { value: 'Europe/Paris', label: "(GMT+01:00) باريس" },
    { value: 'Europe/Berlin', label: "(GMT+01:00) برلين" },
    { value: 'Europe/Rome', label: "(GMT+01:00) روما" },
    { value: 'Africa/Lagos', label: "(GMT+01:00) لاغوس" },
    { value: 'Europe/Istanbul', label: "(GMT+03:00) إسطنبول" },
    { value: 'Asia/Riyadh', label: '(GMT+03:00) الرياض' },
    { value: 'Asia/Dubai', label: "(GMT+04:00) دبي" },
    { value: 'Asia/Kolkata', label: "(GMT+05:30) الهند" },
    { value: 'Asia/Bangkok', label: "(GMT+07:00) بانكوك" },
    { value: 'Asia/Shanghai', label: "(GMT+08:00) شنغهاي" },
    { value: 'Asia/Tokyo', label: "(GMT+09:00) طوكيو" },
    { value: 'Australia/Sydney', label: "(GMT+10:00) سيدني" },
    { value: 'Pacific/Auckland', label: "(GMT+12:00) أوكلاند" },
];

const PLATFORM_OPTIONS = [
    { value: 'tiktok', label: 'TikTok', icon: <Video size={16} /> },
    { value: 'instagram', label: 'Instagram', icon: <Instagram size={16} /> },
    { value: 'youtube', label: 'YouTube', icon: <Youtube size={16} /> },
];

function getDayLabel(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return "اليوم";
    if (target.getTime() === tomorrow.getTime()) return "بكرة";
    return DAYS[target.getDay()];
}

function formatDate(date) {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function detectTimezone() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (TIMEZONES.find(t => t.value === tz)) return tz;
        return 'UTC';
    } catch {
        return 'UTC';
    }
}

export default function ScheduleWeekModal({ isOpen, onClose, clips, jobId, uploadPostKey, uploadUserId, isManaged }) {
    const [time, setTime] = useState('12:00');
    const [timezone, setTimezone] = useState(detectTimezone);
    const [platforms, setPlatforms] = useState({
        tiktok: true,
        instagram: true,
        youtube: true
    });
    const [startOffset, setStartOffset] = useState(1);

    const schedule = useMemo(() => {
        if (!clips) return [];
        return clips.map((clip, i) => {
            const date = new Date();
            date.setDate(date.getDate() + startOffset + i);
            date.setHours(0, 0, 0, 0);
            return { clip, index: i, date };
        });
    }, [clips, startOffset]);

    const [scheduling, setScheduling] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, results: [] });
    const [done, setDone] = useState(false);

    // Reset state when modal reopens
    const prevOpen = React.useRef(false);
    React.useEffect(() => {
        if (isOpen && !prevOpen.current) {
            setScheduling(false);
            setDone(false);
            setProgress({ current: 0, total: 0, results: [] });
        }
        prevOpen.current = isOpen;
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedPlatforms = Object.keys(platforms).filter(k => platforms[k]);

    // Managed (cloud plan/trial) users post with the server-side key — no BYOK needed
    const canPost = isManaged || (uploadPostKey && uploadUserId);

    const handleScheduleAll = async () => {
        if (!canPost) return;
        if (selectedPlatforms.length === 0) return;

        setScheduling(true);
        setDone(false);
        const total = schedule.length;
        setProgress({ current: 0, total, results: [] });

        const results = [];
        for (let i = 0; i < schedule.length; i++) {
            const { clip, index, date } = schedule[i];

            // Build local datetime string: "2026-04-06T12:00:00"
            // Upload-Post accepts this + timezone IANA parameter
            const pad = (n) => String(n).padStart(2, '0');
            const scheduledDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}:00`;

            const payload = {
                job_id: jobId,
                clip_index: index,
                api_key: uploadPostKey,
                user_id: uploadUserId,
                platforms: selectedPlatforms,
                title: clip.video_title_for_youtube_short || "شورت ينتشر",
                description: clip.video_description_for_instagram || clip.video_description_for_tiktok || '',
                scheduled_date: scheduledDate,
                timezone
            };

            try {
                const res = await apiFetch('/api/social/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText);
                }

                results.push({ index: i, success: true });
            } catch (e) {
                results.push({ index: i, success: false, error: e.message });
            }

            setProgress({ current: i + 1, total, results: [...results] });
        }

        setDone(true);
        setScheduling(false);
    };

    const successCount = progress.results.filter(r => r.success).length;
    const failCount = progress.results.filter(r => !r.success).length;

    const footer = (
        <div className="flex flex-col sm:flex-row gap-3">
            <button
                onClick={onClose}
                disabled={scheduling}
                className="btn-ghost flex-1"
            >
                {done ? 'سكّر' : 'إلغاء'}
            </button>
            {!done ? (
                <button
                    onClick={handleScheduleAll}
                    disabled={scheduling || !canPost || selectedPlatforms.length === 0}
                    className="btn-primary flex-1"
                >
                    {scheduling ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            جاري الجدولة...
                        </>
                    ) : (
                        <>
                            <Calendar size={16} />
                            جدول {clips?.length || 0} مقاطع
                        </>
                    )}
                </button>
            ) : (
                <a
                    href="https://app.upload-post.com/calendar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1 no-underline"
                >
                    <ExternalLink size={16} />
                    اعرض التقويم
                </a>
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={scheduling ? undefined : onClose}
            eyebrow="النشر · الأسبوع"
            title="جدول الأسبوع"
            size="md"
            footer={footer}
        >
            <p className="readout mb-4">{clips?.length || 0} المقاطع · 1/يوم</p>

            {!canPost && (
                <div className="mb-4 p-3 bg-warn/10 text-warn text-xs rounded-input flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div>الجدولة والنشر تحتاج مفتاح Upload-Post — حطه من الإعدادات.</div>
                </div>
            )}

            {/* Time + Timezone */}
            <div className="mb-5 grid grid-cols-2 gap-3">
                <div>
                    <label className="eyebrow block mb-2">الوقت</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        disabled={scheduling}
                        className="input-field [color-scheme:dark]"
                    />
                </div>
                <div>
                    <label className="eyebrow block mb-2">المنطقة الزمنية</label>
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        disabled={scheduling}
                        className="input-field appearance-none cursor-pointer"
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Start day offset */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow">ابدأ من</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setStartOffset(Math.max(1, startOffset - 1))}
                        disabled={startOffset <= 1 || scheduling}
                        className="btn-quiet px-2 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="readout text-ink2 min-w-[110px] text-center">
                        {(() => {
                            const d = new Date();
                            d.setDate(d.getDate() + startOffset);
                            return `${getDayLabel(d)} · ${formatDate(d)}`;
                        })()}
                    </span>
                    <button
                        onClick={() => setStartOffset(startOffset + 1)}
                        disabled={scheduling}
                        className="btn-quiet px-2 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Calendar list */}
            <div className="mb-5 border-y border-rule divide-y divide-rule">
                {schedule.map(({ clip, index, date }) => (
                    <div key={index} className="flex items-center gap-3 py-2.5">
                        <div className="w-24 shrink-0">
                            <span className="readout">{getDayLabel(date)} · {formatDate(date)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-ink truncate">
                                {clip.video_title_for_youtube_short || "شورت ينتشر"}
                            </div>
                            <div className="readout mt-0.5 truncate">
                                {time} · {TIMEZONES.find(t => t.value === timezone)?.label || timezone}
                            </div>
                        </div>

                        <div className="shrink-0">
                            {progress.results[index]?.success === true && (
                                <CheckCircle size={16} className="text-ok" />
                            )}
                            {progress.results[index]?.success === false && (
                                <AlertCircle size={16} className="text-danger" />
                            )}
                            {scheduling && progress.current === index && (
                                <Loader2 size={16} className="text-brass animate-spin" />
                            )}
                            {!scheduling && progress.results[index] === undefined && (
                                <Circle size={16} className="text-muted" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Platforms */}
            <div className="mb-5">
                <label className="eyebrow block mb-2">المنصات</label>
                <SegmentedControl
                    multi
                    options={PLATFORM_OPTIONS.map(opt => ({ ...opt, disabled: scheduling }))}
                    value={selectedPlatforms}
                    onChange={(arr) => setPlatforms({
                        tiktok: arr.includes('tiktok'),
                        instagram: arr.includes('instagram'),
                        youtube: arr.includes('youtube')
                    })}
                />
            </div>

            {/* A whole week of tiktok posts is a whole week of silent drafts:
                this modal writes no captions of its own either (it sends the
                clip's generated title/description), and tiktok keeps none of
                them on a draft. Say it before the button, not after. */}
            {platforms.tiktok && !scheduling && !done && <TikTokDraftNotice />}

            {/* Progress bar */}
            {(scheduling || done) && (
                <div className="mb-1">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted lowercase">{scheduling ? 'جاري الجدولة...' : 'خلص'}</span>
                        <span className="readout">{progress.current}/{progress.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-paper3 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${done && failCount === 0 ? 'bg-ok' : done && failCount > 0 ? 'bg-danger' : 'bg-brass'}`}
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    {done && (
                        <div className="mt-3 text-xs text-center lowercase">
                            {failCount === 0 ? (
                                <span className="text-ok">كل المقاطع انجدولت</span>
                            ) : (
                                <span className="text-danger">{successCount} انجدول، {failCount} فشل</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
