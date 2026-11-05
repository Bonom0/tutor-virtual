import type { Timestamp } from 'firebase/firestore';

export type NivelProgramacao = 'nenhum' | 'iniciante' | 'intermediario' | 'avancado';

export type ObjetivoAprendizado =
  | 'aprender_do_zero'
  | 'acompanhar_estudos'
  | 'desenvolver_projetos'
  | 'entrar_no_mercado'
  | 'resolver_duvidas_trabalho'
  | 'preparar_entrevistas';

export interface PerfilPedagogico {
  nivelAutodeclarado: NivelProgramacao;
  linguagemPreferida: string;
  linguagensInteresse: string[];
  areasInteresse: string[];
  objetivoPrincipal: ObjetivoAprendizado;
}

/** usuarios/{uid} */
export interface Usuario {
  nome: string;
  email: string;
  criadoEm: Timestamp;
  nivelGeral: number; // estimativa geral de habilidade (theta, IRT)
  provedor: 'password' | 'google.com';
  onboardingConcluido?: boolean;
  perfilPedagogico?: PerfilPedagogico;
  perfilAtualizadoEm?: Timestamp;
}

/** topicos/{id} */
export interface Topico {
  nome: string;
  ordem: number;
  descricao: string;
}

/** questoes/{id} */
export interface Questao {
  topicoId: string;
  titulo: string;
  enunciado: string;
  linguagem: string;
  codigoInicial: string;
  ativa?: boolean;
  ordem?: number;
  dificuldade_a: number; // parametro de discriminacao (IRT)
  dificuldade_b: number; // parametro de dificuldade (IRT)
  dica?: string;
}

/** usuarios/{uid}/respostas/{id} */
export interface Resposta {
  usuarioId: string;
  questaoId: string;
  codigoEnviado: string;
  correta: boolean;
  feedbackTutor: string;
  tempoRespostaSeg: number;
  criadoEm: Timestamp;
}

/** usuarios/{uid}/progresso/{topicoId} */
export interface Progresso {
  usuarioId: string;
  topicoId: string;
  nivelIRT: number;
  acertos: number;
  erros: number;
  ultimaAtualizacao: Timestamp;
}
