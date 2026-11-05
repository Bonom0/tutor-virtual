import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { getUsuario } from '../firebase/firestore';

export default function RotaPerfilCompleto({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<'carregando' | 'completo' | 'incompleto' | 'erro'>(
    'carregando',
  );

  useEffect(() => {
    let ativo = true;

    async function verificarPerfil() {
      if (!user) return;
      setStatus('carregando');
      try {
        const usuario = await getUsuario(user.uid);
        if (ativo) {
          setStatus(
            usuario?.onboardingConcluido && usuario.perfilPedagogico
              ? 'completo'
              : 'incompleto',
          );
        }
      } catch (error) {
        console.error('[RotaPerfilCompleto] erro ao carregar perfil:', error);
        if (ativo) setStatus('erro');
      }
    }

    verificarPerfil();
    return () => {
      ativo = false;
    };
  }, [user]);

  if (status === 'carregando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <span className="font-mono text-sm text-graphite-soft">carregando perfil...</span>
      </div>
    );
  }

  if (status === 'incompleto') {
    return <Navigate to="/onboarding" replace />;
  }

  if (status === 'erro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk px-6 text-center">
        <div>
          <p className="font-medium text-marker">Não foi possível carregar seu perfil.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-tutor hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

