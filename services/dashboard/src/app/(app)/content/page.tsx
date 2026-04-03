import Link from 'next/link';
import { PenLine, Linkedin, Instagram, Twitter, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Post {
  id: string; platform: string; content: string; status: string;
  scheduledFor?: string; publishedAt?: string; sourceTopic?: string; aiGenerated: boolean;
}

async function getPosts() {
  try {
    const res = await fetch(`${API_URL}/content/posts`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

const PLATFORM_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LINKEDIN: Linkedin,
  INSTAGRAM: Instagram,
  TWITTER: Twitter,
};

const PLATFORM_COLOR: Record<string, string> = {
  LINKEDIN: 'text-blue-400',
  INSTAGRAM: 'text-pink-400',
  TWITTER: 'text-sky-400',
};

const STATUS_COLORS: Record<string, string> = {
  IDEA: 'text-gray-400 bg-gray-400/10',
  DRAFT: 'text-yellow-400 bg-yellow-400/10',
  SCHEDULED: 'text-blue-400 bg-blue-400/10',
  PUBLISHED: 'text-green-400 bg-green-400/10',
  ARCHIVED: 'text-gray-500 bg-gray-500/10',
};

export default async function ContentPage() {
  const posts: Post[] = await getPosts();
  const scheduled = posts.filter((p: Post) => p.status === 'SCHEDULED').length;
  const drafts = posts.filter((p: Post) => p.status === 'DRAFT').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendário de Conteúdo</h1>
          <p className="text-gray-400 text-sm">{drafts} rascunhos · {scheduled} agendados</p>
        </div>
        <Link
          href="/ai"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <PenLine size={15} />
          Criar com IA
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6">
        {['TODOS', 'DRAFT', 'SCHEDULED', 'PUBLISHED'].map((f) => (
          <button key={f} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            {f === 'TODOS' ? 'Todos' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {posts.map((post: Post) => {
          const PlatformIcon = PLATFORM_ICON[post.platform] ?? PenLine;
          return (
            <div key={post.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${PLATFORM_COLOR[post.platform] ?? 'text-gray-400'}`}>
                  <PlatformIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status]}`}>
                      {post.status}
                    </span>
                    {post.aiGenerated && (
                      <span className="text-xs text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">✦ IA</span>
                    )}
                    {post.scheduledFor && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={10} />
                        {new Date(post.scheduledFor).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">{post.content}</p>
                  {post.sourceTopic && (
                    <p className="text-xs text-gray-600 mt-2">Tópico: {post.sourceTopic}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <PenLine size={32} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum post ainda. Crie seu primeiro com a IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
