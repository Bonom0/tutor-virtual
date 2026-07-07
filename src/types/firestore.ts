import type { Timestamp } from 'firebase/firestore';

/** usuarios/{uid} */
export interface Usuario {
  nome: string;
  email: string;
  criadoEm: Timestamp;
  nivelGeral: number; // estimativa geral de habilidade (theta, IRT)
  provedor: 'password' | 'google.com';
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
  gabarito: string | null;
  dificuldade_a: number; // parametro de discriminacao (IRT)
  dificuldade_b: number; // parametro de dificuldade (IRT)
  dica?: string; // anotacao/feedback mostrado apos "Verificar resposta" (ate termos avaliacao real via LLM)
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
