import type { PlanCatalogItem } from '@/lib/types';

type LandingPlanContent = Pick<PlanCatalogItem, 'label' | 'monthlyPriceBrl'> & {
  description: string;
  fallbackHighlights: string[];
};

export const LANDING_PLAN_ORDER: PlanCatalogItem['plan'][] = ['STARTER', 'PRO', 'BUSINESS'];

export const LANDING_PLAN_CONTENT: Record<PlanCatalogItem['plan'], LandingPlanContent> = {
  STARTER: {
    label: 'Starter',
    monthlyPriceBrl: 99.9,
    description: 'Para começar a automatizar seu atendimento no WhatsApp.',
    fallbackHighlights: ['1.000 mensagens/mês', '2 pessoas na equipe', '500 MB de arquivos'],
  },
  PRO: {
    label: 'Pro',
    monthlyPriceBrl: 499.9,
    description: 'Para empresas que já usam o WhatsApp como um canal importante de vendas e atendimento.',
    fallbackHighlights: ['5.000 mensagens/mês', '5 pessoas na equipe', '2 GB de arquivos'],
  },
  BUSINESS: {
    label: 'Business',
    monthlyPriceBrl: 999.9,
    description: 'Para operações com maior volume de atendimento e equipes maiores.',
    fallbackHighlights: ['20.000 mensagens/mês', '15 pessoas na equipe', '10 GB de arquivos'],
  },
};
