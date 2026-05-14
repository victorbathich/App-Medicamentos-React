import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { firebaseConfigurado } from '../config/firebase';
import {
  atualizarRegistroTomado,
  buscarMedicamentos,
  buscarRegistrosPorData,
  criarRegistro,
  getMedicamentosEmCache,
  getRegistrosPorDataEmCache,
} from '../services/firestoreData';
import { colors, shadows } from '../theme';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MINUTOS_RESET_APOS_ULTIMA_DOSE = 30;

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getLabelData(date) {
  const dia = NOMES_DIAS[date.getDay()];
  return `${dia}, ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

function getDiaSemana(date) {
  return DIAS_SEMANA[date.getDay()];
}

function horarioParaMinutos(horario) {
  if (!horario || !/^\d{2}:\d{2}$/.test(horario)) return null;
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

function getHoraBrasilia() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function getMinutosAgora() {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

function medicamentoAtivoNoDia(med, diaSemana) {
  return !(med.diasDaSemana?.length > 0 && !med.diasDaSemana.includes(diaSemana));
}

function calcularDataRotina(medicamentos) {
  const hoje = new Date();
  const diaHoje = getDiaSemana(hoje);
  const horariosHoje = medicamentos
    .filter(med => medicamentoAtivoNoDia(med, diaHoje))
    .flatMap(med => med.horarios || [])
    .map(horarioParaMinutos)
    .filter(minutos => minutos !== null);

  const ultimoHorarioHoje = horariosHoje.length > 0 ? Math.max(...horariosHoje) : null;
  const deveVirarRotina =
    ultimoHorarioHoje !== null &&
    getMinutosAgora() >= ultimoHorarioHoje + MINUTOS_RESET_APOS_ULTIMA_DOSE;

  const data = deveVirarRotina ? addDays(hoje, 1) : hoje;

  return {
    data,
    dataKey: toDateKey(data),
    diaSemana: getDiaSemana(data),
    label: getLabelData(data),
    resetada: deveVirarRotina,
  };
}

function doseEstaAtrasada(dose, rotina) {
  if (dose.registro?.tomado) return false;
  if (rotina.dataKey !== toDateKey(new Date())) return false;

  const minutosDose = horarioParaMinutos(dose.horario);
  if (minutosDose === null) return false;

  return getMinutosAgora() > minutosDose;
}

function montarRotinaEDoses(medicamentos, registros) {
  const rotinaAtual = calcularDataRotina(medicamentos);
  const lista = [];

  for (const med of medicamentos) {
    if (!medicamentoAtivoNoDia(med, rotinaAtual.diaSemana)) continue;

    const horariosDoDia = med.horarios?.length > 0 ? med.horarios : [''];
    for (const horario of horariosDoDia) {
      const reg = registros.find(r => r.medicamentoId === med.id && r.horario === horario) || null;
      lista.push({ medicamento: med, horario, registro: reg });
    }
  }

  lista.sort((a, b) => a.horario.localeCompare(b.horario));
  return { rotinaAtual, lista };
}

export default function HomeScreen() {
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [horaBrasilia, setHoraBrasilia] = useState(getHoraBrasilia());
  const [rotina, setRotina] = useState(() => calcularDataRotina([]));

  useEffect(() => {
    const timer = setInterval(() => setHoraBrasilia(getHoraBrasilia()), 30000);
    return () => clearInterval(timer);
  }, []);

  const aplicarDados = useCallback((medicamentos, registros) => {
    const { rotinaAtual, lista } = montarRotinaEDoses(medicamentos, registros);
    setRotina(rotinaAtual);
    setDoses(lista);
  }, []);

  const carregarDados = useCallback(async () => {
    if (!firebaseConfigurado) { setLoading(false); return; }
    const medicamentosCache = getMedicamentosEmCache();
    if (medicamentosCache) {
      const rotinaCache = calcularDataRotina(medicamentosCache);
      aplicarDados(medicamentosCache, getRegistrosPorDataEmCache(rotinaCache.dataKey) || []);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const medicamentos = await buscarMedicamentos();
      const rotinaAtual = calcularDataRotina(medicamentos);

      const registros = await buscarRegistrosPorData(rotinaAtual.dataKey);
      aplicarDados(medicamentos, registros);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, [aplicarDados]);

  useFocusEffect(useCallback(() => { carregarDados(); }, [carregarDados]));

  const marcarTomado = async (dose) => {
    const mesmaDose = item =>
      item.medicamento.id === dose.medicamento.id && item.horario === dose.horario;
    const registroAnterior = dose.registro;
    const novoTomado = !registroAnterior?.tomado;
    const registroPendente = registroAnterior
      ? { ...registroAnterior, tomado: novoTomado }
      : {
          id: `pendente-${Date.now()}`,
          medicamentoId: dose.medicamento.id,
          data: rotina.dataKey,
          horario: dose.horario,
          tomado: true,
        };

    setDoses(prev => prev.map(item =>
      mesmaDose(item) ? { ...item, registro: registroPendente } : item
    ));

    try {
      if (registroAnterior) {
        await atualizarRegistroTomado(registroAnterior, novoTomado);
      } else {
        const registroCriado = await criarRegistro({
          medicamentoId: dose.medicamento.id,
          data: rotina.dataKey,
          horario: dose.horario,
          tomado: true,
        });
        setDoses(prev => prev.map(item =>
          mesmaDose(item) ? { ...item, registro: registroCriado } : item
        ));
      }
    } catch (e) {
      setDoses(prev => prev.map(item =>
        mesmaDose(item) ? { ...item, registro: registroAnterior } : item
      ));
      Alert.alert('Erro', 'Não foi possível registrar.');
    }
  };

  const tomados = doses.filter(d => d.registro?.tomado).length;
  const total = doses.length;
  const proximaDose = doses.find(d => d.registro?.tomado !== true) || doses[0];
  const todasTomadas = total > 0 && tomados === total;
  const proximaAtrasada = proximaDose ? doseEstaAtrasada(proximaDose, rotina) : false;

  const renderDose = ({ item }) => {
    const tomado = item.registro?.tomado === true;
    const atrasada = doseEstaAtrasada(item, rotina);
    const atual = proximaDose && `${proximaDose.medicamento.id}_${proximaDose.horario}` === `${item.medicamento.id}_${item.horario}`;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.doseRow,
          tomado && styles.doseRowDone,
          atual && !tomado && styles.doseRowActive,
          atrasada && styles.doseRowLate,
        ]}
        onPress={() => marcarTomado(item)}
      >
        <View style={[
          styles.doseCheck,
          tomado && styles.doseCheckDone,
          atual && !tomado && styles.doseCheckActive,
          atrasada && styles.doseCheckLate,
        ]}>
          <Text style={[styles.doseCheckText, tomado && styles.doseCheckTextDone]}>
            {tomado ? '✓' : atual ? '•' : ''}
          </Text>
        </View>
        <View style={styles.doseRowInfo}>
          <Text style={[styles.doseRowName, tomado && styles.doseRowNameDone]}>{item.medicamento.nome}</Text>
          <Text style={[styles.doseRowMeta, tomado && styles.doseRowMetaDone]}>
            {item.medicamento.dose}{item.horario ? ` · ${item.horario}` : ''}
          </Text>
        </View>
        {atrasada && (
          <View style={styles.lateBadge}>
            <Text style={styles.lateBadgeText}>Atrasado</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProgressBars = () => (
    <View style={styles.progressBars}>
      {doses.map((dose, index) => {
        const done = dose.registro?.tomado === true;
        const late = doseEstaAtrasada(dose, rotina);
        return (
          <View
            key={`${dose.medicamento.id}_${dose.horario}_${index}`}
            style={[styles.progressBar, done && styles.progressBarDone, late && styles.progressBarLate]}
          />
        );
      })}
    </View>
  );

  const renderHeader = () => (
    <>
      <View style={styles.hero}>
        <Text style={styles.heroDate}>{rotina.label}</Text>
        <Text style={styles.heroTitle}>{tomados}/{total} doses</Text>
        <Text style={styles.heroTime}>Horário: {horaBrasilia}</Text>
        {rotina.resetada && (
          <Text style={styles.resetHint}>Rotina renovada após a última dose do dia anterior.</Text>
        )}
        {total > 0 && renderProgressBars()}
      </View>

      {proximaDose ? (
        <View style={[styles.nextCard, todasTomadas && styles.nextCardDone, proximaAtrasada && styles.nextCardLate]}>
          <Text style={[
            styles.nextKicker,
            todasTomadas && styles.nextKickerDone,
            proximaAtrasada && styles.nextKickerLate,
          ]}>
            {todasTomadas ? 'ROTINA CONCLUÍDA' : proximaAtrasada ? 'DOSE ATRASADA' : 'PRÓXIMA DOSE'}
          </Text>
          <Text style={styles.nextName}>{proximaDose.medicamento.nome}</Text>
          <Text style={styles.nextDose}>{proximaDose.medicamento.dose}</Text>
          {!!proximaDose.horario && <Text style={[styles.nextTime, proximaAtrasada && styles.nextTimeLate]}>{proximaDose.horario}</Text>}
          {proximaAtrasada && <Text style={styles.lateMessage}>Esse remédio já passou do horário.</Text>}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.confirmButton, todasTomadas && styles.confirmButtonDone, proximaAtrasada && styles.confirmButtonLate]}
            onPress={() => marcarTomado(proximaDose)}
          >
            <Text style={styles.confirmButtonText}>
              {proximaDose.registro?.tomado ? 'Desmarcar dose' : '✓ Marcar como tomado'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {total > 0 && <Text style={styles.listTitle}>TODAS AS DOSES</Text>}
    </>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6EE7C8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doses}
        keyExtractor={(item, i) => `${item.medicamento.id}_${item.horario}_${i}`}
        renderItem={renderDose}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={doses.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {!firebaseConfigurado ? (
              <>
                <Text style={styles.emptyIcon}>!</Text>
                <Text style={styles.emptyTitle}>Firebase não configurado</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>✓</Text>
                <Text style={styles.emptyTitle}>Nenhum medicamento para hoje</Text>
                <Text style={styles.emptyHint}>Cadastre uma rotina na aba Remédios.</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F3' },
  listContent: { paddingBottom: 28 },
  emptyList: { flexGrow: 1, paddingBottom: 28 },
  hero: {
    backgroundColor: '#17172B',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 24,
  },
  heroDate: { color: '#AAA8B8', fontSize: 14, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 4 },
  heroTime: { color: '#D6D3E4', fontSize: 13, fontWeight: '800', marginTop: 8 },
  resetHint: { color: '#8FE8CD', fontSize: 12, fontWeight: '800', marginTop: 8 },
  progressBars: { flexDirection: 'row', gap: 7, marginTop: 18 },
  progressBar: { flex: 1, height: 6, borderRadius: 999, backgroundColor: '#4E4C62' },
  progressBarDone: { backgroundColor: '#6EE7C8' },
  progressBarLate: { backgroundColor: '#F97316' },
  nextCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ECFFF3',
    borderWidth: 1.5,
    borderColor: '#A8F0BF',
    borderRadius: 20,
    padding: 20,
  },
  nextCardDone: { backgroundColor: '#F6F7F9', borderColor: '#D9DEE8' },
  nextCardLate: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  nextKicker: { color: '#16803A', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  nextKickerDone: { color: '#667085' },
  nextKickerLate: { color: '#C2410C' },
  nextName: { color: '#07070B', fontSize: 28, fontWeight: '900', marginTop: 12 },
  nextDose: { color: '#737B8C', fontSize: 16, fontWeight: '700', marginTop: 4 },
  nextTime: { color: '#0C8E3D', fontSize: 23, fontWeight: '900', marginTop: 8 },
  nextTimeLate: { color: '#C2410C' },
  lateMessage: { color: '#9A3412', fontSize: 14, fontWeight: '800', marginTop: 8 },
  confirmButton: {
    marginTop: 18,
    backgroundColor: '#18A84E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#18A84E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmButtonDone: { backgroundColor: '#17172B', shadowColor: '#17172B' },
  confirmButtonLate: { backgroundColor: '#EA580C', shadowColor: '#EA580C' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  listTitle: {
    color: '#A0A6B5',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  doseRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E9EF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...shadows.card,
  },
  doseRowDone: { opacity: 0.58, backgroundColor: '#FAFBFC' },
  doseRowActive: { borderColor: '#DCE1EA' },
  doseRowLate: { borderColor: '#FDBA74', backgroundColor: '#FFFBF7' },
  doseCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  doseCheckDone: { backgroundColor: '#EEF1F5' },
  doseCheckActive: { backgroundColor: '#17172B' },
  doseCheckLate: { backgroundColor: '#EA580C' },
  doseCheckText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  doseCheckTextDone: { color: '#C0C6D2' },
  doseRowInfo: { flex: 1 },
  doseRowName: { color: '#17172B', fontSize: 17, fontWeight: '900' },
  doseRowNameDone: { textDecorationLine: 'line-through', color: '#667085' },
  doseRowMeta: { color: '#8B94A6', fontSize: 13, fontWeight: '700', marginTop: 2 },
  doseRowMetaDone: { color: '#98A2B3' },
  lateBadge: { backgroundColor: '#FFEDD5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  lateBadgeText: { color: '#C2410C', fontSize: 12, fontWeight: '900' },
  emptyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    margin: 16,
    ...shadows.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ECFFF3',
    color: '#18A84E',
    textAlign: 'center',
    lineHeight: 58,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
