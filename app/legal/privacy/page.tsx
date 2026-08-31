export default function Privacy() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <article className="mx-auto max-w-3xl prose prose-invert">
        <h1>Política de Privacidade da BellAI Connect</h1>
        <p>Versão de 30 de agosto de 2026.</p>

        <p className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong>Rascunho.</strong> Este texto descreve com precisão o que o sistema faz hoje,
          mas ainda precisa passar por revisão de um advogado antes de valer como documento
          oficial vinculante. Os campos entre colchetes (ex: [RAZÃO SOCIAL], [CNPJ]) precisam
          ser preenchidos com os dados reais da empresa responsável antes da publicação.
        </p>

        <h2>1. Quem trata os dados (controlador)</h2>
        <p>
          Esta plataforma é operada por [RAZÃO SOCIAL DA EMPRESA], CNPJ [00.000.000/0001-00],
          contato para assuntos de privacidade: [privacidade@suaempresa.com.br]. Quando você
          contrata a BellAI Connect para atender os clientes da sua empresa por meio da Bella, existem dois papéis distintos
          na Lei Geral de Proteção de Dados (LGPD):
        </p>
        <ul>
          <li>
            <strong>A empresa cliente (você) é controladora</strong> dos dados dos consumidores
            que conversam pelo WhatsApp dela — é você quem decide coletar esses dados e para
            que finalidade usá-los no seu negócio.
          </li>
          <li>
            <strong>A BellAI Connect é operadora</strong> desses dados: processamos as conversas e
            informações apenas para prestar o serviço contratado por você, seguindo suas
            instruções (ex: configuração do assistente, base de conhecimento).
          </li>
          <li>
            Para os dados do seu próprio cadastro na plataforma (nome, e-mail, senha, plano,
            uso), a BellAI Connect é controladora.
          </li>
        </ul>

        <h2>2. Quais dados tratamos</h2>
        <ul>
          <li><strong>Cadastro da conta:</strong> nome, e-mail, senha (com hash, nunca em texto puro), empresa, plano, aceite de termos.</li>
          <li><strong>Configuração do assistente:</strong> nome da empresa, segmento, tom de voz, base de conhecimento, produtos e serviços cadastrados.</li>
          <li><strong>Conversas do WhatsApp:</strong> número de telefone, nome de contato, histórico de mensagens (texto, áudio transcrito, imagens), trocadas entre os clientes da empresa contratante e o assistente ou a equipe.</li>
          <li><strong>Arquivos enviados:</strong> documentos, planilhas, imagens e áudios usados para configurar a base de conhecimento ou enviados durante o atendimento.</li>
          <li><strong>Métricas de uso:</strong> volume de mensagens, tokens de IA consumidos, minutos de áudio, armazenamento usado — para controle de limites do plano.</li>
          <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e registros de acesso (logs), para segurança e prevenção de fraude.</li>
        </ul>

        <h2>3. Com quem compartilhamos e por quê</h2>
        <p>Dependendo dos recursos usados, os dados podem ser processados por:</p>
        <ul>
          <li><strong>Meta / WhatsApp Business Platform</strong> — para envio e recebimento de mensagens pelo canal oficial do WhatsApp.</li>
          <li>
            <strong>WhatsApp Web (canal não oficial, via biblioteca de código aberto)</strong> —
            enquanto a empresa cliente optar por este canal em vez do WhatsApp oficial, as
            mensagens trafegam por essa conexão alternativa, sujeita aos riscos descritos nos
            Termos de Uso (item sobre WhatsApp Web).
          </li>
          <li><strong>OpenAI</strong> — para gerar respostas do assistente, transcrever áudios e (quando habilitado) gerar imagens. Mensagens e contexto necessário são enviados à OpenAI para esse processamento.</li>
          <li><strong>Amazon Web Services (AWS S3)</strong> — para armazenamento dos arquivos enviados à base de conhecimento.</li>
          <li><strong>Provedor de hospedagem da aplicação e do banco de dados.</strong></li>
        </ul>
        <p>
          Alguns desses provedores processam dados em servidores fora do Brasil. Esse
          compartilhamento ocorre apenas na medida necessária para prestar o serviço contratado,
          nunca para venda de dados a terceiros ou finalidade de publicidade.
        </p>

        <h2>4. Base legal do tratamento</h2>
        <ul>
          <li><strong>Execução de contrato:</strong> processar cadastro, configuração e conversas para prestar o serviço de atendimento automatizado contratado.</li>
          <li><strong>Consentimento:</strong> aceite dos Termos de Uso e desta Política no cadastro, registrado com data, versão e IP.</li>
          <li><strong>Legítimo interesse:</strong> prevenção a fraude, segurança da plataforma e melhoria do serviço, sempre de forma proporcional e sem prejudicar seus direitos.</li>
          <li><strong>Obrigação legal:</strong> quando exigido por lei ou ordem judicial.</li>
        </ul>

        <h2>5. Cookies e sessão</h2>
        <p>
          Usamos cookies estritamente necessários para manter a sessão de login (token de
          acesso e de renovação), com atributo HttpOnly (não acessível por scripts) e marcados
          como seguros em produção. Não usamos cookies de rastreamento publicitário.
        </p>

        <h2>6. Seus direitos</h2>
        <p>Como titular dos dados, você pode, a qualquer momento pelo painel ou por e-mail:</p>
        <ul>
          <li>Exportar uma cópia dos seus dados (disponível na tela de Conta).</li>
          <li>Solicitar a exclusão da sua conta e dos dados associados (disponível na tela de Conta).</li>
          <li>Corrigir dados incorretos ou desatualizados.</li>
          <li>Revogar consentimento a qualquer momento, sem afetar tratamentos já realizados.</li>
          <li>Solicitar informações sobre com quem seus dados foram compartilhados.</li>
          <li>Apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
        </ul>

        <h2>7. Retenção e exclusão</h2>
        <p>
          Ao solicitar a exclusão da conta, existe um prazo de segurança de 7 dias antes da
          remoção definitiva (para evitar exclusões acidentais). Após esse prazo, os dados são
          apagados permanentemente, incluindo arquivos armazenados. Cópias de backup seguem o
          ciclo técnico de retenção de até 30 dias, exceto quando a lei exigir guarda por prazo
          maior (ex: registros para cumprimento de obrigação legal ou defesa em processo).
        </p>

        <h2>8. Segurança</h2>
        <p>
          Senhas são armazenadas com hash (nunca em texto puro), conexões usam HTTPS/TLS, o
          acesso a arquivos e dados de uma empresa é isolado dos dados de outras empresas, e o
          acesso interno é restrito a quem precisa para prestar suporte.
        </p>

        <h2>9. Menores de idade</h2>
        <p>A plataforma não é destinada a menores de 18 anos.</p>

        <h2>10. Alterações desta política</h2>
        <p>
          Alterações relevantes serão comunicadas com nova data de versão nesta página e, quando
          exigirem novo aceite, solicitadas na próxima vez que você acessar o painel.
        </p>

        <h2>11. Contato</h2>
        <p>
          Dúvidas sobre esta política ou sobre seus dados: [privacidade@suaempresa.com.br].
        </p>
      </article>
    </main>
  );
}
