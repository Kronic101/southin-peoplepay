'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createSafetyCorrectiveAction } from '@/lib/safety-api';

type Props = {
  sourceType?: string;
  sourceId?: string;
  sourceNo?: string;
};

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function SafetyCorrectiveActionForm({
  sourceType = '',
  sourceId = '',
  sourceNo = '',
}: Props) {
  const router = useRouter();

  const [selectedSourceType, setSelectedSourceType] = useState(sourceType);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError('');

    const form = new FormData(event.currentTarget);

    const body = {
      sourceType: selectedSourceType || String(form.get('sourceType') || '').trim(),
      sourceId: String(form.get('sourceId') || '').trim(),

      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      priority: String(form.get('priority') || '').trim(),

      assignedToName: String(form.get('assignedToName') || '').trim(),
      assignedToEmail: String(form.get('assignedToEmail') || '').trim(),
      dueDate: String(form.get('dueDate') || '').trim(),

      createdBy: String(form.get('createdBy') || '').trim(),
      createdByEmail: String(form.get('createdByEmail') || '').trim(),
    };

    try {
      await createSafetyCorrectiveAction(body);
      router.push('/safety/actions');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create corrective action.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error ? <div className="finance-notice danger">{error}</div> : null}

      {sourceNo ? (
        <div className="finance-notice warning">
          Creating corrective action linked to <strong>{sourceNo}</strong>.
        </div>
      ) : null}

      <form className="finance-card form-grid" onSubmit={handleSubmit}>
        <label>
          Source Type
          <select
            name="sourceType"
            value={selectedSourceType}
            onChange={(event) => setSelectedSourceType(event.target.value)}
            required
          >
            <option value="">Select source type</option>
            <option value="SAFETY_OBSERVATION">Safety Observation</option>
            <option value="SAFETY_INCIDENT">Safety Incident</option>
          </select>
        </label>

        <label>
          Source Record ID
          <input
            name="sourceId"
            defaultValue={sourceId}
            placeholder="Observation or incident UUID"
            required
          />
        </label>

        <label className="form-span-2">
          Action Title
          <input
            name="title"
            placeholder="Example: Install barricade around scaffold area"
            required
          />
        </label>

        <label className="form-span-2">
          Description
          <textarea
            name="description"
            rows={4}
            placeholder="Describe the corrective or preventive action required."
            required
          />
        </label>

        <label>
          Priority
          <select name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>

        <label>
          Due Date
          <input name="dueDate" type="date" defaultValue={todayPlusDays(7)} />
        </label>

        <label>
          Assigned To Name
          <input name="assignedToName" placeholder="Person responsible" />
        </label>

        <label>
          Assigned To Email
          <input name="assignedToEmail" type="email" placeholder="name@southincon.com" />
        </label>

        <label>
          Created By
          <input name="createdBy" defaultValue="Chongo Mwesa" />
        </label>

        <label>
          Created By Email
          <input
            name="createdByEmail"
            type="email"
            defaultValue="chongomwesa@southincon.com"
          />
        </label>

        <div className="form-span-2 action-row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Corrective Action'}
          </button>

          <Link className="btn-secondary" href="/safety/actions">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}