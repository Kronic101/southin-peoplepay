import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  style?: ViewStyle;
}>;

export default function AppCard({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 18,
    marginBottom: 14,
  },
});