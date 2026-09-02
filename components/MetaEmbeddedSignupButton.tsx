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

function loadFacebookSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }
    if (document.getElementById('facebook-jssdk')) {
      // Já está carregando (outra instância do componente) — só espera o
      // fbAsyncInit original resolver.
      const check = window.setInterval(() => {
        if (window.FB) {
          window.clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }

    window.fbAsyncInit = () => resolve();

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FB_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  });
}

export default function MetaEmbeddedSignupButton({ metaAppId, metaConfigId, onConnected }: MetaEmbeddedSignupButtonProps) {
  const [connecting, setConnecting] = useState(false);
  // Guarda o waba_id/phone_number_id assim que chegam pelo postMessage,
  // para combinar com o "code" do FB.login() quando os dois estiverem
  // disponíveis (a ordem entre os dois eventos não é garantida).
  const signupAssetsRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

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
    setConnecting(true);
    signupAssetsRef.current = {};

    try {
      await loadFacebookSdk();
      window.FB?.init({ appId: metaAppId, version: 'v20.0' });

      const response = await new Promise<FacebookLoginResponse>((resolve) => {
        window.FB?.login(resolve, {
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

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={connecting}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1465CC] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      <ShieldCheck size={16} /> {connecting ? 'Conectando...' : 'Conectar com a Meta'}
    </button>
  );
}
