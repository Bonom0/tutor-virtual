/**
 * Serviço de API para comunicação com o backend
 */

const DEFAULT_API_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 65_000;

// Remove a barra final para evitar URLs como "http://localhost:8000//api/...".
export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, '');

// Tipos para as requisições e respostas da API
export interface CodeExample {
  language: string;
  code: string;
  explanation: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  user_context?: Record<string, unknown>;
  client_message_id?: string;
}

export interface ChatResponse {
  response: string;
  examples: CodeExample[];
  conversation_id: string;
  moderated: boolean;
  warning?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  last_message_at: string | null;
  status: 'active' | 'archived';
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  examples: CodeExample[];
  moderated: boolean;
  warning: string | null;
  created_at: string | null;
}

export interface ConversationListResponse {
  items: ConversationSummary[];
  next_cursor: string | null;
}

export interface ConversationMessagesResponse {
  conversation_id: string;
  messages: ConversationMessage[];
  next_cursor: string | null;
}

export interface ConversationListOptions {
  status?: 'active' | 'archived' | 'all';
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface ConversationMessagesOptions {
  limit?: number;
  cursor?: string;
}

export type ExerciseAnnotationSeverity =
  | 'info'
  | 'hint'
  | 'warning'
  | 'error'
  | 'correct';

export type ExerciseEvaluationMethod = 'exact_match' | 'llm' | 'static_fallback';

export interface Exercise {
  id: string;
  topic_id: string;
  title: string;
  statement: string;
  language: string;
  starter_code: string;
  hint: string;
  difficulty: {
    discrimination: number;
    level: number;
  };
}

export interface ExerciseAttemptRequest {
  code: string;
  language: string;
  elapsed_seconds: number;
  client_attempt_id?: string;
}

export interface ExerciseAttemptResponse {
  attempt_id: string;
  question_id: string;
  correct: boolean;
  score: number;
  confidence: number;
  feedback: string;
  annotations: Array<{
    line: number;
    severity: ExerciseAnnotationSeverity;
    message: string;
  }>;
  strengths: string[];
  improvements: string[];
  evaluation_method: ExerciseEvaluationMethod;
  progress: {
    topic_id: string;
    previous_level: number;
    current_level: number;
    correct_answers: number;
    wrong_answers: number;
  };
  progress_updated: boolean;
  next_question_id: string | null;
}

export interface ExerciseNavigation {
  current_question_id: string;
  previous_question_ids: string[];
  unlocked_question_ids: string[];
  completed_question_ids: string[];
  recommended_question_id: string;
}

export type ExerciseProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface ExerciseProgress {
  id: string;
  title: string;
  order: number | null;
  status: ExerciseProgressStatus;
  best_score: number;
  attempts: number;
}

export interface TopicProgress {
  topic_id: string;
  topic_name: string;
  level: number;
  correct_answers: number;
  wrong_answers: number;
  total_attempts: number;
  completed_exercises: number;
  total_exercises: number;
  completion_percentage: number;
  last_question_id: string | null;
  last_updated_at: string | null;
}

export interface TopicProgressDetail extends TopicProgress {
  accuracy: number;
  exercises: ExerciseProgress[];
}

export interface GeneralProgress {
  general_level: number;
  total_attempts: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy: number;
  completed_exercises: number;
  topics: TopicProgress[];
  recommended_topic_id: string | null;
}

export interface AttemptHistoryItem {
  id: string;
  question_id: string;
  question_title: string;
  topic_id: string;
  language: string;
  correct: boolean;
  score: number;
  confidence: number;
  feedback: string;
  evaluation_method: ExerciseEvaluationMethod;
  elapsed_seconds: number;
  previous_level: number;
  current_level: number;
  created_at: string | null;
}

export interface AttemptHistoryResponse {
  items: AttemptHistoryItem[];
  next_cursor: string | null;
}

export interface AttemptHistoryOptions {
  limit?: number;
  topicId?: string;
  language?: string;
  correct?: boolean;
  cursor?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    requestId: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Envia uma mensagem para o backend e obtém a resposta do tutor
 */
export async function sendMessage(
  request: ChatRequest,
  idToken: string,
): Promise<ChatResponse> {
  let data: unknown;
  const maxAttempts = request.client_message_id ? 2 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      data = await requestApi<unknown>('/api/v1/chat', idToken, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      break;
    } catch (error) {
      if (attempt + 1 >= maxAttempts || !isRetryableChatError(error)) throw error;
      const seconds = error instanceof ApiError ? error.retryAfterSeconds : null;
      await delay(Math.min(Math.max(seconds ?? 1, 0.5), 2) * 1000);
    }
  }
  if (!isChatResponse(data)) {
    throw new Error('A API retornou uma resposta em formato inesperado.');
  }

  return data;
}

export async function listConversations(
  idToken: string,
  options: ConversationListOptions = {},
): Promise<ConversationListResponse> {
  const params = new URLSearchParams();
  params.set('status', options.status ?? 'active');
  params.set('limit', String(options.limit ?? 50));
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.cursor) params.set('cursor', options.cursor);
  return requestApi<ConversationListResponse>(
    `/api/v1/conversations?${params.toString()}`,
    idToken,
  );
}

export async function getConversationMessages(
  conversationId: string,
  idToken: string,
  options: ConversationMessagesOptions = {},
): Promise<ConversationMessagesResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 50));
  if (options.cursor) params.set('cursor', options.cursor);
  return requestApi<ConversationMessagesResponse>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages?${params.toString()}`,
    idToken,
  );
}

export async function updateConversation(
  conversationId: string,
  update: { title?: string; status?: 'active' | 'archived' },
  idToken: string,
): Promise<ConversationSummary> {
  return requestApi<ConversationSummary>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
    idToken,
    { method: 'PATCH', body: JSON.stringify(update) },
  );
}

export async function archiveConversation(
  conversationId: string,
  idToken: string,
): Promise<void> {
  await requestApi<void>(
    `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
    idToken,
    { method: 'DELETE' },
  );
}

export async function getExercise(
  questionId: string,
  idToken: string,
): Promise<Exercise> {
  return requestApi<Exercise>(
    `/api/v1/exercises/${encodeURIComponent(questionId)}`,
    idToken,
  );
}

export async function submitExerciseAttempt(
  questionId: string,
  attempt: ExerciseAttemptRequest,
  idToken: string,
): Promise<ExerciseAttemptResponse> {
  return requestApi<ExerciseAttemptResponse>(
    `/api/v1/exercises/${encodeURIComponent(questionId)}/attempts`,
    idToken,
    {
      method: 'POST',
      body: JSON.stringify(attempt),
    },
  );
}

export async function getExerciseNavigation(idToken: string): Promise<ExerciseNavigation> {
  return requestApi<ExerciseNavigation>('/api/v1/exercises/navigation', idToken);
}

export async function getGeneralProgress(idToken: string): Promise<GeneralProgress> {
  return requestApi<GeneralProgress>('/api/v1/progress', idToken);
}

export async function getTopicProgress(
  topicId: string,
  idToken: string,
): Promise<TopicProgressDetail> {
  return requestApi<TopicProgressDetail>(
    `/api/v1/progress/topics/${encodeURIComponent(topicId)}`,
    idToken,
  );
}

export async function listAttempts(
  idToken: string,
  options: AttemptHistoryOptions = {},
): Promise<AttemptHistoryResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 10));
  if (options.topicId) params.set('topic_id', options.topicId);
  if (options.language) params.set('language', options.language);
  if (options.correct !== undefined) params.set('correct', String(options.correct));
  if (options.cursor) params.set('cursor', options.cursor);
  return requestApi<AttemptHistoryResponse>(`/api/v1/attempts?${params.toString()}`, idToken);
}

/**
 * Verifica se o backend está online
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function readinessCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/ready`);
    return response.ok;
  } catch {
    return false;
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
  const suffix = error.requestId ? ` (código de suporte: ${error.requestId})` : '';
  if (error.status === 429) return `Você atingiu o limite temporário. Aguarde e tente novamente.${suffix}`;
  if (error.status === 503) return `O serviço está temporariamente indisponível. Tente novamente em instantes.${suffix}`;
  if (error.status === 504) return `O tutor demorou demais para responder. Tente novamente.${suffix}`;
  if (error.status === 409 && error.code === 'REQUEST_IN_PROGRESS') {
    return `Esta mensagem ainda está sendo processada. Aguarde alguns instantes.${suffix}`;
  }
  return `${error.message}${suffix}`;
}

function isChatResponse(data: unknown): data is ChatResponse {
  if (!data || typeof data !== 'object') return false;

  const candidate = data as Partial<ChatResponse>;
  return (
    typeof candidate.response === 'string' &&
    Array.isArray(candidate.examples) &&
    typeof candidate.conversation_id === 'string' &&
    typeof candidate.moderated === 'boolean'
  );
}

async function requestApi<T>(
  path: string,
  idToken: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...init.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A API demorou mais de 65 segundos para responder.');
    }
    throw new Error(
      `Não foi possível conectar à API em ${API_URL}. Verifique se ela está em execução e se o CORS permite a origem deste frontend.`,
    );
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData: { detail?: unknown; code?: unknown; request_id?: unknown } = await response
      .json()
      .catch(() => ({}));
    throw new ApiError(
      typeof errorData.detail === 'string'
        ? errorData.detail
        : `Erro na API: ${response.status} ${response.statusText}`,
      response.status,
      typeof errorData.code === 'string' ? errorData.code : null,
      typeof errorData.request_id === 'string'
        ? errorData.request_id
        : response.headers.get('X-Request-ID'),
      parseRetryAfter(response.headers.get('Retry-After')),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function isRetryableChatError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return error instanceof Error;
  return [429, 503, 504].includes(error.status) ||
    (error.status === 409 && error.code === 'REQUEST_IN_PROGRESS');
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
