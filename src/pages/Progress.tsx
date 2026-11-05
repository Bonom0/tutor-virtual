import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast, { type ToastMessage } from '../components/Toast';
import { AppHeader, LoadingScreen } from '../components/AppHeader';
import { useAuth } from '../context/auth';
import {
  apiErrorMessage,
  getGeneralProgress,
  listAttempts,
  type AttemptHistoryItem,
  type GeneralProgress,
} from '../services/api';
import { formatLevel, formatPercentage } from '../utils/format';

export default function Progress() {
  const [progress, setProgress] = useState<GeneralProgress | null>(null);
  const [attempts, setAttempts] = useState<AttemptHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [topicFilter, setTopicFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const closeToast = useCallback(() => setToast(null), []);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const [progressData, attemptData] = await Promise.all([
        getGeneralProgress(token),
        listAttempts(token, { limit: 10 }),
      ]);
      setProgress(progressData);
      setAttempts(attemptData.items);
      setNextCursor(attemptData.next_cursor);
    } catch (loadError) {
      console.error('[Progress] erro ao carregar progresso:', loadError);
      setError(getErrorMessage(loadError, 'Não foi possível carregar seu progresso.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadMore = async () => {
    if (!user || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const data = await listAttempts(token, {
        limit: 10,
        cursor: nextCursor,
        topicId: topicFilter || undefined,
        language: languageFilter || undefined,
        correct: resultFilter === 'all' ? undefined : resultFilter === 'correct',
      });
      setAttempts((current) => [...current, ...data.items]);
      setNextCursor(data.next_cursor);
    } catch (loadError) {
      setToast({
        type: 'error',
        message: getErrorMessage(loadError, 'Não foi possível carregar mais tentativas.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFilters = async (clear = false) => {
    if (!user) return;
    const selectedTopic = clear ? '' : topicFilter;
    const selectedLanguage = clear ? '' : languageFilter;
    const selectedResult = clear ? 'all' : resultFilter;
    if (clear) {
      setTopicFilter('');
      setLanguageFilter('');
      setResultFilter('all');
    }
    setLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const data = await listAttempts(token, {
        limit: 10,
        topicId: selectedTopic || undefined,
        language: selectedLanguage || undefined,
        correct: selectedResult === 'all' ? undefined : selectedResult === 'correct',
      });
      setAttempts(data.items);
      setNextCursor(data.next_cursor);
    } catch (loadError) {
      setToast({
        type: 'error',
        message: getErrorMessage(loadError, 'Não foi possível aplicar os filtros.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <LoadingScreen label="carregando progresso..." />;

  return (
    <div className="min-h-screen bg-chalk">
      <Toast toast={toast} onClose={closeToast} />
      <AppHeader email={user?.email} onNavigate={navigate} onLogout={handleLogout} current="progress" />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-tutor">Aprendizado</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-graphite">Meu progresso</h1>
            <p className="mt-2 text-sm text-graphite-soft">
              Acompanhe sua evolução e continue do ponto recomendado.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/pergunta')} className="rounded-lg bg-tutor px-4 py-2.5 text-sm font-medium text-white hover:bg-tutor-dark">
            Continuar estudando
          </button>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-marker/30 bg-white p-5">
            <p className="text-sm text-marker">{error}</p>
            <button type="button" onClick={() => void loadDashboard()} className="mt-3 text-sm font-medium text-tutor hover:text-tutor-dark">
              Tentar novamente
            </button>
          </div>
        )}

        {!error && progress && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Nível geral" value={formatLevel(progress.general_level)} />
              <SummaryCard label="Taxa de acerto" value={formatPercentage(progress.accuracy)} />
              <SummaryCard label="Tentativas" value={String(progress.total_attempts)} />
              <SummaryCard label="Exercícios concluídos" value={String(progress.completed_exercises)} />
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-graphite">Progresso por tópico</h2>
                <span className="text-xs text-graphite-soft">{progress.topics.length} tópicos</span>
              </div>

              {progress.topics.length === 0 ? (
                <EmptyState title="Seu progresso começa no primeiro exercício" description="Resolva uma questão para visualizar sua evolução por tópico." />
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {progress.topics.map((topic) => (
                    <button
                      key={topic.topic_id}
                      type="button"
                      onClick={() => navigate('/progresso/' + encodeURIComponent(topic.topic_id))}
                      className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-tutor/40 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-graphite">{topic.topic_name}</h3>
                          <p className="mt-1 text-xs text-graphite-soft">
                            {topic.completed_exercises} de {topic.total_exercises} concluídos
                          </p>
                        </div>
                        {progress.recommended_topic_id === topic.topic_id && (
                          <span className="rounded-full bg-tutor/10 px-2.5 py-1 text-xs font-medium text-tutor">Recomendado</span>
                        )}
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-tutor transition-all" style={{ width: String(Math.round(topic.completion_percentage * 100)) + '%' }} />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-graphite-soft">
                        <span>{formatPercentage(topic.completion_percentage)}</span>
                        <span>Nível {formatLevel(topic.level)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-10 pb-10">
              <h2 className="font-display text-xl font-semibold text-graphite">Tentativas recentes</h2>
              <div className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="text-xs font-medium text-graphite-soft">
                  Tópico
                  <select
                    value={topicFilter}
                    onChange={(event) => setTopicFilter(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-graphite outline-none focus:border-tutor"
                  >
                    <option value="">Todos</option>
                    {progress.topics.map((topic) => (
                      <option key={topic.topic_id} value={topic.topic_id}>{topic.topic_name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-graphite-soft">
                  Linguagem
                  <select
                    value={languageFilter}
                    onChange={(event) => setLanguageFilter(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-graphite outline-none focus:border-tutor"
                  >
                    <option value="">Todas</option>
                    {['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go'].map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-graphite-soft">
                  Resultado
                  <select
                    value={resultFilter}
                    onChange={(event) => setResultFilter(event.target.value as typeof resultFilter)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-graphite outline-none focus:border-tutor"
                  >
                    <option value="all">Todos</option>
                    <option value="correct">Corretas</option>
                    <option value="incorrect">Incorretas</option>
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => void applyFilters()} disabled={loadingMore} className="rounded-lg bg-tutor px-4 py-2 text-sm font-medium text-white hover:bg-tutor-dark disabled:opacity-50">
                    Filtrar
                  </button>
                  <button type="button" onClick={() => void applyFilters(true)} disabled={loadingMore} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-graphite-soft hover:text-graphite disabled:opacity-50">
                    Limpar
                  </button>
                </div>
              </div>
              {attempts.length === 0 ? (
                <EmptyState title="Nenhuma tentativa encontrada" description="Altere os filtros ou resolva um novo exercício." />
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <ul className="divide-y divide-gray-100">
                    {attempts.map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)}
                  </ul>
                  {nextCursor && (
                    <div className="border-t border-gray-100 p-4 text-center">
                      <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="text-sm font-medium text-tutor hover:text-tutor-dark disabled:opacity-50">
                        {loadingMore ? 'Carregando...' : 'Carregar mais'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-graphite-soft">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-graphite">{value}</p>
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptHistoryItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-graphite">{attempt.question_title}</p>
        <p className="mt-1 text-xs text-graphite-soft">
          {attempt.language} · {formatDate(attempt.created_at)} · {evaluationLabel(attempt.evaluation_method)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-graphite-soft">{formatDuration(attempt.elapsed_seconds)}</span>
        <span className={attempt.correct ? 'rounded-full bg-progress/15 px-2.5 py-1 text-xs font-semibold text-tutor-dark' : 'rounded-full bg-marker/10 px-2.5 py-1 text-xs font-semibold text-marker'}>
          {Math.round(attempt.score * 100)}%
        </span>
      </div>
    </li>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center">
      <p className="font-medium text-graphite">{title}</p>
      <p className="mt-1 text-sm text-graphite-soft">{description}</p>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return 'agora';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function evaluationLabel(method: AttemptHistoryItem['evaluation_method']): string {
  const labels = {
    exact_match: 'verificação direta',
    llm: 'avaliação pedagógica',
    static_fallback: 'avaliação básica',
  };
  return labels[method];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return String(seconds) + 's';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? String(minutes) + 'min ' + String(remainder) + 's' : String(minutes) + 'min';
}

function getErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback);
}
