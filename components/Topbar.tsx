type TopbarProps = {
  companyName: string;
  userName: string;
  status: string;
  whatsappConnected?: string;
  onLogout?: () => void;
};

export default function Topbar({ companyName, userName, status, whatsappConnected, onLogout }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Painel</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{companyName} — Atendimento</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            Bot: <span className="font-semibold text-white">{status}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            WhatsApp: <span className="font-semibold text-white">{whatsappConnected}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            Usuário: <span className="font-semibold text-white">{userName}</span>
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout} className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white">
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
