import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, LoadingScreen } from '../components/AppHeader';
import { useAuth } from '../context/auth';
import { apiErrorMessage, getTopicProgress, type TopicProgressDetail } from '../services/api';
import { formatLevel, formatPercentage } from '../utils/format';

export default function TopicProgress() {
  const { topicId } = useParams();
  const [progress, setProgress] = useState<TopicProgressDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const loadProgress = useCallback(async () => {
    if (!user || !topicId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      setProgress(await getTopicProgress(topicId, token));
    } catch (loadError) {
      console.error('[TopicProgress] erro ao carregar tópico:', loadError);
      setError(getErrorMessage(loadError, 'Não foi possível carregar este tópico.'));
    } finally {
      setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <LoadingScreen label="carregando tópico..." />;

  return (
    <div className="min-h-screen bg-chalk">
      <AppHeader email={user?.email} onNavigate={navigate} onLogout={handleLogout} current="progress" />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <button type="button" onClick={() => navigate('/progresso')} className="text-sm font-medium text-tutor hover:text-tutor-dark">
          ← Voltar para o progresso
        </button>

        {error && (
          <div className="mt-6 rounded-xl border border-marker/30 bg-white p-5">
            <p className="text-sm text-marker">{error}</p>
            <button type="button" onClick={() => void loadProgress()} className="mt-3 text-sm font-medium text-tutor">
              Tentar novamente
            </button>
          </div>
        )}

        {!error && progress && (
          <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-tutor">Tópico</p>
                <h1 className="mt-1 font-display text-3xl font-semibold text-graphite">{progress.topic_name}</h1>
                <p className="mt-2 text-sm text-graphite-soft">
                  {progress.completed_exercises} de {progress.total_exercises} exercícios concluídos
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Metric label="Conclusão" value={formatPercentage(progress.completion_percentage)} />
                <Metric label="Acertos" value={formatPercentage(progress.accuracy)} />
                <Metric label="Nível" value={formatLevel(progress.level)} />
              </div>
            </div>

            <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-tutor" style={{ width: String(Math.round(progress.completion_percentage * 100)) + '%' }} />
            </div>

            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-graphite">Exercícios</h2>
              <ol className="mt-4 space-y-3">
                {progress.exercises.map((exercise) => {
                  const accessible = exercise.status !== 'locked';
                  return (
                    <li key={exercise.id}>
                      <button
                        type="button"
                        disabled={!accessible}
                        onClick={() => accessible && navigate('/pergunta?questionId=' + encodeURIComponent(exercise.id))}
                        className="flex w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-tutor/40 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-65"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ' + statusStyle(exercise.status)}>
                            {exercise.order ?? '–'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-graphite">{exercise.title}</p>
                            <p className="mt-0.5 text-xs text-graphite-soft">
                              {statusLabel(exercise.status)} · {exercise.attempts} tentativa(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-medium text-graphite">{Math.round(exercise.best_score * 100)}%</p>
                          <p className="text-xs text-graphite-soft">melhor nota</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
      <p className="text-xs text-graphite-soft">{label}</p>
      <p className="mt-1 font-mono font-semibold text-graphite">{value}</p>
    </div>
  );
}

function statusLabel(status: 'locked' | 'unlocked' | 'in_progress' | 'completed'): string {
  const labels = {
    locked: 'Bloqueada',
    unlocked: 'Disponível',
    in_progress: 'Em andamento',
    completed: 'Concluída',
  };
  return labels[status];
}

function statusStyle(status: 'locked' | 'unlocked' | 'in_progress' | 'completed'): string {
  const styles = {
    locked: 'bg-gray-200 text-graphite-soft',
    unlocked: 'bg-tutor/10 text-tutor',
    in_progress: 'bg-marker/10 text-marker',
    completed: 'bg-progress/20 text-tutor-dark',
  };
  return styles[status];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback);
}
