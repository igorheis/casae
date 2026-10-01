# casaê

MVP mobile-first para organizar disponibilidade, eventos e despesas entre grupos de amigos. Interface em português, navegação inferior no celular e layout adaptável para desktop.

## Stack e arquitetura

- Next.js 15 (App Router), React 19 e TypeScript.
- Tailwind CSS 4.
- PostgreSQL 16 e Prisma ORM, com schema relacional e migrações.
- Autenticação com senha bcrypt e sessão JWT assinada em cookie HttpOnly, SameSite=Lax e Secure em produção, com OAuth Google e Sign in with Apple configuráveis.
- Zod valida entradas no servidor; as rotas verificam vínculo de membro antes de operar em um grupo.
- Valores monetários inteiros em centavos; despesas e pagamentos originais são mantidos ao calcular saldos compensados.

## Executar localmente

Requisitos: Node.js 20.9+ e Docker com Compose.

1. Copie .env.example para .env e defina SESSION_SECRET com uma chave aleatória forte.
2. Inicie o banco: docker compose up -d db.
3. Instale dependências: pnpm install (ou npm install).
4. Gere Prisma Client: pnpm db:generate.
5. Crie/aplique migração: pnpm db:migrate --name init.
6. Carregue dados demonstrativos: pnpm db:seed.
7. Inicie: pnpm dev e acesse http://localhost:3000.

Ao alterar código, mantenha o servidor de desenvolvimento em execução no terminal. Não rode pnpm build ao mesmo tempo que pnpm dev: os dois usam a pasta .next. Use pnpm build depois de parar o servidor de desenvolvimento.

## Demonstração

- E-mail: igor@demo.junto.app
- Senha: Junto2026!
- Grupo: Réveillon no Rio 🎆 com Igor, João, Pedro, Lucas e Mariana.

Os dados são fictícios. O seed pode ser executado novamente sem duplicar grupo, participantes ou despesas-base.

## Banco, migrações e seed

prisma/schema.prisma contém usuários, grupos, participantes, disponibilidade, compromissos, eventos, despesas, parcelas de despesas e pagamentos. DATABASE_URL aponta para PostgreSQL. Use pnpm db:migrate em desenvolvimento e pnpm db:deploy no deploy. O seed cria a demonstração.

## Etapa 2: migração e configuração

Depois de iniciar o PostgreSQL, aplique a migration aditiva com pnpm db:deploy (ou pnpm db:migrate --name etapa2 em desenvolvimento). Os pagamentos existentes recebem status CONFIRMED e seu paidAt é copiado para markedAt. Os registros financeiros originais são preservados.

### Google OAuth

Crie um OAuth Client ID do tipo Web no Google Cloud Console. Configure a tela de consentimento e cadastre como redirect URI exato https://SEU_DOMINIO/api/auth/google/callback. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI e NEXT_PUBLIC_GOOGLE_CLIENT_ID. Para local, use http://localhost:3000/api/auth/google/callback.

### Sign in with Apple

O fluxo Sign in with Apple está preparado com validação de state, nonce, assinatura e troca do authorization code. Requer Apple Developer Program, App ID/Service ID, domínio verificado, Return URL https://SEU_DOMINIO/api/auth/apple/callback, Team ID, Key ID e chave privada .p8. Preencha APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY e APPLE_REDIRECT_URI. O retorno form_post requer HTTPS e cookie SameSite=None; por isso não funciona em localhost HTTP sem túnel HTTPS.

### Notificações e push

Os avisos in-app ficam na central e preferências por categoria. Compromissos e eventos são agendados por POST /api/cron/notifications com Authorization: Bearer CRON_SECRET. Configure um cron externo para chamar essa rota a cada 5 minutos. O push usa VAPID: gere chaves com pnpm exec web-push generate-vapid-keys e configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT. O navegador pede permissão somente após a pessoa ativar o recurso no Perfil.

No iPhone, push web requer iOS/iPadOS 16.4 ou posterior, Safari e o site instalado pela opção Adicionar à Tela de Início. O Service Worker mostra notificações push. Manifest, ícones, ícone Apple Touch, safe area e modo standalone estão configurados. Páginas autenticadas não são armazenadas offline para evitar persistência local de dados financeiros e pessoais.

### Tema

Claro, escuro e automático são salvos por usuário. Automático acompanha a preferência do sistema. O tema é aplicado antes da hidratação para evitar flash claro/escuro.

### QR Pix

O servidor gera BR Code com chave, nome do recebedor e valor de uma dívida líquida autorizada e devolve QR e Pix copia e cola. O app não inicia transferências. Chaves Pix só são devolvidas para a rota autenticada de QR quando a pessoa solicitante realmente deve ao recebedor.

## Testes e build

- pnpm test: compensação líquida, ciclos, divisão e arredondamento, Pix, regras de pagamentos e regras/antecedência de notificações.
- pnpm build: gera Prisma Client e compila o app Next.js.

## Estrutura

- src/app: telas e rotas da API.
- src/lib/auth.ts: sessão e usuário autenticado.
- src/lib/finance.ts: divisão igual e compensação líquida.
- prisma/schema.prisma: modelo e relações.
- prisma/seed.ts: dados de demonstração.

## Segurança

Senhas usam bcrypt; tokens de sessão expiram em sete dias. Ações de grupo verificam associação no servidor. Não coloque segredos no repositório. Em produção configure HTTPS, SESSION_SECRET, DATABASE_URL, backups e monitoramento. Convites usam código compartilhável; a associação é confirmada no servidor.

## Deploy

Use um ambiente compatível com Next.js e PostgreSQL gerenciado. Configure as variáveis de .env.example, execute pnpm db:deploy e use pnpm build/pnpm start. Docker Compose é para desenvolvimento local. Manifesto PWA, ícones próprios, splash Apple, safe area e instalação estão configurados. O service worker atende push e instalação; páginas autenticadas não recebem cache offline para não persistir dados pessoais e financeiros no dispositivo.

## Escopo e limites

Implementados: cadastro/login/logout, criação e adesão a grupo por convite, calendário mensal, disponibilidade manual, compromissos, eventos, despesas com divisão igual/personalizada por valor ou porcentagem, extrato, saldos líquidos, pagamentos parciais registrados, perfil e chave Pix informativa com ação de copiar.

Recuperação de senha ainda requer serviço de e-mail. Google e Apple dependem das credenciais externas acima. Upload de foto e comprovantes não estão habilitados. Push requer HTTPS, VAPID e um cron externo. Não há transferência bancária. Não há cache offline de páginas autenticadas. Limite de requisições, verificação de e-mail, MFA, retenção e monitoramento de auditoria devem ser adicionados antes de um uso público amplo.

## Verificação neste workspace

Schema Prisma, TypeScript, testes unitários e build de produção passaram. A migration Stage 2 foi gerada como alteração aditiva, mas não foi aplicada a um banco neste ambiente. Não foi possível iniciar PostgreSQL ou executar migrations/seed neste computador porque Docker e PostgreSQL não estão instalados; siga a configuração Docker Compose acima para validar autenticação e persistência end-to-end.
