import { ReactNode } from 'react';

type SummaryItem = {
  label: string;
  value: ReactNode;
  helper?: string;
};

type SummaryGridProps = {
  items: SummaryItem[];
};

export function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <div className="summary-grid">
      {items.map((item) => (
        <div className="summary-card" key={item.label}>
          <span className="summary-label">{item.label}</span>
          <strong>{item.value}</strong>
          {item.helper && <small>{item.helper}</small>}
        </div>
      ))}
    </div>
  );
}