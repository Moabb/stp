// teampenning-service.js
import { 
  db, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "./firebase-config.js";

/**
 * Cadastrar um novo Trio/Inscrição na Categoria
 */
export async function cadastrarTrio(userId, compId, catId, dadosTrio) {
  const triosRef = collection(db, "users", userId, "competitions", compId, "categorias", catId, "trios");
  return await addDoc(triosRef, {
    ...dadosTrio,
    status: "PENDENTE", // PENDENTE, OK, SAT, DO, RE_RUN
    tempo: null,
    boisCurralados: 0,
    boiSorteado: null,
    ordemPista: dadosTrio.senhaOriginal, // Inicialmente igual à senha antes do sorteio
    criadoEm: new Date()
  });
}

/**
 * Embaralha as senhas vendidas e gera o Start List (Ordem de Entrada)
 */
export async function realizarSorteioOrdemEntrada(userId, compId, catId, listaTrios) {
  // Fisher-Yates Shuffle para embaralhar aleatoriamente
  let embaralhados = [...listaTrios];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }

  // Atualiza a ordemPista e atribui o Lote de Gado correspondente no Firestore
  const promessas = embaralhados.map((trio, index) => {
    const ordemPista = index + 1;
    const trioRef = doc(db, "users", userId, "competitions", compId, "categorias", catId, "trios", trio.id);
    return updateDoc(trioRef, { ordemPista: ordemPista });
  });

  await Promise.all(promessas);
}

/**
 * Escuta em Tempo Real (Realtime Listener) os Trios da Pista
 * Calcula automaticamente o Lote Atual e o Alerta de Troca de Gado
 */
export function escutarPistaEmTempoReal(userId, compId, catId, limiteGadoPorLote, callback) {
  const triosRef = collection(db, "users", userId, "competitions", compId, "categorias", catId, "trios");
  const q = query(triosRef, orderBy("ordemPista", "asc"));

  return onSnapshot(q, (snapshot) => {
    const trios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Identificar a corrida atual (primeiro trio ainda sem resultado)
    const corridaAtualIndex = trios.findIndex(t => t.status === "PENDENTE");
    const numeroCorridaAtual = corridaAtualIndex !== -1 ? corridaAtualIndex + 1 : trios.length;

    // Lógica de cálculo de Lotes de Gado e Alerta de 5 Corridas
    const loteAtualNum = Math.ceil(numeroCorridaAtual / limiteGadoPorLote) || 1;
    const proximaTrocaEm = loteAtualNum * limiteGadoPorLote;
    const corridasRestantesParaTroca = proximaTrocaEm - numeroCorridaAtual + 1;

    const alertaTrocaGado = corridasRestantesParaTroca <= 5 && corridasRestantesParaTroca > 0;

    callback({
      trios,
      trioAtual: trios[corridaAtualIndex] || null,
      proximosTrios: trios.slice(corridaAtualIndex + 1, corridaAtualIndex + 6),
      numeroCorridaAtual,
      loteAtualNum,
      alertaTrocaGado,
      corridasRestantesParaTroca
    });
  });
}

/**
 * Lançamento de Resultado da Corrida na Mesa do Juiz
 */
export async function registrarResultadoCorrida(userId, compId, catId, trioId, resultado) {
  // resultado = { tempo, boisCurralados, boiSorteado, status: "OK" | "SAT" | "DO" | "RE_RUN" }
  const trioRef = doc(db, "users", userId, "competitions", compId, "categorias", catId, "trios", trioId);
  await updateDoc(trioRef, {
    ...resultado,
    finalizadoEm: new Date()
  });
}