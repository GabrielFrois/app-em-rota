import { lightColors, darkColors } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';

export const useColors = () => {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
};