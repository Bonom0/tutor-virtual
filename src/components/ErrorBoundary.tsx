import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryState {
  failed: boolean;
}

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] erro inesperado:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-chalk px-6 text-center">
          <p className="font-display text-xl font-semibold text-graphite">
            Não foi possível exibir esta página
          </p>
          <p className="max-w-md text-sm text-graphite-soft">
            Ocorreu um erro inesperado. Recarregue a aplicação para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-tutor px-4 py-2.5 text-sm font-medium text-white hover:bg-tutor-dark"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
