import React, { useState, useEffect, useRef } from "react";

const AI_ENDPOINT = "/api/claude";
const CLAUDE_API = AI_ENDPOINT;

const COLORS = {
  bg: "#0B0F1A",
  panel: "#111827",
  card: "#1A2235",
  border: "#1E2D45",
  accent: "#00D4AA",
  accentDim: "#00D4AA22",
  gold: "#F5C518",
  red: "#FF4560",
  text: "#E8EDF5",
  muted: "#6B7A9A",
  blue: "#3B82F6",
};

const FUNNEL_STEPS = [
  { id: 1, label: "Hook", icon: "🎯", color: "#F5C518", desc: "첫 접점 광고/콘텐츠" },
  { id: 2, label: "Analysis", icon: "🔍", color: "#3B82F6", desc: "고객 상황 파악" },
  { id: 3, label: "Insight", icon: "💡", color: "#8B5CF6", desc: "개인화 진단 결과" },
  { id: 4, label: "Solution", icon: "🎁", color: "#00D4AA", desc: "맞춤 솔루션 제안" },
  { id: 5, label: "Retention", icon: "🔄", color: "#F97316", desc: "재방문 유도" },
  { id: 6, label: "Care", icon: "💌", color: "#EC4899", desc: "장기 고객 관리" },
];

const SAMPLE_CUSTOMERS = [
  { id: "C001", name: "투명한 별빛", avatar: "투", status: "online", lastMsg: "네, 예약이나 제안서를 작성하...", time: "2분 전", unread: 2, funnel: 3, bot: true },
  { id: "C002", name: "맑은 파도", avatar: "맑", status: "online", lastMsg: "여러분과 만나서 반가워요.", time: "5분 전", unread: 7, funnel: 2, bot: true },
  { id: "C003", name: "속삭이는 안개", avatar: "속", status: "away", lastMsg: "여러분과 만나서 반가워요.", time: "12분 전", unread: 5, funnel: 4, bot: false },
  { id: "C004", name: "노래하는 벚꽃", avatar: "노", status: "online", lastMsg: "여러분과 만나서 반가워요.", time: "1시간 전", unread: 5, funnel: 5, bot: true },
  { id: "C005", name: "고요한 햇살", avatar: "고", status: "offline", lastMsg: "감사합니다! 다음에 또 연락드릴게요.", time: "3시간 전", unread: 0, funnel: 6, bot: false },
  { id: "C006", name: "김민준", avatar: "김", status: "online", lastMsg: "이번 패키지 가격이 어떻게 되나요?", time: "어제", unread: 1, funnel: 1, bot: true },
  { id: "C007", name: "이서연", avatar: "이", status: "offline", lastMsg: "다음달 예약 가능한가요?", time: "어제", unread: 0, funnel: 2, bot: false },
];

const CAMPAIGNS = [
  { id: 1, name: "봄 시즌 리조트 패키지", status: "active", sent: 1284, opened: 847, responded: 312, type: "시즌 이벤트" },
  { id: 2, name: "재방문 고객 20% 할인", status: "active", sent: 456, opened: 321, responded: 187, type: "리텐션" },
  { id: 3, name: "생일 축하 쿠폰 발송", status: "scheduled", sent: 0, opened: 0, responded: 0, type: "자동화" },
  { id: 4, name: "겨울 패키지 종료 안내", status: "completed", sent: 2100, opened: 1456, responded: 543, type: "시즌 이벤트" },
];

function readStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function callClaude({ system, messages, maxTokens = 1000 }) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages,
      max_tokens: maxTokens,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "AI request failed");
  }

  return data?.content?.[0]?.text || "";
}

function StatusDot({ status }) {
  const c = status === "online" ? "#00D4AA" : status === "away" ? "#F5C518" : "#6B7A9A";
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />;
}

function Avatar({ letter, size = 36 }) {
  const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#00D4AA", "#F5C518"];
  const color = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, color: "#fff", flexShrink: 0, fontFamily: "Noto Sans KR, sans-serif" }}>
      {letter}
    </div>
  );
}

function Sidebar({ page, setPage }) {
  const nav = [
    { id: "dashboard", icon: "⬡", label: "대시보드" },
    { id: "chats", icon: "💬", label: "채팅 관리" },
    { id: "channels", icon: "🔗", label: "1:1 채널" },
    { id: "auto", icon: "🤖", label: "자동 메시지" },
    { id: "campaigns", icon: "📣", label: "캠페인" },
    { id: "customers", icon: "👥", label: "고객 DB" },
    { id: "funnel", icon: "🔁", label: "퍼널 빌더" },
  ];
  return (
    <div style={{ width: 220, minHeight: "100vh", background: COLORS.panel, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", padding: "24px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 28px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⬡</div>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 18, color: COLORS.text, letterSpacing: 1 }}>ASSEMBLE</div>
            <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>AI MARKETING</div>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: page === n.id ? COLORS.accentDim : "transparent", color: page === n.id ? COLORS.accent : COLORS.muted, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14, fontWeight: page === n.id ? 700 : 400, transition: "all 0.15s", textAlign: "left" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>
            {n.label}
            {page === n.id && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: COLORS.accent }} />}
          </button>
        ))}
      </nav>
      {/* Bottom */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar letter="A" size={32} />
          <div>
            <div style={{ fontSize: 13, color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600 }}>어셈블 관리자</div>
            <div style={{ fontSize: 11, color: COLORS.muted }}>admin@assemble.kr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, color: color || COLORS.accent, background: `${color || COLORS.accent}22`, padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>{sub}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, fontFamily: "Montserrat, sans-serif" }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>{label}</div>
    </div>
  );
}

function Dashboard() {
  const funnelData = [72, 58, 43, 31, 24, 18];
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>대시보드</h1>
        <p style={{ color: COLORS.muted, margin: "4px 0 0", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>AI 마케팅 시스템 현황을 한눈에 확인하세요</p>
      </div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard label="오늘 총 대화 수" value="284" sub="+18% ↑" icon="💬" color={COLORS.accent} />
        <StatCard label="AI 자동 응답률" value="91%" sub="목표 달성" icon="🤖" color={COLORS.blue} />
        <StatCard label="발송 캠페인" value="12" sub="3개 진행 중" icon="📣" color={COLORS.gold} />
        <StatCard label="이번 주 신규 고객" value="47" sub="+23% ↑" icon="👥" color="#EC4899" />
      </div>
      {/* Funnel + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Funnel */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>마케팅 퍼널 현황</div>
          {FUNNEL_STEPS.map((step, i) => (
            <div key={step.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>{step.icon} {step.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: step.color, fontFamily: "Montserrat, sans-serif" }}>{funnelData[i]}%</span>
              </div>
              <div style={{ height: 6, background: COLORS.border, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${funnelData[i]}%`, background: step.color, borderRadius: 3, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>
        {/* Recent Chats */}
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text, marginBottom: 20 }}>최근 대화</div>
          {SAMPLE_CUSTOMERS.slice(0, 5).map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <Avatar letter={c.avatar} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.text }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{c.time}</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</div>
              </div>
              {c.unread > 0 && <span style={{ background: COLORS.accent, color: "#000", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{c.unread}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatView({ customer, onBack }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: `안녕하세요! ${customer.name}님, 어떻게 도와드릴까요? 😊` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(true);
  const [funnelStep, setFunnelStep] = useState(customer.funnel);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = `당신은 '어셈블(ASSEMBLE)' AI 마케팅 챗봇입니다. 현재 고객: ${customer.name}.
마케팅 퍼널 6단계(Hook→Analysis→Insight→Solution→Retention→Care)를 따라 자연스럽게 대화를 이끌어 가세요.
현재 단계: ${FUNNEL_STEPS[funnelStep - 1]?.label || "Hook"} - ${FUNNEL_STEPS[funnelStep - 1]?.desc || ""}.
한국어로 친근하고 전문적으로 응답하세요. 짧고 핵심적으로 답변하세요.`;

      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "죄송합니다, 잠시 후 다시 시도해주세요.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (funnelStep < 6) setFunnelStep(s => s + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "네트워크 오류가 발생했습니다." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.bg }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <Avatar letter={customer.avatar} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 15 }}>{customer.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StatusDot status={customer.status} />
            <span style={{ fontSize: 12, color: COLORS.muted }}>ID: {customer.id}</span>
          </div>
        </div>
        {/* Funnel progress */}
        <div style={{ display: "flex", gap: 4 }}>
          {FUNNEL_STEPS.map(s => (
            <div key={s.id} title={s.label} style={{ width: 28, height: 28, borderRadius: 8, background: funnelStep >= s.id ? s.color : COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer", transition: "all 0.2s" }} onClick={() => setFunnelStep(s.id)}>
              {funnelStep >= s.id ? s.icon : ""}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAiMode(v => !v)} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${aiMode ? COLORS.accent : COLORS.border}`, background: aiMode ? COLORS.accentDim : "transparent", color: aiMode ? COLORS.accent : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600 }}>
            {aiMode ? "🤖 AI 모드" : "👤 직접 응답"}
          </button>
        </div>
      </div>
      {/* Funnel step indicator */}
      <div style={{ padding: "8px 24px", background: `${FUNNEL_STEPS[funnelStep - 1]?.color}11`, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{FUNNEL_STEPS[funnelStep - 1]?.icon}</span>
        <span style={{ fontSize: 13, color: FUNNEL_STEPS[funnelStep - 1]?.color, fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600 }}>
          Step {funnelStep}: {FUNNEL_STEPS[funnelStep - 1]?.label} — {FUNNEL_STEPS[funnelStep - 1]?.desc}
        </span>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-end" }}>
            {m.role === "assistant" && <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⬡</div>}
            <div style={{ maxWidth: "65%", background: m.role === "user" ? COLORS.accent : COLORS.card, color: m.role === "user" ? "#000" : COLORS.text, padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", lineHeight: 1.6, border: m.role === "assistant" ? `1px solid ${COLORS.border}` : "none" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, padding: "12px 16px", borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {/* Input */}
      <div style={{ padding: "16px 24px", background: COLORS.panel, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={aiMode ? "AI가 자동으로 응답합니다 — 테스트 메시지 입력..." : "메시지를 입력하세요..."}
          style={{ flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none" }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.accent, border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ➤
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

function ChatsPage() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("전체");

  if (selected) return <ChatView customer={selected} onBack={() => setSelected(null)} />;

  return (
    <div style={{ display: "flex", height: "100%", minHeight: "100vh" }}>
      {/* List */}
      <div style={{ width: 320, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 16, marginBottom: 12 }}>채팅 관리</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="고객 검색..." style={{ flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "8px 12px", color: COLORS.text, fontSize: 13, outline: "none", fontFamily: "Noto Sans KR, sans-serif" }} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["전체", "AI대화", "직접대화"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 10px", borderRadius: 20, border: "none", background: filter === f ? COLORS.accentDim : COLORS.card, color: filter === f ? COLORS.accent : COLORS.muted, fontSize: 12, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif" }}>{f}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "8px 0", overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "8px 16px", fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>전체 {SAMPLE_CUSTOMERS.length}명 · 대화 중 {SAMPLE_CUSTOMERS.filter(c => c.status === "online").length}명</div>
          {SAMPLE_CUSTOMERS.filter(c => filter === "전체" || (filter === "AI대화" && c.bot) || (filter === "직접대화" && !c.bot)).map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{ padding: "12px 16px", display: "flex", gap: 12, cursor: "pointer", transition: "background 0.1s", borderBottom: `1px solid ${COLORS.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.card}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ position: "relative" }}>
                <Avatar letter={c.avatar} size={40} />
                <span style={{ position: "absolute", bottom: 0, right: 0 }}><StatusDot status={c.status} /></span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600, color: COLORS.text, fontSize: 14 }}>{c.name}</span>
                    {c.bot && <span style={{ fontSize: 10, background: COLORS.accentDim, color: COLORS.accent, padding: "1px 6px", borderRadius: 10 }}>AI</span>}
                  </div>
                  <span style={{ fontSize: 11, color: COLORS.muted }}>{c.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{c.lastMsg}</span>
                  {c.unread > 0 && <span style={{ background: COLORS.accent, color: "#000", fontSize: 11, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.unread}</span>}
                </div>
                {/* Funnel badge */}
                <div style={{ marginTop: 4, display: "flex", gap: 3 }}>
                  {FUNNEL_STEPS.map(s => (
                    <div key={s.id} style={{ width: 12, height: 3, borderRadius: 2, background: c.funnel >= s.id ? s.color : COLORS.border }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Empty state */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>
        <div style={{ fontSize: 48 }}>💬</div>
        <div style={{ fontFamily: "Noto Sans KR, sans-serif", marginTop: 12 }}>고객을 선택해 대화를 시작하세요</div>
      </div>
    </div>
  );
}

function CampaignsPage() {
  const [showNew, setShowNew] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);

  const generateMessage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGenerated("");
    try {
      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `AI 마케팅 자동 메시지를 생성해주세요. 상황: ${prompt}
3가지 버전으로 작성해주세요: (1) 정중한 톤, (2) 친근한 톤, (3) 긴급한 톤.
각 버전은 2-3문장으로 간결하게, 실제 발송 가능한 형태로 작성해주세요.`
          }]
        })
      });
      const data = await res.json();
      setGenerated(data.content?.[0]?.text || "");
    } catch { setGenerated("생성 실패. 다시 시도해주세요."); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>캠페인 관리</h1>
          <p style={{ color: COLORS.muted, margin: "4px 0 0", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>AI 자동 메시지 캠페인을 생성하고 관리하세요</p>
        </div>
        <button onClick={() => setShowNew(v => !v)} style={{ padding: "10px 20px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif" }}>
          + 새 캠페인
        </button>
      </div>

      {showNew && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.accent}44`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>🤖 AI 메시지 자동 생성</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="예: 봄 시즌 리조트 패키지 재방문 고객 대상 20% 할인 안내" style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 16px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none" }} />
            <button onClick={generateMessage} disabled={loading} style={{ padding: "12px 20px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", whiteSpace: "nowrap" }}>
              {loading ? "생성 중..." : "✨ 생성"}
            </button>
          </div>
          {generated && (
            <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, fontFamily: "Noto Sans KR, sans-serif", fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {generated}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CAMPAIGNS.map(c => (
          <div key={c.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontSize: 11, background: c.type === "자동화" ? `${COLORS.blue}22` : COLORS.accentDim, color: c.type === "자동화" ? COLORS.blue : COLORS.accent, padding: "2px 8px", borderRadius: 10 }}>{c.type}</span>
                </div>
              </div>
              <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: c.status === "active" ? `${COLORS.accent}22` : c.status === "scheduled" ? `${COLORS.gold}22` : `${COLORS.muted}22`, color: c.status === "active" ? COLORS.accent : c.status === "scheduled" ? COLORS.gold : COLORS.muted, fontWeight: 600 }}>
                {c.status === "active" ? "● 진행 중" : c.status === "scheduled" ? "◷ 예약됨" : "✓ 완료"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "발송", value: c.sent.toLocaleString(), color: COLORS.muted },
                { label: "열람", value: c.opened.toLocaleString(), color: COLORS.blue },
                { label: "응답", value: c.responded.toLocaleString(), color: COLORS.accent },
              ].map(s => (
                <div key={s.label} style={{ background: COLORS.bg, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "Montserrat, sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersPage() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: "0 0 8px" }}>고객 DB</h1>
      <p style={{ color: COLORS.muted, margin: "0 0 24px", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>고객 정보와 대화 이력을 관리하세요</p>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 140px 100px", padding: "14px 20px", background: COLORS.panel, borderBottom: `1px solid ${COLORS.border}`, fontFamily: "Montserrat, sans-serif", fontSize: 12, color: COLORS.muted, fontWeight: 600, letterSpacing: 0.5 }}>
          <div>고객</div><div>상태</div><div>퍼널 단계</div><div>마지막 대화</div><div>AI</div>
        </div>
        {SAMPLE_CUSTOMERS.map((c, i) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 140px 100px", padding: "14px 20px", borderBottom: i < SAMPLE_CUSTOMERS.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar letter={c.avatar} size={32} />
              <div>
                <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600, color: COLORS.text, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{c.id}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <StatusDot status={c.status} />
              <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>{c.status === "online" ? "온라인" : c.status === "away" ? "자리비움" : "오프라인"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{FUNNEL_STEPS[c.funnel - 1]?.icon}</span>
              <span style={{ fontSize: 12, color: FUNNEL_STEPS[c.funnel - 1]?.color, fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600 }}>{FUNNEL_STEPS[c.funnel - 1]?.label}</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>{c.time}</div>
            <div>
              <span style={{ fontSize: 12, background: c.bot ? COLORS.accentDim : COLORS.border, color: c.bot ? COLORS.accent : COLORS.muted, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                {c.bot ? "AI" : "직접"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("리조트/호텔");

  const generateScript = async () => {
    setLoading(true);
    setScript("");
    const step = FUNNEL_STEPS[activeStep - 1];
    try {
      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `AI 마케팅 챗봇 스크립트를 작성해주세요.
업종: ${industry}
퍼널 단계: Step ${step.id} - ${step.label} (${step.desc})
이 단계에서 고객에게 보낼 챗봇 메시지 3-5개를 작성해주세요.
자연스러운 대화 흐름으로, 고객 응답 버튼 옵션도 포함해주세요.`
          }]
        })
      });
      const data = await res.json();
      setScript(data.content?.[0]?.text || "");
    } catch { setScript("생성 실패."); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: "0 0 8px" }}>퍼널 빌더</h1>
      <p style={{ color: COLORS.muted, margin: "0 0 24px", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>6단계 마케팅 퍼널을 설계하고 AI 스크립트를 자동 생성하세요</p>

      {/* Funnel steps */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, alignItems: "center" }}>
        {FUNNEL_STEPS.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <div onClick={() => setActiveStep(step.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", padding: "12px 16px", borderRadius: 16, background: activeStep === step.id ? `${step.color}22` : "transparent", border: `2px solid ${activeStep === step.id ? step.color : COLORS.border}`, transition: "all 0.2s" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: activeStep === step.id ? step.color : COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{step.icon}</div>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: activeStep === step.id ? step.color : COLORS.muted }}>{step.label}</div>
              <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", textAlign: "center", maxWidth: 70 }}>{step.desc}</div>
            </div>
            {i < 5 && <div style={{ width: 24, height: 2, background: COLORS.border }} />}
          </div>
        ))}
      </div>

      {/* Script generator */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>업종:</span>
          <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif", fontSize: 13, outline: "none" }}>
            {["리조트/호텔", "음식점", "쇼핑몰", "병원/클리닉", "헬스/피트니스", "교육/학원", "부동산"].map(v => <option key={v}>{v}</option>)}
          </select>
          <button onClick={generateScript} disabled={loading} style={{ marginLeft: "auto", padding: "10px 20px", background: FUNNEL_STEPS[activeStep - 1].color, color: "#000", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif" }}>
            {loading ? "생성 중..." : `✨ Step ${activeStep} 스크립트 생성`}
          </button>
        </div>
        {script ? (
          <div style={{ background: COLORS.bg, borderRadius: 12, padding: 20, fontFamily: "Noto Sans KR, sans-serif", fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {script}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{FUNNEL_STEPS[activeStep - 1].icon}</div>
            <div>Step {activeStep} · {FUNNEL_STEPS[activeStep - 1].label} 스크립트를 생성하세요</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelPreview({ channel, onClose }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: channel.greeting || "안녕하세요! 무엇을 도와드릴까요?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const step = FUNNEL_STEPS[channel.funnelStart - 1];
      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: `당신은 '${channel.name}' 1:1 채널의 AI 어시스턴트입니다. 현재 퍼널 단계: ${step.label} (${step.desc}). 카테고리: ${channel.category}. 한국어로 친근하고 간결하게 응답하세요.`,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages(p => [...p, { role: "assistant", content: data.content?.[0]?.text || "..." }]);
    } catch { setMessages(p => [...p, { role: "assistant", content: "네트워크 오류" }]); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 380, height: 680, background: "#000", borderRadius: 36, border: "8px solid #222", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 22, background: "#000", borderRadius: "0 0 14px 14px", zIndex: 10 }} />
        {/* Phone header */}
        <div style={{ padding: "32px 16px 12px", background: COLORS.panel, display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 13 }}>{channel.name}</div>
            <div style={{ fontSize: 10, color: COLORS.accent }}>● AI 아바타 온라인</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14, background: COLORS.bg, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "75%", background: m.role === "user" ? COLORS.accent : COLORS.card, color: m.role === "user" ? "#000" : COLORS.text, padding: "8px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", fontSize: 12, fontFamily: "Noto Sans KR, sans-serif", lineHeight: 1.5, border: m.role === "assistant" ? `1px solid ${COLORS.border}` : "none" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ display: "flex", gap: 3, padding: "8px 12px", background: COLORS.card, borderRadius: 14, alignSelf: "flex-start", border: `1px solid ${COLORS.border}` }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.accent, animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
          </div>}
          <div ref={endRef} />
        </div>
        {/* Input */}
        <div style={{ padding: 12, background: COLORS.panel, borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="메시지 입력..." style={{ flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "8px 12px", color: COLORS.text, fontSize: 12, outline: "none", fontFamily: "Noto Sans KR, sans-serif" }} />
          <button onClick={send} style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.accent, border: "none", cursor: "pointer", fontSize: 14 }}>➤</button>
        </div>
      </div>
    </div>
  );
}

function ChannelsPage() {
  const [channels, setChannels] = useState([
    { id: "S4R9T2", name: "휴식 컬러 진단", greeting: "안녕하세요! 30초 만에 당신의 휴식 컬러를 진단해드릴게요 🌊", funnelStart: 1, autoAI: true, category: "진단/퀴즈", clicks: 847, conversations: 312, conversions: 89, status: "active", createdAt: "3일 전" },
    { id: "B3X7K9", name: "봄 시즌 패키지 상담", greeting: "봄 시즌 특별 패키지를 알려드릴게요! 🌸", funnelStart: 1, autoAI: true, category: "상담", clicks: 521, conversations: 198, conversions: 47, status: "active", createdAt: "1주 전" },
    { id: "V8M2P4", name: "재방문 고객 전용", greeting: "다시 만나서 반가워요! 🎁 VIP 고객님을 위한 특별 혜택이 준비되어 있어요.", funnelStart: 5, autoAI: true, category: "리텐션", clicks: 234, conversations: 156, conversions: 89, status: "active", createdAt: "2주 전" },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState(null);
  const [preview, setPreview] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [form, setForm] = useState({ name: "", greeting: "", funnelStart: 1, autoAI: true, category: "일반" });

  // Load from storage on mount
  useEffect(() => {
    setChannels(readStoredJson("assemble_channels", channels));
  }, []);

  // Persist
  useEffect(() => {
    writeStoredJson("assemble_channels", channels);
  }, [channels]);

  const createChannel = () => {
    if (!form.name.trim()) return;
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ch = {
      id, ...form,
      greeting: form.greeting || `안녕하세요! ${form.name}입니다. 무엇을 도와드릴까요? 😊`,
      clicks: 0, conversations: 0, conversions: 0,
      status: "active", createdAt: "방금 전"
    };
    setChannels([ch, ...channels]);
    setNewChannel(ch);
    setForm({ name: "", greeting: "", funnelStart: 1, autoAI: true, category: "일반" });
    setShowCreate(false);
  };

  const copyLink = (id) => {
    const url = `https://assemble.kr/c/${id}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteChannel = (id) => {
    setChannels(channels.filter(c => c.id !== id));
  };

  const toggleStatus = (id) => {
    setChannels(channels.map(c => c.id === id ? { ...c, status: c.status === "active" ? "paused" : "active" } : c));
  };

  const qrUrl = (id) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=1A2235&color=00D4AA&margin=10&data=${encodeURIComponent(`https://assemble.kr/c/${id}`)}`;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>1:1 전용 채널</h1>
          <p style={{ color: COLORS.muted, margin: "4px 0 0", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>고객 한 명 한 명에게 전용 링크를 발급하세요. 앱 설치 없이 클릭만으로 대화 시작 ✨</p>
        </div>
        <button onClick={() => { setShowCreate(v => !v); setNewChannel(null); }} style={{ padding: "10px 20px", background: showCreate ? COLORS.border : COLORS.accent, color: showCreate ? COLORS.text : "#000", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", transition: "all 0.15s" }}>
          {showCreate ? "✕ 취소" : "+ 새 채널 생성"}
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="활성 채널" value={channels.filter(c => c.status === "active").length} sub={`전체 ${channels.length}`} icon="🔗" color={COLORS.accent} />
        <StatCard label="총 클릭 수" value={channels.reduce((s, c) => s + c.clicks, 0).toLocaleString()} sub="이번 달" icon="👆" color={COLORS.blue} />
        <StatCard label="시작된 대화" value={channels.reduce((s, c) => s + c.conversations, 0).toLocaleString()} sub={`${Math.round(channels.reduce((s, c) => s + c.conversations, 0) / Math.max(channels.reduce((s, c) => s + c.clicks, 0), 1) * 100)}% 전환`} icon="💬" color={COLORS.gold} />
        <StatCard label="최종 전환" value={channels.reduce((s, c) => s + c.conversions, 0).toLocaleString()} sub="목표 달성" icon="🎯" color="#EC4899" />
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: COLORS.card, border: `2px solid ${COLORS.accent}44`, borderRadius: 16, padding: 24, marginBottom: 24, animation: "slideDown 0.25s ease" }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text, marginBottom: 16, fontSize: 16 }}>🔗 새 채널 만들기</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 6 }}>채널 이름 *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 봄 시즌 리조트 상담" style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 6 }}>카테고리</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box" }}>
                {["일반", "상담", "진단/퀴즈", "리텐션", "이벤트", "VIP"].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 6 }}>첫 인사말</label>
            <textarea value={form.greeting} onChange={e => setForm({ ...form, greeting: e.target.value })} placeholder="고객이 링크 클릭 시 처음 보게 될 메시지" rows={2} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 8 }}>시작 퍼널 단계</label>
              <div style={{ display: "flex", gap: 6 }}>
                {FUNNEL_STEPS.map(s => (
                  <button key={s.id} onClick={() => setForm({ ...form, funnelStart: s.id })} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${form.funnelStart === s.id ? s.color : COLORS.border}`, background: form.funnelStart === s.id ? `${s.color}22` : "transparent", color: form.funnelStart === s.id ? s.color : COLORS.muted, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 11, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 22 }}>
              <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>AI 자동응답</span>
              <button onClick={() => setForm({ ...form, autoAI: !form.autoAI })} style={{ width: 44, height: 24, borderRadius: 12, background: form.autoAI ? COLORS.accent : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                <div style={{ position: "absolute", top: 2, left: form.autoAI ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "all 0.2s" }} />
              </button>
            </div>
          </div>
          <button onClick={createChannel} disabled={!form.name.trim()} style={{ width: "100%", padding: "12px", background: form.name.trim() ? COLORS.accent : COLORS.border, color: form.name.trim() ? "#000" : COLORS.muted, border: "none", borderRadius: 10, fontWeight: 700, cursor: form.name.trim() ? "pointer" : "not-allowed", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>
            ✨ 채널 생성 및 링크 발급
          </button>
        </div>
      )}

      {/* Newly created channel showcase */}
      {newChannel && (
        <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.blue}22)`, border: `2px solid ${COLORS.accent}`, borderRadius: 16, padding: 28, marginBottom: 24, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, background: `${COLORS.accent}11`, borderRadius: "50%" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, color: COLORS.accent, fontSize: 14, letterSpacing: 1 }}>CHANNEL CREATED</span>
            </div>
            <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 18, marginBottom: 20 }}>{newChannel.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "center" }}>
              <img src={qrUrl(newChannel.id)} alt="QR" style={{ width: 140, height: 140, borderRadius: 12, border: `1px solid ${COLORS.border}` }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", marginBottom: 4 }}>전용 링크</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px", color: COLORS.accent, fontFamily: "Menlo, monospace", fontSize: 13 }}>
                      https://assemble.kr/c/{newChannel.id}
                    </code>
                    <button onClick={() => copyLink(newChannel.id)} style={{ padding: "10px 16px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 13, whiteSpace: "nowrap" }}>
                      {copiedId === newChannel.id ? "✓ 복사됨" : "📋 복사"}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={{ padding: "8px 14px", background: "#FEE500", color: "#000", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12 }}>💬 카카오톡 공유</button>
                  <button style={{ padding: "8px 14px", background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12 }}>💌 SMS 발송</button>
                  <button style={{ padding: "8px 14px", background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12 }}>📧 이메일</button>
                  <button onClick={() => setPreview(newChannel)} style={{ padding: "8px 14px", background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12 }}>📱 미리보기</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.text }}>발급된 채널 ({channels.length})</div>
          <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>최신순</div>
        </div>
        {channels.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <div>아직 생성된 채널이 없어요. 첫 채널을 만들어보세요!</div>
          </div>
        ) : channels.map((c, i) => (
          <div key={c.id} style={{ padding: "16px 24px", borderBottom: i < channels.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 15 }}>{c.name}</span>
                <span style={{ fontSize: 11, background: c.status === "active" ? COLORS.accentDim : `${COLORS.muted}22`, color: c.status === "active" ? COLORS.accent : COLORS.muted, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  {c.status === "active" ? "● LIVE" : "⏸ 일시정지"}
                </span>
                <span style={{ fontSize: 11, background: `${FUNNEL_STEPS[c.funnelStart - 1]?.color}22`, color: FUNNEL_STEPS[c.funnelStart - 1]?.color, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  {FUNNEL_STEPS[c.funnelStart - 1]?.icon} {FUNNEL_STEPS[c.funnelStart - 1]?.label}
                </span>
                <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>#{c.category}</span>
              </div>
              <code style={{ display: "inline-block", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 10px", color: COLORS.muted, fontFamily: "Menlo, monospace", fontSize: 12, marginBottom: 8 }}>
                https://assemble.kr/c/{c.id}
              </code>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
                <span>👆 <strong style={{ color: COLORS.text }}>{c.clicks.toLocaleString()}</strong> 클릭</span>
                <span>💬 <strong style={{ color: COLORS.text }}>{c.conversations.toLocaleString()}</strong> 대화</span>
                <span>🎯 <strong style={{ color: COLORS.accent }}>{c.conversions.toLocaleString()}</strong> 전환</span>
                <span style={{ marginLeft: "auto" }}>· {c.createdAt}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => copyLink(c.id)} title="링크 복사" style={{ width: 36, height: 36, borderRadius: 8, background: copiedId === c.id ? COLORS.accent : COLORS.bg, border: `1px solid ${COLORS.border}`, color: copiedId === c.id ? "#000" : COLORS.text, cursor: "pointer", fontSize: 14 }}>
                {copiedId === c.id ? "✓" : "📋"}
              </button>
              <button onClick={() => setPreview(c)} title="미리보기" style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontSize: 14 }}>📱</button>
              <button onClick={() => toggleStatus(c.id)} title={c.status === "active" ? "일시정지" : "활성화"} style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: "pointer", fontSize: 14 }}>
                {c.status === "active" ? "⏸" : "▶"}
              </button>
              <button onClick={() => { if (confirm("채널을 삭제하시겠어요?")) deleteChannel(c.id); }} title="삭제" style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.red, cursor: "pointer", fontSize: 14 }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {preview && <ChannelPreview channel={preview} onClose={() => setPreview(null)} />}
      <style>{`@keyframes slideDown { from { opacity:0; transform: translateY(-10px) } to { opacity:1; transform: translateY(0) } }`}</style>
    </div>
  );
}

const AUTO_RULES_INIT = [
  { id: "R1", name: "생일 축하 쿠폰 자동 발송", icon: "🎂", trigger: "birthday", desc: "고객 생일 당일 오전 9시 자동", active: true, count: 47, schedule: "매일 09:00 검사", color: "#EC4899", template: "{이름}님 생일을 축하드립니다! 🎁 신원리조트가 특별 선물을 준비했습니다." },
  { id: "R2", name: "시즌 전환 이벤트", icon: "🌸", trigger: "season", desc: "봄·여름·가을·겨울 시작 D-7", active: true, count: 12, schedule: "분기별 자동", color: "#00D4AA", template: "{이름}님, {시즌} 시즌이 다가옵니다. 작년 이맘때 다녀가신 패키지의 {할인율}% 특가를 준비했어요." },
  { id: "R3", name: "장기 미접속 고객 재활성화", icon: "💤", trigger: "dormant", desc: "마지막 접속 30일 이후 고객", active: true, count: 156, schedule: "매주 월요일 10:00", color: "#F97316", template: "{이름}님, 오래간만이에요 🌿 {최근방문월}부터 못 뵀네요. 특별 할인 쿠폰 드려요." },
  { id: "R4", name: "날씨 연동 이벤트", icon: "🌧", trigger: "weather", desc: "비·눈 예보 시 실내 이벤트 추천", active: false, count: 23, schedule: "실시간 감지", color: "#3B82F6", template: "{이름}님, 비 오는 날엔 실내에서 온천 어떠세요? ♨️ 오늘만 입장료 30% 할인!" },
  { id: "R5", name: "VIP 월간 특별 혜택", icon: "💎", trigger: "vip_monthly", desc: "VIP 등급 고객 월 1회", active: true, count: 89, schedule: "매월 1일 09:00", color: "#F5C518", template: "VIP {이름}님께만 드리는 이달의 혜택 💎 스위트룸 무료 업그레이드 이용하세요." },
  { id: "R6", name: "첫 방문 기념일 축하", icon: "🎊", trigger: "anniversary", desc: "최초 방문일 1주년, 2주년...", active: true, count: 34, schedule: "매일 10:00 검사", color: "#8B5CF6", template: "{이름}님, 저희와 함께한 지 {주년}년이 되었어요 🎊 감사의 마음을 담은 선물을 준비했어요." },
];

const MESSAGE_TEMPLATES = [
  { id: "T1", category: "시즌", name: "여름 성수기 안내", body: "{이름}님, 작년에 다녀가신 강원 신원리조트 여름 성수기가 시작됩니다 🌊 이번 주 예약 시 20% 특가!", color: "#00D4AA" },
  { id: "T2", category: "생일/기념일", name: "생일 축하 쿠폰", body: "{이름}님 생일을 축하드립니다! 🎁 신원리조트가 특별 선물을 준비했습니다. 확인해보세요 →", color: "#EC4899" },
  { id: "T3", category: "재방문", name: "장기 미접속 재활성화", body: "{이름}님, 오래간만이에요 🌿 지난 {최근방문월}부터 못 뵀네요. 특별 할인 쿠폰 드려요.", color: "#F97316" },
  { id: "T4", category: "VIP", name: "VIP 단독 프로모션", body: "VIP {이름}님께만 드리는 혜택이에요 💎 이번 달 예약 시 스위트룸 무료 업그레이드!", color: "#F5C518" },
  { id: "T5", category: "프로모션", name: "플래시 세일", body: "⚡ {이름}님, 단 24시간! {상품명} 50% 세일 지금 시작! → 바로가기", color: "#FF4560" },
  { id: "T6", category: "시즌", name: "겨울 온천 패키지", body: "{이름}님, 추워지는 날씨에 따뜻한 온천 어떠세요? ♨️ 겨울 한정 특가 안내드려요.", color: "#3B82F6" },
];

const TARGET_SEGMENTS = [
  { id: "all", name: "전체 고객", count: 2847 },
  { id: "vip", name: "VIP 등급", count: 89 },
  { id: "dormant", name: "30일 미접속 고객", count: 156 },
  { id: "last_summer", name: "작년 여름 투숙 고객", count: 128 },
  { id: "birthday_today", name: "오늘 생일 고객", count: 3 },
  { id: "funnel_3", name: "퍼널 3단계 이상 진입", count: 412 },
];

function AutoMessagesPage() {
  const now = Date.now();
  const [scheduled, setScheduled] = useState([
    { id: "M001", templateName: "여름 성수기 안내", target: "작년 여름 투숙 (128명)", scheduledAt: new Date(now + 1000 * 60 * 60 * 2).toISOString(), status: "pending", channel: "1:1 채널", preview: "김○○님, 작년에 다녀가신 강원 신원리조트 여름 성수기가 시작됩니다 🌊 이번 주 예약 시 20% 특가!" },
    { id: "M002", templateName: "VIP 단독 프로모션", target: "VIP 등급 (89명)", scheduledAt: new Date(now + 1000 * 60 * 60 * 25).toISOString(), status: "pending", channel: "카카오톡", preview: "VIP 김○○님께만 드리는 혜택이에요 💎 이번 달 예약 시 스위트룸 무료 업그레이드!" },
    { id: "M003", templateName: "장기 미접속 재활성화", target: "30일 미접속 (89명)", scheduledAt: new Date(now + 1000 * 60 * 60 * 72).toISOString(), status: "pending", channel: "SMS", preview: "김○○님, 오래간만이에요 🌿 지난 3월부터 못 뵀네요." },
    { id: "M004", templateName: "생일 축하 쿠폰", target: "오늘 생일 (3명)", scheduledAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(), status: "sent", channel: "1:1 채널", preview: "김○○님 생일을 축하드립니다!", opened: 3, clicked: 2 },
    { id: "M005", templateName: "봄 시즌 이벤트", target: "전체 고객 (2,847명)", scheduledAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(), status: "sent", channel: "1:1 채널", preview: "봄이 찾아왔어요 🌸", opened: 1847, clicked: 523 },
  ]);
  const [rules, setRules] = useState(AUTO_RULES_INIT);
  const [tab, setTab] = useState("queue");
  const [, setTick] = useState(0);

  // Live countdown
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000 * 30);
    return () => clearInterval(i);
  }, []);

  // Persist
  useEffect(() => {
    setScheduled(readStoredJson("assemble_scheduled", scheduled));
    setRules(readStoredJson("assemble_rules", AUTO_RULES_INIT));
  }, []);
  useEffect(() => { writeStoredJson("assemble_scheduled", scheduled); }, [scheduled]);
  useEffect(() => { writeStoredJson("assemble_rules", rules); }, [rules]);

  // Compose state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState(TARGET_SEGMENTS[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [channel, setChannel] = useState("1:1 채널");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(CLAUDE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `AI 마케팅 자동 메시지를 작성해주세요. 상황: ${aiPrompt}
타겟: ${target.name}
채널: ${channel}

요구사항:
- 개인화 변수 사용: {이름}, {최근방문월}, {상품명} 등
- 2-3문장, 이모지 1-2개 포함
- 자연스럽고 친근한 톤
- 실제 발송 가능한 완성된 메시지 1개만 출력 (설명 없이)`
          }]
        })
      });
      const data = await res.json();
      setMessage(data.content?.[0]?.text?.trim() || "");
    } catch { setMessage("생성 실패. 다시 시도해주세요."); }
    setAiLoading(false);
  };

  const scheduleMessage = () => {
    if (!message.trim() || !scheduledAt) return;
    const newMsg = {
      id: "M" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      templateName: selectedTemplate?.name || "직접 작성",
      target: `${target.name} (${target.count.toLocaleString()}명)`,
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "pending",
      channel,
      preview: message,
    };
    setScheduled([newMsg, ...scheduled]);
    setMessage(""); setScheduledAt(""); setSelectedTemplate(null); setAiPrompt("");
    setTab("queue");
  };

  const cancelMsg = (id) => setScheduled(scheduled.filter(m => m.id !== id));
  const sendNow = (id) => setScheduled(scheduled.map(m => m.id === id ? { ...m, status: "sent", scheduledAt: new Date().toISOString(), opened: 0, clicked: 0 } : m));
  const toggleRule = (id) => setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const timeUntil = (iso) => {
    const diff = new Date(iso) - new Date();
    if (diff < 0) {
      const past = Math.abs(diff);
      const h = Math.floor(past / (1000 * 60 * 60));
      if (h > 24) return `${Math.floor(h / 24)}일 전`;
      if (h > 0) return `${h}시간 전`;
      return `${Math.floor(past / 60000)}분 전`;
    }
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (h > 24) return `${Math.floor(h / 24)}일 후`;
    if (h > 0) return `${h}시간 ${m}분 후`;
    return `${m}분 후`;
  };

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const pending = scheduled.filter(m => m.status === "pending").sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const sent = scheduled.filter(m => m.status === "sent").sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

  const TABS = [
    { id: "queue", label: "📅 발송 대기열", count: pending.length },
    { id: "rules", label: "⚙️ 자동화 규칙", count: rules.filter(r => r.active).length },
    { id: "templates", label: "📝 템플릿", count: MESSAGE_TEMPLATES.length },
    { id: "compose", label: "✉️ 새 메시지", count: null },
    { id: "history", label: "📊 발송 이력", count: sent.length },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>자동 메시지 · AI Auto Message</h1>
        <p style={{ color: COLORS.muted, margin: "4px 0 0", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14 }}>AI가 고객 성향에 맞는 개인화 메시지를 자동 생성하고 최적 타이밍에 발송합니다</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="대기 중" value={pending.length} sub={pending[0] ? `다음: ${timeUntil(pending[0].scheduledAt)}` : "없음"} icon="⏳" color={COLORS.gold} />
        <StatCard label="활성 자동화 규칙" value={rules.filter(r => r.active).length} sub={`/ 전체 ${rules.length}개`} icon="⚙️" color={COLORS.accent} />
        <StatCard label="이번 달 발송" value={sent.length} sub="메시지" icon="📨" color={COLORS.blue} />
        <StatCard label="평균 응답률" value="34.2%" sub="+8% ↑" icon="📈" color="#EC4899" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 20px", background: "transparent", border: "none", borderBottom: `2px solid ${tab === t.id ? COLORS.accent : "transparent"}`, color: tab === t.id ? COLORS.accent : COLORS.muted, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 14, fontWeight: tab === t.id ? 700 : 500, whiteSpace: "nowrap", marginBottom: -1 }}>
            {t.label} {t.count !== null && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* QUEUE TAB */}
      {tab === "queue" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.length === 0 ? (
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 60, textAlign: "center", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div>예약된 메시지가 없어요. 새 메시지를 작성해보세요!</div>
              <button onClick={() => setTab("compose")} style={{ marginTop: 16, padding: "10px 20px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif" }}>+ 메시지 작성</button>
            </div>
          ) : pending.map(m => {
            const diff = new Date(m.scheduledAt) - new Date();
            const urgent = diff < 1000 * 60 * 60 * 3;
            return (
              <div key={m.id} style={{ background: COLORS.card, border: `1px solid ${urgent ? COLORS.gold + "88" : COLORS.border}`, borderRadius: 14, padding: 18, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
                <div style={{ width: 54, height: 54, borderRadius: 12, background: `${urgent ? COLORS.gold : COLORS.accent}22`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif" }}>
                  <span style={{ fontSize: 11, color: urgent ? COLORS.gold : COLORS.accent, fontWeight: 600 }}>{formatDateTime(m.scheduledAt).split(" ")[0]}</span>
                  <span style={{ fontSize: 14, color: urgent ? COLORS.gold : COLORS.accent, fontWeight: 800 }}>{formatDateTime(m.scheduledAt).split(" ")[1]}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 14 }}>{m.templateName}</span>
                    <span style={{ fontSize: 11, background: COLORS.accentDim, color: COLORS.accent, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>⏳ {timeUntil(m.scheduledAt)}</span>
                    <span style={{ fontSize: 11, background: `${COLORS.blue}22`, color: COLORS.blue, padding: "2px 8px", borderRadius: 10 }}>{m.channel}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", marginBottom: 6 }}>🎯 {m.target}</div>
                  <div style={{ fontSize: 12, color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif", background: COLORS.bg, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{m.preview}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => sendNow(m.id)} style={{ padding: "8px 14px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12, whiteSpace: "nowrap" }}>지금 발송</button>
                  <button onClick={() => cancelMsg(m.id)} style={{ padding: "8px 14px", background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 12 }}>취소</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RULES TAB */}
      {tab === "rules" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {rules.map(r => (
            <div key={r.id} style={{ background: COLORS.card, border: `1px solid ${r.active ? r.color + "44" : COLORS.border}`, borderRadius: 14, padding: 20, position: "relative", overflow: "hidden", opacity: r.active ? 1 : 0.65 }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: r.color }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${r.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{r.icon}</div>
                  <div>
                    <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", marginTop: 2 }}>{r.desc}</div>
                  </div>
                </div>
                <button onClick={() => toggleRule(r.id)} style={{ width: 44, height: 24, borderRadius: 12, background: r.active ? r.color : COLORS.border, border: "none", cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: r.active ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "all 0.2s" }} />
                </button>
              </div>
              <div style={{ background: COLORS.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif", lineHeight: 1.5, border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.muted, fontSize: 11 }}>템플릿 미리보기</span>
                <div style={{ marginTop: 4 }}>{r.template}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
                <span>⏱ {r.schedule}</span>
                <span>📨 이번 달 <strong style={{ color: r.active ? r.color : COLORS.muted }}>{r.count}</strong>건 발송</span>
              </div>
            </div>
          ))}
          <div onClick={() => setTab("compose")} style={{ background: "transparent", border: `2px dashed ${COLORS.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, cursor: "pointer", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", gap: 8 }}>
            <span style={{ fontSize: 28 }}>+</span>
            <span>새 자동화 규칙 만들기</span>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {MESSAGE_TEMPLATES.map(t => (
            <div key={t.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.color + "88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "translateY(0)"; }}
              onClick={() => { setSelectedTemplate(t); setMessage(t.body); setTab("compose"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, background: `${t.color}22`, color: t.color, padding: "3px 8px", borderRadius: 10, fontWeight: 600, fontFamily: "Noto Sans KR, sans-serif" }}>{t.category}</span>
                <span style={{ fontSize: 10, color: COLORS.muted }}>#{t.id}</span>
              </div>
              <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 14, marginBottom: 10 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", lineHeight: 1.6, background: COLORS.bg, padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>{t.body}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: t.color, fontWeight: 600, fontFamily: "Noto Sans KR, sans-serif" }}>이 템플릿 사용 →</div>
            </div>
          ))}
        </div>
      )}

      {/* COMPOSE TAB */}
      {tab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* AI Generator */}
            <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}11, ${COLORS.blue}11)`, border: `1px solid ${COLORS.accent}44`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: COLORS.accent, fontSize: 13, marginBottom: 10, letterSpacing: 0.5 }}>✨ AI로 메시지 생성</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="예: 여름 성수기 20% 할인 안내 메시지" style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 13, outline: "none", fontFamily: "Noto Sans KR, sans-serif" }} />
                <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.trim()} style={{ padding: "10px 18px", background: COLORS.accent, color: "#000", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif", fontSize: 13, whiteSpace: "nowrap" }}>
                  {aiLoading ? "생성 중..." : "✨ 생성"}
                </button>
              </div>
            </div>

            {/* Message editor */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600, color: COLORS.text, fontSize: 13 }}>메시지 내용</span>
                {selectedTemplate && <span style={{ fontSize: 11, background: `${selectedTemplate.color}22`, color: selectedTemplate.color, padding: "2px 8px", borderRadius: 10, fontWeight: 600, fontFamily: "Noto Sans KR, sans-serif" }}>📝 {selectedTemplate.name}</span>}
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="메시지를 입력하거나 AI로 생성해보세요. 변수 사용 가능: {이름}, {최근방문월}, {상품명}" rows={6} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 14px", color: COLORS.text, fontSize: 14, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["{이름}", "{최근방문월}", "{상품명}", "{할인율}", "{주년}"].map(v => (
                  <button key={v} onClick={() => setMessage(m => m + " " + v)} style={{ padding: "4px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 20, color: COLORS.accent, fontSize: 11, cursor: "pointer", fontFamily: "Menlo, monospace" }}>{v}</button>
                ))}
              </div>
            </div>

            {/* Schedule settings */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600, color: COLORS.text, fontSize: 13, marginBottom: 12 }}>발송 설정</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 5 }}>타겟 세그먼트</label>
                  <select value={target.id} onChange={e => setTarget(TARGET_SEGMENTS.find(s => s.id === e.target.value))} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box" }}>
                    {TARGET_SEGMENTS.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count.toLocaleString()}명)</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 5 }}>발송 채널</label>
                  <select value={channel} onChange={e => setChannel(e.target.value)} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box" }}>
                    {["1:1 채널", "카카오톡", "SMS", "이메일"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", display: "block", marginBottom: 5 }}>예약 발송 시간</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontSize: 13, fontFamily: "Noto Sans KR, sans-serif", outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[
                    { label: "1시간 후", h: 1 },
                    { label: "3시간 후", h: 3 },
                    { label: "내일 오전 9시", custom: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
                    { label: "다음 주 월요일", custom: () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); d.setHours(10, 0, 0, 0); return d; } },
                  ].map(p => (
                    <button key={p.label} onClick={() => { const d = p.custom ? p.custom() : new Date(Date.now() + p.h * 3600000); const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); setScheduledAt(iso); }} style={{ padding: "5px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 20, color: COLORS.muted, fontSize: 11, cursor: "pointer", fontFamily: "Noto Sans KR, sans-serif" }}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={scheduleMessage} disabled={!message.trim() || !scheduledAt} style={{ padding: "14px", background: message.trim() && scheduledAt ? COLORS.accent : COLORS.border, color: message.trim() && scheduledAt ? "#000" : COLORS.muted, border: "none", borderRadius: 12, fontWeight: 800, cursor: message.trim() && scheduledAt ? "pointer" : "not-allowed", fontFamily: "Noto Sans KR, sans-serif", fontSize: 15 }}>
              📨 예약 발송 등록
            </button>
          </div>

          {/* Preview */}
          <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
            <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 600, color: COLORS.muted, fontSize: 12, marginBottom: 10 }}>📱 미리보기</div>
            <div style={{ background: "#000", borderRadius: 28, border: "6px solid #222", padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "22px 16px 12px", background: COLORS.panel, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
                <div>
                  <div style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 12 }}>어셈블 AI</div>
                  <div style={{ fontSize: 10, color: COLORS.muted }}>{channel}</div>
                </div>
              </div>
              <div style={{ padding: 14, background: COLORS.bg, minHeight: 280 }}>
                {message ? (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, #0096FF)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>⬡</div>
                    <div style={{ background: COLORS.card, color: COLORS.text, padding: "10px 14px", borderRadius: "14px 14px 14px 4px", fontSize: 13, fontFamily: "Noto Sans KR, sans-serif", lineHeight: 1.6, border: `1px solid ${COLORS.border}`, maxWidth: "80%" }}>
                      {message.replace(/\{이름\}/g, "김민준").replace(/\{최근방문월\}/g, "3월").replace(/\{상품명\}/g, "봄 패키지").replace(/\{할인율\}/g, "20").replace(/\{주년\}/g, "1")}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", fontSize: 12, padding: 40 }}>메시지를 입력하면 여기에 미리보기가 표시됩니다</div>
                )}
              </div>
            </div>
            {scheduledAt && (
              <div style={{ marginTop: 12, padding: 12, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12, color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif" }}>
                <div style={{ color: COLORS.muted, fontSize: 11, marginBottom: 4 }}>📅 예약 발송</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(new Date(scheduledAt).toISOString())}</div>
                <div style={{ color: COLORS.accent, fontSize: 11, marginTop: 4 }}>⏳ {timeUntil(new Date(scheduledAt).toISOString())}</div>
                <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 4 }}>🎯 {target.name} · {target.count.toLocaleString()}명</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
          {sent.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div>아직 발송된 메시지가 없어요</div>
            </div>
          ) : sent.map((m, i) => (
            <div key={m.id} style={{ padding: "16px 20px", borderBottom: i < sent.length - 1 ? `1px solid ${COLORS.border}` : "none", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Noto Sans KR, sans-serif", fontWeight: 700, color: COLORS.text, fontSize: 14 }}>{m.templateName}</span>
                  <span style={{ fontSize: 11, background: COLORS.accentDim, color: COLORS.accent, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>✓ 발송 완료</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>{timeUntil(m.scheduledAt)} · {m.channel}</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif", marginBottom: 4 }}>🎯 {m.target}</div>
                <div style={{ fontSize: 12, color: COLORS.text, fontFamily: "Noto Sans KR, sans-serif", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>{m.preview}</div>
              </div>
              {m.opened !== undefined && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.blue, fontFamily: "Montserrat, sans-serif" }}>{m.opened.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>열람</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.accent, fontFamily: "Montserrat, sans-serif" }}>{m.clicked?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: 10, color: COLORS.muted, fontFamily: "Noto Sans KR, sans-serif" }}>클릭</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "chats": return <ChatsPage />;
      case "channels": return <ChannelsPage />;
      case "auto": return <AutoMessagesPage />;
      case "campaigns": return <CampaignsPage />;
      case "customers": return <CustomersPage />;
      case "funnel": return <FunnelPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "Noto Sans KR, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      <Sidebar page={page} setPage={setPage} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {renderPage()}
      </main>
    </div>
  );
}
