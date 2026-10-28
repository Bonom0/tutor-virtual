import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sendMessage, type CodeExample } from '../services/api';

// Tipos para o sistema de chat
export interface Message {
  id: string;
  role: 'user' | 'tutor';
  content: string;
  examples?: CodeExample[];
  timestamp: Date;
  isModerated?: boolean;
  warning?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focar no input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Adicionar mensagem do usuário
    setMessages((prev) => [...prev, userMessage]);
    const messageContent = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      if (!user) {
        throw new Error('Sua sessão expirou. Entre novamente para continuar.');
      }

      const idToken = await user.getIdToken();

      // Chamada real ao backend
      const response = await sendMessage(
        {
          message: messageContent,
          conversation_id: conversationId || undefined,
          user_context: {},
        },
        idToken,
      );

      // Atualizar conversation_id
      if (response.conversation_id && response.conversation_id !== 'new') {
        setConversationId(response.conversation_id);
      }

      // Criar mensagem do tutor
      const tutorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'tutor',
        content: response.response,
        examples: response.examples,
        timestamp: new Date(),
        isModerated: response.moderated,
        warning: response.warning,
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch (error) {
      console.error('[Chat] Erro ao enviar mensagem:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível obter a resposta do tutor.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startNewConversation = () => {
    if (messages.length === 0) return;

    // Confirmar antes de limpar
    if (confirm('Tem certeza que deseja iniciar uma nova conversa? O histórico atual será perdido.')) {
      setMessages([]);
      setConversationId(null);
      setError(null);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <span className="font-display font-semibold text-lg text-graphite">
            tutor<span className="text-tutor">.</span>virtual
          </span>
          <button
            onClick={startNewConversation}
            className="text-sm font-medium text-tutor hover:text-tutor-dark transition"
            disabled={messages.length === 0}
          >
            + Nova conversa
          </button>
          <button
            onClick={() => navigate('/pergunta')}
            className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
          >
            Exercícios
          </button>
        </div>
        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="text-sm text-graphite-soft hidden sm:inline">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Área principal de chat */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-tutor/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-tutor"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="font-display font-semibold text-2xl text-graphite mb-2">
                  Como posso ajudar?
                </h2>
                <p className="text-graphite-soft text-sm leading-relaxed">
                  Faça qualquer dúvida sobre programação em linguagem natural. Sou seu tutor
                  virtual de programação.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    'Como funciona um loop for?',
                    'O que é uma função?',
                    'Explique recursão',
                    'Diferença entre let e const',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs font-medium text-tutor bg-tutor/10 hover:bg-tutor/20 px-3 py-2 rounded-full transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-tutor flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-white animate-pulse"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-marker/30 bg-marker/10 px-3 py-2 text-sm text-marker"
              >
                <span>Erro ao consultar o tutor: {error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="font-medium hover:underline"
                  aria-label="Fechar mensagem de erro"
                >
                  Fechar
                </button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua dúvida sobre programação..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-tutor focus:border-tutor transition min-h-[48px] max-h-32"
                  disabled={isLoading}
                  style={{ fieldSizing: 'content' }}
                />
                {input && (
                  <div className="absolute right-3 bottom-3 text-xs text-graphite-soft">
                    Enter para enviar, Shift+Enter para nova linha
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-tutor hover:bg-tutor-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-5 py-3 transition flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Enviar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// Componente para renderizar cada mensagem
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-slate text-chalk' : 'bg-tutor text-white'
        }`}
      >
        {isUser ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          </svg>
        )}
      </div>

      {/* Conteúdo da mensagem */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`max-w-2xl rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-slate text-chalk rounded-tr-sm'
              : 'bg-gray-100 text-graphite rounded-tl-sm'
          }`}
        >
          {/* Texto principal */}
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>

          {/* Exemplos de código */}
          {message.examples && message.examples.length > 0 && (
            <div className="mt-4 space-y-3">
              {message.examples.map((example, idx) => (
                <CodeBlock key={idx} example={example} />
              ))}
            </div>
          )}

          {message.warning && (
            <p className="mt-3 rounded-md border border-marker/30 bg-marker/10 px-3 py-2 text-xs text-marker">
              {message.warning}
            </p>
          )}

          {/* Timestamp e indicador de moderação */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${isUser ? 'text-chalk/70' : 'text-graphite-soft'}`}>
            <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            {message.isModerated && !isUser && (
              <span className="flex items-center gap-1 text-progress" title="Conteúdo verificado">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
                Verificado
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para renderizar blocos de código
function CodeBlock({ example }: { example: CodeExample }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Header do bloco de código */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-graphite-soft">
            {example.language}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-tutor hover:text-tutor-dark transition"
        >
          {isExpanded ? 'Recolher' : 'Expandir'}
        </button>
      </div>

      {/* Código */}
      <div className={`bg-slate ${isExpanded ? '' : 'max-h-24 overflow-hidden'}`}>
        <pre className="p-3 text-xs text-chalk font-mono overflow-x-auto">
          <code>{example.code}</code>
        </pre>
      </div>

      {/* Explicação */}
      {example.explanation && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-graphite-soft">{example.explanation}</p>
        </div>
      )}
    </div>
  );
}
