'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createSafetyIncident,
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

export function SafetyIncidentForm({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSite = sites.find((site) => site.id === siteId) || null;

  const idempotencyKey = useMemo(
    () => makeIdempotencyKey('WEB-SAFE-INC'),
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

      incidentDate: String(form.get('incidentDate') || '').trim(),
      incidentType: String(form.get('incidentType') || '').trim(),
      severity: String(form.get('severity') || '').trim(),

      description: String(form.get('description') || '').trim(),
      immediateAction: String(form.get('immediateAction') || '').trim(),

      injuredPersonName: String(form.get('injuredPersonName') || '').trim() || null,
      injuredEmployeeId: String(form.get('injuredEmployeeId') || '').trim() || null,
      contractorCompany: String(form.get('contractorCompany') || '').trim() || null,
      injuryType: String(form.get('injuryType') || '').trim() || null,
      bodyPart: String(form.get('bodyPart') || '').trim() || null,

      rootCause: String(form.get('rootCause') || '').trim() || null,
      investigationNotes: String(form.get('investigationNotes') || '').trim() || null,

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
      await createSafetyIncident(body);
      router.push('/safety/incidents');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to report safety incident.');
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
            placeholder="Laydown area, workshop, site office..."
            required
          />
        </label>

        <label>
          Incident Date
          <input
            name="incidentDate"
            type="date"
            defaultValue={todayIsoDate()}
            required
          />
        </label>

        <label>
          Incident Type
          <select name="incidentType" defaultValue="NEAR_MISS">
            <option value="NEAR_MISS">Near Miss</option>
            <option value="FIRST_AID">First Aid</option>
            <option value="MEDICAL_TREATMENT">Medical Treatment</option>
            <option value="LTI">Lost Time Injury</option>
            <option value="FATALITY">Fatality</option>
            <option value="PROPERTY_DAMAGE">Property Damage</option>
            <option value="ENVIRONMENTAL">Environmental</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Severity
          <select name="severity" defaultValue="MEDIUM">
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
            placeholder="Describe what happened."
            required
          />
        </label>

        <label className="form-span-2">
          Immediate Action Taken
          <textarea
            name="immediateAction"
            rows={3}
            placeholder="What was done immediately to control the risk?"
          />
        </label>

        <label>
          Injured Person
          <input name="injuredPersonName" placeholder="Optional" />
        </label>

        <label>
          Injured Employee ID
          <input name="injuredEmployeeId" placeholder="Optional employee UUID" />
        </label>

        <label>
          Contractor Company
          <input name="contractorCompany" placeholder="Optional" />
        </label>

        <label>
          Injury Type
          <input name="injuryType" placeholder="Optional" />
        </label>

        <label>
          Body Part
          <input name="bodyPart" placeholder="Optional" />
        </label>

        <label>
          GPS Latitude
          <input name="gpsLatitude" placeholder="-12.1845000" />
        </label>

        <label>
          GPS Longitude
          <input name="gpsLongitude" placeholder="26.3972000" />
        </label>

        <label className="form-span-2">
          Root Cause / Initial Cause
          <textarea name="rootCause" rows={3} placeholder="Optional at reporting stage." />
        </label>

        <label className="form-span-2">
          Investigation Notes
          <textarea name="investigationNotes" rows={3} placeholder="Optional at reporting stage." />
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
            {submitting ? 'Submitting...' : 'Submit Incident'}
          </button>

          <Link className="btn-secondary" href="/safety/incidents">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}