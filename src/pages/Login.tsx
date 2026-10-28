import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      navigate('/chat');
    } catch (err) {
      console.error('[Login] erro no login/cadastro por email:', err);
      setError(traduzErro(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate('/chat');
    } catch (err) {
      console.error('[Login] erro no login com Google:', err);
      setError(traduzErro(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-chalk">
      {/* Painel esquerdo - elemento de assinatura: tutor anotando codigo na margem */}
      <div className="hidden lg:flex flex-col justify-between bg-slate text-chalk p-12 relative overflow-hidden">
        <div>
          <span className="font-display font-semibold text-xl tracking-tight">
            tutor<span className="text-tutor">.</span>virtual
          </span>
        </div>

        <div className="font-mono text-sm leading-relaxed relative">
          <CodeWithAnnotations />
        </div>

        <p className="font-body text-graphite-soft text-sm max-w-sm">
          Um tutor que le seu codigo e comenta na margem, como um professor de verdade.
        </p>
      </div>

      {/* Painel direito - formulario */}
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 font-display font-semibold text-xl text-graphite">
            tutor<span className="text-tutor">.</span>virtual
          </div>

          <h1 className="font-display font-semibold text-2xl text-graphite mb-1">
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </h1>
          <p className="text-graphite-soft text-sm mb-8">
            {mode === 'signin'
              ? 'Continue de onde parou.'
              : 'Comece a praticar com seu tutor de programacao.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-graphite mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-tutor focus:border-tutor
                           transition"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-graphite mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-tutor focus:border-tutor
                           transition"
                placeholder="Minimo 6 caracteres"
              />
            </div>

            {error && (
              <p className="text-sm text-marker bg-marker/10 border border-marker/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-tutor hover:bg-tutor-dark disabled:opacity-60
                         text-white font-medium text-sm rounded-lg py-2.5 transition"
            >
              {submitting ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-graphite-soft">ou</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 border border-gray-300
                       rounded-lg py-2.5 text-sm font-medium text-graphite hover:bg-gray-50
                       disabled:opacity-60 transition"
          >
            <GoogleIcon />
            Continuar com Google
          </button>

          <p className="text-center text-sm text-graphite-soft mt-8">
            {mode === 'signin' ? 'Ainda nao tem conta?' : 'Ja tem uma conta?'}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-tutor font-medium hover:underline"
            >
              {mode === 'signin' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function traduzErro(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Este email ja esta cadastrado.',
    'auth/invalid-email': 'Email invalido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/user-not-found': 'Email ou senha incorretos.',
    'auth/wrong-password': 'Email ou senha incorretos.',
    'auth/invalid-credential': 'Email ou senha incorretos.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/unauthorized-domain': 'Este dominio nao esta autorizado no Firebase (Authentication > Settings > Authorized domains).',
    'auth/popup-blocked': 'O navegador bloqueou o popup de login. Permita popups para este site.',
    'auth/operation-not-allowed': 'O provedor Google nao esta ativado no Firebase (Authentication > Sign-in method).',
  };
  return map[code] ?? `Ocorreu um erro${code ? ` (${code})` : ''}. Veja o console (F12) para detalhes.`;
}

function CodeWithAnnotations() {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 items-start">
      <span className="text-graphite-soft">function <span className="text-tutor">soma</span>(a, b) {'{'}</span>
      <span />
      <span className="pl-4">return a + b</span>
      <span className="annotation-thread self-center w-8" />
      <span className="text-graphite-soft">{'}'}</span>
      <span className="text-marker text-xs -mt-1">
        // dica: e se a ou b nao forem numeros?
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.64 14.2 17.64 11.9 17.64 9.2z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.96a9 9 0 0 0 0 8.06l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
