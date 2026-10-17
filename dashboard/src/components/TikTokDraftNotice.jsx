import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Shown wherever tiktok is among the selected platforms, before the button
 * that posts or schedules.
 *
 * Two different people need it. Someone who publishes one clip expects a live
 * post and finds nothing on their profile, and reads that as a failure. Someone
 * who schedules a week gets a silent drawer of drafts and a profile that stays
 * empty for seven days.
 *
 * The title/description line is not a detail: TikTok's upload-to-inbox endpoint
 * takes only source_info (the bytes), with no post_info anywhere in the request,
 * so the caption we send is dropped on the floor for a video draft — whether the
 * user typed it or the AI wrote it. Saying only "it arrives as a draft" leaves
 * them to discover that in the app.
 *
 * Lead with the upside: finishing the post inside TikTok is what the algorithm
 * rewards, so this is a better default, not a limitation we are apologising for.
 */
export default function TikTokDraftNotice() {
    return (
        <div className="mb-4 px-3 py-2 rounded-input text-xs text-ink2 bg-paper3 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-brass" />
            <div className="lowercase">
                تيك توك يوصل <b className="text-ink">كمسودة</b>، مو منشور مباشر — بيجيك تنبيه في التطبيق. الـ API حقه ما ينقل العنوان ولا الوصف للمسودة، فتكتبها هناك، مع الأصوات الترند والتأثيرات والهاشتاقات — وهذا يوصل لناس أكثر من النشر المباشر من API.
            </div>
        </div>
    );
}
