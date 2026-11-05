import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import Toast, { type ToastMessage } from '../components/Toast';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../context/auth';
import { createClientId } from '../utils/id';
import {
  ApiError,
  getExercise,
  getExerciseNavigation,
  submitExerciseAttempt,
  apiErrorMessage,
  type Exercise,
  type ExerciseAttemptResponse,
  type ExerciseAnnotationSeverity,
  type ExerciseEvaluationMethod,
} from '../services/api';

export default function Question() {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [lastSubmittedCode, setLastSubmittedCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ExerciseAttemptResponse | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const startedAt = useRef(Date.now());
  const pendingAttempt = useRef<{ key: string; id: string } | null>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const closeToast = useCallback(() => setToast(null), []);
  const editorExtensions = useMemo(() => codeLanguageExtensions(exercise?.language), [exercise?.language]);

  const loadExercise = useCallback(
    async (questionId: string) => {
      if (!user) return;

      setLoading(true);
      setLoadError(null);
      setResult(null);
      try {
        const idToken = await user.getIdToken();
        const loadedExercise = await getExercise(questionId, idToken);
        const normalizedStarterCode = normalizeStarterCode(loadedExercise.starter_code);
        setExercise(loadedExercise);
        setInitialCode(normalizedStarterCode);
        setCode(normalizedStarterCode);
        setLastSubmittedCode(null);
        pendingAttempt.current = null;
        startedAt.current = Date.now();
      } catch (error) {
        console.error('[Question] erro ao carregar questão pela API:', error);
        setExercise(null);
        setLoadError(
          error instanceof ApiError && error.status === 403
            ? 'Esta questão ainda está bloqueada. Conclua a questão anterior para continuar.'
            : getErrorMessage(error, 'Não foi possível carregar a questão pela API.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    const currentUser = user;

    let active = true;

    async function restoreNavigation() {
      setLoading(true);
      setLoadError(null);
      try {
        const idToken = await currentUser.getIdToken();
        const navigation = await getExerciseNavigation(idToken);
        if (!active) return;
        const baseHistory = Array.from(
          new Set([...navigation.previous_question_ids, navigation.current_question_id]),
        );
        const requestedId = new URLSearchParams(window.location.search).get('questionId');
        const accessibleIds = new Set([
          ...navigation.unlocked_question_ids,
          ...navigation.completed_question_ids,
        ]);
        const selectedId = requestedId && accessibleIds.has(requestedId)
          ? requestedId
          : navigation.current_question_id;
        const history = baseHistory.includes(selectedId)
          ? baseHistory
          : [...baseHistory, selectedId];
        setQuestionHistory(history);
        setHistoryIndex(history.indexOf(selectedId));
        const url = new URL(window.location.href);
        url.searchParams.set('questionId', selectedId);
        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        await loadExercise(selectedId);
      } catch (error) {
        if (!active) return;
        console.error('[Question] erro ao restaurar navegação:', error);
        setLoadError(
          getErrorMessage(error, 'Não foi possível restaurar sua navegação de exercícios.'),
        );
        setLoading(false);
      }
    }

    void restoreNavigation();
    return () => {
      active = false;
    };
  }, [loadExercise, user]);

  const navigateInHistory = async (nextIndex: number) => {
    const questionId = questionHistory[nextIndex];
    if (!questionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('questionId', questionId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    setHistoryIndex(nextIndex);
    await loadExercise(questionId);
  };

  const handlePreviousExercise = async () => {
    if (historyIndex <= 0) return;
    await navigateInHistory(historyIndex - 1);
  };

  const handleNextExercise = async () => {
    if (historyIndex < questionHistory.length - 1) {
      await navigateInHistory(historyIndex + 1);
      return;
    }
    const nextQuestionId = result?.next_question_id ?? null;
    if (!result?.correct || !nextQuestionId) return;

    const nextHistory = [
      ...questionHistory.slice(0, historyIndex + 1),
      nextQuestionId,
    ];
    setQuestionHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    const url = new URL(window.location.href);
    url.searchParams.set('questionId', nextQuestionId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    await loadExercise(nextQuestionId);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCheck = async () => {
    if (!user || !exercise || checking) return;
    if (!code.trim()) {
      setToast({ type: 'error', message: 'Escreva uma solução antes de verificar.' });
      return;
    }
    if (comparableCode(code) === comparableCode(initialCode)) {
      setToast({
        type: 'info',
        message: 'Modifique o código inicial antes de verificar a resposta.',
      });
      return;
    }
    if (lastSubmittedCode !== null && comparableCode(code) === comparableCode(lastSubmittedCode)) {
      setToast({
        type: 'info',
        message: 'Esse mesmo código já foi avaliado. Faça uma alteração antes de tentar novamente.',
      });
      return;
    }

    setChecking(true);
    setToast(null);
    try {
      const idToken = await user.getIdToken();
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
      const attemptKey = `${exercise.id}:${exercise.language}:${comparableCode(code)}`;
      if (pendingAttempt.current?.key !== attemptKey) {
        pendingAttempt.current = { key: attemptKey, id: createClientId() };
      }
      const attempt = await submitExerciseAttempt(
        exercise.id,
        {
          code,
          language: exercise.language,
          elapsed_seconds: Math.min(elapsedSeconds, 86_400),
          client_attempt_id: pendingAttempt.current.id,
        },
        idToken,
      );

      setResult(attempt);
      setLastSubmittedCode(code);
      setToast({
        type: attempt.progress_updated && attempt.correct ? 'success' : 'info',
        message: !attempt.progress_updated
          ? 'Essa tentativa já havia sido registrada e não alterou seu progresso.'
          : attempt.correct
          ? 'Resposta correta! Seu progresso foi atualizado.'
          : 'Tentativa registrada. Confira o feedback do tutor.',
      });
    } catch (error) {
      console.error('[Question] erro ao avaliar resposta:', error);
      setToast({
        type: 'error',
        message: getErrorMessage(error, 'Não foi possível avaliar sua resposta.'),
      });
    } finally {
      setChecking(false);
    }
  };

  const restoreInitialCode = () => {
    setCode(initialCode);
    setResult(null);
    setToast({ type: 'info', message: 'Código inicial restaurado.' });
  };

  useEffect(() => {
    if (comparableCode(code) === comparableCode(initialCode) || result) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [code, initialCode, result]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chalk">
        <span className="font-mono text-sm text-graphite-soft">carregando questão...</span>
      </div>
    );
  }

  const codeWasChanged = comparableCode(code) !== comparableCode(initialCode);
  const nextQuestionId = result?.next_question_id ?? null;

  if (loadError || !exercise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-chalk px-6 text-center">
        <p className="max-w-lg font-medium text-marker">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-tutor px-4 py-2 text-sm font-medium text-white hover:bg-tutor-dark"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 text-sm font-medium text-graphite-soft hover:text-graphite"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-chalk">
      <Toast toast={toast} onClose={closeToast} />

      <AppHeader
        email={user?.email}
        onNavigate={navigate}
        onLogout={handleLogout}
        current="exercise"
      />

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-tutor/10 px-2.5 py-1 text-xs font-medium text-tutor">
              Exercício adaptativo
            </span>
            {historyIndex > 0 && (
              <button
                type="button"
                onClick={() => void handlePreviousExercise()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-graphite-soft transition hover:border-tutor/40 hover:text-tutor-dark"
              >
                <span aria-hidden="true">←</span>
                Questão anterior
              </button>
            )}
          </div>

          <h1 className="font-display text-2xl font-semibold text-graphite">{exercise.title}</h1>
          <p className="leading-relaxed text-graphite-soft">{exercise.statement}</p>
          <p className="font-mono text-xs text-graphite-soft">
            {exercise.language} · dificuldade {exercise.difficulty.level.toFixed(2)}
          </p>

          <button
            type="button"
            onClick={handleCheck}
            disabled={checking || !code.trim() || !codeWasChanged}
            className="mt-2 w-fit rounded-lg bg-tutor px-5 py-2.5 text-sm font-medium text-white transition hover:bg-tutor-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? 'Analisando...' : 'Verificar resposta'}
          </button>
          {!codeWasChanged && (
            <p className="text-xs text-graphite-soft">
              {initialCode.trim()
                ? 'Modifique o código inicial para habilitar a verificação.'
                : 'Digite sua solução para habilitar a verificação.'}
            </p>
          )}

          {result && <AttemptResult result={result} />}
          {historyIndex < questionHistory.length - 1 && (
            <button
              type="button"
              onClick={() => void handleNextExercise()}
              className="w-fit rounded-lg bg-tutor px-5 py-2.5 text-sm font-medium text-white transition hover:bg-tutor-dark"
            >
              Retornar à próxima questão
            </button>
          )}
          {historyIndex === questionHistory.length - 1 &&
            result?.correct &&
            nextQuestionId && (
            <button
              type="button"
              onClick={() => void handleNextExercise()}
              className="w-fit rounded-lg bg-tutor px-5 py-2.5 text-sm font-medium text-white transition hover:bg-tutor-dark"
            >
              Próximo exercício
            </button>
          )}
          {historyIndex === questionHistory.length - 1 &&
            result?.correct &&
            !nextQuestionId && (
            <p className="rounded-lg border border-tutor/20 bg-tutor/5 px-3 py-2 text-sm text-tutor-dark">
              Você concluiu os exercícios disponíveis para este tópico e linguagem.
            </p>
          )}
        </section>

        <section className="flex flex-col overflow-hidden rounded-xl bg-slate">
          <div className="flex items-center gap-1.5 border-b border-slate-line px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-marker/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-progress/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-tutor/70" />
            <span className="ml-2 text-xs font-mono text-graphite-soft">
              solucao.{languageExtension(exercise.language)}
            </span>
            <button
              type="button"
              onClick={restoreInitialCode}
              disabled={!codeWasChanged}
              className="ml-auto text-xs font-medium text-chalk/70 hover:text-chalk disabled:cursor-not-allowed disabled:opacity-40"
            >
              Restaurar código
            </button>
          </div>

          <div className="min-h-[300px] flex-1">
            <CodeMirror
              value={code}
              height="100%"
              minHeight="300px"
              theme="dark"
              extensions={editorExtensions}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                indentOnInput: true,
              }}
              onChange={(value) => {
                setCode(value);
                setResult(null);
                if (pendingAttempt.current?.key !== `${exercise.id}:${exercise.language}:${comparableCode(value)}`) {
                  pendingAttempt.current = null;
                }
              }}
              aria-label="Código da solução"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void handleCheck();
                }
              }}
              className="h-full overflow-hidden text-sm"
            />
          </div>

          {result && result.annotations.length > 0 && (
            <div className="space-y-2 border-t border-slate-line p-4">
              {result.annotations.map((annotation, index) => (
                <div key={`${annotation.line}-${index}`} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 font-mono text-xs text-graphite-soft">
                    L{annotation.line}
                  </span>
                  <span className="annotation-thread mt-2.5 w-4" />
                  <span className={annotationColor(annotation.severity)}>
                    {annotation.message}
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

function AttemptResult({ result }: { result: ExerciseAttemptResponse }) {
  const score = Math.round(result.score * 100);
  const confidence = Math.round(result.confidence * 100);
  const levelDifference = result.progress.current_level - result.progress.previous_level;

  return (
    <div
      className={`mt-3 rounded-xl border p-4 ${
        result.correct ? 'border-progress/40 bg-progress/10' : 'border-marker/30 bg-white'
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className={result.correct ? 'text-tutor-dark' : 'text-marker'}>
          {result.correct ? 'Resposta correta' : 'Continue tentando'}
        </strong>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 font-mono text-xs text-graphite">
            Nota: {score}%
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs text-graphite-soft">
            {evaluationMethodLabel(result.evaluation_method)} · confiança {confidence}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-graphite">{result.feedback}</p>
      {(result.strengths.length > 0 || result.improvements.length > 0) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {result.strengths.length > 0 && (
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-tutor-dark">
                Pontos positivos
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-graphite">
                {result.strengths.map((strength, index) => (
                  <li key={`${strength}-${index}`}>• {strength}</li>
                ))}
              </ul>
            </div>
          )}
          {result.improvements.length > 0 && (
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-marker">
                O que melhorar
              </p>
              <ul className="mt-1.5 space-y-1 text-sm text-graphite">
                {result.improvements.map((improvement, index) => (
                  <li key={`${improvement}-${index}`}>• {improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 text-xs text-graphite-soft sm:grid-cols-4">
        <ProgressItem label="Nível anterior" value={result.progress.previous_level.toFixed(3)} />
        <ProgressItem label="Nível atual" value={result.progress.current_level.toFixed(3)} />
        <ProgressItem label="Acertos" value={String(result.progress.correct_answers)} />
        <ProgressItem label="Erros" value={String(result.progress.wrong_answers)} />
      </dl>
      <p className="mt-2 font-mono text-xs text-graphite-soft">
        Evolução nesta tentativa: {levelDifference >= 0 ? '+' : ''}{levelDifference.toFixed(3)}
      </p>
    </div>
  );
}

function ProgressItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mt-0.5 font-mono font-medium text-graphite">{value}</dd>
    </div>
  );
}

function annotationColor(severity: ExerciseAnnotationSeverity): string {
  if (severity === 'correct') return 'text-progress';
  if (severity === 'info') return 'text-chalk';
  if (severity === 'hint') return 'text-amber-300';
  return 'text-marker';
}

function languageExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    csharp: 'cs',
    cpp: 'cpp',
  };
  return extensions[language] ?? language;
}

function codeLanguageExtensions(language: string | undefined) {
  if (language === 'javascript') return [javascript()];
  if (language === 'typescript') return [javascript({ typescript: true })];
  if (language === 'python') return [python()];
  if (language === 'java') return [java()];
  if (language === 'c' || language === 'cpp') return [cpp()];
  return [];
}

function evaluationMethodLabel(method: ExerciseEvaluationMethod): string {
  const labels: Record<ExerciseEvaluationMethod, string> = {
    exact_match: 'Verificação direta',
    llm: 'Avaliação pedagógica',
    static_fallback: 'Avaliação básica',
  };
  return labels[method];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return apiErrorMessage(error, fallback);
}

function normalizeStarterCode(code: string): string {
  if (code.includes('\n') || !code.includes('\\n')) return code;
  return code.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

function comparableCode(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/\s+/g, '');
}
