import { Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Project {
  id: string; name: string; type: string; status: string;
  contractedValue?: string; deadline?: string; contact?: { name: string; company?: string };
}

async function getProjects() {
  try {
    const res = await fetch(`${API_URL}/projects`, { next: { revalidate: 60 } });
    const data = await res.json();
    return data.data ?? [];
  } catch { return []; }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  SCOPING:     { label: 'Escopo', color: 'text-blue-400 bg-blue-400/10', icon: Circle },
  IN_PROGRESS: { label: 'Em Andamento', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  REVIEW:      { label: 'Revisão', color: 'text-purple-400 bg-purple-400/10', icon: AlertCircle },
  DELIVERED:   { label: 'Entregue', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  MAINTENANCE: { label: 'Manutenção', color: 'text-gray-400 bg-gray-400/10', icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelado', color: 'text-red-400 bg-red-400/10', icon: AlertCircle },
};

const TYPE_LABELS: Record<string, string> = {
  AI_AGENT: 'Agente IA', AUTOMATION: 'Automação',
  WHATSAPP_SERVICE: 'WhatsApp', CONSULTING: 'Consultoria', OTHER: 'Outro',
};

export default async function ProjectsPage() {
  const projects: Project[] = await getProjects();
  const active = projects.filter((p: Project) => !['DELIVERED', 'CANCELLED'].includes(p.status));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projetos</h1>
          <p className="text-gray-400 text-sm">{active.length} em andamento</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Novo Projeto
        </button>
      </div>

      <div className="grid gap-4">
        {projects.map((project: Project) => {
          const config = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.IN_PROGRESS;
          const Icon = config.icon;
          return (
            <div key={project.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      {TYPE_LABELS[project.type] ?? project.type}
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                      <Icon size={10} />
                      {config.label}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold">{project.name}</h3>
                  {project.contact && (
                    <p className="text-gray-400 text-sm mt-0.5">
                      {project.contact.name}{project.contact.company ? ` — ${project.contact.company}` : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {project.contractedValue && (
                    <p className="text-green-400 font-semibold text-sm">
                      R$ {Number(project.contractedValue).toLocaleString('pt-BR')}
                    </p>
                  )}
                  {project.deadline && (
                    <p className="text-gray-500 text-xs mt-1">
                      Prazo: {new Date(project.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <p>Nenhum projeto cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
