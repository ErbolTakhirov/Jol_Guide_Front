/** API client for the AI Travel Planner backend. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Safely merge existing headers
  if (fetchOptions.headers) {
    const existing = fetchOptions.headers instanceof Headers
      ? Object.fromEntries(fetchOptions.headers.entries())
      : Array.isArray(fetchOptions.headers)
        ? Object.fromEntries(fetchOptions.headers)
        : fetchOptions.headers;
    Object.assign(headers, existing);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    // DRF returns field-level errors: { "email": ["already exists"] }
    // or detail: { "detail": "..." }
    const message = error.detail
      || Object.values(error).flat().join(', ')
      || `API Error: ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

// ─── Types ───

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  auth_provider: string;
  travel_persona: string;
  is_creator: boolean;
  locale: string;
  role: string;
  created_at: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  description: string;
  hero_image_url: string;
  latitude: number;
  longitude: number;
  popularity_score: number;
  tags: string[];
  places_count?: number;
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviews_count: number;
  price_level: number;
  photos: string[];
  opening_hours: Record<string, string>;
  tags: string[];
  destination?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string;
  is_public: boolean;
  share_token: string;
  status: string;
  ai_query: string;
  owner_name: string;
  days?: TripDay[];
  days_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TripDay {
  id: string;
  day_number: number;
  date: string | null;
  title: string;
  notes: string;
  items: TripItem[];
}

export interface TripItem {
  id: string;
  place: Place | null;
  position: number;
  start_time: string | null;
  end_time: string | null;
  notes: string;
  custom_title: string;
  custom_description: string;
  display_title: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  is_public: boolean;
  cover_image_url: string;
  items_count: number;
  owner_name: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages_count: number;
  last_message: { role: string; content: string; created_at: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structured_data: Record<string, unknown>;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── API Methods ───

export const api = {
  // Auth
  register: (data: { email: string; password: string; display_name?: string }) =>
    apiFetch<{ access: string; refresh: string; user: User }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ access: string; refresh: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: (token: string) =>
    apiFetch<User>('/auth/me/', { token }),

  updateProfile: (token: string, data: Partial<User>) =>
    apiFetch<User>('/auth/me/', { method: 'PATCH', token, body: JSON.stringify(data) }),

  createAnonymousSession: () =>
    apiFetch<{ access: string; refresh: string; user: User }>('/auth/anonymous/', {
      method: 'POST',
    }),

  // Destinations
  getDestinations: (params?: string) =>
    apiFetch<PaginatedResponse<Destination>>(`/destinations/${params ? `?${params}` : ''}`),

  getDestination: (slug: string) =>
    apiFetch<Destination>(`/destinations/${slug}/`),

  // Places
  getPlaces: (params?: string) =>
    apiFetch<PaginatedResponse<Place>>(`/places/${params ? `?${params}` : ''}`),

  getPlace: (slug: string) =>
    apiFetch<Place>(`/places/${slug}/`),

  searchPlaces: (query: string) =>
    apiFetch<PaginatedResponse<Place>>(`/places/search/?q=${encodeURIComponent(query)}`),

  // Trips
  getTrips: (token: string) =>
    apiFetch<PaginatedResponse<Trip>>('/trips/', { token }),

  getTrip: (token: string, id: string) =>
    apiFetch<Trip>(`/trips/${id}/`, { token }),

  createTrip: (token: string, data: Partial<Trip>) =>
    apiFetch<Trip>('/trips/', { method: 'POST', token, body: JSON.stringify(data) }),

  shareTrip: (token: string, id: string) =>
    apiFetch<{ share_token: string; share_url: string }>(`/trips/${id}/share/`, {
      method: 'POST',
      token,
    }),

  duplicateTrip: (token: string, id: string) =>
    apiFetch<Trip>(`/trips/${id}/duplicate/`, { method: 'POST', token }),

  // Collections
  getCollections: (token: string) =>
    apiFetch<PaginatedResponse<Collection>>('/collections/', { token }),

  createCollection: (token: string, data: Partial<Collection>) =>
    apiFetch<Collection>('/collections/', { method: 'POST', token, body: JSON.stringify(data) }),

  // AI Chat
  getChatSessions: (token: string) =>
    apiFetch<ChatSession[]>('/ai/sessions/', { token }),

  getSessionMessages: (token: string, sessionId: string) =>
    apiFetch<ChatMessage[]>(`/ai/sessions/${sessionId}/messages/`, { token }),

  // Google Maps
  googleSearchPlaces: (token: string, query: string, lat?: number, lng?: number, radius?: number) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (radius) params.append('radius', radius.toString());
    return apiFetch<{results: any[], count: number}>(`/places/google-search/?${params.toString()}`, { token });
  },

  googlePlaceDetails: (token: string, placeId: string) =>
    apiFetch<any>(`/places/google-details/${placeId}/`, { token }),

  geocodeAddress: (token: string, address: string) =>
    apiFetch<{latitude: number, longitude: number, formatted_address: string}>(
      '/places/geocode/',
      { method: 'POST', token, body: JSON.stringify({ address }) }
    ),

  getTripRoute: (token: string, tripId: string, mode: string = 'driving') =>
    apiFetch<{polyline: string, duration_text: string, distance_text: string, waypoints: any[]}>(
      `/trips/${tripId}/route/`,
      { method: 'POST', token, body: JSON.stringify({ mode }) }
    ),
};
