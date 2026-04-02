export const QUICK_QUESTIONS = [
  "What's my latest blood sugar?",
  'Any concerning values?',
  'How is my cholesterol?',
  'Compare with last report',
  "What's my vitamin D level?",
];

export const BIOMARKER_CATEGORY_ORDER = [
  'Diabetes Panel',
  'Lipid Panel',
  'Kidney Panel',
  'Liver Panel',
  'Thyroid Panel',
  'Blood Count',
  'Vitamins & Minerals',
  'Other',
];

export const STATUS_LABEL: Record<string, string> = {
  normal:     'Normal',
  borderline: 'Borderline',
  high:       'High',
  low:        'Low',
};

export const TREND_ICON: Record<string, string> = {
  improving: '↓',
  worsening: '↑',
  stable:    '→',
  new:       '•',
};

export const PROCESSING_STATUS_LABEL: Record<string, string> = {
  pending:    'Pending',
  processing: 'Processing',
  done:       'Done',
  failed:     'Failed',
};

export const RELATIONSHIP_OPTIONS = [
  { value: 'mother',      label: 'Mother' },
  { value: 'father',      label: 'Father' },
  { value: 'spouse',      label: 'Spouse / Partner' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'other',       label: 'Other' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
] as const;
