import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const appDir = path.join(srcDir, 'app');

// ─── Tests: Route Structure ───
describe('Route Structure', () => {
  it('should have place/[slug] detail page', () => {
    const pagePath = path.join(appDir, 'place', '[slug]', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it('should have trips/[id] detail page', () => {
    const pagePath = path.join(appDir, 'trips', '[id]', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it('should have destinations/[slug] detail page', () => {
    const pagePath = path.join(appDir, 'destinations', '[slug]', 'page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it('should have global error.tsx', () => {
    const errorPath = path.join(appDir, 'error.tsx');
    expect(fs.existsSync(errorPath)).toBe(true);
  });

  it('should have global not-found.tsx', () => {
    const notFoundPath = path.join(appDir, 'not-found.tsx');
    expect(fs.existsSync(notFoundPath)).toBe(true);
  });

  it('should have AuthContext provider', () => {
    const ctxPath = path.join(srcDir, 'context', 'AuthContext.tsx');
    expect(fs.existsSync(ctxPath)).toBe(true);
  });
});

// ─── Tests: Page Content ───
describe('Place Detail Page', () => {
  let content: string;

  beforeAll(() => {
    const pagePath = path.join(appDir, 'place', '[slug]', 'page.tsx');
    content = fs.readFileSync(pagePath, 'utf-8');
  });

  it('should use useAuth for auth state', () => {
    expect(content).toContain('useAuth');
  });

  it('should use useParams for slug', () => {
    expect(content).toContain('useParams');
    expect(content).toContain('params.slug');
  });

  it('should call api.getPlace', () => {
    expect(content).toContain('api.getPlace');
  });

  it('should have save to collection action', () => {
    expect(content.toLowerCase()).toContain('save');
    expect(content.toLowerCase()).toContain('collection');
  });

  it('should have add to trip action', () => {
    expect(content.toLowerCase()).toContain('add to trip');
  });

  it('should display place details (rating, price, address)', () => {
    expect(content).toContain('place.rating');
    expect(content).toContain('place.price_level');
    expect(content).toContain('place.address');
  });

  it('should have photo gallery support', () => {
    expect(content).toContain('place.photos');
    expect(content).toContain('gallery');
  });

  it('should have opening hours display', () => {
    expect(content).toContain('opening_hours');
  });

  it('should have loading state', () => {
    expect(content).toContain('loading');
  });

  it('should have error state', () => {
    expect(content).toContain('error');
    expect(content).toContain('Place Not Found');
  });
});

describe('Trip Detail Page', () => {
  let content: string;

  beforeAll(() => {
    const pagePath = path.join(appDir, 'trips', '[id]', 'page.tsx');
    content = fs.readFileSync(pagePath, 'utf-8');
  });

  it('should use useAuth for auth state', () => {
    expect(content).toContain('useAuth');
  });

  it('should require authentication to view', () => {
    expect(content).toContain('isAuthenticated');
    expect(content).toContain('getToken');
  });

  it('should call api.getTrip', () => {
    expect(content).toContain('api.getTrip');
  });

  it('should display trip days and items', () => {
    expect(content).toContain('trip.days');
    expect(content).toContain('day.items');
  });

  it('should have share functionality', () => {
    expect(content).toContain('handleShare');
    expect(content).toContain('shareTrip');
  });

  it('should have duplicate functionality', () => {
    expect(content).toContain('handleDuplicate');
    expect(content).toContain('duplicateTrip');
  });

  it('should link to place detail pages', () => {
    expect(content).toContain('/place/');
    expect(content).toContain('item.place');
    expect(content).toContain('item.place.slug');
  });

  it('should have loading state', () => {
    expect(content).toContain('loading');
  });

  it('should have error state', () => {
    expect(content).toContain('error');
    expect(content).toContain('Trip Not Found');
  });
});

describe('Collections Page', () => {
  let content: string;

  beforeAll(() => {
    const pagePath = path.join(appDir, 'collections', 'page.tsx');
    content = fs.readFileSync(pagePath, 'utf-8');
  });

  it('should use useAuth for auth state', () => {
    expect(content).toContain('useAuth');
  });

  it('should fetch collections from API', () => {
    expect(content).toContain('api.getCollections');
  });

  it('should have create collection form', () => {
    expect(content).toContain('api.createCollection');
    expect(content).toContain('showCreate');
  });

  it('should display collection cards', () => {
    expect(content).toContain('collections.map');
    expect(content).toContain('col.title');
    expect(content).toContain('col.items_count');
  });

  it('should have empty state', () => {
    expect(content).toContain('No collections yet');
    expect(content).toContain('Browse Destinations');
  });

  it('should handle authentication requirement', () => {
    expect(content).toContain('isAuthenticated');
    expect(content).toContain('Please log in');
  });
});

// ─── Tests: API Type Consistency ───
describe('API Types', () => {
  it('Place type should have destination field', async () => {
    const apiPath = path.join(srcDir, 'lib', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');
    expect(content).toContain('destination?: string');
  });

  it('Trip type should have days field', async () => {
    const apiPath = path.join(srcDir, 'lib', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');
    expect(content).toContain('days?: TripDay[]');
  });

  it('Collection type should have items_count field', async () => {
    const apiPath = path.join(srcDir, 'lib', 'api.ts');
    const content = fs.readFileSync(apiPath, 'utf-8');
    expect(content).toContain('items_count');
  });
});

// ─── Tests: AuthContext Completeness ───
describe('AuthContext', () => {
  let content: string;

  beforeAll(() => {
    const ctxPath = path.join(srcDir, 'context', 'AuthContext.tsx');
    content = fs.readFileSync(ctxPath, 'utf-8');
  });

  it('should export AuthProvider', () => {
    expect(content).toContain('export function AuthProvider');
  });

  it('should export useAuth hook', () => {
    expect(content).toContain('export function useAuth');
  });

  it('should provide login method', () => {
    expect(content).toContain('login');
  });

  it('should provide register method', () => {
    expect(content).toContain('register');
  });

  it('should provide logout method', () => {
    expect(content).toContain('logout');
  });

  it('should provide getToken method', () => {
    expect(content).toContain('getToken');
  });

  it('should provide isAuthenticated flag', () => {
    expect(content).toContain('isAuthenticated');
  });

  it('should provide isLoading flag', () => {
    expect(content).toContain('isLoading');
  });

  it('should handle token refresh', () => {
    expect(content).toContain('refreshAccessToken');
    expect(content).toContain('refresh_token');
  });

  it('should clear auth on logout', () => {
    expect(content).toContain('clearAuth');
    expect(content).toContain('removeItem');
  });
});

// ─── Tests: No orphaned localStorage in pages ───
describe('No Direct localStorage in Pages', () => {
  const pagesToCheck = [
    'app/login/page.tsx',
    'app/register/page.tsx',
    'app/trips/page.tsx',
    'app/collections/page.tsx',
    'app/chat/page.tsx',
  ];

  pagesToCheck.forEach((page) => {
    it(`${page} should not use localStorage directly`, () => {
      const pagePath = path.join(srcDir, page);
      if (!fs.existsSync(pagePath)) return; // skip if page doesn't exist
      const content = fs.readFileSync(pagePath, 'utf-8');
      expect(content).not.toContain('localStorage');
    });
  });
});
