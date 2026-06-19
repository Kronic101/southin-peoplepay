export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert('No records available to export.');
    return;
  }

  const headers = Object.keys(rows[0]);

  const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) return '';

    const text = String(value).replace(/"/g, '""');

    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text}"`;
    }

    return text;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}