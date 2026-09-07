import { describe, expect, it } from 'vitest';
import { interpretOnboardingCorrection, keepOnlyLatestRetest } from './onboarding-correction';

const welcome = 'Olá, tudo bem? Eu sou a Ana, IA da Pambda case. Me conte como posso ajudar no seu atendimento de hoje.';

describe('interpretação de correções no teste do onboarding', () => {
  it('troca IA por Assistente virtual usando o contexto da saudação', () => {
    expect(interpretOnboardingCorrection({
      correction: 'O IA da pambda case quero Assistente virtual',
      testedMessage: 'Olá',
      botResponse: welcome,
      hasImage: false,
      pendingWelcome: false,
    })).toEqual({
      action: 'welcome_message',
      value: 'Olá, tudo bem? Eu sou a Ana, Assistente virtual da Pambda case. Me conte como posso ajudar no seu atendimento de hoje.',
    });
  });

  it('pede o texto completo quando o cliente diz apenas mudar a mensagem', () => {
    expect(interpretOnboardingCorrection({ correction: 'mudar a mensagem', testedMessage: 'Olá', botResponse: welcome, hasImage: false, pendingWelcome: false }))
      .toEqual({ action: 'clarify_welcome', value: '' });
  });

  it('mantém o contexto e usa a mensagem informada na resposta seguinte', () => {
    expect(interpretOnboardingCorrection({ correction: 'Quero que seja: Olá! Eu sou a Ana, assistente virtual da Pambda Case.', testedMessage: 'Olá', botResponse: welcome, hasImage: false, pendingWelcome: true }))
      .toEqual({ action: 'welcome_message', value: 'Olá! Eu sou a Ana, assistente virtual da Pambda Case.' });
  });

  it('ativa análise de imagens em vez de criar uma regra textual', () => {
    expect(interpretOnboardingCorrection({ correction: 'Não quero que fale que está desativada', testedMessage: '', botResponse: 'A análise de imagens está desativada.', hasImage: true, pendingWelcome: false }))
      .toEqual({ action: 'analyze_images', value: true });
  });

  it('mantém somente a versão mais recente do reteste', () => {
    const messages = [
      { id: 'customer', retest: false },
      { id: 'original', retest: false },
      { id: 'old-retest', retest: true },
    ];

    expect(keepOnlyLatestRetest(messages, { id: 'latest-retest', retest: true })).toEqual([
      { id: 'customer', retest: false },
      { id: 'original', retest: false },
      { id: 'latest-retest', retest: true },
    ]);
  });
});
