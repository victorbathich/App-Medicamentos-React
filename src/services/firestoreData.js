import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TEMPO_CACHE_MS = 60000;

const cache = {
  medicamentos: null,
  medicamentosPromise: null,
  registrosPorData: new Map(),
  registrosPorDataPromises: new Map(),
  registrosPeriodo: new Map(),
  registrosPeriodoPromises: new Map(),
};

function criarEntrada(dados) {
  return { dados, atualizadoEm: Date.now() };
}

function cacheValido(entrada) {
  return entrada && Date.now() - entrada.atualizadoEm < TEMPO_CACHE_MS;
}

function periodoKey(dataInicio, dataFim) {
  return `${dataInicio}|${dataFim}`;
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() }));
}

function salvarRegistroEmCache(registro) {
  if (!registro?.data) return;

  const entradaData = cache.registrosPorData.get(registro.data);
  if (entradaData) {
    const lista = entradaData.dados.slice();
    const index = lista.findIndex(item => item.id === registro.id);
    if (index >= 0) {
      lista[index] = { ...lista[index], ...registro };
    } else {
      lista.push(registro);
    }
    cache.registrosPorData.set(registro.data, criarEntrada(lista));
  }

  cache.registrosPeriodo.forEach((entrada, key) => {
    const [inicio, fim] = key.split('|');
    if (registro.data < inicio || registro.data > fim) return;

    const lista = entrada.dados.slice();
    const index = lista.findIndex(item => item.id === registro.id);
    if (index >= 0) {
      lista[index] = { ...lista[index], ...registro };
    } else {
      lista.push(registro);
    }
    cache.registrosPeriodo.set(key, criarEntrada(lista));
  });
}

export function getMedicamentosEmCache() {
  return cache.medicamentos?.dados ?? null;
}

export function getRegistrosPorDataEmCache(dataKey) {
  return cache.registrosPorData.get(dataKey)?.dados ?? null;
}

export function getRegistrosPeriodoEmCache(dataInicio, dataFim) {
  return cache.registrosPeriodo.get(periodoKey(dataInicio, dataFim))?.dados ?? null;
}

export async function buscarMedicamentos({ force = false } = {}) {
  if (!force && cacheValido(cache.medicamentos)) {
    return cache.medicamentos.dados;
  }

  if (!force && cache.medicamentosPromise) {
    return cache.medicamentosPromise;
  }

  cache.medicamentosPromise = getDocs(
    query(collection(db, 'medicamentos'), orderBy('criadoEm', 'desc'))
  )
    .then(snapshot => {
      const medicamentos = mapSnapshot(snapshot);
      cache.medicamentos = criarEntrada(medicamentos);
      return medicamentos;
    })
    .finally(() => {
      cache.medicamentosPromise = null;
    });

  return cache.medicamentosPromise;
}

export async function buscarRegistrosPorData(dataKey, { force = false } = {}) {
  const entrada = cache.registrosPorData.get(dataKey);
  if (!force && cacheValido(entrada)) {
    return entrada.dados;
  }

  const promiseAtual = cache.registrosPorDataPromises.get(dataKey);
  if (!force && promiseAtual) {
    return promiseAtual;
  }

  const promise = getDocs(
    query(collection(db, 'registros'), where('data', '==', dataKey))
  )
    .then(snapshot => {
      const registros = mapSnapshot(snapshot);
      cache.registrosPorData.set(dataKey, criarEntrada(registros));
      return registros;
    })
    .finally(() => {
      cache.registrosPorDataPromises.delete(dataKey);
    });

  cache.registrosPorDataPromises.set(dataKey, promise);
  return promise;
}

export async function buscarRegistrosPeriodo(dataInicio, dataFim, { force = false } = {}) {
  const key = periodoKey(dataInicio, dataFim);
  const entrada = cache.registrosPeriodo.get(key);
  if (!force && cacheValido(entrada)) {
    return entrada.dados;
  }

  const promiseAtual = cache.registrosPeriodoPromises.get(key);
  if (!force && promiseAtual) {
    return promiseAtual;
  }

  const promise = getDocs(
    query(
      collection(db, 'registros'),
      where('data', '>=', dataInicio),
      where('data', '<=', dataFim)
    )
  )
    .then(snapshot => {
      const registros = mapSnapshot(snapshot);
      cache.registrosPeriodo.set(key, criarEntrada(registros));
      return registros;
    })
    .finally(() => {
      cache.registrosPeriodoPromises.delete(key);
    });

  cache.registrosPeriodoPromises.set(key, promise);
  return promise;
}

export async function criarRegistro(dados) {
  const ref = await addDoc(collection(db, 'registros'), dados);
  const registro = { id: ref.id, ...dados };
  salvarRegistroEmCache(registro);
  return registro;
}

export async function atualizarRegistroTomado(registro, tomado) {
  await updateDoc(doc(db, 'registros', registro.id), { tomado });
  const atualizado = { ...registro, tomado };
  salvarRegistroEmCache(atualizado);
  return atualizado;
}

export async function criarMedicamento(dados) {
  const ref = await addDoc(collection(db, 'medicamentos'), {
    ...dados,
    criadoEm: serverTimestamp(),
  });

  if (cache.medicamentos) {
    const medicamento = { id: ref.id, ...dados, criadoEm: new Date().toISOString() };
    cache.medicamentos = criarEntrada([medicamento, ...cache.medicamentos.dados]);
  }

  return ref;
}

export async function atualizarMedicamento(id, dados) {
  await updateDoc(doc(db, 'medicamentos', id), dados);

  if (cache.medicamentos) {
    const medicamentos = cache.medicamentos.dados.map(medicamento =>
      medicamento.id === id ? { ...medicamento, ...dados } : medicamento
    );
    cache.medicamentos = criarEntrada(medicamentos);
  }
}

export async function excluirMedicamento(id) {
  await deleteDoc(doc(db, 'medicamentos', id));

  if (cache.medicamentos) {
    cache.medicamentos = criarEntrada(
      cache.medicamentos.dados.filter(medicamento => medicamento.id !== id)
    );
  }
}
