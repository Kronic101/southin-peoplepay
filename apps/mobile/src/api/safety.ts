import { apiGet, apiPatch, apiPost } from './client';
import {
  SafetyCorrectiveActionPayload,
  SafetyIncidentPayload,
  SafetyObservationPayload,
} from '../types/safety';

export const getSafetyDashboard = () => apiGet('/safety/dashboard');

export const getSafetyObservations = () => apiGet('/safety/observations');

export const createSafetyObservation = (payload: SafetyObservationPayload) =>
  apiPost('/safety/observations', payload);

export const getSafetyIncidents = () => apiGet('/safety/incidents');

export const createSafetyIncident = (payload: SafetyIncidentPayload) =>
  apiPost('/safety/incidents', payload);

export const getSafetyCorrectiveActions = () =>
  apiGet('/safety/corrective-actions');

export const createSafetyCorrectiveAction = (
  payload: SafetyCorrectiveActionPayload,
) => apiPost('/safety/corrective-actions', payload);

export const updateSafetyCorrectiveActionStatus = (id: string, payload: any) =>
  apiPatch(`/safety/corrective-actions/${id}/status`, payload);

/**
 * Temporary site lookup.
 * Later we should replace this with /sites or /people-ops/context
 * once the mobile app has a clean lookup sync endpoint.
 */
export const getSafetySites = async () => {
  try {
    const result: any = await apiGet('/people-ops/context');

    return result?.sites || [];
  } catch {
    return [
      {
        id: '1a565f51-bf42-445a-9a23-0c0c355e8340',
        code: 'KAN-KMP',
        name: 'Kansanshi KMP',
      },
    ];
  }
};