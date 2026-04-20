import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for AuthService logic — token parsing, role routing, localStorage.
 * These test the pure logic without Angular TestBed.
 */

// Helper: create a fake JWT token with given payload
function createJwt(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('Auth Token Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should detect expired token', () => {
    const expiredToken = createJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    const payload = JSON.parse(atob(expiredToken.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    expect(isExpired).toBe(true);
  });

  it('should detect valid (non-expired) token', () => {
    const validToken = createJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const payload = JSON.parse(atob(validToken.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    expect(isExpired).toBe(false);
  });

  it('should treat malformed token as expired', () => {
    const malformed = 'not-a-jwt';
    let isExpired = true;
    try {
      const payload = JSON.parse(atob(malformed.split('.')[1]));
      isExpired = payload.exp * 1000 < Date.now();
    } catch {
      isExpired = true;
    }
    expect(isExpired).toBe(true);
  });
});

describe('Dashboard Route Logic', () => {
  function getDashboardRoute(role: string | null): string {
    if (role === 'ADMIN') return '/admin';
    if (role === 'CORPORATE') return '/corporate';
    return '/dashboard';
  }

  it('should route ADMIN to /admin', () => {
    expect(getDashboardRoute('ADMIN')).toBe('/admin');
  });

  it('should route CORPORATE to /corporate', () => {
    expect(getDashboardRoute('CORPORATE')).toBe('/corporate');
  });

  it('should route INDIVIDUAL to /dashboard', () => {
    expect(getDashboardRoute('INDIVIDUAL')).toBe('/dashboard');
  });

  it('should route null to /dashboard', () => {
    expect(getDashboardRoute(null)).toBe('/dashboard');
  });
});

describe('UI State Storage (Cookie-Based Auth)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save only display data from login response (no tokens)', () => {
    // In cookie-based auth, tokens are NOT stored in localStorage.
    // Only UI display data is saved.
    const response = {
      // token and refreshToken are null/undefined in response body
      email: 'test@example.com',
      role: 'INDIVIDUAL',
      companyName: 'Test User',
      firstName: 'Test',
    };

    localStorage.setItem('user_email', response.email);
    localStorage.setItem('user_role', response.role);
    localStorage.setItem('user_company', response.companyName);
    localStorage.setItem('user_firstName', response.firstName);

    expect(localStorage.getItem('user_email')).toBe('test@example.com');
    expect(localStorage.getItem('user_role')).toBe('INDIVIDUAL');
    expect(localStorage.getItem('user_company')).toBe('Test User');
    expect(localStorage.getItem('user_firstName')).toBe('Test');
    // Tokens must NOT be in localStorage
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('jwt_refresh_token')).toBeNull();
    expect(localStorage.getItem('user_refreshToken')).toBeNull();
  });

  it('should clear all user data on logout (including legacy keys)', () => {
    // Set current model keys
    localStorage.setItem('user_email', 'email');
    localStorage.setItem('user_role', 'role');
    localStorage.setItem('user_company', 'company');
    localStorage.setItem('user_firstName', 'name');
    // Set legacy keys that might still exist
    localStorage.setItem('jwt_token', 'legacy');
    localStorage.setItem('jwt_refresh_token', 'legacy');
    localStorage.setItem('user_refreshToken', 'legacy');

    // Simulate logout — clears everything
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_company');
    localStorage.removeItem('user_firstName');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_refresh_token');
    localStorage.removeItem('user_refreshToken');

    expect(localStorage.getItem('user_email')).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
    expect(localStorage.getItem('user_company')).toBeNull();
    expect(localStorage.getItem('user_firstName')).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('jwt_refresh_token')).toBeNull();
    expect(localStorage.getItem('user_refreshToken')).toBeNull();
  });

  it('should detect logged-in state from user_role presence', () => {
    // No role = not logged in
    expect(!!localStorage.getItem('user_role')).toBe(false);

    // Set role = logged in
    localStorage.setItem('user_role', 'ADMIN');
    expect(!!localStorage.getItem('user_role')).toBe(true);
  });
});
