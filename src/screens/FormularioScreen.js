import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { atualizarMedicamento, criarMedicamento } from '../services/firestoreData';
import { colors, shadows } from '../theme';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function formatarHora(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function FormularioScreen({ navigation, route }) {
  const editando = route.params?.medicamento;

  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState(new Date());
  const [horarioManual, setHorarioManual] = useState(formatarHora(new Date()));

  useEffect(() => {
    if (editando) {
      setNome(editando.nome || '');
      setDose(editando.dose || '');
      setObservacoes(editando.observacoes || '');
      setHorarios(editando.horarios || []);
      setDiasSelecionados(editando.diasDaSemana || []);
    }
    navigation.setOptions({ title: editando ? 'Editar medicamento' : 'Novo medicamento' });
  }, []);

  const irParaHoje = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('Home');
    } else {
      navigation.navigate('Home');
    }
  };

  const adicionarHorarioValor = (valor) => {
    const h = valor.trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) {
      Alert.alert('Horário inválido', 'Informe um horário no formato HH:MM.');
      return;
    }
    if (horarios.includes(h)) {
      Alert.alert('Já adicionado', 'Esse horário já está na lista.');
      return;
    }
    setHorarios(prev => [...prev, h].sort());
    setMostrarPicker(false);
  };

  const onChangePicker = (event, date) => {
    if (Platform.OS === 'android') setMostrarPicker(false);
    if (event.type === 'dismissed') return;
    if (!date) return;

    const hora = formatarHora(date);
    setHorarioSelecionado(date);
    setHorarioManual(hora);

    if (Platform.OS === 'android') {
      adicionarHorarioValor(hora);
    }
  };

  const adicionarHorario = () => {
    const hora = Platform.OS === 'web' ? horarioManual : formatarHora(horarioSelecionado);
    adicionarHorarioValor(hora);
  };

  const toggleDia = (dia) =>
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );

  const salvar = async () => {
    if (!nome.trim()) { Alert.alert('Campo obrigatório', 'Informe o nome do medicamento.'); return; }
    if (!dose.trim()) { Alert.alert('Campo obrigatório', 'Informe a dose.'); return; }

    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        dose: dose.trim(),
        horarios,
        diasDaSemana: diasSelecionados,
        observacoes: observacoes.trim(),
      };

      if (editando) {
        await atualizarMedicamento(editando.id, dados);
        Alert.alert('Salvo!', 'Medicamento atualizado.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await criarMedicamento(dados);
        if (Platform.OS === 'web') {
          window.alert('Medicamento adicionado com sucesso.');
          irParaHoje();
        } else {
          Alert.alert('Cadastrado!', 'Medicamento adicionado com sucesso.', [
            { text: 'OK', onPress: irParaHoje },
          ]);
        }
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar.\nVerifique a configuração do Firebase.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.kicker}>{editando ? 'Editar rotina' : 'Nova rotina'}</Text>
        <Text style={styles.heroTitle}>Dados do medicamento</Text>
        <Text style={styles.heroSubtitle}>Organize nome, dose, horários e dias de uso.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identificação</Text>

        <Text style={styles.label}>Nome do medicamento *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Losartana"
          placeholderTextColor="#98A2B3"
        />

        <Text style={styles.label}>Dose *</Text>
        <TextInput
          style={styles.input}
          value={dose}
          onChangeText={setDose}
          placeholder="Ex: 50mg"
          placeholderTextColor="#98A2B3"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Horários</Text>
          <Text style={styles.counterText}>{horarios.length} selecionado(s)</Text>
        </View>

        <TouchableOpacity style={styles.btnHorario} onPress={() => setMostrarPicker(true)}>
          <Text style={styles.btnHorarioText}>
            {Platform.OS === 'web' ? 'Digitar horário' : 'Selecionar horário'}
          </Text>
        </TouchableOpacity>

        {mostrarPicker && Platform.OS === 'web' && (
          <View style={styles.manualTimeWrap}>
            <TextInput
              style={[styles.input, styles.manualTimeInput]}
              value={horarioManual}
              onChangeText={setHorarioManual}
              placeholder="08:00"
              placeholderTextColor="#98A2B3"
              keyboardType="numeric"
              maxLength={5}
            />
            <TouchableOpacity onPress={adicionarHorario} style={styles.btnConfirmarHorario}>
              <Text style={styles.btnConfirmarText}>Adicionar horário</Text>
            </TouchableOpacity>
          </View>
        )}

        {mostrarPicker && Platform.OS !== 'web' && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={horarioSelecionado}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangePicker}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.iosPickerBtns}>
                <TouchableOpacity onPress={() => setMostrarPicker(false)} style={styles.btnCancelar}>
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={adicionarHorario} style={styles.btnConfirmar}>
                  <Text style={styles.btnConfirmarText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!mostrarPicker && Platform.OS === 'web' && (
          <TouchableOpacity style={styles.btnAddHorario} onPress={adicionarHorario}>
            <Text style={styles.btnAddHorarioText}>Adicionar {horarioManual}</Text>
          </TouchableOpacity>
        )}

        {!mostrarPicker && Platform.OS === 'android' && (
          <TouchableOpacity style={styles.btnAddHorario} onPress={adicionarHorario}>
            <Text style={styles.btnAddHorarioText}>Adicionar {formatarHora(horarioSelecionado)}</Text>
          </TouchableOpacity>
        )}

        {horarios.length > 0 && (
          <View style={styles.tagsRow}>
            {horarios.map(h => (
              <TouchableOpacity key={h} style={styles.tag} onPress={() => setHorarios(horarios.filter(x => x !== h))}>
                <Text style={styles.tagText}>{h}  ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recorrência</Text>
        <Text style={styles.helperText}>Se nenhum dia for selecionado, o medicamento aparecerá todos os dias.</Text>
        <View style={styles.diasRow}>
          {DIAS.map(dia => (
            <TouchableOpacity
              key={dia}
              style={[styles.diaBtn, diasSelecionados.includes(dia) && styles.diaBtnAtivo]}
              onPress={() => toggleDia(dia)}
            >
              <Text style={[styles.diaBtnText, diasSelecionados.includes(dia) && styles.diaBtnTextAtivo]}>
                {dia}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observações</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Ex: tomar com água, em jejum..."
          placeholderTextColor="#98A2B3"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.btnSalvar, salvando && styles.disabled]}
        onPress={salvar}
        disabled={salvando}
      >
        {salvando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnSalvarText}>{editando ? 'Salvar alterações' : 'Cadastrar medicamento'}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 120 },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    ...shadows.card,
  },
  kicker: { fontSize: 12, fontWeight: '900', color: '#BFDBFE', textTransform: 'uppercase' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroSubtitle: { fontSize: 14, color: '#DCEBFF', marginTop: 6, lineHeight: 20, fontWeight: '600' },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  counterText: { fontSize: 12, color: colors.primary, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '800', color: colors.muted, marginTop: 16, marginBottom: 7 },
  input: {
    backgroundColor: '#FAFBFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { height: 92, textAlignVertical: 'top', marginTop: 12 },
  btnHorario: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnHorarioText: { fontSize: 15, color: '#fff', fontWeight: '900' },
  pickerWrap: { marginTop: 10 },
  manualTimeWrap: {
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: '100%',
    marginTop: 10,
  },
  manualTimeInput: {
    width: '100%',
    maxWidth: '100%',
    textAlign: 'center',
    fontWeight: '900',
  },
  btnConfirmarHorario: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    maxWidth: '100%',
  },
  btnAddHorario: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  btnAddHorarioText: { fontSize: 14, color: colors.primaryDark, fontWeight: '900' },
  iosPickerBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  btnCancelar: { padding: 12 },
  btnCancelarText: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  btnConfirmar: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, paddingHorizontal: 20 },
  btnConfirmarText: { fontSize: 16, color: '#fff', fontWeight: '800' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { backgroundColor: colors.tealSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { fontSize: 14, color: colors.teal, fontWeight: '900' },
  helperText: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  diaBtn: {
    minWidth: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FAFBFF',
    alignItems: 'center',
  },
  diaBtnAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaBtnText: { fontSize: 14, fontWeight: '900', color: colors.muted },
  diaBtnTextAtivo: { color: '#fff' },
  btnSalvar: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 17,
    alignItems: 'center',
    marginTop: 18,
    ...shadows.float,
  },
  disabled: { opacity: 0.7 },
  btnSalvarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
