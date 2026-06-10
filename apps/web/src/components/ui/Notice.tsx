import { ReactNode } from 'react';

type NoticeProps = {
  children: ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'warning';
};

export function Notice({ children, tone = 'default' }: NoticeProps) {
  const className =
    tone === 'success'
      ? 'notice success'
      : tone === 'danger'
        ? 'notice danger'
        : tone === 'warning'
          ? 'notice warning'
          : 'notice';

  return <div className={className}>{children}</div>;
}