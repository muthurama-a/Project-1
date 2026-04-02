import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('thingual_token');
  return { Authorization: `Bearer ${token}` };
};

export const lessonService = {
  // ── Core Lessons ──────────────────────────────────────────────────────────
  getDashboard: async () => {
    const res = await axios.get(`${API_URL}/lessons/dashboard`, { headers: getAuthHeader() });
    return res.data;
  },

  getLesson: async (lessonId: any) => {
    const res = await axios.get(`${API_URL}/lessons/${lessonId}`, { headers: getAuthHeader() });
    return res.data;
  },

  completeLesson: async (lessonId: any) => {
    const res = await axios.post(`${API_URL}/lessons/${lessonId}/complete`, {}, { headers: getAuthHeader() });
    return res.data;
  },

  // ── SM-2 Flashcards ───────────────────────────────────────────────────────
  getDueCards: async (limit = 20) => {
    const res = await axios.get(`${API_URL}/lessons/sm2/due?limit=${limit}`, { headers: getAuthHeader() });
    return res.data;
  },

  getWeakCards: async () => {
    const res = await axios.get(`${API_URL}/lessons/sm2/weak`, { headers: getAuthHeader() });
    return res.data;
  },

  getAllCards: async () => {
    const res = await axios.get(`${API_URL}/lessons/sm2/all`, { headers: getAuthHeader() });
    return res.data;
  },

  submitSM2: async (payload: {
    card_id: number;
    is_correct: boolean;
    response_time_ms: number;
    hesitation_count?: number;
    answer_duration_ms?: number;
    transcript?: string;
  }) => {
    const res = await axios.post(`${API_URL}/lessons/sm2/submit`, payload, { headers: getAuthHeader() });
    return res.data;
  },

  seedCards: async (lessonId: number) => {
    const res = await axios.post(`${API_URL}/lessons/sm2/seed/${lessonId}`, {}, { headers: getAuthHeader() });
    return res.data;
  },

  // ── Velocity Tracker ──────────────────────────────────────────────────────
  logVelocity: async (payload: {
    lesson_id?: number;
    card_id?: number;
    response_time_ms: number;
    answer_duration_ms?: number;
    hesitation_count?: number;
    transcript?: string;
  }) => {
    const res = await axios.post(`${API_URL}/lessons/velocity/log`, payload, { headers: getAuthHeader() });
    return res.data;
  },

  getVelocityStats: async () => {
    const res = await axios.get(`${API_URL}/lessons/velocity/stats`, { headers: getAuthHeader() });
    return res.data;
  },
};
