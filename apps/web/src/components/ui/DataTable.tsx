import { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  title?: string;
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function DataTable<T>({
  title,
  columns,
  rows,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      {title && <h3>{title}</h3>}

      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row: any, index) => (
              <tr key={row.id || row.employeeId || row.employeeNumber || index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}