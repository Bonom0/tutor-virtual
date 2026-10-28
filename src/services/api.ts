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
}

export interface ChatResponse {
  response: string;
  examples: CodeExample[];
  conversation_id: string;
  moderated: boolean;
  warning?: string;
}

/**
 * Envia uma mensagem para o backend e obtém a resposta do tutor
 */
export async function sendMessage(
  request: ChatRequest,
  idToken: string,
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(request),
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
    const errorData: { detail?: unknown } = await response.json().catch(() => ({}));
    const detail =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : `Erro na API: ${response.status} ${response.statusText}`;

    throw new Error(
      detail,
    );
  }

  const data: unknown = await response.json();
  if (!isChatResponse(data)) {
    throw new Error('A API retornou uma resposta em formato inesperado.');
  }

  return data;
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
