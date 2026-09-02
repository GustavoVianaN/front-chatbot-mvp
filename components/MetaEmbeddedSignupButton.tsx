'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { connectWhatsappCloud } from '@/lib/api';
import { toast } from '@/components/Toast';

type MetaEmbeddedSignupButtonProps = {
  metaAppId: string;
  metaConfigId: string;
  onConnected: () => Promise<void>;
};

// Dados que o próprio fluxo de Embedded Signup manda por postMessage
// enquanto o popup do Facebook está aberto — é assim que sabemos QUAL
// WABA/número a pessoa conectou, já que o "code" do FB.login() sozinho não
// carrega essa informação (só serve pra trocar por token depois).
type EmbeddedSignupMessage = {
  type: string;
  event: string;
  data?: { phone_number_id?: string; waba_id?: string };
};

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; version: string }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
          config_id: string;
          response_type: 'code';
          override_default_response_type: true;
          extras?: { sessionInfoVersion?: string };
        }
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const FB_SDK_SRC = 'https://connect.facebook.net/pt_BR/sdk.js';
// Se o FB.login() não chamar o callback nesse tempo, o popup provavelmente
// foi bloqueado pelo navegador (isso acontece de forma silenciosa — o SDK
// não avisa) e a promise ficaria pendurada para sempre sem isso.
const POPUP_TIMEOUT_MS = 45_000;
// Se nem o SCRIPT do SDK carregar nesse tempo (rede lenta, bloqueador de
// anúncio/rastreador barrando connect.facebook.net, CSP, etc.), avisa em
// vez de deixar o botão preso em "Carregando..." pra sempre — foi
// exatamente esse silêncio que aconteceu no teste.
const SDK_LOAD_TIMEOUT_MS = 15_000;

function loadFacebookSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      document.getElementById('facebook-jssdk')?.remove();
      reject(new Error('O SDK da Meta não carregou a tempo. Pode ser bloqueador de anúncios/rastreador impedindo o carregamento de connect.facebook.net — desative extensões desse tipo e recarregue a página.'));
    }, SDK_LOAD_TIMEOUT_MS);

    if (document.getElementById('facebook-jssdk')) {
      // Já está carregando (outra instância do componente) — só espera o
      // fbAsyncInit original resolver.
      const check = window.setInterval(() => {
        if (window.FB) {
          window.clearInterval(check);
          window.clearTimeout(timeout);
          resolve();
        }
      }, 100);
      return;
    }

    window.fbAsyncInit = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FB_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      window.clearTimeout(timeout);
      // Remove a tag com falha — sem isso, uma nova tentativa (retry) cairia
      // no ramo "já existe" acima e nunca chegaria a criar um script novo.
      script.remove();
      reject(new Error('Não foi possível carregar o SDK da Meta (connect.facebook.net). Verifique sua conexão ou se algum bloqueador de anúncios/rastreador está impedindo o carregamento.'));
    };
    document.body.appendChild(script);
  });
}

export default function MetaEmbeddedSignupButton({ metaAppId, metaConfigId, onConnected }: MetaEmbeddedSignupButtonProps) {
  const [connecting, setConnecting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  // Guarda o waba_id/phone_number_id assim que chegam pelo postMessage,
  // para combinar com o "code" do FB.login() quando os dois estiverem
  // disponíveis (a ordem entre os dois eventos não é garantida).
  const signupAssetsRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  // Carrega o SDK e já inicializa assim que o componente aparece na tela —
  // NUNCA dentro do clique. Se o carregamento (mesmo que rápido) acontecer
  // depois do clique, o navegador deixa de considerar o FB.login() uma ação
  // direta do usuário e bloqueia o popup sem avisar nada — é exatamente o
  // "fica esperando" que aconteceu no teste.
  useEffect(() => {
    let cancelled = false;
    setSdkError('');
    loadFacebookSdk()
      .then(() => {
        if (cancelled) return;
        window.FB?.init({ appId: metaAppId, version: 'v20.0' });
        setSdkReady(true);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        console.error('Falha ao carregar o SDK da Meta', error);
        setSdkError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [metaAppId, retryToken]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!/^https:\/\/www\.facebook\.com$|^https:\/\/web\.facebook\.com$/.test(event.origin)) return;

      let payload: EmbeddedSignupMessage | null = null;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (payload.event === 'FINISH' && payload.data) {
        signupAssetsRef.current = {
          wabaId: payload.data.waba_id,
          phoneNumberId: payload.data.phone_number_id,
        };
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleClick() {
    if (connecting) return;

    if (!sdkReady || !window.FB) {
      toast('Ainda carregando o SDK da Meta. Espere um instante e tente de novo.');
      return;
    }

    setConnecting(true);
    signupAssetsRef.current = {};

    try {
      // FB.login() é chamado direto aqui, sem nenhum await antes — precisa
      // continuar sendo uma reação síncrona ao clique, senão o navegador
      // bloqueia o popup da Meta silenciosamente.
      const response = await new Promise<FacebookLoginResponse>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error('A janela da Meta não abriu ou demorou demais para responder. Verifique se o navegador bloqueou o popup (ícone de bloqueio na barra de endereço) e tente novamente.'));
        }, POPUP_TIMEOUT_MS);

        window.FB!.login((loginResponse) => {
          window.clearTimeout(timeout);
          resolve(loginResponse);
        }, {
          config_id: metaConfigId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { sessionInfoVersion: '3' },
        });
      });

      const code = response.authResponse?.code;
      const { wabaId, phoneNumberId } = signupAssetsRef.current;

      if (!code || !wabaId || !phoneNumberId) {
        toast('Conexão cancelada ou incompleta. Tente novamente.');
        return;
      }

      await connectWhatsappCloud({ code, wabaId, phoneNumberId });
      toast('WhatsApp oficial conectado com sucesso.');
      await onConnected();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível conectar com a Meta agora.');
    } finally {
      setConnecting(false);
    }
  }

  if (sdkError) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border border-rose-600/30 bg-rose-600/10 p-3 text-sm text-rose-200">{sdkError}</p>
        <button
          type="button"
          onClick={() => setRetryToken((value) => value + 1)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Tentar carregar de novo
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={connecting || !sdkReady}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1465CC] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      <ShieldCheck size={16} /> {connecting ? 'Conectando...' : sdkReady ? 'Conectar com a Meta' : 'Carregando...'}
    </button>
  );
}
