'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import { createStoresRequisition } from '@/lib/stores-api';

type LineForm = {
  itemCode: string;
  itemName: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  notes: string;
};

const emptyLine: LineForm = {
  itemCode: '',
  itemName: '',
  description: '',
  quantity: '1',
  unitCost: '0',
  unitOfMeasure: 'EA',
  notes: '',
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `K ${asNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function NewStoresRequisitionPage() {
  const router = useRouter();

  const [requestedBy, setRequestedBy] = useState('Requester Test');
  const [requestedByEmail, setRequestedByEmail] = useState('requester@southincon.com');
  const [department, setDepartment] = useState('Operations');
  const [site, setSite] = useState('Solwezi Head Office');
  const [branch, setBranch] = useState('KMDC');
  const [projectCode, setProjectCode] = useState('');
  const [reason, setReason] = useState('');

  const [lines, setLines] = useState<LineForm[]>([
    {
      ...emptyLine,
      itemCode: 'PPE-GLOVES',
      itemName: 'Safety Gloves',
      quantity: '10',
      unitCost: '25',
      unitOfMeasure: 'PAIR',
      notes: 'Safety gloves issue',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totalValue = useMemo(() => {
    return lines.reduce((sum, line) => {
      return sum + asNumber(line.quantity) * asNumber(line.unitCost);
    }, 0);
  }, [lines]);

  function updateLine(index: number, key: keyof LineForm, value: string) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  }

  function addLine() {
    setLines((current) => [...current, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((current) => {
      if (current.length === 1) return current;
      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!requestedBy.trim()) {
        throw new Error('Requested By is required.');
      }

      if (!department.trim()) {
        throw new Error('Department is required.');
      }

      if (!site.trim()) {
        throw new Error('Site is required.');
      }

      if (!reason.trim()) {
        throw new Error('Reason is required.');
      }

      const cleanLines = lines
        .filter((line) => line.itemName.trim())
        .map((line) => ({
          itemCode: line.itemCode.trim() || null,
          itemName: line.itemName.trim(),
          description: line.description.trim() || null,
          quantity: asNumber(line.quantity),
          unitCost: asNumber(line.unitCost),
          unitOfMeasure: line.unitOfMeasure.trim() || 'EA',
          notes: line.notes.trim() || null,
        }));

      if (!cleanLines.length) {
        throw new Error('Add at least one requisition line.');
      }

      const result = await createStoresRequisition({
        requestedBy: requestedBy.trim(),
        requestedByEmail: requestedByEmail.trim() || null,
        department: department.trim(),
        site: site.trim(),
        branch: branch.trim() || null,
        projectCode: projectCode.trim() || null,
        reason: reason.trim(),
        lines: cleanLines,
      });

      setMessage(`Requisition ${result.requisition.requisitionNo} submitted successfully.`);

      router.push(`/stores/requisitions/${result.requisition.id}`);
    } catch (err: any) {
      setError(err?.message || 'Unable to submit stores requisition.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <RequireStaffRole
        allowedRoles={[
          'ADMIN',
          'DIRECTOR',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
          'ASSET_MANAGER',
          'LINE_MANAGER',
          'SUPERVISOR',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Stores Management</p>
              <h1>New Stores Requisition</h1>
              <p className="muted">
                Submit a stores request for approval through Site Manager, Operations, Branch,
                Administration and Director of Operations.
              </p>
            </div>

            <div className="action-row">
              <Link className="btn-secondary" href="/stores/requisitions">
                Back to Requisitions
              </Link>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            <div className="finance-card">
              <h2>Requester Details</h2>

              <div className="form-grid">
                <label>
                  Requested By
                  <input
                    value={requestedBy}
                    onChange={(event) => setRequestedBy(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Requester Email
                  <input
                    value={requestedByEmail}
                    onChange={(event) => setRequestedByEmail(event.target.value)}
                    placeholder="requester@southincon.com"
                  />
                </label>

                <label>
                  Department
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Site
                  <input
                    value={site}
                    onChange={(event) => setSite(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Branch
                  <input
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    placeholder="KMDC"
                  />
                </label>

                <label>
                  Project Code
                  <input
                    value={projectCode}
                    onChange={(event) => setProjectCode(event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Reason
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="e.g. Issue PPE to site team"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="finance-card">
              <div className="section-title-row">
                <div>
                  <h2>Requisition Lines</h2>
                  <p className="muted">Add the items being requested from stores.</p>
                </div>

                <button className="btn-secondary" type="button" onClick={addLine}>
                  Add Line
                </button>
              </div>

              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>UOM</th>
                      <th>Unit Cost</th>
                      <th>Total</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={`line-${index}`}>
                        <td>
                          <input
                            value={line.itemCode}
                            onChange={(event) => updateLine(index, 'itemCode', event.target.value)}
                            placeholder="PPE-GLOVES"
                          />
                        </td>

                        <td>
                          <input
                            value={line.itemName}
                            onChange={(event) => updateLine(index, 'itemName', event.target.value)}
                            placeholder="Safety Gloves"
                            required
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </td>

                        <td>
                          <input
                            value={line.unitOfMeasure}
                            onChange={(event) =>
                              updateLine(index, 'unitOfMeasure', event.target.value)
                            }
                            placeholder="EA"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            value={line.unitCost}
                            onChange={(event) => updateLine(index, 'unitCost', event.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </td>

                        <td>
                          <strong>{money(asNumber(line.quantity) * asNumber(line.unitCost))}</strong>
                        </td>

                        <td>
                          <input
                            value={line.notes}
                            onChange={(event) => updateLine(index, 'notes', event.target.value)}
                            placeholder="Optional"
                          />
                        </td>

                        <td>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => removeLine(index)}
                            disabled={lines.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="finance-summary-grid" style={{ marginTop: '1rem' }}> 
                <div className="finance-summary-card">
                  <span>Total Lines</span>
                  <strong>{lines.length}</strong>
                </div>

                <div className="finance-summary-card">
                  <span>Total Value</span>
                  <strong>{money(totalValue)}</strong>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Requisition'}
                </button>

                <Link className="btn-secondary" href="/stores/requisitions">
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}