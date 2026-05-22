import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { atualizarMedicamento, criarMedicamento } from '../services/firestoreData';
import { colors, shadows } from '../theme';
import { formatarErroFirebase } from '../utils/firebaseError';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const UNIDADES_DOSE = ['mg', 'ml'];

function separarDose(valor = '') {
  const doseTexto = String(valor).trim();
  const match = doseTexto.match(/^(.+?)\s*(mg|ml)$/i);

  if (!match) {
    return { quantidade: doseTexto, unidade: 'mg' };
  }

  return {
    quantidade: match[1].trim(),
    unidade: match[2].toLowerCase(),
  };
}

function formatarHora(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function ajustarHoraTexto(valor, tipo, passo) {
  const [horaTexto = '00', minutoTexto = '00'] = valor.split(':');
  let hora = Number.parseInt(horaTexto, 10);
  let minuto = Number.parseInt(minutoTexto, 10);

  if (Number.isNaN(hora)) hora = 0;
  if (Number.isNaN(minuto)) minuto = 0;

  if (tipo === 'hora') {
    hora = (hora + passo + 24) % 24;
  } else {
    minuto = (minuto + passo + 60) % 60;
  }

  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function aplicarParteHorario(valor, tipo, novoValor) {
  const numeros = novoValor.replace(/\D/g, '').slice(0, 2);
  const limite = tipo === 'hora' ? 23 : 59;
  const numero = Math.min(Number.parseInt(numeros || '0', 10), limite);
  const [horaTexto = '00', minutoTexto = '00'] = valor.split(':');
  const parte = String(numero).padStart(2, '0');

  return tipo === 'hora'
    ? `${parte}:${minutoTexto.padStart(2, '0').slice(0, 2)}`
    : `${horaTexto.padStart(2, '0').slice(0, 2)}:${parte}`;
}

export default function FormularioScreen({ navigation, route }) {
  const editando = route.params?.medicamento;

  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [unidadeDose, setUnidadeDose] = useState('mg');
  const [observacoes, setObservacoes] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState(new Date());
  const [horarioManual, setHorarioManual] = useState(formatarHora(new Date()));
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);
  const [sucessoCadastro, setSucessoCadastro] = useState(false);

  useEffect(() => {
    if (editando) {
      const doseAtual = separarDose(editando.dose);
      setNome(editando.nome || '');
      setDose(doseAtual.quantidade);
      setUnidadeDose(doseAtual.unidade);
      setObservacoes(editando.observacoes || '');
      setHorarios(editando.horarios || []);
      setDiasSelecionados(editando.diasDaSemana || []);
    }
    navigation.setOptions({ title: editando ? 'Editar medicamento' : 'Novo medicamento' });
  }, []);

  const resetarFormulario = () => {
    const agora = new Date();

    setNome('');
    setDose('');
    setUnidadeDose('mg');
    setObservacoes('');
    setHorarios([]);
    setDiasSelecionados([]);
    setMostrarPicker(false);
    setHorarioSelecionado(agora);
    setHorarioManual(formatarHora(agora));
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

  const ajustarHorarioManual = (tipo, passo) => {
    setHorarioManual(atual => ajustarHoraTexto(atual, tipo, passo));
  };

  const editarParteHorario = (tipo, valor) => {
    setHorarioManual(atual => aplicarParteHorario(atual, tipo, valor));
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
        dose: `${dose.trim()}${unidadeDose}`,
        horarios,
        diasDaSemana: diasSelecionados,
        observacoes: observacoes.trim(),
      };

      if (editando) {
        await atualizarMedicamento(editando.id, dados);
        setSucessoCadastro(false);
        setSalvoComSucesso(true);
      } else {
        await criarMedicamento(dados);
        setSucessoCadastro(true);
        setSalvoComSucesso(true);
      }
    } catch (e) {
      Alert.alert('Erro', formatarErroFirebase(e, 'Nao foi possivel salvar.'));
      return;
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.doseRow}>
          <TextInput
            style={[styles.input, styles.doseInput]}
            value={dose}
            onChangeText={setDose}
            placeholder="Ex: 50"
            placeholderTextColor="#98A2B3"
            keyboardType="numeric"
          />
          <View style={styles.unitSelector}>
            {UNIDADES_DOSE.map(unidade => {
              const ativo = unidadeDose === unidade;
              return (
                <TouchableOpacity
                  key={unidade}
                  style={[styles.unitButton, ativo && styles.unitButtonActive]}
                  onPress={() => setUnidadeDose(unidade)}
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                >
                  <Text style={[styles.unitButtonText, ativo && styles.unitButtonTextActive]}>
                    {unidade}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Horários</Text>
          <Text style={styles.counterText}>{horarios.length} selecionado(s)</Text>
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.timeSelector}>
            <View style={styles.timePickerRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Hora</Text>
                <TouchableOpacity style={styles.timeAdjustButton} onPress={() => ajustarHorarioManual('hora', 1)}>
                  <Text style={styles.timeAdjustText}>+</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.timeValueInput}
                  value={horarioManual.split(':')[0]}
                  onChangeText={valor => editarParteHorario('hora', valor)}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus
                  accessibilityLabel="Hora"
                />
                <TouchableOpacity style={styles.timeAdjustButton} onPress={() => ajustarHorarioManual('hora', -1)}>
                  <Text style={styles.timeAdjustText}>-</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeColumn}>
                <Text style={styles.timeLabel}>Min</Text>
                <TouchableOpacity style={styles.timeAdjustButton} onPress={() => ajustarHorarioManual('minuto', 1)}>
                  <Text style={styles.timeAdjustText}>+</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.timeValueInput}
                  value={horarioManual.split(':')[1]}
                  onChangeText={valor => editarParteHorario('minuto', valor)}
                  keyboardType="numeric"
                  maxLength={2}
                  selectTextOnFocus
                  accessibilityLabel="Minuto"
                />
                <TouchableOpacity style={styles.timeAdjustButton} onPress={() => ajustarHorarioManual('minuto', -1)}>
                  <Text style={styles.timeAdjustText}>-</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={adicionarHorario} style={styles.btnConfirmarHorario}>
              <Text style={styles.btnConfirmarText}>Adicionar {horarioManual}</Text>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.btnHorario} onPress={() => setMostrarPicker(true)}>
            <Text style={styles.btnHorarioText}>Escolher outro horário</Text>
          </TouchableOpacity>
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
    {salvoComSucesso && (
      <View style={styles.successOverlay}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            {sucessoCadastro ? 'Medicamento cadastrado!' : 'Salvo com sucesso!'}
          </Text>
          <Text style={styles.successText}>
            {sucessoCadastro
              ? 'O medicamento foi adicionado a rotina.'
              : 'As alteracoes do medicamento foram atualizadas.'}
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              setSalvoComSucesso(false);
              if (sucessoCadastro) {
                setSucessoCadastro(false);
                resetarFormulario();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Lista' }],
                });
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Lista' }],
                });
              }
            }}
          >
            <Text style={styles.successButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </View>
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
  doseRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  doseInput: { flex: 1 },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitButton: {
    minWidth: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  unitButtonActive: { backgroundColor: colors.primary },
  unitButtonText: { fontSize: 14, color: colors.primaryDark, fontWeight: '900' },
  unitButtonTextActive: { color: '#fff' },
  textArea: { height: 92, textAlignVertical: 'top', marginTop: 12 },
  timeSelector: {
    marginTop: 14,
    backgroundColor: '#FAFBFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
    maxWidth: 116,
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: { fontSize: 12, color: colors.muted, fontWeight: '900', textTransform: 'uppercase' },
  timeAdjustButton: {
    width: '100%',
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeAdjustText: { color: colors.primaryDark, fontSize: 24, fontWeight: '900', lineHeight: 26 },
  timeValueInput: {
    width: '100%',
    minHeight: 42,
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    textAlign: 'center',
    borderRadius: 12,
    paddingVertical: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSeparator: { color: colors.muted, fontSize: 30, fontWeight: '900', paddingTop: 26 },
  btnHorario: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnHorarioText: { fontSize: 15, color: '#fff', fontWeight: '900' },
  pickerWrap: { marginTop: 10 },
  btnConfirmarHorario: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
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
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    zIndex: 20,
    elevation: 20,
  },
  successCard: {
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
  successIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIconText: { color: colors.success, fontSize: 28, fontWeight: '900' },
  successTitle: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  successText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  successButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  successButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
