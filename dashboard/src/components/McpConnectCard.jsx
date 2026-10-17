import React, { useState, useCallback } from 'react';
import { Plug, Copy, Check } from 'lucide-react';
import { getApiUrl } from '../config';

// "Connect an agent": the one place that tells a person how to drive
// OpenShorts from Claude, ChatGPT, Cursor or n8n. Cloud accounts connect by
// URL (claude.ai and ChatGPT run the OAuth flow themselves; CLI clients take
// an API key); a self-hosted install has no auth, so every snippet is the
// local URL and nothing else.

const CLOUD_MCP_URL = 'https://mcp.openshorts.app/mcp';

// The self-hosted dashboard proxies /api and /videos to the backend but not
// /mcp (neither the Vite dev proxy nor nginx.conf), so an MCP client must
// talk to the API container itself: VITE_API_URL when it is set, otherwise
// the backend's default port on the same host.
function localMcpUrl() {
  const u = getApiUrl('/mcp');
  if (u.startsWith('http')) return u;
  try { return `${window.location.protocol}//${window.location.hostname}:8000/mcp`; } catch { return 'http://localhost:8000/mcp'; }
}

function buildClients({ cloud, url }) {
  const key = cloud ? 'osk_YOUR_KEY' : null;
  const header = key ? ` \\\n  --header "Authorization: Bearer ${key}"` : '';
  const desktopArgs = key
    ? `["-y", "mcp-remote", "${url}", "--header", "Authorization: Bearer ${key}"]`
    : `["-y", "mcp-remote", "${url}"]`;
  const cursorHeaders = key ? `,\n      "headers": { "Authorization": "Bearer ${key}" }` : '';
  return [
    cloud && {
      id: 'claude-ai', label: 'Claude (claude.ai)', kind: 'steps',
      steps: [
        "افتح claude.ai ← الإعدادات ← Connectors ← Add custom connector.",
        `حط هالرابط واحفظ: ${url}`,
        "اضغط Connect: بتوصل لـ OpenShorts عشان توافق على الصلاحية، وبعدها الـ 8 أدوات تطلع في كل محادثة.",
      ],
      snippet: url,
    },
    cloud && {
      id: 'chatgpt', label: 'ChatGPT', kind: 'steps',
      steps: [
        "افتح ChatGPT ← الإعدادات ← Connectors ← Create (وضع المطوّر).",
        `سمّه OpenShorts، حط رابط سيرفر MCP هذا، واختر OAuth: ${url}`,
        "وافق على الصلاحية في OpenShorts لما ينطلب منك. خلاص: اطلب من ChatGPT يقص لك فيديو.",
      ],
      snippet: url,
    },
    {
      id: 'claude-code', label: 'Claude Code', kind: 'code', lang: 'bash',
      snippet: `claude mcp add --transport http openshorts ${url}${header}`,
      note: cloud ? "سوّ مفتاح تحت وحطه مكان osk_YOUR_KEY." : "ما تحتاج مفتاح في النسخة المستضافة على سيرفرك.",
    },
    {
      id: 'claude-desktop', label: 'Claude Desktop', kind: 'code', lang: 'json',
      snippet: `{\n  "mcpServers": {\n    "openshorts": {\n      "command": "npx",\n      "args": ${desktopArgs}\n    }\n  }\n}`,
      note: "الإعدادات ← Developer ← Edit config (claude_desktop_config.json)، وبعدين أعد تشغيل Claude.",
    },
    {
      id: 'cursor', label: 'Cursor', kind: 'code', lang: 'json',
      snippet: `{\n  "mcpServers": {\n    "openshorts": {\n      "url": "${url}"${cursorHeaders}\n    }\n  }\n}`,
      note: "الإعدادات ← MCP ← Add new global MCP server (.cursor/mcp.json).",
    },
    {
      id: 'n8n', label: 'n8n', kind: 'steps',
      steps: [
        "أضف عقدة \"MCP Client Tool\" للـ AI Agent حقك.",
        `نقطة الاتصال: ${url}  ·  النقل: HTTP Streamable.`,
        cloud ? "المصادقة: Bearer، بمفتاح من تحت." : "المصادقة: بدون.",
      ],
      snippet: url,
    },
    {
      id: 'curl', label: 'curl', kind: 'code', lang: 'bash',
      snippet: `curl -X POST ${url} \\\n  -H "Content-Type: application/json"${key ? ` \\\n  -H "Authorization: Bearer ${key}"` : ''} \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
      note: "JSON-RPC عادي فوق HTTP: نفس نقطة الاتصال اللي تكلمها كل البرامج اللي فوق.",
    },
  ].filter(Boolean);
}

export default function McpConnectCard({ cloud = true, compact = false }) {
  const url = cloud ? CLOUD_MCP_URL : localMcpUrl();
  const clients = buildClients({ cloud, url });
  const [active, setActive] = useState(clients[0].id);
  const [copied, setCopied] = useState(false);
  const current = clients.find((c) => c.id === active) || clients[0];

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(current.snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }, [current]);

  return (
    <div className="card p-6" id="connect-agent">
      <h3 className="font-display lowercase text-lg text-ink mb-1 flex items-center gap-2">
        <Plug size={16} className="text-brass" /> اربط وكيل ذكاء اصطناعي
      </h3>
      <p className="text-muted text-sm mb-4">
        خلّ Claude أو ChatGPT أو Cursor أو n8n يقصون وينشرون عنك عن طريق سيرفر MCP المدمج: 8 أدوات (معالجة فيديو أو رفعه، متابعة مهمة، عرض المقاطع، إضافة ترجمة، إعادة قص، نشر، الرصيد).
        {cloud
          ? " claude.ai و ChatGPT يتصلون برابط واحد وتسجيل دخول؛ برامج سطر الأوامر تستخدم مفتاح API."
          : " هالنسخة تشتغل بدون حسابات، فما تحتاج مفتاح."}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4" role="tablist" aria-label="البرنامج">
        {clients.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === active}
            onClick={() => { setActive(c.id); setCopied(false); }}
            className={`px-3 py-1.5 rounded-input text-xs border transition-colors ${
              c.id === active ? 'border-brass text-ink bg-brass/10' : 'border-rule text-muted hover:text-ink'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {current.kind === 'steps' && (
        <ol className="list-decimal ps-5 space-y-1.5 text-sm text-ink2 mb-3">
          {current.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}

      <div className="relative">
        <pre className={`font-mono text-ink2 whitespace-pre-wrap break-all rounded-card border border-rule bg-paper p-3 pr-20 text-xs ${compact ? '' : 'leading-relaxed'}`}>
          {current.snippet}
        </pre>
        <button onClick={copy} className="btn-ghost absolute top-2 right-2 px-2.5 py-1 text-xs" aria-label="نسخ">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "انتسخ" : "نسخ"}
        </button>
      </div>
      {current.note && <p className="text-muted text-xs mt-2">{current.note}</p>}
    </div>
  );
}
