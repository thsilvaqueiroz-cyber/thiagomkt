import { TrendingUp, Users, FolderKanban, DollarSign, AlertCircle, Sparkles } from 'lucide-react';

async function getDashboardData() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const [pipelineRes, financesRes, aiUsageRes] = await Promise.allSettled([
    fetch(`${API_URL}/crm/pipeline/summary`, { next: { revalidate: 60 } }),
    fetch(`${API_URL}/finances/summary`, { next: { revalidate: 60 } }),
    fetch(`${API_URL}/ai/usage`, { next: { revalidate: 300 } }),
  ]);

  const pipeline = pipelineRes.status === 'fulfilled' && pipelineRes.value.ok
    ? (await pipelineRes.value.json()).data : [];
  const finances = financesRes.status === 'fulfilled' && financesRes.value.ok
    ? (await financesRes.value.json()).data : null;
  const aiUsage = aiUsageRes.status === 'fulfilled' && aiUsageRes.value.ok
    ? (await aiUsageRes.value.json()).data : null;

  return { pipeline, finances, aiUsage };
}

interface PipelineStage { stage: string; count: number; total_value: string; }

export default async function DashboardPage() {
  const { pipeline, finances, aiUsage } = await getDashboardData();

  const totalPipelineValue = (pipeline as PipelineStage[])
    .filter((s: PipelineStage) => !['WON', 'LOST'].includes(s.stage))
    .reduce((acc: number, s: PipelineStage) => acc + Number(s.total_value), 0);

  const activeLeads = (pipeline as PipelineStage[])
    .filter((s: PipelineStage) => !['WON', 'LOST'].includes(s.stage))
    .reduce((acc: number, s: PipelineStage) => acc + Number(s.count), 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Visão geral do negócio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Pipeline Ativo"
          value={`R$ ${totalPipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          subtitle={`${activeLeads} leads em andamento`}
          icon={TrendingUp}
          color="indigo"
        />
        <KpiCard
          title="Receita do Mês"
          value={`R$ ${Number(finances?.currentMonth?.revenue?.received ?? 0).toLocaleString('pt-BR')}`}
          subtitle={`R$ ${Number(finances?.currentMonth?.revenue?.expected ?? 0).toLocaleString('pt-BR')} esperado`}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          title="Faturas em Atraso"
          value={String(finances?.overdue?.count ?? 0)}
          subtitle={`R$ ${Number(finances?.overdue?.total ?? 0).toLocaleString('pt-BR')} em aberto`}
          icon={AlertCircle}
          color="red"
        />
        <KpiCard
          title="Gasto IA (mês)"
          value={`$ ${Number(aiUsage?.totalCostUsd ?? 0).toFixed(2)}`}
          subtitle={`${aiUsage?.budgetUsedPct ?? 0}% do orçamento`}
          icon={Sparkles}
          color="purple"
        />
      </div>

      {/* Pipeline Kanban Summary */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Pipeline de Leads</h2>
          <a href="/crm" className="text-indigo-400 text-sm hover:text-indigo-300">Ver tudo →</a>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
          {(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'] as const).map((stage) => {
            const stageData = (pipeline as PipelineStage[]).find((s: PipelineStage) => s.stage === stage);
            return (
              <div key={stage} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stageData?.count ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">{stageLabels[stage]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const stageLabels: Record<string, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  PROPOSAL_SENT: 'Proposta',
  NEGOTIATION: 'Negociação',
  WON: 'Ganho',
  LOST: 'Perdido',
};

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: 'indigo' | 'green' | 'red' | 'purple';
}

function KpiCard({ title, value, subtitle, icon: Icon, color }: KpiCardProps) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-400 text-sm">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
    </div>
  );
}
