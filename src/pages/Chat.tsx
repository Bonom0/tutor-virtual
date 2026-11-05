import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/auth';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getConversationMessages,
  listConversations,
  archiveConversation as archiveConversationApi,
  updateConversation,
  sendMessage,
  apiErrorMessage,
  type CodeExample,
  type ConversationMessage,
  type ConversationSummary,
} from '../services/api';
import { createClientId } from '../utils/id';
import ConversationSidebar from '../components/ConversationSidebar';
import ConfirmDialog from '../components/ConfirmDialog';
import RenameConversationDialog from '../components/RenameConversationDialog';
import Toast, { type ToastMessage } from '../components/Toast';

type PendingConfirmation =
  | { type: 'new-conversation' }
  | { type: 'archive-conversation'; conversation: ConversationSummary };

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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [conversationListError, setConversationListError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'active' | 'archived'>('active');
  const [conversationSearch, setConversationSearch] = useState('');
  const [debouncedConversationSearch, setDebouncedConversationSearch] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [renamingConversation, setRenamingConversation] = useState<ConversationSummary | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeConversationId } = useParams<{ conversationId?: string }>();
  const conversationId = routeConversationId ?? null;

  const loadConversations = useCallback(async (cursor?: string) => {
    if (!user) return;
    setIsLoadingConversations(true);
    setConversationListError(null);
    try {
      const idToken = await user.getIdToken();
      const response = await listConversations(idToken, {
        status: conversationStatus,
        search: debouncedConversationSearch,
        limit: 30,
        cursor,
      });
      setConversations((current) => cursor ? mergeById(current, response.items) : response.items);
      setConversationCursor(response.next_cursor);
    } catch (error) {
      console.error('[Chat] Erro ao listar conversas:', error);
      setConversationListError(
        apiErrorMessage(error, 'Não foi possível carregar o histórico.'),
      );
    } finally {
      setIsLoadingConversations(false);
    }
  }, [conversationStatus, debouncedConversationSearch, user]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedConversationSearch(conversationSearch),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [conversationSearch]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focar no input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Restaura a conversa persistida sempre que o ID presente na URL mudar.
  useEffect(() => {
    let active = true;

    if (!conversationId) {
      setMessages([]);
      setMessageCursor(null);
      setError(null);
      setIsLoadingHistory(false);
      return () => {
        active = false;
      };
    }

    if (!user) return;
    const currentUser = user;
    const currentConversationId = conversationId;

    setIsLoadingHistory(true);
    setError(null);
    getConversationMessagesForUser();

    async function getConversationMessagesForUser() {
      try {
        const idToken = await currentUser.getIdToken();
        const response = await getConversationMessages(currentConversationId, idToken);
        if (active) {
          setMessages(response.messages.map(toUiMessage));
          setMessageCursor(response.next_cursor);
        }
      } catch (error) {
        console.error('[Chat] Erro ao carregar conversa:', error);
        if (active) {
          setMessages([]);
          setError(
            apiErrorMessage(error, 'Não foi possível carregar o histórico da conversa.'),
          );
        }
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    }

    return () => {
      active = false;
    };
  }, [conversationId, user]);

  const loadOlderMessages = async () => {
    if (!user || !conversationId || !messageCursor || isLoadingOlderMessages) return;
    setIsLoadingOlderMessages(true);
    try {
      const idToken = await user.getIdToken();
      const response = await getConversationMessages(conversationId, idToken, {
        limit: 50,
        cursor: messageCursor,
      });
      setMessages((current) => mergeById(response.messages.map(toUiMessage), current));
      setMessageCursor(response.next_cursor);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, 'Não foi possível carregar mensagens anteriores.'));
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: createClientId(),
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
          client_message_id: userMessage.id,
        },
        idToken,
      );

      // Atualizar conversation_id
      if (
        response.conversation_id &&
        response.conversation_id !== 'new' &&
        response.conversation_id !== conversationId
      ) {
        navigate(`/chat/${encodeURIComponent(response.conversation_id)}`, { replace: true });
      }

      // Criar mensagem do tutor
      const tutorMessage: Message = {
        id: createClientId(),
        role: 'tutor',
        content: response.response,
        examples: response.examples,
        timestamp: new Date(),
        isModerated: response.moderated,
        warning: response.warning,
      };

      setMessages((prev) => [...prev, tutorMessage]);
      void loadConversations();
    } catch (error) {
      console.error('[Chat] Erro ao enviar mensagem:', error);
      setError(
        apiErrorMessage(error, 'Não foi possível obter a resposta do tutor.'),
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
    if (
      !conversationId &&
      messages.length === 0 &&
      conversationStatus === 'active' &&
      !conversationSearch
    ) return;

    if (messages.length > 0) {
      setPendingConfirmation({ type: 'new-conversation' });
      return;
    }
    resetToNewConversation();
  };

  const resetToNewConversation = () => {
    setMessages([]);
    setError(null);
    navigate('/chat');
    setConversationStatus('active');
    setConversationSearch('');
    setIsSidebarOpen(false);
    inputRef.current?.focus();
  };

  const selectConversation = (id: string) => {
    navigate(`/chat/${encodeURIComponent(id)}`);
    setIsSidebarOpen(false);
  };

  const requestArchiveConversation = (conversation: ConversationSummary) => {
    setPendingConfirmation({ type: 'archive-conversation', conversation });
  };

  const requestRenameConversation = (conversation: ConversationSummary) => {
    setRenamingConversation(conversation);
    setConversationTitle(conversation.title);
  };

  const renameConversation = async () => {
    const title = conversationTitle.trim();
    if (!user || !renamingConversation || !title || isRenaming) return;

    setIsRenaming(true);
    try {
      const idToken = await user.getIdToken();
      const updated = await updateConversation(renamingConversation.id, { title }, idToken);
      setConversations((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setRenamingConversation(null);
      setConversationTitle('');
      setToast({ type: 'success', message: 'Conversa renomeada com sucesso.' });
    } catch (error) {
      console.error('[Chat] Erro ao renomear conversa:', error);
      setToast({
        type: 'error',
        message: apiErrorMessage(error, 'Não foi possível renomear a conversa.'),
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const archiveConversation = async (conversation: ConversationSummary) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await archiveConversationApi(conversation.id, idToken);
      setConversations((items) => items.filter((item) => item.id !== conversation.id));
      if (conversation.id === conversationId) {
        setMessages([]);
        navigate('/chat');
      }
      setToast({ type: 'success', message: 'Conversa arquivada com sucesso.' });
    } catch (error) {
      console.error('[Chat] Erro ao arquivar conversa:', error);
      setConversationListError(
        apiErrorMessage(error, 'Não foi possível arquivar a conversa.'),
      );
      setToast({ type: 'error', message: 'Não foi possível arquivar a conversa.' });
    }
  };

  const restoreConversation = async (conversation: ConversationSummary) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await updateConversation(conversation.id, { status: 'active' }, idToken);
      setConversations((items) => items.filter((item) => item.id !== conversation.id));
      setToast({ type: 'success', message: 'Conversa restaurada para a lista de ativas.' });
    } catch (error) {
      console.error('[Chat] Erro ao restaurar conversa:', error);
      setConversationListError(
        apiErrorMessage(error, 'Não foi possível restaurar a conversa.'),
      );
      setToast({ type: 'error', message: 'Não foi possível restaurar a conversa.' });
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingConfirmation) return;
    if (pendingConfirmation.type === 'new-conversation') {
      resetToNewConversation();
      setPendingConfirmation(null);
      return;
    }

    setIsConfirming(true);
    await archiveConversation(pendingConfirmation.conversation);
    setIsConfirming(false);
    setPendingConfirmation(null);
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
            className="text-sm font-medium text-tutor hover:text-tutor-dark transition lg:hidden"
            disabled={messages.length === 0}
          >
            + Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="text-sm font-medium text-graphite-soft hover:text-graphite lg:hidden"
          >
            Histórico
          </button>
          <button
            onClick={() => navigate('/pergunta')}
            className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
          >
            Exercícios
          </button>
          <button
            onClick={() => navigate('/progresso')}
            className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
          >
            Meu progresso
          </button>
          <button
            onClick={() => navigate('/perfil')}
            className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
          >
            Meu perfil
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

      <div className="flex min-h-0 flex-1">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          isLoading={isLoadingConversations}
          error={conversationListError}
          isOpen={isSidebarOpen}
          statusFilter={conversationStatus}
          search={conversationSearch}
          onClose={() => setIsSidebarOpen(false)}
          onStatusFilterChange={setConversationStatus}
          onSearchChange={setConversationSearch}
          onNewConversation={startNewConversation}
          onSelectConversation={selectConversation}
          onRenameConversation={requestRenameConversation}
          onArchiveConversation={requestArchiveConversation}
          onRestoreConversation={restoreConversation}
          hasMore={Boolean(conversationCursor)}
          onLoadMore={() => void loadConversations(conversationCursor ?? undefined)}
        />

      {/* Área principal de chat */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {isLoadingHistory && (
            <div className="py-12 text-center">
              <span className="font-mono text-sm text-graphite-soft">
                carregando conversa...
              </span>
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
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

          {!isLoadingHistory && messageCursor && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => void loadOlderMessages()}
                disabled={isLoadingOlderMessages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-tutor hover:border-tutor disabled:opacity-50"
              >
                {isLoadingOlderMessages ? 'Carregando...' : 'Carregar mensagens anteriores'}
              </button>
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
                  disabled={isLoading || isLoadingHistory}
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
                disabled={!input.trim() || isLoading || isLoadingHistory}
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

      <ConfirmDialog
        open={pendingConfirmation !== null}
        title={
          pendingConfirmation?.type === 'archive-conversation'
            ? 'Arquivar conversa?'
            : 'Iniciar nova conversa?'
        }
        description={
          pendingConfirmation?.type === 'archive-conversation'
            ? `“${pendingConfirmation.conversation.title || 'Nova conversa'}” será movida para a aba Arquivadas e poderá ser restaurada depois.`
            : 'A conversa atual continuará salva no histórico e poderá ser retomada quando quiser.'
        }
        confirmLabel={
          pendingConfirmation?.type === 'archive-conversation' ? 'Arquivar' : 'Nova conversa'
        }
        tone={pendingConfirmation?.type === 'archive-conversation' ? 'danger' : 'primary'}
        loading={isConfirming}
        onCancel={() => {
          if (!isConfirming) setPendingConfirmation(null);
        }}
        onConfirm={() => void confirmPendingAction()}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <RenameConversationDialog
        open={renamingConversation !== null}
        value={conversationTitle}
        loading={isRenaming}
        onChange={setConversationTitle}
        onCancel={() => {
          if (!isRenaming) {
            setRenamingConversation(null);
            setConversationTitle('');
          }
        }}
        onConfirm={() => void renameConversation()}
      />
    </div>
  );
}

function toUiMessage(message: ConversationMessage): Message {
  const parsedTimestamp = message.created_at ? new Date(message.created_at) : new Date();
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'tutor' : 'user',
    content: message.content,
    examples: message.examples,
    timestamp: Number.isNaN(parsedTimestamp.getTime()) ? new Date() : parsedTimestamp,
    isModerated: message.moderated,
    warning: message.warning ?? undefined,
  };
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

function mergeById<T extends { id: string }>(first: T[], second: T[]): T[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
