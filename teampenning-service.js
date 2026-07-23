// teampenning-service.js - VERSÃO 1.5 (Suporte a Categorias Embutidas/Espelho)
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
 * VERSÃO 1.5
 * Cadastrar um novo Trio/Inscrição na Categoria.
 * Suporta Categoria Embutida (Ex: Feminina embutida na Soma 3).
 */
export async function cadastrarTrio(userId, compId, catId, dadosTrio, catEmbutidaId = null) {
  const triosRef = collection(db, "users", userId, "competitions", compId, "categorias", catId, "trios");
  
  // 1. Cadastra o Trio Principal
  const docRefPai = await addDoc(triosRef, {
    ...dadosTrio,
    status: "PENDENTE",
    tempo: null,
    boisCurralados: 0,
    boiSorteado: null,
    ordemPista: dadosTrio.senhaOriginal,
    criadoEm: new Date()
  });

  // 2. Se houver Categoria Embutida (ex: Feminina), cria o registro espelho vinculado
  if (catEmbutidaId) {
    const triosEmbutidosRef = collection(db, "users", userId, "competitions", compId, "categorias", catEmbutidaId, "trios");
    const docRefFilho = await addDoc(triosEmbutidosRef, {
      ...dadosTrio,
      categoriaEspelho: true,
      trioPaiId: docRefPai.id,
      status: "PENDENTE",
      tempo: null,
      boisCurralados: 0,
      boiSorteado: null,
      ordemPista: dadosTrio.senhaOriginal,
      criadoEm: new Date()
    });

    // Atualiza o trio pai com o ID do filho para referência bidirecional
    await updateDoc(docRefPai, { trioEspelhoId: docRefFilho.id });
  }

  return docRefPai;
}

/**
 * Embaralha as senhas vendidas e gera o Start List (Ordem de Entrada)
 */
export async function realizarSorteioOrdemEntrada(userId, compId, catId, listaTrios) {
  let embaralhados = [...listaTrios];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }

  const promessas = embaralhados.map((trio, index) => {
    const ordemPista = index + 1;
    const trioRef = doc(db, "users", userId, "competitions", compId, "categorias", catId, "trios", trio.id);
    return updateDoc(trioRef, { ordemPista: ordemPista });
  });

  await Promise.all(promessas);
}

/**
 * Escuta em Tempo Real (Realtime Listener) os Trios da Pista
 */
export function escutarPistaEmTempoReal(userId, compId, catId, limiteGadoPorLote, callback) {
  const triosRef = collection(db, "users", userId, "competitions", compId, "categorias", catId, "trios");
  const q = query(triosRef, orderBy("ordemPista", "asc"));

  return onSnapshot(q, (snapshot) => {
    const trios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const corridaAtualIndex = trios.findIndex(t => t.status === "PENDENTE");
    const numeroCorridaAtual = corridaAtualIndex !== -1 ? corridaAtualIndex + 1 : trios.length;

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
 * VERSÃO 1.5 - Lançamento de Resultado com Sincronização Automática para Categorias Embutidas
 */
export async function registrarResultadoCorrida(userId, compId, catId, trioId, resultado, trioEspelhoInfo = null) {
  // 1. Grava resultado no trio principal
  const trioRef = doc(db, "users", userId, "competitions", compId, "categorias", catId, "trios", trioId);
  await updateDoc(trioRef, {
    ...resultado,
    finalizadoEm: new Date()
  });

  // 2. Se o trio possuir categoria embutida vinculada, repli-ca o resultado no ranking exclusivo dela
  if (trioEspelhoInfo && trioEspelhoInfo.catEmbutidaId && trioEspelhoInfo.trioEspelhoId) {
    const trioEspelhoRef = doc(
      db, 
      "users", 
      userId, 
      "competitions", 
      compId, 
      "categorias", 
      trioEspelhoInfo.catEmbutidaId, 
      "trios", 
      trioEspelhoInfo.trioEspelhoId
    );

    await updateDoc(trioEspelhoRef, {
      ...resultado,
      finalizadoEm: new Date()
    });
  }
}