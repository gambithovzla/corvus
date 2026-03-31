import { useState, useEffect } from 'react';
import * as api from './lib/api';

// ===== CONSTANTS =====
const PLATFORMS = {
  instagram: { name: 'Instagram', icon: '◎', color: '#E1306C', bg: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
  twitter: { name: 'X (Twitter)', icon: '𝕏', color: '#000000', bg: '#000' },
  tiktok: { name: 'TikTok', icon: '♪', color: '#00F2EA', bg: 'linear-gradient(135deg, #00F2EA, #FF0050)' },
  youtube: { name: 'YouTube', icon: '▶', color: '#FF0000', bg: '#FF0000' },
};

const CONTENT_TYPES = [
  { id: 'post', label: 'Post con imagen', icon: '🖼' },
  { id: 'infographic', label: 'Infografía', icon: '📊' },
  { id: 'reel', label: 'Video / Reel', icon: '🎬' },
  { id: 'thread', label: 'Hilo / Thread', icon: '🧵' },
];

const QUICK_IDEAS = [
  { topic: 'Cómo un bateador mejora su rendimiento con la sabermetría', platform: 'instagram' },
  { topic: 'Top 5 estadísticas que todo fanático del béisbol debe conocer', platform: 'twitter' },
  { topic: 'El dato más sorprendente sobre el WAR en béisbol', platform: 'tiktok' },
  { topic: 'Análisis completo: cómo los equipos usan analytics para ganar', platform: 'youtube' },
  { topic: '3 métricas que predicen el éxito de un pitcher mejor que el ERA', platform: 'instagram' },
  { topic: 'Moneyball en 2026: qué cambió y qué sigue igual', platform: 'twitter' },
];

// ===== SMALL COMPONENTS =====
function PlatformIcon({ platform, size = 28 }) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
      style={{ width: size, height: size, background: p.bg, fontSize: size * 0.4 }}
    >
      {p.icon}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    generating: 'bg-green-50 text-green-700 border-green-200 animate-pulse',
    review: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    published: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  };
  const labels = {
    draft: 'Borrador', generating: 'Generando...', review: 'En revisión',
    approved: 'Aprobado', published: 'Publicado', rejected: 'Rechazado',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function Notification({ notification }) {
  if (!notification) return null;
  const colors = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border ${colors[notification.type] || colors.info}`}>
      {notification.msg}
    </div>
  );
}

// ===== COMMAND INPUT =====
function CommandInput({ profiles, onGenerate, isGenerating }) {
  const [platform, setPlatform] = useState('instagram');
  const [profileId, setProfileId] = useState('');
  const [contentType, setContentType] = useState('post');
  const [topic, setTopic] = useState('');

  // Set default profile when profiles load
  useEffect(() => {
    if (profiles.length > 0 && !profileId) {
      setProfileId(profiles[0].id);
    }
  }, [profiles, profileId]);

  const handleSubmit = () => {
    if (!topic.trim() || isGenerating || !profileId) return;
    onGenerate({ platform, profileId, contentType, topic: topic.trim() });
    setTopic('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-corvus-900 to-corvus-500 flex items-center justify-center text-white font-black text-sm">
          C
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">Centro de comando</div>
          <div className="text-xs text-gray-400">Describe tu idea y CORVUS se encarga</div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {/* Platform selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Red social</label>
          <div className="flex gap-1">
            {Object.entries(PLATFORMS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPlatform(key)}
                className={`flex-1 py-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition-all ${
                  platform === key
                    ? 'border-gray-900 bg-gray-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm">{val.icon}</span>
                <span className={`text-[9px] font-semibold ${platform === key ? 'text-gray-900' : 'text-gray-400'}`}>
                  {val.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Brand selector */}
        <div className="min-w-[120px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Marca</label>
          <select
            value={profileId}
            onChange={e => setProfileId(e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 cursor-pointer"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Content type */}
        <div className="min-w-[150px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo</label>
          <select
            value={contentType}
            onChange={e => setContentType(e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 cursor-pointer"
          >
            {CONTENT_TYPES.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.icon} {ct.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Text input */}
      <div className="relative">
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
          placeholder="Ej: Quiero un post sobre cómo un bateador mejora su rendimiento con la sabermetría..."
          rows={3}
          className="w-full px-4 py-3 pr-24 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none focus:bg-white placeholder:text-gray-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!topic.trim() || isGenerating || !profileId}
          className={`absolute right-3 bottom-3 px-5 py-2 rounded-lg text-white text-xs font-bold transition-all ${
            !topic.trim() || isGenerating
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-corvus-700 to-corvus-500 hover:from-corvus-900 hover:to-corvus-700 cursor-pointer shadow-md'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generando
            </span>
          ) : 'Generar'}
        </button>
      </div>
    </div>
  );
}

// ===== POST CARD =====
function PostCard({ post, onAction }) {
  const p = PLATFORMS[post.platform];
  const [expanded, setExpanded] = useState(false);
  const contentPreview = post.content.length > 200 && !expanded
    ? post.content.substring(0, 200) + '...'
    : post.content;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Platform header bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100"
        style={{ background: `${p?.color}08` }}>
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} size={24} />
          <span className="text-xs font-semibold text-gray-700">{p?.name}</span>
        </div>
        <StatusBadge status={post.status} />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Profile */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background: post.profile?.color || '#6366f1' }}
          >
            {post.profile?.avatar || '?'}
          </div>
          <span className="text-xs font-medium text-gray-500">{post.profile?.name || 'Sin perfil'}</span>
          <span className="text-[10px] text-gray-300 ml-auto">
            {new Date(post.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Topic */}
        {post.topic && (
          <div className="text-[10px] font-semibold text-corvus-500 uppercase tracking-wider mb-2">
            {post.contentType === 'thread' ? '🧵' : post.contentType === 'reel' ? '🎬' : post.contentType === 'infographic' ? '📊' : '🖼'} {post.topic}
          </div>
        )}

        {/* Text content */}
        <div
          className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {contentPreview}
          {post.content.length > 200 && (
            <span className="text-corvus-500 text-xs font-medium ml-1">
              {expanded ? '▲ Menos' : '▼ Más'}
            </span>
          )}
        </div>

        {/* Hashtags */}
        {post.hashtags && (
          <p className="text-xs mt-3 leading-relaxed" style={{ color: p?.color || '#6366f1' }}>
            {post.hashtags}
          </p>
        )}

        {/* Action buttons */}
        {post.status === 'review' && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => onAction(post.id, 'approved')}
              className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              ✓ Aprobar
            </button>
            <button
              onClick={() => onAction(post.id, 'regenerate')}
              className="flex-1 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition-colors"
            >
              ↻ Regenerar
            </button>
            <button
              onClick={() => onAction(post.id, 'rejected')}
              className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
            >
              ✕ Rechazar
            </button>
          </div>
        )}

        {post.status === 'approved' && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              className="w-full py-2.5 rounded-lg text-white text-xs font-bold transition-opacity hover:opacity-90"
              style={{ background: p?.bg || '#000' }}
              onClick={() => onAction(post.id, 'published')}
            >
              Publicar en {p?.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== STATS BAR =====
function StatsBar({ posts }) {
  const stats = [
    { label: 'Total', value: posts.length, color: 'text-gray-900' },
    { label: 'Pendientes', value: posts.filter(p => p.status === 'review').length, color: 'text-amber-600' },
    { label: 'Aprobados', value: posts.filter(p => p.status === 'approved').length, color: 'text-emerald-600' },
    { label: 'Publicados', value: posts.filter(p => p.status === 'published').length, color: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {stats.map(s => (
        <div key={s.label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
          <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          <div className="text-[10px] text-gray-400 font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ===== QUICK IDEAS =====
function QuickIdeas({ profiles, onGenerate, isGenerating }) {
  const defaultProfile = profiles[0]?.id || '';
  return (
    <div className="mt-2">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ideas rápidas</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_IDEAS.map((idea, i) => (
          <button
            key={i}
            onClick={() => onGenerate({ platform: idea.platform, profileId: defaultProfile, contentType: 'post', topic: idea.topic })}
            disabled={isGenerating || !defaultProfile}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlatformIcon platform={idea.platform} size={22} />
            <span className="text-xs text-gray-600 leading-relaxed">{idea.topic}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('command');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState(null);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Initialize: check backend, load profiles and posts
  useEffect(() => {
    async function init() {
      try {
        // Check backend health
        const healthRes = await fetch((import.meta.env.VITE_API_URL || '') + '/health');
        if (!healthRes.ok) throw new Error('Backend no responde');
        setBackendOk(true);

        // Seed profiles if needed
        await api.seedProfiles();

        // Load profiles
        const profilesRes = await api.getProfiles();
        setProfiles(profilesRes.data || []);

        // Load posts
        const postsRes = await api.getPosts();
        setPosts(postsRes.data || []);
      } catch (err) {
        console.error('Error inicializando:', err);
        setBackendOk(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Generate content
  const handleGenerate = async ({ platform, profileId, contentType, topic }) => {
    setIsGenerating(true);
    setView('feed');

    try {
      // 1. Generate with AI
      const aiRes = await api.generateContent({ platform, profileId, contentType, topic });

      // 2. Save to database
      const postRes = await api.createPost({
        profileId,
        platform,
        contentType,
        topic,
        content: aiRes.data.content,
        hashtags: aiRes.data.hashtags,
        status: 'review',
      });

      setPosts(prev => [postRes.data, ...prev]);
      showNotif(`Contenido generado para ${PLATFORMS[platform]?.name || platform}`);
    } catch (err) {
      console.error('Error generando:', err);
      showNotif('Error: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Post actions (approve, reject, publish, regenerate)
  const handleAction = async (postId, action) => {
    if (action === 'regenerate') {
      const post = posts.find(p => p.id === postId);
      if (post) {
        await api.deletePost(postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
        handleGenerate({
          platform: post.platform,
          profileId: post.profileId,
          contentType: post.contentType,
          topic: post.topic,
        });
      }
      return;
    }

    try {
      const res = await api.updatePost(postId, { status: action });
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));

      const msgs = {
        approved: 'Contenido aprobado — listo para publicar',
        rejected: 'Contenido rechazado',
        published: 'Publicado exitosamente',
      };
      showNotif(msgs[action] || 'Actualizado', action === 'rejected' ? 'error' : 'success');
    } catch (err) {
      showNotif('Error actualizando: ' + err.message, 'error');
    }
  };

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'review', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'published', label: 'Publicados' },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-corvus-900 to-corvus-500 flex items-center justify-center text-white font-black text-xl animate-pulse">C</div>
          <div className="text-sm text-gray-400">Conectando con CORVUS...</div>
        </div>
      </div>
    );
  }

  // Backend offline state
  if (backendOk === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Backend no conectado</h2>
          <p className="text-sm text-gray-500 mb-4">
            CORVUS necesita el backend corriendo para funcionar. Asegúrate de que el servidor esté activo en Railway o localmente en el puerto 3001.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-600 font-mono">
            <div className="mb-1">cd backend</div>
            <div className="mb-1">npm install</div>
            <div className="mb-1">npx prisma generate</div>
            <div className="mb-1">npx prisma db push</div>
            <div>npm run dev</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 rounded-lg bg-corvus-500 text-white text-sm font-semibold hover:bg-corvus-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-12">
      {/* Header */}
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-corvus-900 via-corvus-700 to-corvus-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-corvus-500/20">
            C
          </div>
          <div>
            <div className="text-xl font-extrabold text-gray-900 tracking-tight">CORVUS</div>
            <div className="text-[10px] text-gray-400 font-medium tracking-wide">SOCIAL MEDIA COMMAND CENTER</div>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[{ key: 'command', label: '⚡ Comando' }, { key: 'feed', label: '📋 Feed' }].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification */}
      <Notification notification={notification} />

      {/* Command Input - always visible */}
      <CommandInput
        profiles={profiles}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      {/* Stats */}
      {posts.length > 0 && <StatsBar posts={posts} />}

      {/* Feed view */}
      {view === 'feed' && posts.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex gap-1.5 mb-4">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filter === f.key
                    ? 'bg-corvus-50 text-corvus-700 border-corvus-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Post grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPosts.map(post => (
              <PostCard key={post.id} post={post} onAction={handleAction} />
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No hay contenido con este filtro
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {view === 'feed' && posts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">🦅</div>
          <div className="text-base font-semibold text-gray-500 mb-1">Tu centro de comando está listo</div>
          <div className="text-sm text-gray-400">Escribe una idea arriba y CORVUS genera el contenido</div>
        </div>
      )}

      {/* Quick ideas in command view */}
      {view === 'command' && (
        <QuickIdeas profiles={profiles} onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      {/* Footer */}
      <div className="text-center pt-8 text-[10px] text-gray-300 font-medium tracking-wider">
        CORVUS v1.0 — H.E.X.A. ARCHITECTURE V4
      </div>
    </div>
  );
}
