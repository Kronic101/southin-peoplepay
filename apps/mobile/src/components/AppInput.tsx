import { Text, TextInput, TextInputProps, StyleSheet, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
};

export default function AppInput({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    color: '#020617',
    fontWeight: '900',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#020617',
    fontWeight: '700',
  },
});