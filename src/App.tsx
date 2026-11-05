import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import RotaProtegida from './components/RotaProtegida';
import RotaPerfilCompleto from './components/RotaPerfilCompleto';

const Login = lazy(() => import('./pages/Login'));
const Chat = lazy(() => import('./pages/Chat'));
const Question = lazy(() => import('./pages/Question'));
const PerfilPedagogico = lazy(() => import('./pages/PerfilPedagogico'));
const Progress = lazy(() => import('./pages/Progress'));
const TopicProgress = lazy(() => import('./pages/TopicProgress'));

function ComPerfil({ children }: { children: ReactNode }) {
  return (
    <RotaProtegida>
      <RotaPerfilCompleto>{children}</RotaPerfilCompleto>
    </RotaProtegida>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-chalk">
                <span className="font-mono text-sm text-graphite-soft">carregando página...</span>
              </div>
            }
          >
            <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <RotaProtegida>
                <PerfilPedagogico modo="onboarding" />
              </RotaProtegida>
            }
          />
          <Route
            path="/perfil"
            element={
              <ComPerfil>
                <PerfilPedagogico modo="edicao" />
              </ComPerfil>
            }
          />
          <Route
            path="/chat/:conversationId?"
            element={
              <ComPerfil>
                <Chat />
              </ComPerfil>
            }
          />
          <Route
            path="/pergunta"
            element={
              <ComPerfil>
                <Question />
              </ComPerfil>
            }
          />
          <Route
            path="/progresso"
            element={
              <ComPerfil>
                <Progress />
              </ComPerfil>
            }
          />
          <Route
            path="/progresso/:topicId"
            element={
              <ComPerfil>
                <TopicProgress />
              </ComPerfil>
            }
          />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
