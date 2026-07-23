import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  closeSafetyCorrectiveAction,
  completeSafetyCorrectiveAction,
  getSafetyCorrectiveAction,
  verifySafetyCorrectiveAction,
} from '@/lib/safety-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function sourceLabel(action: any) {
  if (action?.observation?.observationNo) return action.observation.observationNo;
  if (action?.incident?.incidentNo) return action.incident.incidentNo;
  return action?.sourceId || '-';
}

function sourceDescription(action: any) {
  return (
    action?.observation?.description ||
    action?.incident?.description ||
    action?.sourceType ||
    '-'
  );
}

async function completeAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') || '');
  const notes = String(formData.get('notes') || '');

  await completeSafetyCorrectiveAction(id, {
    notes,
    actionedBy: 'Southin Hub User',
  });

  revalidatePath('/safety/actions');
  revalidatePath(`/safety/actions/${id}`);
  redirect(`/safety/actions/${id}`);
}

async function verifyAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') || '');
  const notes = String(formData.get('notes') || '');

  await verifySafetyCorrectiveAction(id, {
    notes,
    verifiedBy: 'Southin Hub User',
  });

  revalidatePath('/safety/actions');
  revalidatePath(`/safety/actions/${id}`);
  redirect(`/safety/actions/${id}`);
}

async function closeAction(formData: FormData) {
  'use server';

  const id = String(formData.get('id') || '');
  const notes = String(formData.get('notes') || '');

  await closeSafetyCorrectiveAction(id, {
    notes,
    closedBy: 'Southin Hub User',
  });

  revalidatePath('/safety/actions');
  revalidatePath(`/safety/actions/${id}`);
  redirect(`/safety/actions/${id}`);
}

export default async function SafetyCorrectiveActionDetailPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const action: any = await getSafetyCorrectiveAction(resolvedParams.id);

  const status = displayValue(action?.status, 'OPEN');

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>{action?.actionNo || 'Corrective Action'}</h1>
            <p className="muted">
              Review, complete, verify and close corrective actions raised from safety observations
              and incidents.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety/actions">
              Back to Actions
            </Link>
            <Link className="btn-secondary" href="/safety">
              Safety Dashboard
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Status</span>
            <strong>{status}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Priority</span>
            <strong>{displayValue(action?.priority)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Due Date</span>
            <strong>{formatDate(action?.dueDate)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Assigned To</span>
            <strong>{displayValue(action?.assignedToName)}</strong>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Action Details</h2>
              <p className="muted">Corrective or preventive action closeout information.</p>
            </div>

            <StatusPill status={status} />
          </div>

          <div className="detail-grid">
            <div className="detail-card">
              <span>Action No.</span>
              <strong>{displayValue(action?.actionNo)}</strong>
            </div>

            <div className="detail-card">
              <span>Title</span>
              <strong>{displayValue(action?.title)}</strong>
            </div>

            <div className="detail-card">
              <span>Source Type</span>
              <strong>{displayValue(action?.sourceType)}</strong>
            </div>

            <div className="detail-card">
              <span>Linked Source</span>
              <strong>{sourceLabel(action)}</strong>
            </div>

            <div className="detail-card form-span-2">
              <span>Description</span>
              <strong>{displayValue(action?.description)}</strong>
            </div>

            <div className="detail-card form-span-2">
              <span>Source Description</span>
              <strong>{sourceDescription(action)}</strong>
            </div>

            <div className="detail-card">
              <span>Assigned To</span>
              <strong>{displayValue(action?.assignedToName)}</strong>
            </div>

            <div className="detail-card">
              <span>Assigned Email</span>
              <strong>{displayValue(action?.assignedToEmail)}</strong>
            </div>

            <div className="detail-card">
              <span>Created By</span>
              <strong>{displayValue(action?.createdBy)}</strong>
            </div>

            <div className="detail-card">
              <span>Created Date</span>
              <strong>{formatDate(action?.createdAt)}</strong>
            </div>
          </div>
        </div>

        <div className="finance-card">
          <h2>Closeout Timeline</h2>
          <p className="muted">
            Completion, verification and final closeout audit trail.
          </p>

          <div className="detail-grid">
            <div className="detail-card">
              <span>Completed By</span>
              <strong>{displayValue(action?.completedBy)}</strong>
            </div>

            <div className="detail-card">
              <span>Completed At</span>
              <strong>{formatDate(action?.completedAt)}</strong>
            </div>

            <div className="detail-card">
              <span>Verified By</span>
              <strong>{displayValue(action?.verifiedBy)}</strong>
            </div>

            <div className="detail-card">
              <span>Verified At</span>
              <strong>{formatDate(action?.verifiedAt)}</strong>
            </div>

            <div className="detail-card form-span-2">
              <span>Verification Notes</span>
              <strong>{displayValue(action?.verificationNotes)}</strong>
            </div>

            <div className="detail-card">
              <span>Closed By</span>
              <strong>{displayValue(action?.closedBy)}</strong>
            </div>

            <div className="detail-card">
              <span>Closed At</span>
              <strong>{formatDate(action?.closedAt)}</strong>
            </div>

            <div className="detail-card form-span-2">
              <span>Closeout Notes</span>
              <strong>{displayValue(action?.closeoutNotes)}</strong>
            </div>
          </div>
        </div>

        <div className="finance-card">
          <h2>Closeout Actions</h2>
          <p className="muted">
            Use these controls to move the action through completion, verification and final
            closeout.
          </p>

          <form action={completeAction} className="form-grid">
            <input type="hidden" name="id" value={action?.id} />

            <label className="form-span-2">
              Completion Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Describe what was done to complete the corrective action."
              />
            </label>

            <div className="form-span-2 action-row">
              <button className="btn" type="submit">
                Mark Completed
              </button>
            </div>
          </form>

          <form action={verifyAction} className="form-grid">
            <input type="hidden" name="id" value={action?.id} />

            <label className="form-span-2">
              Verification Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Confirm whether the completed action is effective."
              />
            </label>

            <div className="form-span-2 action-row">
              <button className="btn-secondary" type="submit">
                Verify Action
              </button>
            </div>
          </form>

          <form action={closeAction} className="form-grid">
            <input type="hidden" name="id" value={action?.id} />

            <label className="form-span-2">
              Closeout Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Final closeout comments."
              />
            </label>

            <div className="form-span-2 action-row">
              <button className="btn-secondary" type="submit">
                Close Action
              </button>
            </div>
          </form>
        </div>
      </section>
    </AppShell>
  );
}