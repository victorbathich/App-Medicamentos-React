import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { firebaseConfigurado } from '../config/firebase';
import {
  buscarMedicamentos as buscarMedicamentosFirestore,
  getMedicamentosEmCache,
} from '../services/firestoreData';
import { colors, shadows } from '../theme';
import { formatarErroFirebase } from '../utils/firebaseError';

export default function MedicamentosScreen({ navigation }) {
  const [medicamentos, setMedicamentos] = useState(() => getMedicamentosEmCache() || []);
  const [loading, setLoading] = useState(() => getMedicamentosEmCache() === null);

  const buscarMedicamentos = useCallback(async () => {
    if (!firebaseConfigurado) {
      setLoading(false);
      return;
    }
    const cache = getMedicamentosEmCache();
    if (cache) {
      setMedicamentos(cache);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      setMedicamentos(await buscarMedicamentosFirestore());
    } catch (e) {
      Alert.alert('Erro', formatarErroFirebase(e, 'Nao foi possivel carregar os medicamentos.'));
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { buscarMedicamentos(); }, [buscarMedicamentos]));

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.86}
      style={styles.card}
      onPress={() => navigation.navigate('Detalhes', { medicamento: item })}
    >
      <View style={styles.cardTop}>
        <View style={styles.initialCircle}>
          <Text style={styles.initialText}>{item.nome?.charAt(0)?.toUpperCase() || 'M'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.dose}>{item.dose}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillText}>
            {item.horarios?.length ? `${item.horarios.length} horário(s)` : 'Sem horário'}
          </Text>
        </View>
        <Text style={styles.horarios}>
          {item.horarios?.length > 0 ? item.horarios.join('  •  ') : 'Uso sob demanda'}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.kicker}>Cadastro</Text>
        <Text style={styles.title}>Medicamentos</Text>
        <Text style={styles.subtitle}>{medicamentos.length} item(ns) na rotina</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Formulario')}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel="Adicionar medicamento"
        >
          <Text style={styles.addButtonText}>Adicionar medicamento</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={medicamentos}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={medicamentos.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {!firebaseConfigurado ? (
              <>
                <Text style={styles.emptyIcon}>!</Text>
                <Text style={styles.emptyTitle}>Firebase não configurado</Text>
                <Text style={styles.emptyHint}>Configure as credenciais em src/config/firebase.js.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Nenhum medicamento cadastrado</Text>
                <Text style={styles.emptyHint}>Adicione o primeiro medicamento para criar a rotina.</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  headerBlock: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  kicker: { fontSize: 12, color: colors.primary, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginTop: 2 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, fontWeight: '600' },
  addButton: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...shadows.float,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  listContent: { paddingBottom: 28 },
  emptyList: { flex: 1, padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginVertical: 7,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  initialCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialText: { color: colors.teal, fontWeight: '900', fontSize: 20 },
  cardInfo: { flex: 1 },
  nome: { fontSize: 18, fontWeight: '900', color: colors.text },
  dose: { fontSize: 14, color: colors.muted, marginTop: 3, fontWeight: '600' },
  chevron: { fontSize: 30, color: '#A6B0C3', marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  metaPill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  metaPillText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  horarios: { flex: 1, color: colors.muted, fontSize: 13, fontWeight: '600', marginLeft: 10 },
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
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
