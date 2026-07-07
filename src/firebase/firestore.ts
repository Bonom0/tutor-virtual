import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { Usuario, Topico, Questao, Resposta, Progresso } from '../types/firestore';

// Converter generico: grava/le o objeto como esta, sem transformacao.
// Mantem os tipos fortes ao ler/escrever no Firestore.
function converter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data as Record<string, unknown>,
    fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
  };
}

const usuariosCol = collection(db, 'usuarios').withConverter(converter<Usuario>());
const topicosCol = collection(db, 'topicos').withConverter(converter<Topico>());
const questoesCol = collection(db, 'questoes').withConverter(converter<Questao>());

function respostasCol(usuarioId: string) {
  return collection(db, 'usuarios', usuarioId, 'respostas').withConverter(converter<Resposta>());
}

function progressoCol(usuarioId: string) {
  return collection(db, 'usuarios', usuarioId, 'progresso').withConverter(converter<Progresso>());
}

/** Cria o documento do usuario na primeira vez que ele loga (email ou Google). */
export async function criarUsuarioSeNaoExistir(
  uid: string,
  dados: { nome: string; email: string; provedor: Usuario['provedor'] },
) {
  const ref = doc(usuariosCol, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nome: dados.nome,
      email: dados.email,
      provedor: dados.provedor,
      nivelGeral: 0,
      criadoEm: serverTimestamp(),
    } as Usuario);
  }
  return ref;
}

export async function getUsuario(uid: string) {
  const snap = await getDoc(doc(usuariosCol, uid));
  return snap.exists() ? snap.data() : null;
}

export async function listarTopicos() {
  const snap = await getDocs(query(topicosCol, orderBy('ordem')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listarQuestoesPorTopico(topicoId: string) {
  const snap = await getDocs(query(questoesCol, where('topicoId', '==', topicoId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getQuestao(questaoId: string) {
  const snap = await getDoc(doc(questoesCol, questaoId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Salva uma tentativa de resposta no historico do usuario. */
export async function salvarResposta(
  usuarioId: string,
  dados: Omit<Resposta, 'usuarioId' | 'criadoEm'>,
) {
  return addDoc(respostasCol(usuarioId), {
    ...dados,
    usuarioId,
    criadoEm: serverTimestamp(),
  } as Resposta);
}

/** Atualiza (ou cria) o progresso do usuario em um topico apos uma resposta. */
export async function atualizarProgresso(
  usuarioId: string,
  topicoId: string,
  dados: { nivelIRT: number; acertou: boolean },
) {
  const ref = doc(progressoCol(usuarioId), topicoId);
  const atual = await getDoc(ref);

  const base = atual.exists()
    ? atual.data()
    : { usuarioId, topicoId, nivelIRT: 0, acertos: 0, erros: 0 };

  await setDoc(ref, {
    ...base,
    nivelIRT: dados.nivelIRT,
    acertos: base.acertos + (dados.acertou ? 1 : 0),
    erros: base.erros + (dados.acertou ? 0 : 1),
    ultimaAtualizacao: serverTimestamp(),
  } as Progresso);
}

export async function listarProgresso(usuarioId: string) {
  const snap = await getDocs(progressoCol(usuarioId));
  return snap.docs.map((d) => d.data());
}
