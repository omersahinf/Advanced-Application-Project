import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Attaches HttpOnly cookie credentials to all API requests.
 * Handles HTTP error responses globally.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Cookie-based auth: browser sends HttpOnly cookie automatically
  // when withCredentials is true
  const authReq = req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/logout')) {
        auth.logout();
      } else if (error.status === 403) {
        console.error('Access denied:', req.url);
      } else if (error.status === 0) {
        console.error('Server unreachable — check if the backend is running');
      } else if (error.status >= 500) {
        console.error('Server error:', error.status, error.message);
      }

      const serverMessage = error.error?.error || error.error?.message;
      const enrichedError = serverMessage
        ? new HttpErrorResponse({ ...error, statusText: serverMessage, url: error.url || undefined })
        : error;

      return throwError(() => enrichedError);
    })
  );
};
