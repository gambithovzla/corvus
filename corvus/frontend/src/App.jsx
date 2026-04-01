import { useState, useEffect, useMemo } from 'react';
import * as api from './lib/api';

// ===== CONSTANTS =====
const PLATFORMS = {
  instagram: { name: 'Instagram', icon: 'IG', color: '#E1306C', bg: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' },
  twitter: { name: 'X (Twitter)', icon: 'X', color: '#000000', bg: '#000' },
  tiktok: { name: 'TikTok', icon: 'TT', color: '#00F2EA', bg: 'linear-gradient(135deg, #00F2EA, #FF0050)' },
  youtube: { name: 'YouTube', icon: 'YT', color: '#FF0000', bg: '#FF0000' },
};

const CONTENT_TYPES = [
  { id: 'post', label: 'Post con imagen', icon: '[P]' },
  { id: 'infographic', label: 'Infografia', icon: '[I]' },
  { id: 'reel', label: 'Video / Reel', icon: '[R]' },
  { id: 'thread', label: 'Hilo / Thread', icon: '[T]' },
];

const QUICK_IDEAS = [
  { topic: 'Como un bateador mejora su rendimiento con la sabermetria', platform: 'instagram' },
  { topic: 'Top 5 estadisticas que todo fanatico del beisbol debe conocer', platform: 'twitter' },
  { topic: 'El dato mas sorprendente sobre el WAR en beisbol', platform: 'tiktok' },
  { topic: 'Analisis completo: como los equipos usan analytics para ganar', platform: 'youtube' },
  { topic: '3 metricas que predicen el exito de un pitcher mejor que el ERA', platform: 'instagram' },
  { topic: 'Moneyball en 2026: que cambio y que sigue igual', platform: 'twitter' },
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
    draft: 'Borrador',
    generating: 'Generando...',
    review: 'En revision',
    approved: 'Aprobado',
    published: 'Publicado',
    rejected: 'Rechazado',
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

function ThreadPreviewModal({ previewState, onClose }) {
  if (!previewState.open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-xl max-h-[85vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Preview de hilo en X</h3>
            {previewState.topic && (
              <p className="text-xs text-gray-500 mt-1">{previewState.topic}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {previewState.loading && (
            <div className="text-sm text-gray-500">Generando preview...</div>
          )}

          {!previewState.loading && previewState.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {previewState.error}
            </div>
          )}

          {!previewState.loading && !previewState.error && previewState.preview && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Total tweets: <span className="font-semibold text-gray-700">{previewState.preview.totalTweets}</span>
              </div>

              {previewState.preview.tweets.map((tweet) => (
                <div key={tweet.index} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                    <span>Tweet {tweet.index}</span>
                    <span>{tweet.characters}/280</span>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{tweet.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function XConnectionCard({ profileId, xStatus, isConnectingX, onConnectX, onRefreshXStatus }) {
  if (!profileId) return null;

  if (xStatus?.connected) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between">
        <div className="text-xs text-emerald-800">
          Conectado en X como <span className="font-bold">@{xStatus.xUsername}</span>
        </div>
        <button
          onClick={() => onRefreshXStatus(profileId)}
          className="text-[11px] px-2 py-1 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
        >
          Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between">
      <div className="text-xs text-gray-600">Este perfil aun no esta conectado a X</div>
      <button
        onClick={() => onConnectX(profileId)}
        disabled={isConnectingX}
        className={`text-[11px] px-3 py-1.5 rounded-md text-white font-semibold ${isConnectingX ? 'bg-gray-300' : 'bg-black hover:bg-gray-800'}`}
      >
        {isConnectingX ? 'Conectando...' : 'Conectar X'}
      </button>
    </div>
  );
}

// ===== COMMAND INPUT =====
function CommandInput({
  profiles,
  onGenerate,
  isGenerating,
  xStatusByProfile,
  onConnectX,
  onRefreshXStatus,
  isConnectingX,
}) {
  const [platform, setPlatform] = useState('instagram');
  const [profileId, setProfileId] = useState('');
  const [contentType, setContentType] = useState('post');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    if (profiles.length > 0 && !profileId) {
      setProfileId(profiles[0].id);
    }
  }, [profiles, profileId]);

  useEffect(() => {
    if (profileId) {
      onRefreshXStatus(profileId, true);
    }
  }, [profileId, onRefreshXStatus]);

  const selectedXStatus = profileId ? xStatusByProfile[profileId] : null;

  const handleSubmit = () => {
    if (!topic.trim() || isGenerating || !profileId) return;
    onGenerate({ platform, profileId, contentType, topic: topic.trim() });
    setTopic('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-corvus-900 to-corvus-500 flex items-center justify-center text-white font-black text-sm">
          C
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">Centro de comando</div>
          <div className="text-xs text-gray-400">Describe tu idea y CORVUS se encarga</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
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

        <div className="min-w-[140px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Marca</label>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 cursor-pointer"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full px-3 py-[9px] rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 cursor-pointer"
          >
            {CONTENT_TYPES.map((ct) => (
              <option key={ct.id} value={ct.id}>{ct.icon} {ct.label}</option>
            ))}
          </select>
        </div>
      </div>

      <XConnectionCard
        profileId={profileId}
        xStatus={selectedXStatus}
        isConnectingX={isConnectingX}
        onConnectX={onConnectX}
        onRefreshXStatus={onRefreshXStatus}
      />

      <div className="relative mt-3">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ej: Quiero un post sobre como un bateador mejora su rendimiento con la sabermetria..."
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
          {isGenerating ? 'Generando' : 'Generar'}
        </button>
      </div>
    </div>
  );
}

// ===== POST CARD =====
function PostCard({ post, onAction, onPreview, onPublishToX }) {
  const p = PLATFORMS[post.platform];
  const [expanded, setExpanded] = useState(false);
  const contentPreview = post.content.length > 200 && !expanded
    ? `${post.content.substring(0, 200)}...`
    : post.content;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100" style={{ background: `${p?.color}08` }}>
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.platform} size={24} />
          <span className="text-xs font-semibold text-gray-700">{p?.name}</span>
        </div>
        <StatusBadge status={post.status} />
      </div>

      <div className="p-4">
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

        {post.topic && (
          <div className="text-[10px] font-semibold text-corvus-500 uppercase tracking-wider mb-2">
            {post.contentType === 'thread' ? '[T]' : post.contentType === 'reel' ? '[R]' : post.contentType === 'infographic' ? '[I]' : '[P]'} {post.topic}
          </div>
        )}

        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap cursor-pointer" onClick={() => setExpanded(!expanded)}>
          {contentPreview}
          {post.content.length > 200 && (
            <span className="text-corvus-500 text-xs font-medium ml-1">
              {expanded ? 'Less' : 'More'}
            </span>
          )}
        </div>

        {post.hashtags && (
          <p className="text-xs mt-3 leading-relaxed" style={{ color: p?.color || '#6366f1' }}>
            {post.hashtags}
          </p>
        )}

        {!!post.publishError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            Error de publicacion: {post.publishError}
          </div>
        )}

        {post.status === 'review' && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => onAction(post.id, 'approved')}
              className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              Aprobar
            </button>
            <button
              onClick={() => onAction(post.id, 'regenerate')}
              className="flex-1 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition-colors"
            >
              Regenerar
            </button>
            <button
              onClick={() => onAction(post.id, 'rejected')}
              className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
            >
              Rechazar
            </button>
          </div>
        )}

        {post.status === 'approved' && post.platform === 'twitter' && (
          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
            <button
              className="py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold"
              onClick={() => onPreview(post)}
            >
              Ver preview
            </button>
            <button
              className="py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-gray-800"
              onClick={() => onPublishToX(post)}
            >
              Publicar en X
            </button>
          </div>
        )}

        {post.status === 'approved' && post.platform !== 'twitter' && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Publicacion real aun no disponible para esta plataforma en esta fase.
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
    { label: 'Pendientes', value: posts.filter((p) => p.status === 'review').length, color: 'text-amber-600' },
    { label: 'Aprobados', value: posts.filter((p) => p.status === 'approved').length, color: 'text-emerald-600' },
    { label: 'Publicados', value: posts.filter((p) => p.status === 'published').length, color: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
          <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          <div className="text-[10px] text-gray-400 font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function QuickIdeas({ profiles, onGenerate, isGenerating }) {
  const defaultProfile = profiles[0]?.id || '';

  return (
    <div className="mt-2">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ideas rapidas</div>
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
  const [xStatusByProfile, setXStatusByProfile] = useState({});
  const [xConnectingProfileId, setXConnectingProfileId] = useState(null);
  const [previewState, setPreviewState] = useState({
    open: false,
    loading: false,
    error: null,
    preview: null,
    topic: '',
  });

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const refreshXStatus = async (profileId, silent = false) => {
    if (!profileId) return;

    try {
      const response = await api.getXStatus(profileId);
      setXStatusByProfile((prev) => ({
        ...prev,
        [profileId]: response.data,
      }));
    } catch (error) {
      setXStatusByProfile((prev) => ({
        ...prev,
        [profileId]: {
          connected: false,
          xUsername: null,
        },
      }));

      if (!silent) {
        showNotif(`No se pudo consultar estado de X: ${error.message}`, 'error');
      }
    }
  };

  const handleConnectX = async (profileId) => {
    try {
      setXConnectingProfileId(profileId);
      const response = await api.getXAuthUrl(profileId);
      window.location.href = response.data.authUrl;
    } catch (error) {
      showNotif(`Error iniciando OAuth con X: ${error.message}`, 'error');
    } finally {
      setXConnectingProfileId(null);
    }
  };

  const reloadPosts = async () => {
    const postsRes = await api.getPosts();
    setPosts(postsRes.data || []);
  };

  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch((import.meta.env.VITE_API_URL || '') + '/health');
        if (!healthRes.ok) throw new Error('Backend no responde');
        setBackendOk(true);

        const params = new URLSearchParams(window.location.search);
        const xConnected = params.get('x_connected');
        const callbackProfileId = params.get('profileId');
        const xError = params.get('x_error');
        const xUsername = params.get('x_username');

        if (xConnected === '1') {
          showNotif(`Cuenta de X conectada correctamente${xUsername ? ` (@${xUsername})` : ''}`);
        }
        if (xConnected === '0' && xError) {
          showNotif(`No se pudo conectar X: ${xError}`, 'error');
        }

        if (xConnected !== null) {
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        await api.seedProfiles();

        const profilesRes = await api.getProfiles();
        const profilesData = profilesRes.data || [];
        setProfiles(profilesData);

        await reloadPosts();

        if (callbackProfileId) {
          await refreshXStatus(callbackProfileId, true);
        } else if (profilesData[0]?.id) {
          await refreshXStatus(profilesData[0].id, true);
        }
      } catch (err) {
        console.error('Error inicializando:', err);
        setBackendOk(false);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const handleGenerate = async ({ platform, profileId, contentType, topic }) => {
    setIsGenerating(true);
    setView('feed');

    try {
      const aiRes = await api.generateContent({ platform, profileId, contentType, topic });

      const postRes = await api.createPost({
        profileId,
        platform,
        contentType,
        topic,
        content: aiRes.data.content,
        hashtags: aiRes.data.hashtags,
        status: 'review',
      });

      setPosts((prev) => [postRes.data, ...prev]);
      showNotif(`Contenido generado para ${PLATFORMS[platform]?.name || platform}`);
    } catch (err) {
      showNotif(`Error generando: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async (post) => {
    setPreviewState({
      open: true,
      loading: true,
      error: null,
      preview: null,
      topic: post.topic || '',
    });

    try {
      const res = await api.getXPreview({ postId: post.id });
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        preview: res.data,
      }));
    } catch (error) {
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  };

  const closePreview = () => {
    setPreviewState({
      open: false,
      loading: false,
      error: null,
      preview: null,
      topic: '',
    });
  };

  const handlePublishToX = async (post) => {
    try {
      const response = await api.publishPostToX(post.id);
      const updatedPost = response.data.post;

      setPosts((prev) => prev.map((p) => (p.id === post.id ? updatedPost : p)));
      showNotif('Publicado exitosamente en X');

      if (updatedPost?.profileId) {
        refreshXStatus(updatedPost.profileId, true);
      }
    } catch (error) {
      showNotif(`No se pudo publicar en X: ${error.message}`, 'error');
      await reloadPosts();
    }
  };

  const handleAction = async (postId, action) => {
    if (action === 'regenerate') {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      try {
        await api.deletePost(postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        await handleGenerate({
          platform: post.platform,
          profileId: post.profileId,
          contentType: post.contentType,
          topic: post.topic,
        });
      } catch (error) {
        showNotif(`No se pudo regenerar: ${error.message}`, 'error');
      }
      return;
    }

    try {
      const res = await api.updatePost(postId, { status: action });
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.data : p)));

      const msgs = {
        approved: 'Contenido aprobado - listo para publicar',
        rejected: 'Contenido rechazado',
      };
      showNotif(msgs[action] || 'Post actualizado', action === 'rejected' ? 'error' : 'success');
    } catch (error) {
      showNotif(`Error actualizando post: ${error.message}`, 'error');
    }
  };

  const filteredPosts = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.status === filter)),
    [posts, filter]
  );

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'review', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'published', label: 'Publicados' },
  ];

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

  if (backendOk === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">!</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Backend no conectado</h2>
          <p className="text-sm text-gray-500 mb-4">
            CORVUS necesita el backend corriendo para funcionar. Asegurate de que el servidor este activo en Railway o localmente en el puerto 3001.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-xs text-gray-600 font-mono">
            <div className="mb-1">cd backend</div>
            <div className="mb-1">npm install</div>
            <div className="mb-1">npx prisma migrate dev</div>
            <div className="mb-1">npx prisma generate</div>
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
      <ThreadPreviewModal previewState={previewState} onClose={closePreview} />

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
          {[{ key: 'command', label: 'Command' }, { key: 'feed', label: 'Feed' }].map((v) => (
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

      <Notification notification={notification} />

      <CommandInput
        profiles={profiles}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        xStatusByProfile={xStatusByProfile}
        onConnectX={handleConnectX}
        onRefreshXStatus={refreshXStatus}
        isConnectingX={Boolean(xConnectingProfileId)}
      />

      {posts.length > 0 && <StatsBar posts={posts} />}

      {view === 'feed' && posts.length > 0 && (
        <>
          <div className="flex gap-1.5 mb-4">
            {filters.map((f) => (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onAction={handleAction}
                onPreview={handlePreview}
                onPublishToX={handlePublishToX}
              />
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No hay contenido con este filtro</div>
          )}
        </>
      )}

      {view === 'feed' && posts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-20">C</div>
          <div className="text-base font-semibold text-gray-500 mb-1">Tu centro de comando esta listo</div>
          <div className="text-sm text-gray-400">Escribe una idea arriba y CORVUS genera el contenido</div>
        </div>
      )}

      {view === 'command' && (
        <QuickIdeas profiles={profiles} onGenerate={handleGenerate} isGenerating={isGenerating} />
      )}

      <div className="text-center pt-8 text-[10px] text-gray-300 font-medium tracking-wider">
        CORVUS v2.0 - X INTEGRATION PHASE
      </div>
    </div>
  );
}
