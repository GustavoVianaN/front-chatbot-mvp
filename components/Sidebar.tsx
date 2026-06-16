import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

type Section = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type SidebarProps = {
  sections: readonly Section[];
  activeSection: string;
  onChange: (section: string) => void;
  companyName: string;
};

export default function Sidebar({ sections, activeSection, onChange, companyName }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col justify-between px-5 py-6">
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">SaaS de atendimento</p>
          <h2 className="mt-4 text-2xl font-semibold text-white">{companyName}</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Painel operacional para WhatsApp e atendimento IA.</p>
        </div>
        <nav className="space-y-1">
          {sections.map((section) => {
            const IconComponent = section.icon;
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                  active ? 'bg-slate-800 text-white shadow-panel' : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
                onClick={() => onChange(section.id)}
              >
                <IconComponent size={18} className="shrink-0" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-100">Operação segura</p>
        <p className="mt-2 leading-6">Ajuste o bot, acompanhe conversas e valide integrações sem expor segredos técnicos.</p>
      </div>
    </aside>
  );
}
