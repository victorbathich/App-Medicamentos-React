import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { excluirMedicamento } from '../services/firestoreData';
import { colors, shadows } from '../theme';

export default function DetalhesScreen({ navigation, route }) {
  const { medicamento } = route.params;
  const [excluindo, setExcluindo] = useState(false);

  const confirmarExclusao = async () => {
    if (!medicamento?.id) {
      Alert.alert('Erro', 'Medicamento inválido.');
      return;
    }

    setExcluindo(true);
    try {
      await excluirMedicamento(medicamento.id);
      Alert.alert('Excluído!', 'Medicamento removido com sucesso.', [
        { text: 'OK', onPress: () => navigation.navigate('Lista') },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível excluir o medicamento.');
    } finally {
      setExcluindo(false);
    }
  };

  const excluir = () => {
    if (Platform.OS === 'web') {
      const confirmado = window.confirm(`Tem certeza que deseja excluir "${medicamento.nome}"?`);
      if (confirmado) confirmarExclusao();
      return;
    }

    Alert.alert(
      'Excluir medicamento',
      `Tem certeza que deseja excluir "${medicamento.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: confirmarExclusao },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.initialCircle}>
          <Text style={styles.initialText}>{medicamento.nome?.charAt(0)?.toUpperCase() || 'M'}</Text>
        </View>
        <Text style={styles.nome}>{medicamento.nome}</Text>
        <Text style={styles.dose}>{medicamento.dose}</Text>
      </View>

      <View style={styles.card}>
        {medicamento.horarios?.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Horários</Text>
            <View style={styles.tagsRow}>
              {medicamento.horarios.map(h => (
                <View key={h} style={styles.tag}>
                  <Text style={styles.tagText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {medicamento.diasDaSemana?.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Dias da semana</Text>
            <View style={styles.tagsRow}>
              {medicamento.diasDaSemana.map(d => (
                <View key={d} style={[styles.tag, styles.tagSoft]}>
                  <Text style={[styles.tagText, styles.tagTextSoft]}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!!medicamento.observacoes && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Observações</Text>
            <Text style={styles.observacoes}>{medicamento.observacoes}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.btnEditar}
        onPress={() => navigation.navigate('Formulario', { medicamento })}
        disabled={excluindo}
      >
        <Text style={styles.btnEditarText}>Editar medicamento</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnExcluir, excluindo && styles.btnDesabilitado]}
        onPress={excluir}
        disabled={excluindo}
      >
        {excluindo
          ? <ActivityIndicator color={colors.danger} />
          : <Text style={styles.btnExcluirText}>Excluir medicamento</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 42 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 20,
    alignItems: 'flex-start',
    ...shadows.card,
  },
  initialCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  initialText: { color: '#fff', fontWeight: '900', fontSize: 24 },
  nome: { fontSize: 28, fontWeight: '900', color: '#fff' },
  dose: { fontSize: 17, color: '#DCEBFF', marginTop: 6, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    marginTop: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  secao: { marginBottom: 20 },
  secaoTitulo: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tagSoft: { backgroundColor: colors.tealSoft },
  tagText: { fontSize: 14, color: colors.primaryDark, fontWeight: '900' },
  tagTextSoft: { color: colors.teal },
  observacoes: { fontSize: 15, color: colors.muted, lineHeight: 22, fontWeight: '600' },
  btnEditar: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    ...shadows.float,
  },
  btnEditarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  btnExcluir: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDesabilitado: { opacity: 0.65 },
  btnExcluirText: { fontSize: 16, fontWeight: '900', color: colors.danger },
});
