import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiErrorMessage,
  getConversationMessages,
  getExerciseNavigation,
  listAttempts,
  listConversations,
  sendMessage,
  submitExerciseAttempt,
} from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('cliente da API', () => {
  it('envia token ao restaurar a navegação', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          current_question_id: 'q1',
          previous_question_ids: [],
          unlocked_question_ids: ['q1'],
          completed_question_ids: [],
          recommended_question_id: 'q1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const response = await getExerciseNavigation('token-teste');
    expect(response.current_question_id).toBe('q1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/exercises/navigation'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-teste' }),
      }),
    );
  });

  it('monta filtros e cursor do histórico', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listAttempts('token', {
      limit: 5,
      topicId: 'loops',
      language: 'javascript',
      correct: true,
      cursor: 'cursor-1',
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('limit=5');
    expect(url).toContain('topic_id=loops');
    expect(url).toContain('language=javascript');
    expect(url).toContain('correct=true');
    expect(url).toContain('cursor=cursor-1');
  });

  it('preserva o status de erros HTTP', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({
        detail: 'Questão bloqueada',
        code: 'FORBIDDEN',
        request_id: 'request-123',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getExerciseNavigation('token')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        message: 'Questão bloqueada',
        status: 403,
        code: 'FORBIDDEN',
        requestId: 'request-123',
        retryAfterSeconds: null,
      }),
    );
  });

  it('envia a chave de idempotência da tentativa', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await submitExerciseAttempt(
      'q1',
      {
        code: 'console.log(1)',
        language: 'javascript',
        elapsed_seconds: 10,
        client_attempt_id: '2d6b0805-9f6b-49fa-9d9a-f22a1e389177',
      },
      'token',
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        client_attempt_id: '2d6b0805-9f6b-49fa-9d9a-f22a1e389177',
      }),
    );
  });

  it('envia a chave idempotente do chat', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      response: 'Olá', examples: [], conversation_id: 'c1', moderated: true,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await sendMessage({ message: 'Olá', client_message_id: 'message-uuid' }, 'token');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).client_message_id).toBe('message-uuid');
  });

  it('envia cursores opacos de conversas e mensagens', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ conversation_id: 'c1', messages: [], next_cursor: null }), { status: 200 }));
    await listConversations('token', { cursor: 'next-list' });
    await getConversationMessages('c1', 'token', { cursor: 'next-messages' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('cursor=next-list');
    expect(String(fetchMock.mock.calls[1][0])).toContain('cursor=next-messages');
  });

  it('traduz indisponibilidade com request ID seguro', () => {
    expect(apiErrorMessage(new ApiError('indisponível', 503, 'SERVICE_UNAVAILABLE', 'req-1'), 'erro'))
      .toContain('req-1');
  });
});
