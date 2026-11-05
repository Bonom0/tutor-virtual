# Tutor Virtual

Projeto de TCC: Tutor Virtual com LLM para ensino de programacao.

Stack atual: **React + TypeScript + Vite + Tailwind CSS v4 + Firebase Auth + API FastAPI**.

## Estrutura

```
src/
  pages/
    Login.tsx       -> tela de login (email, criar conta, Google)
    Chat.tsx        -> chat conectado ao backend FastAPI
    Question.tsx    -> tela de pergunta/exercicio
    PerfilPedagogico.tsx -> onboarding e edicao do perfil de aprendizagem
  context/
    AuthContext.tsx -> estado de autenticacao global (useAuth())
  components/
    RotaProtegida.tsx -> redireciona para "/" se nao estiver logado
  firebase/
    config.ts       -> inicializacao do Firebase Auth
```

Rotas:
- `/` -> Login
- `/chat` -> chat com o tutor virtual (protegida, exige login)
- `/chat/:conversationId` -> conversa persistida e restaurada pela API
- `/pergunta` -> tela de pergunta (protegida, exige login)
- `/progresso` -> dashboard de progresso e histórico de tentativas
- `/progresso/:topicId` -> exercícios e evolução detalhada do tópico
- `/onboarding` -> pesquisa inicial de preferências pedagógicas
- `/perfil` -> edição do perfil pedagógico

O chat exibe uma barra lateral com as conversas ativas do usuário. No desktop
ela permanece visível; em telas menores pode ser aberta pelo botão `Histórico`.
As conversas podem ser pesquisadas pelo título, retomadas, arquivadas sem
exclusão física e restauradas pela aba `Arquivadas`. A barra lateral e o
histórico de mensagens usam os cursores opacos retornados pela API para carregar
mais itens sem reler todo o histórico.

## Como rodar

### 0. Iniciar a API

Este frontend utiliza a API independente do Tutor Virtual. Por padrão, ela deve
estar disponível em `http://localhost:8000`, com o endpoint de chat em
`/api/v1/chat` e o health check em `/health`.

As chamadas de chat enviam o Firebase ID Token do usuário no cabeçalho
`Authorization`. A API precisa estar configurada com Firebase Admin para validar
esse token.

Cada mensagem e tentativa recebe um UUID gerado no cliente. Assim, timeout,
reenvio ou perda momentânea de conexão não duplicam conversas, mensagens ou
progresso. Erros de limite, indisponibilidade e timeout exibem mensagens
específicas e incluem o `request_id` como código de suporte quando disponível.

Para usar outro endereço, defina `VITE_API_URL` no `.env` e reinicie o Vite.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Estrutura do banco (Firestore)

O frontend usa o Firebase diretamente somente para autenticacao. Perfil,
conversas, exercicios, tentativas e progresso sao acessados pela API autenticada.
As principais colecoes administradas pela API sao:

- `usuarios/{uid}` - perfil e nivel geral (theta IRT). Criado automaticamente no cadastro/login.
  - `usuarios/{uid}/respostas/{id}` - historico de tentativas do usuario
  - `usuarios/{uid}/progresso/{topicoId}` - nivel IRT por topico
- `topicos/{id}` - conteudo publico (ex: "Loops", "Recursao")
- `questoes/{id}` - exercicios, com parametros IRT (`dificuldade_a`, `dificuldade_b`)

O arquivo `firestore.rules` e uma copia das regras canonicas mantidas em
`tutor-virtual-api/firestore.rules`. Publique as regras e os indices pela pasta da
API. O catalogo inicial pode ser carregado pelo script `scripts/seed_firestore.py`
da API.

### 3. Criar um projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto.
2. Em **Authentication > Sign-in method**, ative os provedores **Email/senha** e **Google**.
3. Em **Firestore Database**, crie o banco (modo producao ou teste, como preferir).
4. Em **Configuracoes do projeto > Seus apps**, crie um app Web e copie as credenciais.

### 4. Configurar variaveis de ambiente

Copie `.env.example` para `.env` e preencha com as credenciais do passo anterior:

```bash
cp .env.example .env
```

### 5. Rodar o projeto

```bash
npm run dev
```

Abra http://localhost:5173

## Qualidade do frontend

O frontend usa carregamento sob demanda por rota, Error Boundary global e CodeMirror 6
na tela de exercícios. O editor oferece destaque de sintaxe, numeração de linhas,
restauração do código inicial e envio com `Ctrl + Enter`.

Para executar as validações:

```bash
npm run lint
npm test
npm run build
```

O dashboard permite filtrar tentativas por tópico, linguagem e resultado, usando
paginação por cursor fornecida pela API. O cliente também reconhece `/ready`
para verificações de prontidão da API.

## Contrato com a API

- `POST /api/v1/chat`: chat persistente e idempotente por `client_message_id`.
- `POST /api/v1/profile/initialize`, `GET /api/v1/profile` e `PUT /api/v1/profile`:
  inicializacao, leitura e edicao do perfil pedagógico.
- `GET /api/v1/conversations`: busca por prefixo e paginação por cursor.
- `GET /api/v1/conversations/{id}/messages`: histórico cronológico paginado.
- `POST /api/v1/exercises/{id}/attempts`: avaliação idempotente por `client_attempt_id`.
- `GET /api/v1/progress` e `/api/v1/attempts`: progresso e histórico adaptativo.

Em produção, configure `VITE_API_URL` com HTTPS e restrinja as origens CORS da
API ao domínio publicado do frontend.
