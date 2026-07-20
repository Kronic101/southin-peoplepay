export const SAFETY_OBSERVATION_TYPES = [
  { label: 'Safe Act', value: 'SAFE_ACT' },
  { label: 'Unsafe Act', value: 'UNSAFE_ACT' },
  { label: 'Unsafe Condition', value: 'UNSAFE_CONDITION' },
  { label: 'PPE Non-Compliance', value: 'PPE_NON_COMPLIANCE' },
  { label: 'Environmental', value: 'ENVIRONMENTAL' },
  { label: 'Other', value: 'OTHER' },
];

export const SAFETY_INCIDENT_TYPES = [
  { label: 'Near Miss', value: 'NEAR_MISS' },
  { label: 'First Aid', value: 'FIRST_AID' },
  { label: 'Medical Treatment', value: 'MEDICAL_TREATMENT' },
  { label: 'Lost Time Injury', value: 'LTI' },
  { label: 'Fatality', value: 'FATALITY' },
  { label: 'Property Damage', value: 'PROPERTY_DAMAGE' },
  { label: 'Environmental', value: 'ENVIRONMENTAL' },
  { label: 'Other', value: 'OTHER' },
];

export const SAFETY_RISK_LEVELS = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' },
];

export function makeMobileId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function todayIso() {
  return new Date().toISOString();
}