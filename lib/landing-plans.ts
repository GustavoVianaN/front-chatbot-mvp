import type { PlanCatalogItem } from '@/lib/types';

type LandingPlanContent = Pick<PlanCatalogItem, 'label' | 'monthlyPriceBrl'> & {
  description: string;
};

export const LANDING_PLAN_CONTENT: Record<PlanCatalogItem['plan'], LandingPlanContent> = {
  STARTER: {
    label: 'Starter',
    monthlyPriceBrl: 99.9,
    description: 'Para começar a automatizar seu atendimento no WhatsApp.',
  },
  PRO: {
    label: 'Pro',
    monthlyPriceBrl: 499.9,
    description: 'Para empresas que já usam o WhatsApp como um canal importante de vendas e atendimento.',
  },
  BUSINESS: {
    label: 'Business',
    monthlyPriceBrl: 999.9,
    description: 'Para operações com maior volume de atendimento e equipes maiores.',
  },
};
