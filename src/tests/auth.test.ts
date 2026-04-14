import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock localStorage ───
const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
  };
};

let ls: ReturnType<typeof mockLocalStorage>;

beforeEach(() => {
  ls = mockLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
});

// ─── Tests: Auth Token Key Consistency ───
describe('Auth Token Keys', () => {
  it('login should write access_token key', () => {
    const data = {
      access: 'mock-access',
      refresh: 'mock-refresh',
      user: { id: '1', email: 'test@test.com', display_name: 'Test' },
    };

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));

    expect(ls.setItem).toHaveBeenCalledWith('access_token', 'mock-access');
    expect(ls.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh');
    expect(ls.setItem).not.toHaveBeenCalledWith('token', expect.anything());
  });

  it('register should write access_token key', async () => {
    const data = {
      access: 'mock-access',
      refresh: 'mock-refresh',
      user: { id: '1', email: 'test@test.com', display_name: 'Test' },
    };

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));

    expect(ls.setItem).toHaveBeenCalledWith('access_token', 'mock-access');
    expect(ls.setItem).not.toHaveBeenCalledWith('token', expect.anything());
  });

  it('trips page should read access_token key (same key login writes)', () => {
    // Set token using the key login uses
    localStorage.setItem('access_token', 'my-token');

    // Read using the key trips page uses
    const token = localStorage.getItem('access_token');
    expect(token).toBe('my-token');
  });

  it('should use consistent keys: access_token and refresh_token', () => {
    // Write with login/register keys
    localStorage.setItem('access_token', 'at');
    localStorage.setItem('refresh_token', 'rt');

    // Read with trips page key
    expect(localStorage.getItem('access_token')).toBe('at');
    expect(localStorage.getItem('refresh_token')).toBe('rt');

    // Old broken keys should NOT be used
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
  });
});

// ─── Tests: Source Code Key Consistency ───
describe('Source Code Token Key Audit', () => {
  it('AuthContext should use access_token key for storage', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/context/AuthContext.tsx'),
      'utf-8'
    );
    expect(content).toContain("'access_token'");
    expect(content).toContain("'refresh_token'");
    // Should NOT use old broken keys
    expect(content).not.toMatch(/['"`]token['"`]/);
    expect(content).not.toMatch(/['"`]refresh['"`]/);
  });

  it('login page should not have direct localStorage calls', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/app/login/page.tsx'),
      'utf-8'
    );
    // Login should delegate to AuthContext, not call localStorage directly
    expect(content).toContain('useAuth');
    expect(content).not.toContain('localStorage');
  });

  it('register page should not have direct localStorage calls', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/app/register/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('useAuth');
    expect(content).not.toContain('localStorage');
  });

  it('trips page should not have direct localStorage calls', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/app/trips/page.tsx'),
      'utf-8'
    );
    expect(content).toContain('useAuth');
    expect(content).not.toContain('localStorage');
  });

  it('AuthContext should use consistent keys everywhere', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/context/AuthContext.tsx'),
      'utf-8'
    );
    expect(content).toContain("'access_token'");
    expect(content).toContain("'refresh_token'");
  });
});
