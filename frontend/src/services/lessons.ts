import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getAuthHeader = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('thingual_token');
  return { Authorization: `Bearer ${token}` };
};

// Map lesson slug → JSON filename in /public/A1-unit 1/
const A1_UNIT1_MAP: Record<string, string> = {
  'a1_unit1_lesson01': 'lesson_01_hello_goodbye.json',
  'a1_unit1_lesson02': 'lesson_02_introducing_yourself.json',
  'a1_unit1_lesson03': 'lesson_03_asking_about_others.json',
  'a1_unit1_lesson04': 'lesson_04_family_friends.json',
  'a1_unit1_lesson05': 'lesson_05_where_i_live.json',
  'a1_unit1_lesson06': 'lesson_06_daily_routines.json',
  'a1_unit1_lesson07': 'lesson_07_hobbies_preferences.json',
  'a1_unit1_lesson08': 'lesson_08_unit1_review.json',
};

async function fetchLocalLesson(slug: string): Promise<any> {
  const filename = A1_UNIT1_MAP[slug];
  if (!filename) {
    console.warn(`[fetchLocalLesson] No filename mapping for slug: "${slug}"`);
    return null;
  }

  // In Next.js, files in /public are served statically — DO NOT use dynamic import().
  // Always use fetch() instead.
  const url = `/a1_unit_1/${filename}`;
  console.log(`[fetchLocalLesson] Fetching: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[fetchLocalLesson] HTTP ${res.status} for ${url}`);
      return null;
    }
    const data = await res.json();
    console.log(`[fetchLocalLesson] OK — tasks: ${data.tasks?.length}`);
    return data;
  } catch (e) {
    console.error(`[fetchLocalLesson] Fetch failed:`, e);
    return null;
  }
}

export const lessonService = {
  // ── Core Lessons ──────────────────────────────────────────────────────────
  getDashboard: async () => {
    const res = await axios.get(`${API_URL}/lessons/dashboard`, { headers: getAuthHeader() });
    return res.data;
  },

  getProgress: async (year?: number) => {
    const url = year ? `${API_URL}/lessons/progress?year=${year}` : `${API_URL}/lessons/progress`;
    const res = await axios.get(url, { headers: getAuthHeader() });
    return res.data;
  },

  getLesson: async (id: string | number) => {
    if (String(id).startsWith('a1_unit1_')) {
      const localData = await fetchLocalLesson(String(id));
      if (localData) return localData;
      console.warn(`[getLesson] Local data not found for ${id}, falling back...`);
      // We shouldn't fall back to the backend if it's explicitly a local A1 Unit 1 lesson
      throw new Error(`Local lesson not found: ${id}`);
    }

    const response = await axios.get(`${API_URL}/api/lessons/${id}`, {
      headers: getAuthHeader(),
    });
    
    // Check if the API returned an error payload
    if (response.data && response.data.error) {
       throw new Error(response.data.error);
    }
    
    return response.data;
  },

  completeLesson: async (lessonId: any, payload: { accuracy?: number } = {}) => {
    const res = await axios.post(`${API_URL}/lessons/${lessonId}/complete`, payload, { headers: getAuthHeader() });
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
