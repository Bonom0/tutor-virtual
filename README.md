# Tutor Virtual

Projeto de TCC: Tutor Virtual com LLM para ensino de programacao.

Stack atual: **React + TypeScript + Vite + Tailwind CSS v4 + Firebase (Auth + Firestore)**.

## Estrutura

```
src/
  pages/
    Login.tsx       -> tela de login (email, criar conta, Google)
    Question.tsx    -> tela de pergunta/exercicio
  context/
    AuthContext.tsx -> estado de autenticacao global (useAuth())
  components/
    RotaProtegida.tsx -> redireciona para "/" se nao estiver logado
  firebase/
    config.ts       -> inicializacao do Firebase (Auth + Firestore)
```

Rotas:
- `/` -> Login
- `/pergunta` -> tela de pergunta (protegida, exige login)

## Como rodar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Estrutura do banco (Firestore)

Colecoes usadas pelo projeto (ver `src/types/firestore.ts` para os tipos e `src/firebase/firestore.ts` para as funcoes de acesso):

- `usuarios/{uid}` - perfil e nivel geral (theta IRT). Criado automaticamente no cadastro/login.
  - `usuarios/{uid}/respostas/{id}` - historico de tentativas do usuario
  - `usuarios/{uid}/progresso/{topicoId}` - nivel IRT por topico
- `topicos/{id}` - conteudo publico (ex: "Loops", "Recursao")
- `questoes/{id}` - exercicios, com parametros IRT (`dificuldade_a`, `dificuldade_b`)

As regras de seguranca ja estao em `firestore.rules` (publique com `firebase deploy --only firestore:rules` depois de instalar a Firebase CLI). Voce ainda precisa popular manualmente `topicos` e `questoes` no console do Firebase (ou via um script/backend) - o app so cria os dados de `usuarios`, `respostas` e `progresso` automaticamente.

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

## Proximos passos sugeridos (conforme arquitetura do TCC)

- Conectar a tela de pergunta a um backend real (FastAPI) que chama o LLM (GPT-4o) e retorna as anotacoes/feedback.
- Persistir progresso do aluno no Firestore (historico de respostas, nivel de dificuldade adaptativo via IRT).
- Trocar o `<textarea>` da tela de pergunta pelo Monaco Editor para syntax highlighting real.
- Adicionar Redis/cache no backend para sessoes de tutoria em tempo real, se necessario.
