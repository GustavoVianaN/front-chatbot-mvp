import { Moon, Sun } from 'lucide-react';

type TopbarProps = {
  companyName: string;
  userName: string;
  status: string;
  whatsappConnected?: string;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
};

export default function Topbar({ companyName, userName, status, whatsappConnected, onLogout, theme = 'dark', onToggleTheme }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500 sm:text-sm sm:tracking-[0.3em]">Painel</p>
          <h1 className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl">{companyName} — Atendimento</h1>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-300 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:text-sm">
          <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            Bot: <span className="font-semibold text-white">{status}</span>
          </div>
          <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            WhatsApp: <span className="font-semibold text-white">{whatsappConnected}</span>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 sm:block">
            Usuário: <span className="font-semibold text-white">{userName}</span>
          </div>
          {onToggleTheme && (
            <button type="button" onClick={onToggleTheme} className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white" aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout} className="shrink-0 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white">
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
