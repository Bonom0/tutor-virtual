import { useEffect, useRef } from 'react';

interface RenameConversationDialogProps {
  open: boolean;
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RenameConversationDialog({
  open,
  value,
  loading = false,
  onChange,
  onConfirm,
  onCancel,
}: RenameConversationDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  const title = value.trim();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate/55 px-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-conversation-title"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (title && !loading) onConfirm();
        }}
      >
        <h2 id="rename-conversation-title" className="font-display text-lg font-semibold text-graphite">
          Renomear conversa
        </h2>
        <label className="mt-4 block text-sm font-medium text-graphite" htmlFor="conversation-title">
          Título
        </label>
        <input
          ref={inputRef}
          id="conversation-title"
          value={value}
          maxLength={60}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-graphite outline-none transition focus:border-tutor focus:ring-2 focus:ring-tutor/20 disabled:opacity-60"
        />
        <p className="mt-1 text-right text-xs text-graphite-soft">{value.length}/60</p>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-graphite transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !title}
            className="rounded-lg bg-tutor px-4 py-2.5 text-sm font-medium text-white transition hover:bg-tutor-dark disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
