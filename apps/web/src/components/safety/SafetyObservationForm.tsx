'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createSafetyObservation,
  makeIdempotencyKey,
} from '@/lib/safety-api';

type SiteOption = {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function SafetyObservationForm({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSite = sites.find((site) => site.id === siteId) || null;

  const idempotencyKey = useMemo(
    () => makeIdempotencyKey('WEB-SAFE-OBS'),
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const form = new FormData(event.currentTarget);

    if (!selectedSite) {
      setSubmitting(false);
      setError('Please select a site/location.');
      return;
    }

    const body = {
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      branch: String(form.get('branch') || '').trim(),
      department: String(form.get('department') || '').trim(),
      exactLocation: String(form.get('exactLocation') || '').trim(),

      observationDate: String(form.get('observationDate') || '').trim(),
      observationType: String(form.get('observationType') || '').trim(),
      riskLevel: String(form.get('riskLevel') || '').trim(),

      description: String(form.get('description') || '').trim(),
      immediateAction: String(form.get('immediateAction') || '').trim(),

      personObserved: String(form.get('personObserved') || '').trim() || null,
      employeeId: String(form.get('employeeId') || '').trim() || null,
      contractorName: String(form.get('contractorName') || '').trim() || null,

      reportedBy: String(form.get('reportedBy') || '').trim(),
      reportedByEmail: String(form.get('reportedByEmail') || '').trim(),

      gpsLatitude: String(form.get('gpsLatitude') || '').trim() || null,
      gpsLongitude: String(form.get('gpsLongitude') || '').trim() || null,

      photoUrls: [],
      mobileDraftId: null,
      idempotencyKey,
      syncStatus: 'SYNCED',
      deviceId: 'WEB-FORM',
      capturedOfflineAt: null,
    };

    try {
      await createSafetyObservation(body);
      router.push('/safety/observations');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to create safety observation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error ? <div className="finance-notice danger">{error}</div> : null}

      <form className="finance-card form-grid" onSubmit={handleSubmit}>
        <label>
          Site / Location
          <select
            name="siteId"
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            required
          >
            <option value="">Select site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.code ? `${site.code} - ` : ''}
                {site.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Branch
          <input name="branch" defaultValue="Solwezi" />
        </label>

        <label>
          Department
          <input name="department" defaultValue="Operations" />
        </label>

        <label>
          Exact Location
          <input
            name="exactLocation"
            placeholder="Workshop, laydown area, scaffold bay..."
            required
          />
        </label>

        <label>
          Observation Date
          <input
            name="observationDate"
            type="date"
            defaultValue={todayIsoDate()}
            required
          />
        </label>

        <label>
          Observation Type
          <select name="observationType" defaultValue="UNSAFE_CONDITION">
            <option value="SAFE_ACT">Safe Act</option>
            <option value="UNSAFE_ACT">Unsafe Act</option>
            <option value="UNSAFE_CONDITION">Unsafe Condition</option>
            <option value="PPE_NON_COMPLIANCE">PPE Non-Compliance</option>
            <option value="ENVIRONMENTAL">Environmental</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Risk Level
          <select name="riskLevel" defaultValue="LOW">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>

        <label className="form-span-2">
          Description
          <textarea
            name="description"
            rows={4}
            placeholder="Describe what was observed."
            required
          />
        </label>

        <label className="form-span-2">
          Immediate Action Taken
          <textarea
            name="immediateAction"
            rows={3}
            placeholder="What immediate control or correction was done?"
          />
        </label>

        <label>
          Person Observed
          <input name="personObserved" placeholder="Optional" />
        </label>

        <label>
          Employee ID
          <input name="employeeId" placeholder="Optional employee UUID" />
        </label>

        <label>
          Contractor Name
          <input name="contractorName" placeholder="Optional" />
        </label>

        <label>
          GPS Latitude
          <input name="gpsLatitude" placeholder="-12.1845000" />
        </label>

        <label>
          GPS Longitude
          <input name="gpsLongitude" placeholder="26.3972000" />
        </label>

        <label>
          Reported By
          <input name="reportedBy" defaultValue="Chongo Mwesa" required />
        </label>

        <label>
          Reporter Email
          <input
            name="reportedByEmail"
            type="email"
            defaultValue="chongomwesa@southincon.com"
          />
        </label>

        <div className="form-span-2 action-row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Observation'}
          </button>

          <Link className="btn-secondary" href="/safety/observations">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}