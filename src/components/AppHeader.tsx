export function AppHeader({
  email,
  onNavigate,
  onLogout,
  current,
}: {
  email?: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  current?: 'exercise' | 'progress';
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
      <button type="button" onClick={() => onNavigate('/chat')} className="font-display text-lg font-semibold text-graphite">
        tutor<span className="text-tutor">.</span>virtual
      </button>
      <nav className="hidden items-center gap-4 md:flex" aria-label="Navegação principal">
        <NavigationButtons current={current} email={email} onNavigate={onNavigate} onLogout={onLogout} />
      </nav>
      <details className="relative md:hidden">
        <summary className="cursor-pointer list-none rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-graphite">
          Menu
        </summary>
        <nav className="absolute right-0 z-50 mt-2 flex w-52 flex-col items-stretch gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-xl" aria-label="Navegação móvel">
          <NavigationButtons current={current} email={email} onNavigate={onNavigate} onLogout={onLogout} mobile />
        </nav>
      </details>
    </header>
  );
}

function NavigationButtons({
  current,
  email,
  onNavigate,
  onLogout,
  mobile = false,
}: {
  current?: 'exercise' | 'progress';
  email?: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  mobile?: boolean;
}) {
  const base = mobile ? 'rounded-lg px-3 py-2 text-left text-sm font-medium' : 'text-sm font-medium';
  return (
    <>
      <button type="button" onClick={() => onNavigate('/pergunta')} className={base + (current === 'exercise' ? ' text-tutor' : ' text-graphite-soft hover:text-graphite')}>Exercícios</button>
      <button type="button" onClick={() => onNavigate('/progresso')} className={base + (current === 'progress' ? ' text-tutor' : ' text-graphite-soft hover:text-graphite')}>Meu progresso</button>
      <button type="button" onClick={() => onNavigate('/chat')} className={base + ' text-graphite-soft hover:text-graphite'}>Tirar dúvidas</button>
      <button type="button" onClick={() => onNavigate('/perfil')} className={base + ' text-graphite-soft hover:text-graphite'}>Meu perfil</button>
      {email && <span className={mobile ? 'truncate px-3 py-2 text-xs text-graphite-soft' : 'hidden text-sm text-graphite-soft lg:inline'}>{email}</span>}
      <button type="button" onClick={onLogout} className={base + ' text-graphite-soft hover:text-graphite'}>Sair</button>
    </>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-chalk">
      <span className="font-mono text-sm text-graphite-soft">{label}</span>
    </div>
  );
}
