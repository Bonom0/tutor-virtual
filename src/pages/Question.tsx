import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { listarTopicos, listarQuestoesPorTopico } from '../firebase/firestore';
import type { Questao } from '../types/firestore';

interface Annotation {
  line: number;
  text: string;
  tone: 'hint' | 'correct';
}

type QuestaoComId = Questao & { id: string };

export default function Question() {
  const [questao, setQuestao] = useState<QuestaoComId | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [checking, setChecking] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function carregarQuestao() {
      setCarregando(true);
      setErroCarregamento(null);
      try {
        const topicos = await listarTopicos();
        if (topicos.length === 0) {
          setErroCarregamento(
            'Nenhum topico encontrado no Firestore. Crie um documento na colecao "topicos" para comecar.',
          );
          return;
        }

        const primeiroTopico = topicos[0];
        const questoes = await listarQuestoesPorTopico(primeiroTopico.id);
        if (questoes.length === 0) {
          setErroCarregamento(
            `Nenhuma questao encontrada para o topico "${primeiroTopico.nome}". Crie um documento na colecao "questoes" com topicoId = "${primeiroTopico.id}".`,
          );
          return;
        }

        const primeiraQuestao = questoes[0] as QuestaoComId;
        setQuestao(primeiraQuestao);
        setCode(primeiraQuestao.codigoInicial);
      } catch (err) {
        console.error('[Question] erro ao carregar questao do Firestore:', err);
        setErroCarregamento('Erro ao carregar dados do Firestore. Veja o console (F12) para detalhes.');
      } finally {
        setCarregando(false);
      }
    }

    carregarQuestao();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCheck = async () => {
    setChecking(true);
    // TODO: substituir por chamada real ao backend (FastAPI + LLM) que avalia o codigo
    // e retorna anotacoes de verdade. Por enquanto, mostra a dica cadastrada na questao.
    await new Promise((r) => setTimeout(r, 700));
    setAnnotations([
      { line: 2, text: questao?.dica ?? 'continue tentando!', tone: 'hint' },
    ]);
    setChecking(false);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-chalk flex items-center justify-center">
        <span className="font-mono text-sm text-graphite-soft">carregando questao...</span>
      </div>
    );
  }

  if (erroCarregamento || !questao) {
    return (
      <div className="min-h-screen bg-chalk flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-marker font-medium max-w-md">{erroCarregamento}</p>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-graphite-soft hover:text-graphite transition"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <span className="font-display font-semibold text-lg text-graphite">
          tutor<span className="text-tutor">.</span>virtual
        </span>
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

      <main className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 p-6 max-w-6xl mx-auto w-full">
        {/* Enunciado */}
        <section className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-tutor bg-tutor/10 px-2.5 py-1 rounded-full">
            Exercicio adaptativo
          </span>
          <h1 className="font-display font-semibold text-2xl text-graphite">
            {questao.titulo}
          </h1>
          <p className="text-graphite-soft leading-relaxed">{questao.enunciado}</p>

          <button
            onClick={handleCheck}
            disabled={checking}
            className="mt-2 w-fit bg-tutor hover:bg-tutor-dark disabled:opacity-60
                       text-white font-medium text-sm rounded-lg px-5 py-2.5 transition"
          >
            {checking ? 'Analisando...' : 'Verificar resposta'}
          </button>
        </section>

        {/* Editor com anotacoes na margem (elemento de assinatura) */}
        <section className="bg-slate rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-line">
            <span className="w-2.5 h-2.5 rounded-full bg-marker/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-progress/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-tutor/70" />
            <span className="ml-2 text-xs font-mono text-graphite-soft">
              solucao.{questao.linguagem === 'javascript' ? 'js' : questao.linguagem}
            </span>
          </div>

          <div className="flex-1 flex">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-transparent text-chalk font-mono text-sm leading-7
                         p-4 resize-none focus:outline-none min-h-[240px]"
            />
          </div>

          {annotations.length > 0 && (
            <div className="border-t border-slate-line p-4 space-y-2">
              {annotations.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-mono text-graphite-soft text-xs mt-0.5">
                    L{a.line}
                  </span>
                  <span className="annotation-thread w-4 mt-2.5" />
                  <span className={a.tone === 'correct' ? 'text-progress' : 'text-marker'}>
                    {a.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
