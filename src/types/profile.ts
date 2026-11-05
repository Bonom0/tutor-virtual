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
