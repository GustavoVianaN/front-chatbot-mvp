export default function Terms() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <article className="mx-auto max-w-3xl prose prose-invert">
        <h1>Termos de Uso da Bella</h1>
        <p>Versão de 30 de agosto de 2026.</p>

        <p className="rounded-xl border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <strong>Rascunho.</strong> Este texto descreve com precisão o que o sistema faz hoje,
          mas ainda precisa passar por revisão de um advogado antes de valer como documento
          oficial vinculante. Os campos entre colchetes precisam ser preenchidos com os dados
          reais da empresa responsável antes da publicação.
        </p>

        <h2>1. Sobre o serviço</h2>
        <p>
          A Bella é oferecida por [RAZÃO SOCIAL DA EMPRESA], CNPJ [00.000.000/0001-00]. A Bella
          automatiza o atendimento pelo WhatsApp da sua empresa e organiza informações de
          clientes, produtos e conversas. As respostas são geradas por inteligência artificial
          e podem conter imprecisões — é responsabilidade da empresa contratante supervisionar
          o atendimento, especialmente no início de uso.
        </p>

        <h2>2. Canais de WhatsApp disponíveis</h2>
        <p>Hoje a plataforma oferece dois canais de conexão, com riscos diferentes:</p>
        <ul>
          <li>
            <strong>WhatsApp Cloud API (canal oficial da Meta):</strong> conexão homologada
            diretamente pela Meta, mais estável e sem risco de bloqueio por uso automatizado.
          </li>
          <li>
            <strong>WhatsApp Web (conexão não oficial, via biblioteca de código aberto):</strong>
            emula um dispositivo conectado ao WhatsApp comum da empresa, sem homologação da
            Meta. <strong>A empresa contratante reconhece e aceita que esse canal pode violar
            os Termos de Serviço do WhatsApp e que o número conectado corre risco real de
            suspensão ou banimento pela Meta, a qualquer momento e sem aviso prévio.</strong> A
            Bella não garante disponibilidade, estabilidade nem continuidade desse canal, e não
            se responsabiliza por perdas decorrentes de bloqueio do número pela Meta/WhatsApp
            quando esse for o canal escolhido pela empresa contratante.
          </li>
        </ul>
        <p>
          A escolha do canal é feita pela empresa contratante, que deve avaliar o risco antes de
          conectar um número usado para fins comerciais importantes.
        </p>

        <h2>3. Responsabilidades da empresa contratante</h2>
        <ul>
          <li>Ter autorização legítima sobre o número de WhatsApp conectado.</li>
          <li>Respeitar as regras de uso da Meta/WhatsApp e a legislação aplicável (incluindo a LGPD em relação aos dados dos próprios clientes dela).</li>
          <li>Manter as informações de cadastro corretas e atualizadas.</li>
          <li>Supervisionar as respostas automatizadas e corrigir configurações que gerem respostas inadequadas.</li>
          <li>Não usar a plataforma para conteúdo ilegal, malicioso, discurso de ódio, spam em massa não solicitado, ou qualquer atividade que viole direitos de terceiros.</li>
        </ul>

        <h2>4. Planos, limites e cobrança</h2>
        <p>
          A Bella é oferecida nos planos descritos na página de Conta/Planos, cada um com
          limites mensais de mensagens, uso de IA, minutos de áudio, armazenamento, contatos e
          membros de equipe. Ao ultrapassar o limite do plano, o atendimento automático pode ser
          pausado até renovação do ciclo ou upgrade de plano — a empresa contratante é avisada
          no painel quando estiver próxima do limite.
        </p>
        <p>
          <strong>Confirmação de pagamento:</strong> nesta fase inicial, a confirmação de
          pagamento e ativação de plano é feita manualmente pela equipe da Bella após o
          recebimento (ex: PIX ou transferência, conforme combinado no momento da contratação).
          A automação de cobrança recorrente ainda está em desenvolvimento.
        </p>
        <p>
          <strong>Reajuste:</strong> valores podem ser reajustados mediante aviso prévio de 30
          dias, aplicável a partir do próximo ciclo de cobrança.
        </p>
        <p>
          <strong>Reembolso:</strong> [defina aqui a política de reembolso/cancelamento —
          ex: sem reembolso de período já pago, ou reembolso proporcional em X dias].
        </p>

        <h2>5. Período de teste (trial)</h2>
        <p>
          Novas contas iniciam em período de teste gratuito de 14 dias, com limites reduzidos.
          Ao final do período, é necessário selecionar um plano pago para continuar usando o
          atendimento automatizado sem interrupção.
        </p>

        <h2>6. Cancelamento e exclusão</h2>
        <p>
          O cancelamento pode ser feito a qualquer momento pela tela de Conta e interrompe
          cobranças futuras a partir do próximo ciclo. A exclusão da conta desativa o assistente
          imediatamente e inicia o prazo de segurança de 7 dias descrito na Política de
          Privacidade antes da remoção definitiva dos dados.
        </p>

        <h2>7. Propriedade e conteúdo</h2>
        <p>
          A empresa contratante mantém a titularidade sobre os dados de seus próprios clientes,
          produtos e configurações inseridos na plataforma. A Bella mantém a titularidade sobre
          o software, marca e tecnologia da plataforma.
        </p>

        <h2>8. Limitação de responsabilidade</h2>
        <p>
          A Bella é fornecida &quot;como está&quot;, sem garantia de disponibilidade
          ininterrupta. Não nos responsabilizamos por: decisões comerciais tomadas com base em
          respostas geradas por IA sem supervisão adequada; indisponibilidade de serviços de
          terceiros dos quais dependemos (Meta/WhatsApp, OpenAI, provedores de nuvem); ou
          bloqueio de número no canal WhatsApp Web, conforme item 2. Nossa responsabilidade,
          quando aplicável, está limitada ao valor pago pela empresa contratante nos últimos 3
          meses de uso.
        </p>

        <h2>9. Alterações destes termos</h2>
        <p>
          Alterações relevantes serão comunicadas com nova data de versão e, quando exigirem
          novo aceite, solicitadas na próxima vez que a empresa contratante acessar o painel.
        </p>

        <h2>10. Lei aplicável e foro</h2>
        <p>
          Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
          [CIDADE/UF] para dirimir eventuais controvérsias, com renúncia a qualquer outro, por
          mais privilegiado que seja.
        </p>

        <h2>11. Contato</h2>
        <p>Dúvidas sobre estes termos: [contato@suaempresa.com.br].</p>
      </article>
    </main>
  );
}
