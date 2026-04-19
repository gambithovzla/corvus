import { useState, useEffect, useRef } from "react";

const PLATFORMS = {
  instagram: {
    name: "Instagram",
    icon: "◎",
    color: "#E1306C",
    bg: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
    maxChars: 2200,
    hashtagLimit: 30,
  },
  twitter: {
    name: "X (Twitter)",
    icon: "𝕏",
    color: "#000000",
    bg: "#000000",
    maxChars: 280,
    hashtagLimit: 5,
  },
  tiktok: {
    name: "TikTok",
    icon: "♪",
    color: "#00F2EA",
    bg: "linear-gradient(135deg, #00F2EA, #FF0050)",
    maxChars: 4000,
    hashtagLimit: 8,
  },
  youtube: {
    name: "YouTube",
    icon: "▶",
    color: "#FF0000",
    bg: "#FF0000",
    maxChars: 5000,
    hashtagLimit: 15,
  },
};

const BRANDS = [
  { id: "hexa", name: "HEXA", avatar: "H", color: "#6366f1" },
  { id: "brand2", name: "Marca 2", avatar: "M2", color: "#0ea5e9" },
  { id: "brand3", name: "Marca 3", avatar: "M3", color: "#10b981" },
];

const CONTENT_TYPES = [
  { id: "post", label: "Post con imagen", icon: "🖼" },
  { id: "infographic", label: "Infografía", icon: "📊" },
  { id: "reel", label: "Video corto / Reel", icon: "🎬" },
  { id: "thread", label: "Hilo / Thread", icon: "🧵" },
];

const VOICE_PROFILES = {
  hexa: {
    instagram: "Eres un community manager experto en deportes y sabermetría. Tono: visual, inspiracional, con datos precisos. Usa emojis estratégicamente. Genera hashtags relevantes. Formato: texto de pie de foto para Instagram con saltos de línea. Al inicio un gancho potente.",
    twitter: "Eres un analista deportivo con voz directa e inteligente. Tono: conciso, provocador, basado en datos. Usa hilos si el contenido lo amerita. Máximo 280 caracteres por tweet. Incluye 2-3 hashtags relevantes.",
    tiktok: "Eres un creador de contenido deportivo viral. Genera un guión para video corto (30-60seg). Incluye: Hook inicial (3seg), desarrollo con datos sorprendentes, cierre con call-to-action. Tono: energético pero informado.",
    youtube: "Eres un guionista de contenido deportivo educativo. Genera un guión completo con timestamps, incluyendo: intro gancho, desarrollo con datos, conclusión. Tono: profesional pero accesible.",
  },
};

function generateMockImage(topic, platform) {
  const colors = [
    ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    ["#0d1b2a", "#1b263b", "#415a77", "#778da9"],
    ["#10002b", "#240046", "#3c096c", "#7b2cbf"],
    ["#03071e", "#370617", "#6a040f", "#9d0208"],
    ["#1b4332", "#2d6a4f", "#40916c", "#52b788"],
  ];
  const palette = colors[Math.floor(Math.random() * colors.length)];
  const w = platform === "instagram" ? 1080 : platform === "twitter" ? 1200 : 1080;
  const h = platform === "instagram" ? 1080 : platform === "twitter" ? 675 : 1920;
  const svgW = 400;
  const svgH = platform === "twitter" ? 225 : platform === "tiktok" ? 500 : 400;

  const shapes = [];
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * svgW;
    const y = Math.random() * svgH;
    const size = 20 + Math.random() * 80;
    const c = palette[Math.floor(Math.random() * palette.length)];
    const op = 0.3 + Math.random() * 0.5;
    if (Math.random() > 0.5) {
      shapes.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="${c}" opacity="${op}"/>`);
    } else {
      shapes.push(`<rect x="${x}" y="${y}" width="${size * 1.5}" height="${size}" rx="8" fill="${c}" opacity="${op}" transform="rotate(${Math.random() * 45}, ${x}, ${y})"/>`);
    }
  }

  const words = topic.split(" ").slice(0, 4).join(" ");
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}"><rect width="${svgW}" height="${svgH}" fill="${palette[0]}"/>${shapes.join("")}<rect x="0" y="${svgH * 0.55}" width="${svgW}" height="${svgH * 0.45}" fill="url(#g1)"/><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${palette[0]}" stop-opacity="0"/><stop offset="100%" stop-color="${palette[0]}" stop-opacity="0.95"/></linearGradient></defs><text x="${svgW / 2}" y="${svgH * 0.75}" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="700" font-size="22">${words}</text><text x="${svgW / 2}" y="${svgH * 0.85}" text-anchor="middle" fill="${palette[3]}" font-family="sans-serif" font-weight="600" font-size="12">HEXA ANALYTICS</text></svg>`)}`;
}

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Borrador", bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "var(--color-border-tertiary)" },
    generating: { label: "Generando...", bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" },
    review: { label: "En revisión", bg: "#FAEEDA", color: "#854F0B", border: "#EF9F27" },
    approved: { label: "Aprobado", bg: "#E1F5EE", color: "#0F6E56", border: "#5DCAA5" },
    published: { label: "Publicado", bg: "#E6F1FB", color: "#185FA5", border: "#85B7EB" },
    rejected: { label: "Rechazado", bg: "#FCEBEB", color: "#A32D2D", border: "#F09595" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: 0.3 }}>
      {s.label}
    </span>
  );
}

function PlatformIcon({ platform, size = 28 }) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
      {p.icon}
    </div>
  );
}

function PostCard({ post, onApprove, onReject, onRegenerate }) {
  const p = PLATFORMS[post.platform];
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, overflow: "hidden", transition: "box-shadow 0.2s", cursor: "default" }}>
      {post.image && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          <img src={post.image} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <PlatformIcon platform={post.platform} size={32} />
          </div>
        </div>
      )}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: BRANDS.find(b => b.id === post.brand)?.color || "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>
              {BRANDS.find(b => b.id === post.brand)?.avatar || "?"}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{BRANDS.find(b => b.id === post.brand)?.name}</span>
          </div>
          <StatusBadge status={post.status} />
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-primary)", margin: "0 0 10px", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden" }}>
          {post.content}
        </p>
        {post.hashtags && (
          <p style={{ fontSize: 11, color: p?.color || "var(--color-text-info)", margin: "0 0 12px", lineHeight: 1.5 }}>
            {post.hashtags}
          </p>
        )}
        {post.status === "review" && (
          <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <button onClick={() => onApprove(post.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Aprobar
            </button>
            <button onClick={() => onRegenerate(post.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
              Regenerar
            </button>
            <button onClick={() => onReject(post.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "var(--color-background-danger)", color: "var(--color-text-danger)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Rechazar
            </button>
          </div>
        )}
        {post.status === "approved" && (
          <div style={{ paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <button style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "none", background: p?.bg || "#000", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Publicar en {p?.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommandInput({ onGenerate, isGenerating }) {
  const [platform, setPlatform] = useState("instagram");
  const [brand, setBrand] = useState("hexa");
  const [contentType, setContentType] = useState("post");
  const [topic, setTopic] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (!topic.trim() || isGenerating) return;
    onGenerate({ platform, brand, contentType, topic: topic.trim() });
    setTopic("");
  };

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800 }}>
          C
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Centro de comando</div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Describe tu idea y CORVUS se encarga del resto</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Red social</label>
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(PLATFORMS).map(([key, val]) => (
              <button key={key} onClick={() => setPlatform(key)} style={{ flex: 1, padding: "6px 2px", borderRadius: 8, border: platform === key ? `1.5px solid ${val.color}` : "0.5px solid var(--color-border-tertiary)", background: platform === key ? (key === "twitter" ? "rgba(0,0,0,0.05)" : `${val.color}15`) : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.15s" }}>
                <span style={{ fontSize: 14 }}>{val.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: platform === key ? val.color : "var(--color-text-tertiary)" }}>{val.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 100 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Marca</label>
          <select value={brand} onChange={e => setBrand(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 130 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Tipo</label>
          <select value={contentType} onChange={e => setContentType(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
            {CONTENT_TYPES.map(ct => <option key={ct.id} value={ct.id}>{ct.icon} {ct.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <textarea
          ref={textareaRef}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Ej: Quiero un post sobre cómo un bateador mejora su rendimiento con la sabermetría..."
          rows={3}
          style={{ width: "100%", padding: "12px 14px", paddingRight: 80, borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 14, color: "var(--color-text-primary)", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box" }}
        />
        <button
          onClick={handleSubmit}
          disabled={!topic.trim() || isGenerating}
          style={{ position: "absolute", right: 10, bottom: 10, padding: "8px 16px", borderRadius: 8, border: "none", background: isGenerating ? "var(--color-border-secondary)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: isGenerating ? "wait" : "pointer", transition: "all 0.15s", opacity: !topic.trim() ? 0.5 : 1 }}
        >
          {isGenerating ? "..." : "Generar"}
        </button>
      </div>
    </div>
  );
}

function StatsBar({ posts }) {
  const total = posts.length;
  const published = posts.filter(p => p.status === "published").length;
  const review = posts.filter(p => p.status === "review").length;
  const approved = posts.filter(p => p.status === "approved").length;

  const stats = [
    { label: "Total", value: total, color: "var(--color-text-primary)" },
    { label: "En revisión", value: review, color: "#854F0B" },
    { label: "Aprobados", value: approved, color: "#0F6E56" },
    { label: "Publicados", value: published, color: "#185FA5" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function FilterBar({ filter, setFilter }) {
  const filters = [
    { key: "all", label: "Todos" },
    { key: "review", label: "Pendientes" },
    { key: "approved", label: "Aprobados" },
    { key: "published", label: "Publicados" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
      {filters.map(f => (
        <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "5px 14px", borderRadius: 20, border: filter === f.key ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", background: filter === f.key ? "var(--color-background-info)" : "transparent", color: filter === f.key ? "var(--color-text-info)" : "var(--color-text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default function Corvus() {
  const [posts, setPosts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("command");
  const [notification, setNotification] = useState(null);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateContent = async ({ platform, brand, contentType, topic }) => {
    setIsGenerating(true);
    setView("feed");

    const voiceProfile = VOICE_PROFILES[brand]?.[platform] || VOICE_PROFILES.hexa.instagram;
    const platformInfo = PLATFORMS[platform];

    const contentTypeInstructions = {
      post: "Genera un post completo con texto y sugerencia de imagen.",
      infographic: "Genera el contenido para una infografía: título, 4-6 datos clave numerados, y un pie de imagen.",
      reel: "Genera un guión para video corto de 30-60 segundos: hook (3seg), desarrollo, cierre con CTA.",
      thread: "Genera un hilo de 4-6 tweets conectados, cada uno de máximo 280 caracteres.",
    };

    const systemPrompt = `${voiceProfile}\n\nTipo de contenido: ${contentTypeInstructions[contentType]}\nPlataforma: ${platformInfo.name} (máx ${platformInfo.maxChars} caracteres)\nMarca: ${BRANDS.find(b => b.id === brand)?.name}\n\nIMPORTANTE: Responde SOLO con un JSON válido (sin markdown, sin backticks) con esta estructura:\n{"content": "texto del post aquí", "hashtags": "#hashtag1 #hashtag2", "imagePrompt": "descripción corta para generar imagen"}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Tema: ${topic}` }],
          system: systemPrompt,
        }),
      });

      const data = await response.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        parsed = { content: text, hashtags: "", imagePrompt: topic };
      }

      const newPost = {
        id: Date.now().toString(),
        platform,
        brand,
        contentType,
        topic,
        content: parsed.content || text,
        hashtags: parsed.hashtags || "",
        image: generateMockImage(parsed.imagePrompt || topic, platform),
        status: "review",
        createdAt: new Date().toISOString(),
      };

      setPosts(prev => [newPost, ...prev]);
      showNotif(`Contenido generado para ${platformInfo.name}`);
    } catch (err) {
      const fallbackContent = {
        instagram: `📊 La sabermetría está revolucionando el béisbol.\n\n${topic}\n\nLos datos no mienten: los bateadores que integran análisis avanzado mejoran su OPS en un 15% promedio.\n\nDesliza para ver los números que están cambiando el juego. ➡️`,
        twitter: `🧵 HILO: ${topic}\n\nLos datos están transformando cómo entendemos el rendimiento deportivo.\n\nEl análisis avanzado ya no es opcional — es la ventaja competitiva.`,
        tiktok: `🎬 GUIÓN:\n\n[HOOK - 3seg] ¿Sabías que los mejores bateadores usan matemáticas para ganar?\n\n[DESARROLLO] ${topic}\n\n[CTA] Síguenos para más datos que cambian el juego.`,
        youtube: `📹 GUIÓN:\n\n[00:00] INTRO: ${topic}\n[00:30] Los números detrás del rendimiento\n[02:00] Casos de éxito reales\n[04:00] Conclusión y call-to-action`,
      };

      const newPost = {
        id: Date.now().toString(),
        platform,
        brand,
        contentType,
        topic,
        content: fallbackContent[platform] || fallbackContent.instagram,
        hashtags: `#${topic.split(" ").slice(0, 3).join(" #")} #deportes #analytics`,
        image: generateMockImage(topic, platform),
        status: "review",
        createdAt: new Date().toISOString(),
      };
      setPosts(prev => [newPost, ...prev]);
      showNotif("Contenido generado (modo offline)", "info");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = id => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "approved" } : p));
    showNotif("Contenido aprobado — listo para publicar");
  };

  const handleReject = id => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "rejected" } : p));
    showNotif("Contenido rechazado", "error");
  };

  const handleRegenerate = id => {
    const post = posts.find(p => p.id === id);
    if (post) {
      setPosts(prev => prev.filter(p => p.id !== id));
      generateContent({ platform: post.platform, brand: post.brand, contentType: post.contentType, topic: post.topic });
    }
  };

  const filteredPosts = filter === "all" ? posts : posts.filter(p => p.status === filter);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 40px", fontFamily: "var(--font-sans, system-ui)" }}>
      {/* Header */}
      <div style={{ padding: "24px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #1e1b4b, #4338ca, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 900, letterSpacing: -1 }}>
            C
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: -0.5 }}>CORVUS</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: 500 }}>Social media command center</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["command", "feed"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", borderRadius: 8, border: view === v ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", background: view === v ? "var(--color-background-info)" : "transparent", color: view === v ? "var(--color-text-info)" : "var(--color-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {v === "command" ? "Comando" : "Feed"}
            </button>
          ))}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 500, background: notification.type === "error" ? "var(--color-background-danger)" : notification.type === "info" ? "var(--color-background-info)" : "var(--color-background-success)", color: notification.type === "error" ? "var(--color-text-danger)" : notification.type === "info" ? "var(--color-text-info)" : "var(--color-text-success)", transition: "all 0.3s" }}>
          {notification.msg}
        </div>
      )}

      {/* Command Input - always visible */}
      <CommandInput onGenerate={generateContent} isGenerating={isGenerating} />

      {/* Stats */}
      {posts.length > 0 && <StatsBar posts={posts} />}

      {/* Content Feed */}
      {view === "feed" && posts.length > 0 && (
        <>
          <FilterBar filter={filter} setFilter={setFilter} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300, 1fr))", gap: 16 }}>
            {filteredPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onApprove={handleApprove}
                onReject={handleReject}
                onRegenerate={handleRegenerate}
              />
            ))}
          </div>
          {filteredPosts.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-tertiary)", fontSize: 14 }}>
              No hay contenido con este filtro
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {posts.length === 0 && view === "feed" && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🦅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>Tu centro de comando está listo</div>
          <div style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Escribe una idea arriba y CORVUS genera el contenido para ti</div>
        </div>
      )}

      {/* Quick Actions */}
      {view === "command" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Ideas rápidas</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { topic: "Cómo un bateador mejora su rendimiento con la sabermetría", platform: "instagram" },
              { topic: "Top 5 estadísticas que todo fanático del béisbol debería conocer", platform: "twitter" },
              { topic: "El dato más sorprendente sobre el WAR en béisbol", platform: "tiktok" },
              { topic: "Análisis completo: cómo los equipos usan analytics para ganar", platform: "youtube" },
            ].map((idea, i) => (
              <button
                key={i}
                onClick={() => generateContent({ platform: idea.platform, brand: "hexa", contentType: "post", topic: idea.topic })}
                disabled={isGenerating}
                style={{ padding: "12px 14px", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", cursor: isGenerating ? "wait" : "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <PlatformIcon platform={idea.platform} size={24} />
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{idea.topic}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "30px 0 0", fontSize: 10, color: "var(--color-text-tertiary)" }}>
        CORVUS v1.0 — Powered by H.E.X.A. Architecture
      </div>
    </div>
  );
}
