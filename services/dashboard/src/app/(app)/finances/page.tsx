import { DollarSign, TrendingDown, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Invoice {
  id: string; number: string; amount: string; status: string;
  dueDate?: string; contact?: { name: string; company?: string };
}
interface Expense {
  id: string; description: string; amount: string; category: string; date: string; recurring: boolean;
}

async function getFinancesData() {
  try {
    const [invRes, expRes, sumRes] = await Promise.all([
      fetch(`${API_URL}/finances/invoices`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/finances/expenses`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/finances/summary`, { next: { revalidate: 60 } }),
    ]);
    return {
      invoices: invRes.ok ? (await invRes.json()).data : [],
      expenses: expRes.ok ? (await expRes.json()).data : [],
      summary: sumRes.ok ? (await sumRes.json()).data : null,
    };
  } catch { return { invoices: [], expenses: [], summary: null }; }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-gray-400', SENT: 'text-blue-400', VIEWED: 'text-purple-400',
  PAID: 'text-green-400', OVERDUE: 'text-red-400', CANCELLED: 'text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', VIEWED: 'Visualizada',
  PAID: 'Paga', OVERDUE: 'Atrasada', CANCELLED: 'Cancelada',
};

export default async function FinancesPage() {
  const { invoices, expenses, summary } = await getFinancesData();
  const recurringExpenses = (expenses as Expense[]).filter((e: Expense) => e.recurring);
  const recurringTotal = recurringExpenses.reduce((acc: number, e: Expense) => acc + Number(e.amount), 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Finanças</h1>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-400" />
            <p className="text-gray-400 text-sm">Receita Recebida</p>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {Number(summary?.currentMonth?.revenue?.received ?? 0).toLocaleString('pt-BR')}
          </p>
          <p className="text-gray-500 text-xs mt-1">Este mês</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <p className="text-gray-400 text-sm">Despesas Fixas</p>
          </div>
          <p className="text-2xl font-bold text-white">
            R$ {recurringTotal.toLocaleString('pt-BR')}
          </p>
          <p className="text-gray-500 text-xs mt-1">{recurringExpenses.length} despesas recorrentes</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-orange-400" />
            <p className="text-gray-400 text-sm">Faturas em Atraso</p>
          </div>
          <p className="text-2xl font-bold text-white">{summary?.overdue?.count ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">
            R$ {Number(summary?.overdue?.total ?? 0).toLocaleString('pt-BR')} a receber
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Faturas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Faturas</h2>
            <button className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg">+ Nova</button>
          </div>
          <div className="space-y-2">
            {(invoices as Invoice[]).slice(0, 10).map((inv: Invoice) => (
              <div key={inv.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{inv.number}</p>
                  {inv.contact && <p className="text-xs text-gray-400">{inv.contact.name}</p>}
                  {inv.dueDate && <p className="text-xs text-gray-500">Vence: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">R$ {Number(inv.amount).toLocaleString('pt-BR')}</p>
                  <p className={`text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{STATUS_LABELS[inv.status]}</p>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-gray-600 text-sm text-center py-6">Nenhuma fatura ainda</p>}
          </div>
        </div>

        {/* Despesas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Despesas</h2>
            <button className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg">+ Nova</button>
          </div>
          <div className="space-y-2">
            {(expenses as Expense[]).slice(0, 10).map((exp: Expense) => (
              <div key={exp.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{exp.category}</span>
                    {exp.recurring && <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Recorrente</span>}
                  </div>
                </div>
                <p className="text-sm font-semibold text-red-400">-R$ {Number(exp.amount).toLocaleString('pt-BR')}</p>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-gray-600 text-sm text-center py-6">Nenhuma despesa registrada</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
