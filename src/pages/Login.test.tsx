// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';


const authMock = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock('../context/auth', () => ({ useAuth: () => authMock }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

describe('recuperação de senha', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('envia o email informado e exibe uma confirmação genérica', async () => {
    authMock.resetPassword.mockResolvedValue(undefined);
    render(<Login />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' aluno@example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }));

    await waitFor(() => {
      expect(authMock.resetPassword).toHaveBeenCalledWith('aluno@example.com');
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Se existir uma conta com este email',
    );
  });

  it('solicita o email antes de enviar a redefinição', () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }));

    expect(authMock.resetPassword).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe seu email');
  });
});
