'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Phone, Building2, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const STAGES = [
  { id: 'NEW', label: 'Novos', color: 'border-gray-600' },
  { id: 'CONTACTED', label: 'Contatados', color: 'border-blue-600' },
  { id: 'QUALIFIED', label: 'Qualificados', color: 'border-yellow-500' },
  { id: 'PROPOSAL_SENT', label: 'Proposta Enviada', color: 'border-purple-500' },
  { id: 'NEGOTIATION', label: 'Negociação', color: 'border-orange-500' },
  { id: 'WON', label: 'Ganho', color: 'border-green-500' },
  { id: 'LOST', label: 'Perdido', color: 'border-red-500' },
] as const;

interface Contact {
  id: string; name: string; company?: string; phone?: string; tags?: string[];
}
interface Pipeline {
  stage: string; estimatedValue?: string; nextFollowUpAt?: string;
}
interface Lead { contact: Contact; pipeline: Pipeline | null; }

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

export default function CrmPage() {
  const { data: leads = [] } = useSWR<Lead[]>(`${API_URL}/crm/leads`, fetcher, { refreshInterval: 30000 });

  const leadsByStage = STAGES.reduce((acc, s) => {
    acc[s.id] = leads.filter((l: Lead) => (l.pipeline?.stage ?? 'NEW') === s.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM & Pipeline</h1>
          <p className="text-gray-400 text-sm">{leads.length} leads no total</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} />
          Novo Lead
        </button>
      </div>

      {/* Kanban — scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage[stage.id] ?? [];
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`flex items-center justify-between mb-3 px-1 border-b-2 pb-2 ${stage.color}`}>
                <span className="text-sm font-semibold text-gray-200">{stage.label}</span>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{stageLeads.length}</span>
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead: Lead) => (
                  <LeadCard key={lead.contact.id} lead={lead} />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-sm">Vazio</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/crm/${lead.contact.id}`}
      className="block bg-gray-900 border border-gray-800 hover:border-indigo-600 rounded-lg p-3 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{lead.contact.name}</p>
          {lead.contact.company && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 size={12} className="text-gray-500" />
              <p className="text-xs text-gray-400 truncate">{lead.contact.company}</p>
            </div>
          )}
          {lead.contact.phone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone size={12} className="text-gray-500" />
              <p className="text-xs text-gray-500">{lead.contact.phone}</p>
            </div>
          )}
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-indigo-400 mt-1" />
      </div>

      {lead.pipeline?.estimatedValue && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <p className="text-xs font-medium text-green-400">
            R$ {Number(lead.pipeline.estimatedValue).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {lead.contact.tags && lead.contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.contact.tags.slice(0, 2).map((tag: string) => (
            <span key={tag} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
