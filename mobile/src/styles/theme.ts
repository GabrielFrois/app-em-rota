export const lightColors = {
  primary:       '#2D6BE4',
  primaryDark:   '#1A4DB8',
  primaryLight:  '#EBF1FD',
  accent:        '#FF6B35',
  success:       '#27AE60',
  warning:       '#F2994A',
  danger:        '#E53935',
  upcoming:      '#2D6BE4',
  traveling:     '#27AE60',
  completed:     '#9E9E9E',
  white:         '#FFFFFF',
  background:    '#F5F7FB',
  surface:       '#FFFFFF',
  border:        '#E0E6F0',
  divider:       '#F0F3F8',
  textPrimary:   '#1A1D2E',
  textSecondary: '#6B7280',
  textDisabled:  '#B0B7C3',
  tabActive:     '#2D6BE4',
  tabInactive:   '#9E9E9E',
  card:          '#FFFFFF',
  inputBg:       '#FFFFFF',
  modalBg:       '#FFFFFF',
};

export const darkColors = {
  primary:       '#4D8EFF',
  primaryDark:   '#2D6BE4',
  primaryLight:  '#1A2A4A',
  accent:        '#FF6B35',
  success:       '#2ECC71',
  warning:       '#F2994A',
  danger:        '#FF5252',
  upcoming:      '#4D8EFF',
  traveling:     '#2ECC71',
  completed:     '#6B7280',
  white:         '#1A1D2E',
  background:    '#0F1117',
  surface:       '#1A1D2E',
  border:        '#2D3148',
  divider:       '#1E2235',
  textPrimary:   '#F0F2FF',
  textSecondary: '#9BA3C0',
  textDisabled:  '#4A5070',
  tabActive:     '#4D8EFF',
  tabInactive:   '#4A5070',
  card:          '#1A1D2E',
  inputBg:       '#1E2235',
  modalBg:       '#1A1D2E',
};

// Exportação padrão mantida para arquivos que ainda não usam ThemeContext
export const colors = lightColors;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const fontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30,
};

export const fontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
};