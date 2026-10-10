import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { lightColors, fontSize, fontWeight, radius, spacing } from '../styles/theme';

type Colors = typeof lightColors;

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  colors: Colors;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible, title, message, confirmLabel = 'Confirmar',
  confirmDanger = false, onConfirm, onCancel, colors,
}) => {
  const s = useMemo(() => StyleSheet.create({
    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    sheet:      { width: '100%', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
    title:      { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
    message:    { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
    btns:       { flexDirection: 'row', gap: spacing.sm },
    cancelBtn:  { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
    cancelText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary },
    confirmBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
    confirmText:{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: 'white' },
  }), [colors]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <View style={s.sheet}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.btns}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirmBtn, confirmDanger && { backgroundColor: colors.danger }]}
              onPress={onConfirm}
            >
              <Text style={s.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ConfirmModal;