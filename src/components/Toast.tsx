import { useEffect } from 'react';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Toast({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timeout);
  }, [onClose, toast]);

  if (!toast) return null;

  const colors = {
    success: 'border-progress/40 bg-white text-graphite',
    error: 'border-marker/40 bg-white text-graphite',
    info: 'border-tutor/40 bg-white text-graphite',
  };

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${colors[toast.type]}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          toast.type === 'success'
            ? 'bg-progress'
            : toast.type === 'error'
              ? 'bg-marker'
              : 'bg-tutor'
        }`}
        aria-hidden="true"
      >
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}
      </span>
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded px-1 text-graphite-soft hover:bg-gray-100 hover:text-graphite"
        aria-label="Fechar aviso"
      >
        ×
      </button>
    </div>
  );
}

