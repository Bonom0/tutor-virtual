import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import {
  initializeProfile,
  updateProfile,
  type PedagogicalProfile,
  type ProfileLanguage,
} from '../services/api';
import type {
  NivelProgramacao,
  ObjetivoAprendizado,
  PerfilPedagogico as PerfilPedagogicoData,
} from '../types/profile';

interface Option<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

const NIVEIS: Option<NivelProgramacao>[] = [
  { value: 'nenhum', label: 'Nunca programei', description: 'Quero começar pelos fundamentos.' },
  { value: 'iniciante', label: 'Iniciante', description: 'Conheço conceitos básicos e estou praticando.' },
  { value: 'intermediario', label: 'Intermediário', description: 'Já desenvolvo pequenos projetos.' },
  { value: 'avancado', label: 'Avançado', description: 'Tenho experiência prática e quero aprofundar.' },
];

const LINGUAGENS: Option<ProfileLanguage>[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
];

const AREAS: Option[] = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'mobile', label: 'Desenvolvimento mobile' },
  { value: 'dados', label: 'Ciência e análise de dados' },
  { value: 'ia', label: 'Inteligência artificial' },
  { value: 'jogos', label: 'Jogos' },
  { value: 'seguranca', label: 'Segurança da informação' },
  { value: 'devops', label: 'Cloud / DevOps' },
  { value: 'automacao', label: 'Automação' },
  { value: 'fundamentos', label: 'Fundamentos de programação' },
  { value: 'explorando', label: 'Ainda estou explorando' },
];

const OBJETIVOS: Option<ObjetivoAprendizado>[] = [
  { value: 'aprender_do_zero', label: 'Aprender programação do zero' },
  { value: 'acompanhar_estudos', label: 'Acompanhar a faculdade ou um curso' },
  { value: 'desenvolver_projetos', label: 'Desenvolver projetos próprios' },
  { value: 'entrar_no_mercado', label: 'Preparar-me para o mercado' },
  { value: 'resolver_duvidas_trabalho', label: 'Resolver dúvidas do trabalho' },
  { value: 'preparar_entrevistas', label: 'Preparar-me para entrevistas' },
];

const PERFIL_INICIAL: PerfilPedagogicoData = {
  nivelAutodeclarado: 'iniciante',
  linguagemPreferida: 'javascript',
  linguagensInteresse: [],
  areasInteresse: [],
  objetivoPrincipal: 'acompanhar_estudos',
};

export default function PerfilPedagogico({ modo }: { modo: 'onboarding' | 'edicao' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(0);
  const [perfil, setPerfil] = useState<PerfilPedagogicoData>(PERFIL_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken()
      .then((idToken) => initializeProfile(idToken))
      .then((usuario) => {
        if (modo === 'onboarding' && usuario.onboarding_completed) {
          navigate('/chat', { replace: true });
          return;
        }
        if (usuario.profile) setPerfil(toLocalProfile(usuario.profile));
      })
      .catch((error) => {
        console.error('[PerfilPedagogico] erro ao carregar perfil:', error);
        setErro('Não foi possível carregar seu perfil.');
      })
      .finally(() => setCarregando(false));
  }, [modo, navigate, user]);

  const podeAvancar = useMemo(() => {
    if (etapa === 0) return Boolean(perfil.nivelAutodeclarado);
    if (etapa === 1) {
      return (
        perfil.linguagensInteresse.length > 0 &&
        perfil.linguagensInteresse.includes(perfil.linguagemPreferida)
      );
    }
    return perfil.areasInteresse.length > 0 && Boolean(perfil.objetivoPrincipal);
  }, [etapa, perfil]);

  const alternarSelecao = (campo: 'linguagensInteresse' | 'areasInteresse', value: string) => {
    setPerfil((atual) => {
      const selecionados = atual[campo];
      const proximos = selecionados.includes(value)
        ? selecionados.filter((item) => item !== value)
        : [...selecionados, value];

      if (campo === 'linguagensInteresse') {
        const preferida = proximos.includes(atual.linguagemPreferida)
          ? atual.linguagemPreferida
          : proximos[0] ?? '';
        return { ...atual, linguagensInteresse: proximos, linguagemPreferida: preferida };
      }
      return { ...atual, areasInteresse: proximos };
    });
  };

  const salvar = async () => {
    if (!user || !podeAvancar) return;
    setSalvando(true);
    setErro(null);
    try {
      const idToken = await user.getIdToken();
      await updateProfile(toApiProfile(perfil), idToken);
      navigate('/chat', { replace: true });
    } catch (error) {
      console.error('[PerfilPedagogico] erro ao salvar perfil:', error);
      setErro('Não foi possível salvar suas preferências. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div className="min-h-screen bg-chalk flex items-center justify-center">Carregando perfil...</div>;
  }

  return (
    <div className="min-h-screen bg-chalk">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <span className="font-display font-semibold text-lg text-graphite">
          tutor<span className="text-tutor">.</span>virtual
        </span>
        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="text-sm font-medium text-graphite-soft hover:text-graphite"
        >
          Sair
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between text-xs font-medium text-graphite-soft">
            <span>{modo === 'onboarding' ? 'Seu perfil de aprendizagem' : 'Editar perfil'}</span>
            <span>Etapa {etapa + 1} de 3</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-tutor transition-all"
              style={{ width: `${((etapa + 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {etapa === 0 && (
            <Step
              title="Qual é o seu nível atual?"
              description="Isso ajuda o tutor a escolher a profundidade das explicações."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {NIVEIS.map((option) => (
                  <ChoiceButton
                    key={option.value}
                    selected={perfil.nivelAutodeclarado === option.value}
                    label={option.label}
                    description={option.description}
                    onClick={() => setPerfil((p) => ({ ...p, nivelAutodeclarado: option.value }))}
                  />
                ))}
              </div>
            </Step>
          )}

          {etapa === 1 && (
            <Step
              title="Quais linguagens despertam seu interesse?"
              description="Selecione uma ou mais e escolha a principal para os exemplos."
            >
              <div className="flex flex-wrap gap-2">
                {LINGUAGENS.map((option) => (
                  <TagButton
                    key={option.value}
                    selected={perfil.linguagensInteresse.includes(option.value)}
                    onClick={() => alternarSelecao('linguagensInteresse', option.value)}
                  >
                    {option.label}
                  </TagButton>
                ))}
              </div>
              {perfil.linguagensInteresse.length > 0 && (
                <div className="mt-6">
                  <label htmlFor="linguagem-preferida" className="mb-2 block text-sm font-medium text-graphite">
                    Linguagem principal para os exemplos
                  </label>
                  <select
                    id="linguagem-preferida"
                    value={perfil.linguagemPreferida}
                    onChange={(event) => setPerfil((p) => ({ ...p, linguagemPreferida: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-tutor focus:outline-none focus:ring-2 focus:ring-tutor"
                  >
                    {LINGUAGENS.filter((option) => perfil.linguagensInteresse.includes(option.value)).map(
                      (option) => <option key={option.value} value={option.value}>{option.label}</option>,
                    )}
                  </select>
                </div>
              )}
            </Step>
          )}

          {etapa === 2 && (
            <Step
              title="Onde você quer chegar?"
              description="Escolha áreas de interesse e seu objetivo principal."
            >
              <p className="mb-3 text-sm font-medium text-graphite">Áreas de interesse</p>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((option) => (
                  <TagButton
                    key={option.value}
                    selected={perfil.areasInteresse.includes(option.value)}
                    onClick={() => alternarSelecao('areasInteresse', option.value)}
                  >
                    {option.label}
                  </TagButton>
                ))}
              </div>
              <div className="mt-6">
                <label htmlFor="objetivo" className="mb-2 block text-sm font-medium text-graphite">
                  Objetivo principal
                </label>
                <select
                  id="objetivo"
                  value={perfil.objetivoPrincipal}
                  onChange={(event) => setPerfil((p) => ({
                    ...p,
                    objetivoPrincipal: event.target.value as ObjetivoAprendizado,
                  }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-tutor focus:outline-none focus:ring-2 focus:ring-tutor"
                >
                  {OBJETIVOS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </Step>
          )}

          {erro && <p role="alert" className="mt-6 rounded-lg border border-marker/30 bg-marker/10 px-3 py-2 text-sm text-marker">{erro}</p>}

          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => etapa === 0 ? navigate('/chat') : setEtapa((e) => e - 1)}
              className={`text-sm font-medium text-graphite-soft hover:text-graphite ${
                etapa === 0 && modo === 'onboarding' ? 'invisible' : ''
              }`}
            >
              {etapa === 0 ? 'Cancelar' : 'Voltar'}
            </button>
            {etapa < 2 ? (
              <button
                type="button"
                disabled={!podeAvancar}
                onClick={() => setEtapa((e) => e + 1)}
                className="rounded-lg bg-tutor px-5 py-2.5 text-sm font-medium text-white hover:bg-tutor-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                disabled={!podeAvancar || salvando}
                onClick={salvar}
                className="rounded-lg bg-tutor px-5 py-2.5 text-sm font-medium text-white hover:bg-tutor-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar perfil'}
              </button>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-relaxed text-graphite-soft">
          Você poderá alterar estas preferências quando quiser. Não coletamos dados pessoais além dos necessários para personalizar o aprendizado.
        </p>
      </main>
    </div>
  );
}

function toApiProfile(perfil: PerfilPedagogicoData): PedagogicalProfile {
  return {
    level: perfil.nivelAutodeclarado,
    preferred_language: perfil.linguagemPreferida as ProfileLanguage,
    programming_languages: perfil.linguagensInteresse as ProfileLanguage[],
    interests: perfil.areasInteresse,
    learning_goal: perfil.objetivoPrincipal,
  };
}

function toLocalProfile(perfil: PedagogicalProfile): PerfilPedagogicoData {
  return {
    nivelAutodeclarado: perfil.level as NivelProgramacao,
    linguagemPreferida: perfil.preferred_language,
    linguagensInteresse: perfil.programming_languages,
    areasInteresse: perfil.interests,
    objetivoPrincipal: (perfil.learning_goal ?? 'acompanhar_estudos') as ObjetivoAprendizado,
  };
}

function Step({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-graphite">{title}</h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-graphite-soft">{description}</p>
      {children}
    </div>
  );
}

function ChoiceButton({ selected, label, description, onClick }: { selected: boolean; label: string; description?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected ? 'border-tutor bg-tutor/10 ring-1 ring-tutor' : 'border-gray-200 hover:border-tutor/50'
      }`}
    >
      <span className="block text-sm font-semibold text-graphite">{label}</span>
      {description && <span className="mt-1 block text-xs leading-relaxed text-graphite-soft">{description}</span>}
    </button>
  );
}

function TagButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
        selected ? 'border-tutor bg-tutor text-white' : 'border-gray-300 bg-white text-graphite hover:border-tutor'
      }`}
    >
      {children}
    </button>
  );
}

