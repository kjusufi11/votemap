// src/services/api.js
// All API calls from the frontend go through here.
// Change BASE_URL here if you deploy the backend somewhere.

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ── Lookup ────────────────────────────────────────────────────────────────────

// Core entry: resolve a ZIP to the user's representatives
export async function lookupZip(zip) {
  const { data } = await api.post('/lookup/zip', { zip });
  return data;
}

// ── Politicians ───────────────────────────────────────────────────────────────

export async function getPolitician(bioguideId) {
  const { data } = await api.get(`/politicians/${bioguideId}`);
  return data;
}

export async function getPoliticianVotes(bioguideId, page = 0, subject = null) {
  const params = { page };
  if (subject) params.subject = subject;
  const { data } = await api.get(`/politicians/${bioguideId}/votes`, { params });
  return data;
}

export async function getPoliticianAnalysis(bioguideId) {
  const { data } = await api.get(`/politicians/${bioguideId}/analysis`);
  return data;
}

export async function triggerAnalysis(bioguideId, forceRefresh = false) {
  const { data } = await api.post(
    `/politicians/${bioguideId}/analyze`,
    {},
    { params: { refresh: forceRefresh } }
  );
  return data;
}

export async function searchPoliticians(query = {}) {
  const { data } = await api.get('/politicians', { params: query });
  return data;
}

// ── Error helpers ─────────────────────────────────────────────────────────────

export function getErrorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong.';
}
