import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, UserInfo, RegisterRequest, UserDto, UpdateProfileRequest } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = '/api/auth';

  private _token = signal<string | null>(localStorage.getItem('jwt_token'));
  private _refreshToken = signal<string | null>(localStorage.getItem('jwt_refresh_token'));
  private _email = signal<string | null>(localStorage.getItem('user_email'));
  private _role = signal<string | null>(localStorage.getItem('user_role'));
  private _company = signal<string | null>(localStorage.getItem('user_company'));
  private _firstName = signal<string | null>(localStorage.getItem('user_firstName'));

  isLoggedIn = computed(() => !!this._token() && !this.isTokenExpired());
  currentEmail = computed(() => this._email());
  currentRole = computed(() => this._role());
  currentCompany = computed(() => this._company());
  currentFirstName = computed(() => this._firstName());

  isAdmin = computed(() => this._role() === 'ADMIN');
  isCorporate = computed(() => this._role() === 'CORPORATE');
  isIndividual = computed(() => this._role() === 'INDIVIDUAL');

  constructor(private http: HttpClient, private router: Router) {
    if (this._token() && this.isTokenExpired()) {
      this.tryRefresh();
    }
  }

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.API}/login`, req);
  }

  register(req: RegisterRequest) {
    return this.http.post<UserDto>(`${this.API}/register`, req);
  }

  refreshAccessToken() {
    const refreshToken = this._refreshToken();
    if (!refreshToken) return null;
    return this.http.post<LoginResponse>(`${this.API}/refresh`, { refreshToken });
  }

  updateProfile(req: UpdateProfileRequest) {
    return this.http.put<UserDto>(`${this.API}/profile`, req);
  }

  saveToken(response: LoginResponse) {
    localStorage.setItem('jwt_token', response.token);
    localStorage.setItem('jwt_refresh_token', response.refreshToken);
    localStorage.setItem('user_email', response.email);
    localStorage.setItem('user_role', response.role);
    localStorage.setItem('user_company', response.companyName);
    localStorage.setItem('user_firstName', response.firstName || '');
    this._token.set(response.token);
    this._refreshToken.set(response.refreshToken);
    this._email.set(response.email);
    this._role.set(response.role);
    this._company.set(response.companyName);
    this._firstName.set(response.firstName || '');
  }

  getToken(): string | null {
    if (this.isTokenExpired()) {
      this.tryRefresh();
      return this._token();
    }
    return this._token();
  }

  logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_company');
    localStorage.removeItem('user_firstName');
    this._token.set(null);
    this._refreshToken.set(null);
    this._email.set(null);
    this._role.set(null);
    this._company.set(null);
    this._firstName.set(null);
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

  private tryRefresh() {
    const obs = this.refreshAccessToken();
    if (obs) {
      obs.subscribe({
        next: (res) => this.saveToken(res),
        error: () => this.logout()
      });
    } else {
      this.logout();
    }
  }

  private isTokenExpired(): boolean {
    const token = this._token();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
