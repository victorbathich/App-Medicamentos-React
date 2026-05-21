import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { excluirMedicamento } from '../services/firestoreData';
import { colors, shadows } from '../theme';
import { formatarErroFirebase } from '../utils/firebaseError';

export default function DetalhesScreen({ navigation, route }) {
  const { medicamento } = route.params;
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const confirmarExclusao = async () => {
    if (!medicamento?.id) {
      Alert.alert('Erro', 'Medicamento inválido.');
      return;
    }

    setExcluindo(true);
    setConfirmandoExclusao(false);
    try {
      await excluirMedicamento(medicamento.id);
      Alert.alert('Excluído!', 'Medicamento removido com sucesso.', [
        { text: 'OK', onPress: () => navigation.navigate('Lista') },
      ]);
    } catch (e) {
      Alert.alert('Erro', formatarErroFirebase(e, 'Nao foi possivel excluir o medicamento.'));
      return;
    } finally {
      setExcluindo(false);
    }
  };

  const excluir = () => {
    setConfirmandoExclusao(true);
  };

  return (
    <View style={styles.container}>
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

    {confirmandoExclusao && (
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIcon}>
            <Text style={styles.modalIconText}>!</Text>
          </View>
          <Text style={styles.modalTitle}>Excluir medicamento?</Text>
          <Text style={styles.modalText}>
            Essa ação remove "{medicamento.nome}" da rotina e apaga os registros dele no histórico.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setConfirmandoExclusao(false)}
              disabled={excluindo}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalDeleteText}>Excluir</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}
    </View>
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    zIndex: 20,
    elevation: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.float,
  },
  modalIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIconText: { color: colors.danger, fontSize: 28, fontWeight: '900' },
  modalTitle: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: colors.text, fontSize: 15, fontWeight: '900' },
  modalDeleteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
