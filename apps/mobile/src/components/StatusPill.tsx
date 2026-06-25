import { StyleSheet, Text } from 'react-native';

type Props = {
  status?: string | null;
};

export default function StatusPill({ status }: Props) {
  const value = String(status || 'UNKNOWN').toUpperCase();

  const tone =
    ['ACTIVE', 'APPROVED', 'POSTED', 'COMPLETED', 'CLOSED', 'SAFE'].includes(value)
      ? 'success'
      : ['OPEN', 'PENDING', 'PLANNED', 'IN_PROGRESS', 'REQUIRED'].includes(value)
        ? 'warning'
        : ['REJECTED', 'FAILED', 'NOT_SAFE', 'DANGER'].includes(value)
          ? 'danger'
          : 'neutral';

  return <Text style={[styles.pill, styles[tone]]}>{value}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  warning: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  danger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  neutral: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
});