'use client';
import { useState } from 'react';
import { Sparkles, FileText, UserCheck, PenLine, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type AgentTab = 'proposal' | 'qualify' | 'content';

export default function AIAgentsPage() {
  const [activeTab, setActiveTab] = useState<AgentTab>('proposal');

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles size={24} className="text-indigo-400" />
          Agentes IA
        </h1>
        <p className="text-gray-400 text-sm mt-1">Claude trabalhando para você</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-1">
        {[
          { id: 'proposal' as AgentTab, label: 'Escrever Proposta', icon: FileText },
          { id: 'qualify' as AgentTab, label: 'Qualificar Lead', icon: UserCheck },
          { id: 'content' as AgentTab, label: 'Criar Conteúdo', icon: PenLine },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-gray-800 text-white border border-gray-700 border-b-transparent'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'proposal' && <ProposalAgent />}
      {activeTab === 'qualify' && <QualifyAgent />}
      {activeTab === 'content' && <ContentAgent />}
    </div>
  );
}

function ProposalAgent() {
  const [contactId, setContactId] = useState('');
  const [serviceType, setServiceType] = useState('WHATSAPP_SERVICE');
  const [painPoints, setPainPoints] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!contactId || !painPoints) return;
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch(`${API_URL}/ai/proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, serviceType, painPoints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setResult(data.data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Claude escreve uma proposta completa em markdown baseada nos dados do lead.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">ID do Contato (UUID)</label>
          <input
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            placeholder="11111111-0000-0000-..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tipo de Serviço</label>
          <select
            value={serviceType}
            onChange={e => setServiceType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="WHATSAPP_SERVICE">Serviço WhatsApp</option>
            <option value="AI_AGENT">Agente de IA</option>
            <option value="AUTOMATION">Automação Interna</option>
            <option value="CONSULTING">Consultoria</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Dores e Problemas do Cliente</label>
        <textarea
          value={painPoints}
          onChange={e => setPainPoints(e.target.value)}
          rows={4}
          placeholder="Ex: Cliente tem restaurante, perde leads porque não responde WhatsApp rápido, faz reservas manualmente por telefone..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !contactId || !painPoints}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Gerando proposta...' : 'Gerar Proposta'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-green-400">Proposta gerada!</p>
            <button
              onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Copiar
            </button>
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

function QualifyAgent() {
  const [contactId, setContactId] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!contactId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_URL}/ai/qualify-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setResult(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Claude analisa o histórico do lead e retorna uma qualificação BANT com próxima ação recomendada.</p>
      <div className="flex gap-3">
        <input
          value={contactId}
          onChange={e => setContactId(e.target.value)}
          placeholder="ID do lead (UUID)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !contactId}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
          Qualificar
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${Number(result.score) >= 7 ? 'text-green-400' : Number(result.score) >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {String(result.score)}/10
            </div>
            <div>
              <p className="text-white font-medium">{String(result.recommendation)}</p>
              <p className="text-gray-400 text-xs">Score de qualificação</p>
            </div>
          </div>
          {result.nextAction && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
              <p className="text-xs text-indigo-400 font-medium mb-1">Próxima ação:</p>
              <p className="text-sm text-white">{String(result.nextAction)}</p>
            </div>
          )}
          {result.suggestedMessage && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-xs text-green-400 font-medium mb-1">Mensagem sugerida para WhatsApp:</p>
              <p className="text-sm text-white">{String(result.suggestedMessage)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentAgent() {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('LINKEDIN');
  const [tone, setTone] = useState('educativo');
  const [result, setResult] = useState<{ content: string; hookVariants: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeHook, setActiveHook] = useState(0);

  async function handleSubmit() {
    if (!topic) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_URL}/ai/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setResult(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Claude cria posts para suas redes com 3 variações de hook para escolher.</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tópico</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex: como IA reduz 80% do tempo de atendimento" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Plataforma</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="LINKEDIN">LinkedIn</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TWITTER">Twitter/X</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Tom</label>
          <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="educativo">Educativo</option>
            <option value="provocativo">Provocativo</option>
            <option value="storytelling">Storytelling</option>
            <option value="lista">Lista/Dicas</option>
          </select>
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading || !topic} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
        {loading ? 'Criando conteúdo...' : 'Criar Post'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="space-y-3">
          {result.hookVariants.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Escolha um hook:</p>
              <div className="space-y-2">
                {result.hookVariants.map((hook: string, i: number) => (
                  <button key={i} onClick={() => setActiveHook(i)} className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${activeHook === i ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'}`}>
                    {hook}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <p className="text-xs text-gray-400">Post completo</p>
              <button onClick={() => navigator.clipboard.writeText(result.content)} className="text-xs text-gray-400 hover:text-white">Copiar</button>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">{result.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
