import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { firebaseConfigurado } from '../config/firebase';
import {
  buscarMedicamentos,
  buscarRegistrosPeriodo,
  getMedicamentosEmCache,
  getRegistrosPeriodoEmCache,
} from '../services/firestoreData';
import { colors, shadows } from '../theme';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function getUltimos7Dias() {
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dias.push(`${y}-${m}-${day}`);
  }
  return dias;
}

function formatarData(dataStr) {
  const hoje = new Date();
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  if (dataStr === fmt(hoje)) return 'Hoje';

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  if (dataStr === fmt(ontem)) return 'Ontem';

  const [y, m, d] = dataStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]}, ${d} de ${MESES[m - 1]}`;
}

function montarSecoes(dias, registros, medicamentos) {
  const medMap = {};
  medicamentos.forEach(medicamento => { medMap[medicamento.id] = medicamento; });

  const agrupado = {};
  dias.forEach(dia => { agrupado[dia] = []; });
  registros.forEach(reg => {
    if (agrupado[reg.data] !== undefined) {
      agrupado[reg.data].push(reg);
    }
  });

  return dias
    .filter(dia => agrupado[dia].length > 0)
    .reverse()
    .map(dia => ({
      title: dia,
      data: agrupado[dia].sort((a, b) => a.horario.localeCompare(b.horario)),
      medMap,
    }));
}

export default function HistoricoScreen() {
  const [secoes, setSecoes] = useState(() => {
    const dias = getUltimos7Dias();
    const dataInicio = dias[0];
    const dataFim = dias[dias.length - 1];
    const registrosCache = getRegistrosPeriodoEmCache(dataInicio, dataFim);
    const medicamentosCache = getMedicamentosEmCache();

    return registrosCache && medicamentosCache
      ? montarSecoes(dias, registrosCache, medicamentosCache)
      : [];
  });
  const [loading, setLoading] = useState(() => {
    const dias = getUltimos7Dias();
    const dataInicio = dias[0];
    const dataFim = dias[dias.length - 1];
    return !(getRegistrosPeriodoEmCache(dataInicio, dataFim) && getMedicamentosEmCache());
  });

  const carregarHistorico = useCallback(async () => {
    if (!firebaseConfigurado) { setLoading(false); return; }
    const dias = getUltimos7Dias();
    const dataInicio = dias[0];
    const dataFim = dias[dias.length - 1];
    const registrosCache = getRegistrosPeriodoEmCache(dataInicio, dataFim);
    const medicamentosCache = getMedicamentosEmCache();

    if (registrosCache && medicamentosCache) {
      setSecoes(montarSecoes(dias, registrosCache, medicamentosCache));
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [registros, medicamentos] = await Promise.all([
        buscarRegistrosPeriodo(dataInicio, dataFim),
        buscarMedicamentos(),
      ]);

      setSecoes(montarSecoes(dias, registros, medicamentos));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregarHistorico(); }, [carregarHistorico]));

  const renderItem = ({ item, section }) => {
    const med = section.medMap[item.medicamentoId];
    const nomeMed = med?.nome ?? 'Medicamento removido';
    const doseMed = med?.dose ?? '';
    return (
      <View style={styles.item}>
        <View style={[styles.itemIcone, item.tomado ? styles.iconeTomado : styles.iconePendente]}>
          <Text style={[styles.iconeText, item.tomado ? styles.iconeTextTomado : styles.iconeTextPendente]}>
            {item.tomado ? '✓' : '!'}
          </Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemNome}>{nomeMed}</Text>
          {!!doseMed && <Text style={styles.itemDose}>{doseMed}</Text>}
          {!!item.horario && <Text style={styles.itemHorario}>{item.horario}</Text>}
        </View>
        <View style={[styles.badge, item.tomado ? styles.badgeTomado : styles.badgePendente]}>
          <Text style={[styles.badgeText, item.tomado ? styles.badgeTextTomado : styles.badgeTextPendente]}>
            {item.tomado ? 'Tomado' : 'Não tomado'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }) => {
    const tomados = section.data.filter(r => r.tomado).length;
    const total = section.data.length;
    return (
      <View style={styles.secaoHeader}>
        <View>
          <Text style={styles.secaoTitulo}>{formatarData(section.title)}</Text>
          <Text style={styles.secaoSubtitulo}>{section.title}</Text>
        </View>
        <View style={styles.secaoResumoBadge}>
          <Text style={styles.secaoResumo}>{tomados}/{total}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>Acompanhamento</Text>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>Registros dos últimos 7 dias</Text>
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={secoes.length === 0 ? styles.emptyList : styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>0</Text>
            <Text style={styles.emptyTitle}>Nenhum registro nos últimos 7 dias</Text>
            <Text style={styles.emptyHint}>Use a aba Hoje para marcar os medicamentos tomados.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 },
  kicker: { fontSize: 12, color: colors.primary, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginTop: 2 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, fontWeight: '600' },
  listContent: { paddingBottom: 24 },
  emptyList: { flex: 1, padding: 16 },
  secaoHeader: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  secaoTitulo: { fontSize: 17, fontWeight: '900', color: colors.text },
  secaoSubtitulo: { fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: '700' },
  secaoResumoBadge: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  secaoResumo: { fontSize: 13, color: colors.primaryDark, fontWeight: '900' },
  item: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIcone: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconeTomado: { backgroundColor: colors.successSoft },
  iconePendente: { backgroundColor: colors.dangerSoft },
  iconeText: { fontSize: 18, fontWeight: '900' },
  iconeTextTomado: { color: colors.success },
  iconeTextPendente: { color: colors.danger },
  itemInfo: { flex: 1 },
  itemNome: { fontSize: 16, fontWeight: '800', color: colors.text },
  itemDose: { fontSize: 13, color: colors.muted, marginTop: 2, fontWeight: '600' },
  itemHorario: { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '800' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTomado: { backgroundColor: colors.successSoft },
  badgePendente: { backgroundColor: colors.dangerSoft },
  badgeText: { fontSize: 12, fontWeight: '900' },
  badgeTextTomado: { color: colors.success },
  badgeTextPendente: { color: colors.danger },
  emptyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    ...shadows.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 58,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
