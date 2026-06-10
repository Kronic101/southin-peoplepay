import { ReactNode } from 'react';

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-row">{children}</div>;
}