import type { ConversationSummary } from '../services/api';

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  statusFilter: 'active' | 'archived';
  search: string;
  onClose: () => void;
  onStatusFilterChange: (status: 'active' | 'archived') => void;
  onSearchChange: (search: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversation: ConversationSummary) => void;
  onArchiveConversation: (conversation: ConversationSummary) => void;
  onRestoreConversation: (conversation: ConversationSummary) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  isLoading,
  error,
  isOpen,
  statusFilter,
  search,
  onClose,
  onStatusFilterChange,
  onSearchChange,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onArchiveConversation,
  onRestoreConversation,
  hasMore,
  onLoadMore,
}: ConversationSidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar histórico"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate/40 lg:hidden"
        />
      )}

      <aside
        aria-label="Histórico de conversas"
        className={`${
          isOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'
        } w-[min(82vw,20rem)] flex-col border-r border-gray-200 bg-white lg:static lg:z-auto lg:flex lg:w-72 lg:flex-shrink-0`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-soft">
              Histórico
            </p>
            <p className="mt-0.5 text-sm font-semibold text-graphite">Suas conversas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-graphite-soft hover:bg-gray-100 hover:text-graphite lg:hidden"
            aria-label="Fechar histórico"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={onNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-tutor px-4 py-2.5 text-sm font-medium text-white transition hover:bg-tutor-dark"
          >
            <span aria-hidden="true">+</span>
            Nova conversa
          </button>

          <div className="mt-3 grid grid-cols-2 rounded-lg bg-gray-100 p-1" role="tablist">
            {(['active', 'archived'] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={statusFilter === status}
                onClick={() => onStatusFilterChange(status)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  statusFilter === status
                    ? 'bg-white text-graphite shadow-sm'
                    : 'text-graphite-soft hover:text-graphite'
                }`}
              >
                {status === 'active' ? 'Ativas' : 'Arquivadas'}
              </button>
            ))}
          </div>

          <label className="relative mt-3 block">
            <span className="sr-only">Pesquisar conversas pelo título</span>
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Pesquisar por título..."
              maxLength={60}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-graphite outline-none transition placeholder:text-graphite-soft focus:border-tutor focus:ring-2 focus:ring-tutor/20"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {isLoading && (
            <p className="px-3 py-6 text-center font-mono text-xs text-graphite-soft">
              carregando histórico...
            </p>
          )}

          {!isLoading && error && (
            <p className="mx-2 my-3 rounded-lg border border-marker/30 bg-marker/10 px-3 py-2 text-xs leading-relaxed text-marker">
              {error}
            </p>
          )}

          {!isLoading && !error && conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-xs leading-relaxed text-graphite-soft">
              {search.trim()
                ? 'Nenhuma conversa encontrada com esse título.'
                : statusFilter === 'archived'
                  ? 'Você ainda não arquivou nenhuma conversa.'
                  : 'Suas conversas aparecerão aqui depois da primeira pergunta.'}
            </p>
          )}

          {!isLoading && conversations.length > 0 && (
            <>
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const selected = conversation.id === activeConversationId;
                return (
                  <li
                    key={conversation.id}
                    className={`group flex items-center gap-1 rounded-lg transition ${
                      selected ? 'bg-tutor/10' : 'hover:bg-gray-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      aria-current={selected ? 'page' : undefined}
                    >
                      <span
                        className={`block truncate text-sm font-medium ${
                          selected ? 'text-tutor-dark' : 'text-graphite'
                        }`}
                      >
                        {conversation.title || 'Nova conversa'}
                      </span>
                      <span className="mt-0.5 block text-xs text-graphite-soft">
                        {formatConversationDate(
                          conversation.last_message_at ?? conversation.updated_at,
                        )}
                      </span>
                    </button>
                    {statusFilter === 'active' && (
                      <button
                        type="button"
                        onClick={() => onRenameConversation(conversation)}
                        className="rounded p-2 text-graphite-soft opacity-70 transition hover:bg-tutor/10 hover:text-tutor lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                        aria-label={`Renomear ${conversation.title || 'conversa'}`}
                        title="Renomear conversa"
                      >
                        <RenameIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        statusFilter === 'archived'
                          ? onRestoreConversation(conversation)
                          : onArchiveConversation(conversation)
                      }
                      className={`mr-1 rounded p-2 opacity-70 transition lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 ${
                        statusFilter === 'archived'
                          ? 'text-graphite-soft hover:bg-tutor/10 hover:text-tutor'
                          : 'text-graphite-soft hover:bg-marker/10 hover:text-marker'
                      }`}
                      aria-label={`${
                        statusFilter === 'archived' ? 'Restaurar' : 'Arquivar'
                      } ${conversation.title || 'conversa'}`}
                      title={statusFilter === 'archived' ? 'Restaurar conversa' : 'Arquivar conversa'}
                    >
                      {statusFilter === 'archived' ? <RestoreIcon /> : <ArchiveIcon />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-tutor hover:border-tutor"
              >
                Carregar mais conversas
              </button>
            )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function formatConversationDate(value: string | null): string {
  if (!value) return 'Agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M5 7l1 13h12l1-13M9 11h6M3 3h18v4H3V3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4v6h6M5.5 9a8 8 0 1 1-1 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16 4 20ZM14.8 6.4l2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite-soft"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

