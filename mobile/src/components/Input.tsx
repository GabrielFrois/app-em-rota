import { Feather } from '@expo/vector-icons';
import React, { useState, forwardRef } from 'react';
import {
  StyleSheet, Text, TextInput, TextInputProps,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { fontSize, fontWeight, radius, spacing } from '../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

const Input = forwardRef<TextInput, InputProps>(({
  label, error, containerStyle, isPassword = false, ...rest
}, ref) => {
  const colors = useColors();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused]       = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, marginBottom: spacing.xs }}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputRow,
        {
          borderColor:     isFocused ? colors.primary : error ? colors.danger : colors.border,
          backgroundColor: colors.inputBg,
        },
      ]}>
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(p => !p)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={{ fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  eyeBtn: { paddingLeft: spacing.sm },
});

export default Input;