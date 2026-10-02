# AUDAZ SQUAD — catálogo público e administração

Monólito modular com **Python + FastAPI** no backend e **React + Vite + TypeScript** no frontend. Catálogo público, carrossel de fotos, detalhes, valores e PDFs. Login somente para administrador e gerentes autorizados. Paleta: `#F20530`, `#A60A33`, `#021D40`, `#011126`, `#F2F2F2`.

## Estrutura

```text
backend/
  app/domain/          Entidades, permissões e interfaces
  app/application/     Casos de uso
  app/infrastructure/  Banco, arquivos, configuração e segurança
  app/presentation/    Rotas e validação HTTP
  migrations/          Migrações Alembic
  tests/               Testes de autorização, arquivos e catálogo
  seed/                Conteúdo fictício opcional
frontend/
  src/components/      Layout, cards e carrossel
  src/features/        Catálogo, detalhe, login e administração
  src/lib/             API, sessão e tipos
  nginx.conf           Mesma origem e encaminhamento para FastAPI
compose.yaml           Aplicação + PostgreSQL + volumes
```

A pasta `dist/` na raiz é o protótipo estático anterior, mantido para preservar a publicação existente. A versão nova é `frontend/` + `backend/`. Leia [a arquitetura](docs/ARCHITECTURE.md).

## Desenvolvimento local

Requisitos: Python 3.12+, Node 22.12+ e pnpm 11.25.0.

Backend, em um terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.lock.txt
cp .env.example .env
alembic upgrade head
python -m app.cli seed-demo       # opcional: seis imóveis fictícios
python -m app.cli create-admin    # solicita nome, e-mail e senha sem exibi-la
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend, em outro terminal:

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Acesse http://localhost:3000. Área administrativa: `/login`. API documentada em http://127.0.0.1:8000/api/docs. O Vite encaminha `/api` para FastAPI, sem expor tokens no armazenamento do navegador.

No ambiente em que este projeto foi criado, o banco local já contém os seis exemplos e o administrador solicitado. A senha inicial está em arquivo separado do código. O ZIP não inclui banco, sessões, senhas ou arquivos de configuração privados.

## Fluxo de administração

1. Entre em `/login`.
2. Em **Novo empreendimento**, informe localização em Fortaleza, Caucaia, Maracanaú ou Eusébio, dados e preço.
3. Salve o cadastro e anexe fotos ou PDFs (book, tabela, plantas e demais categorias).
4. Marque **Visível no catálogo público** para publicar; desmarque para manter como rascunho.
5. Em **Usuários e permissões**, crie acessos para corretores, gerentes e diretores. Escolha edição de imóveis e/ou gestão de anexos. Apenas administradores gerenciam contas.
6. Em **Logo**, envie a logo da AUDAZ SQUAD (PNG transparente, JPG ou WebP). Ela aparece no topo e no rodapé.
7. Todos os anexos dos imóveis publicados são públicos; o catálogo pode ser consultado sem conta.

## Docker / produção

```bash
cp .env.example .env
# Edite .env com senha forte do banco, domínio e opções de cookie.
docker compose up --build -d
docker compose exec backend python -m app.cli create-admin
# Opcional:
docker compose exec backend python -m app.cli seed-demo
```

A aplicação fica em http://localhost:8080. Para produção, coloque o serviço atrás de HTTPS, defina `ALLOWED_ORIGINS=https://seu-dominio` e `COOKIE_SECURE=true`. Faça backup dos volumes `database` e `uploads` juntos. Não execute `docker compose down -v` se deseja preservar os dados.

O serviço de banco não é exposto ao host. O FastAPI também não publica porta externa no Compose; todo acesso passa pelo Nginx. O Dockerfile inicia as migrações antes da API. Antes de atualizar uma instalação real, faça backup e revise novas migrações.

## Validação

```bash
cd backend
.venv/bin/python -m pytest -q
cd ../frontend
pnpm build
```

Testes cobrem acesso público, proteção de rascunhos, PDFs, validação de uploads, CSRF, cidades, permissões, revogação de sessões e login. O fluxo completo de navegador foi validado com criação de imóvel, fotos, PDF e gerente.

## Imagens de demonstração

As fotos são ilustrativas e não representam os empreendimentos cadastrados:
- https://unsplash.com/photos/Z27XMPg9ygM
- https://unsplash.com/photos/WgSrVJQRjQ8
- https://unsplash.com/photos/1d6cLEBGcps

## Publicação existente

`.openai/hosting.json` identifica o catálogo estático anterior. Esta migração não deve ser publicada como simples pasta estática: FastAPI, banco e volumes precisam estar em funcionamento. A configuração Docker está pronta para um servidor compatível; nenhuma conta de hospedagem Python foi configurada nesta entrega.
