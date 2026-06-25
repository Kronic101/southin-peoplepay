import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#071426',
  },
  danger: {
    backgroundColor: '#dc2626',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: '#ffffff',
    fontWeight: '900',
  },
});