import React from 'react';
import {
  ActivityIndicator, StyleSheet, Text, TextStyle,
  TouchableOpacity, ViewStyle,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import { fontSize, fontWeight, radius, spacing } from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title, onPress,
  variant = 'primary', size = 'md',
  loading = false, disabled = false,
  style, textStyle,
}) => {
  const colors     = useColors();
  const isDisabled = disabled || loading;

  const bgColor = {
    primary: colors.primary,
    outline: 'transparent',
    ghost:   'transparent',
    danger:  colors.danger,
  }[variant];

  const textColor = {
    primary: colors.white,
    outline: colors.primary,
    ghost:   colors.primary,
    danger:  colors.white,
  }[variant];

  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizes[size],
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0, opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} size="small" />
      ) : (
        <Text style={[styles.text, fontSizes[size], { color: textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  text: { fontWeight: fontWeight.semibold },
});

const sizes: Record<string, ViewStyle> = {
  sm: { paddingVertical: spacing.xs,     paddingHorizontal: spacing.md, minHeight: 36 },
  md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg, minHeight: 48 },
  lg: { paddingVertical: spacing.md,     paddingHorizontal: spacing.xl, minHeight: 56 },
};

const fontSizes: Record<string, TextStyle> = {
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.md },
  lg: { fontSize: fontSize.lg },
};

export default Button;