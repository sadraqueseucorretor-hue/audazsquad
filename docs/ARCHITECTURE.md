# Arquitetura AUDAZ SQUAD

## Decisão principal

Monólito modular: toda a lógica de negócio está em uma única aplicação FastAPI e em um único banco. O frontend React/Vite é separado para apresentação. Nginx, API e PostgreSQL são componentes de infraestrutura da mesma aplicação; não há microsserviços de domínio.

```text
Navegador
    │ HTTPS / mesma origem
    ▼
Nginx ─── arquivos estáticos React + Vite
    │ /api/*
    ▼
FastAPI / presentation
    ▼
application / casos de uso
    ▼
domain / entidades, regras e interfaces
    ▲
infrastructure / SQLAlchemy, arquivos, hash e sessões
    │
PostgreSQL + volume de uploads
```

## Camadas e SOLID

- `domain`: entidades Python, invariantes de metragem e suítes, permissões e contratos. Não importa FastAPI ou SQLAlchemy.
- `application`: cadastro de empreendimentos, anexos e usuários. Recebe repositórios, armazenamento e serviço de senha por contratos (`Protocol`).
- `infrastructure`: implementações SQLAlchemy, arquivos locais, Argon2 e sessões persistidas. SQLite no desenvolvimento; PostgreSQL no Docker.
- `presentation`: validação Pydantic, rotas HTTP, cookies, erros e composição de dependências.
- Interfaces de usuários, catálogo, transação, armazenamento e senha são separadas para que cada caso de uso dependa apenas do contrato necessário.
- Componentes do frontend: catálogo, detalhe, carrossel, editor de empreendimento e gestão de acessos. Chamadas HTTP e sessão ficam em `lib/`.

## Acesso, conforme a definição final

| Ação | Público / corretor | Administrador | Gerente autorizado |
|---|---|---|---|
| Consultar imóveis publicados e valores | Sim | Sim | Sim |
| Abrir fotos, books e tabelas de imóveis publicados | Sim | Sim | Sim |
| Consultar rascunhos | Não | Sim | Se puder editar ou anexar |
| Cadastrar, editar, publicar e retirar da vitrine | Não | Sim | Permissão `catalog.edit` |
| Anexar e remover fotos/documentos | Não | Sim | Permissão `assets.manage` |
| Criar acessos, alterar permissões e desativar pessoas | Não | Sim | Não |

Não há cadastro de corretor para consultar o catálogo. O administrador inicial é criado por comando no servidor, sem endpoint público de criação. Permissões são verificadas na API; esconder botões no frontend não é uma barreira de segurança.

## Persistência e arquivos

Migrações Alembic versionam o esquema. Cadastros e metadados persistem no banco; os arquivos ficam em volume separado. Nomes internos aleatórios evitam usar o nome do upload como caminho. Imagens são validadas, normalizadas como JPEG e têm metadados removidos. PDFs devem ser válidos e sem senha; são baixados como anexos. Limites: 20 MB por arquivo, 15 fotos por imóvel, 25 megapixels na entrada.

As informações flexíveis dos empreendimentos ficam em uma coluna JSON validada pela API e pelo domínio; usuários, sessões e relacionamentos de anexos possuem campos relacionais. Uma futura necessidade de índices de pesquisa pode mover campos do catálogo para colunas próprias sem alterar os casos de uso.

A vitrine retorna apenas registros publicados. O download de anexos de rascunhos também exige autorização; conhecer o endereço do arquivo não concede acesso. Os documentos de um imóvel publicado são públicos por decisão de produto.

## Autenticação

Senha com Argon2; token aleatório em cookie HttpOnly, SameSite=Lax e Secure em produção. O banco armazena somente o hash do token. Sessões expiram em 12 horas, e mudanças de acesso encerram sessões anteriores. Escritas exigem token CSRF, com verificação de origem no servidor. Tentativas inválidas de login têm limites por conta e origem da conexão.

## Escopo e limites

- Conteúdo real é mantido pela administração; o seed é demonstrativo e opcional.
- Cadastro de materiais nesta versão aceita PDFs e fotos JPG/PNG/WebP. Tabelas devem ser enviadas em PDF.
- Não há CRM, leads ou funil, recuperação automática por e-mail ou envio de convites.
- SQLite atende desenvolvimento local. O conjunto Docker utiliza PostgreSQL.
- Produção precisa de domínio HTTPS, `COOKIE_SECURE=true`, origem correta e backup de banco e arquivos.
- O deploy completo exige um servidor Python/containers. O link Sites da primeira versão continua servindo o protótipo estático e não executa este FastAPI.
