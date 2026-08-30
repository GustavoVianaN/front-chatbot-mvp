# Produção do frontend

O frontend gera uma imagem Next.js standalone e publica a porta 3001. Na instância, copie `.env.example` para `.env` e configure `BACKEND_API_URL` com a URL acessível pelo container (o padrão usa `host.docker.internal:3000`).

No GitHub, configure `LIGHTSAIL_HOST`, `LIGHTSAIL_USER`, `LIGHTSAIL_SSH_KEY`, `LIGHTSAIL_KNOWN_HOSTS` e `LIGHTSAIL_FRONTEND_PATH`. Depois que o CI da branch `main` passa, o workflow de deploy atualiza o repositório e executa `docker compose up -d --build --remove-orphans`.

O proxy reverso público deve terminar HTTPS, encaminhar o domínio do painel para `127.0.0.1:3001` e não expor diretamente as portas 3000/3001 à internet. Após publicar, valide login, cadastro, onboarding, arquivos, conta e pagamento em navegador móvel e desktop.
