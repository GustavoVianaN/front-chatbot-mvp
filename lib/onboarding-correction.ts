export type OnboardingCorrectionResult =
  | { action: 'welcome_message'; value: string }
  | { action: 'analyze_images'; value: true }
  | { action: 'response_rule'; value: string }
  | { action: 'clarify_welcome'; value: '' };

type CorrectionContext = {
  correction: string;
  testedMessage: string;
  botResponse: string;
  hasImage: boolean;
  pendingWelcome: boolean;
};

function requestedFullWelcome(correction: string, pendingWelcome: boolean) {
  const quoted = correction.match(/["“]([^"”]{5,})["”]/)?.[1]?.trim();
  if (quoted) return quoted;

  const separatorParts = correction.split(/\.{3,}|…|:\s*/).map((part) => part.trim()).filter(Boolean);
  if (separatorParts.length > 1) return separatorParts.at(-1) || '';

  const afterInstruction = correction.match(/(?:primeira mensagem|mensagem inicial|boas[- ]vindas).*?(?:sej\w*|fosse|assim)[\s.:;-]*(.+)$/i)?.[1]?.trim();
  if (afterInstruction) return afterInstruction;

  if (pendingWelcome) {
    return correction
      .replace(/^\s*(?:a|o)?\s*(?:ia\s*)?(?:eu\s*)?(?:quero|gostaria|prefiro)\s+que\s+(?:sej\w*|fique|ficasse)\s*[,.:;-]*\s*/i, '')
      .trim();
  }

  return '';
}

export function interpretOnboardingCorrection(context: CorrectionContext): OnboardingCorrectionResult {
  const correction = context.correction.trim();
  const imageCorrection = context.hasImage
    && /an[aá]lis\w*.*(?:imagem|foto)|(?:imagem|foto).*an[aá]lis\w*|desativad[ao]/i.test(`${correction} ${context.botResponse}`);
  if (imageCorrection) return { action: 'analyze_images', value: true };

  const testedGreeting = /^(?:ol[aá]|oi|bom dia|boa tarde|boa noite)(?:[!,.?\s]|$)/i.test(context.testedMessage.trim());
  const explicitWelcome = /primeira mensagem|mensagem inicial|boas[- ]vindas/i.test(correction);
  const isWelcomeCorrection = context.pendingWelcome || explicitWelcome || testedGreeting;

  if (isWelcomeCorrection) {
    const fullWelcome = requestedFullWelcome(correction, context.pendingWelcome);
    if ((context.pendingWelcome || explicitWelcome) && fullWelcome.length >= 5 && !/^(mudar|trocar|altera\w*)\b/i.test(fullWelcome)) {
      return { action: 'welcome_message', value: fullWelcome };
    }

    // Caso comum: o cliente quer trocar apenas a forma de apresentação,
    // mantendo o restante da mensagem inicial intacto.
    if (/assistente virtual/i.test(correction) && /\bIA\b/i.test(context.botResponse)) {
      return { action: 'welcome_message', value: context.botResponse.replace(/\bIA\b/i, 'Assistente virtual') };
    }

    if (fullWelcome.length >= 5 && !/^(mudar|trocar|altera\w*)\b/i.test(fullWelcome)) {
      return { action: 'welcome_message', value: fullWelcome };
    }

    return { action: 'clarify_welcome', value: '' };
  }

  return { action: 'response_rule', value: correction };
}

export function keepOnlyLatestRetest<T extends { retest?: boolean }>(messages: T[], latestRetest: T): T[] {
  return [...messages.filter((message) => !message.retest), latestRetest];
}
