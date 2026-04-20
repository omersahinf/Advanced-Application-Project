import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, UserInfo, RegisterRequest, UserDto, UpdateProfileRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = '/api/auth';

  // JWT tokens are now in HttpOnly cookies (not accessible from JS).
  // UI state stays in localStorage for display purposes only.
  private _email = signal<string | null>(localStorage.getItem('user_email'));
  private _role = signal<string | null>(localStorage.getItem('user_role'));
  private _company = signal<string | null>(localStorage.getItem('user_company'));
  private _firstName = signal<string | null>(localStorage.getItem('user_firstName'));
  // Track login state (since we can't read HttpOnly cookie)
  private _loggedIn = signal<boolean>(!!localStorage.getItem('user_role'));

  isLoggedIn = computed(() => this._loggedIn());
  currentEmail = computed(() => this._email());
  currentRole = computed(() => this._role());
  currentCompany = computed(() => this._company());
  currentFirstName = computed(() => this._firstName());

  isAdmin = computed(() => this._role() === 'ADMIN');
  isCorporate = computed(() => this._role() === 'CORPORATE');
  isIndividual = computed(() => this._role() === 'INDIVIDUAL');

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.API}/login`, req, { withCredentials: true });
  }

  register(req: RegisterRequest) {
    return this.http.post<UserDto>(`${this.API}/register`, req);
  }

  refreshAccessToken() {
    // Refresh token is in HttpOnly cookie — browser sends it automatically
    return this.http.post<LoginResponse>(`${this.API}/refresh`, {}, { withCredentials: true });
  }

  updateProfile(req: UpdateProfileRequest) {
    return this.http.put<UserDto>(`${this.API}/profile`, req);
  }

  saveToken(response: LoginResponse) {
    // JWT cookies are set by the server (HttpOnly, not accessible here).
    // We only store UI display data in localStorage.
    localStorage.setItem('user_email', response.email);
    localStorage.setItem('user_role', response.role);
    localStorage.setItem('user_company', response.companyName);
    localStorage.setItem('user_firstName', response.firstName || '');
    this._email.set(response.email);
    this._role.set(response.role);
    this._company.set(response.companyName);
    this._firstName.set(response.firstName || '');
    this._loggedIn.set(true);
  }

  logout() {
    // Tell server to clear HttpOnly cookies
    this.http.post(`${this.API}/logout`, {}, { withCredentials: true }).subscribe({ error: () => {} });
    // Clear UI state from localStorage
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_company');
    localStorage.removeItem('user_firstName');
    // Also clear legacy keys if present
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_refresh_token');
    localStorage.removeItem('user_refreshToken');
    this._email.set(null);
    this._role.set(null);
    this._company.set(null);
    this._firstName.set(null);
    this._loggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getMe() {
    return this.http.get<UserInfo>(`${this.API}/me`);
  }

  getDashboardRoute(): string {
    const role = this._role();
    if (role === 'ADMIN') return '/admin';
    if (role === 'CORPORATE') return '/corporate';
    return '/dashboard';
  }
}

