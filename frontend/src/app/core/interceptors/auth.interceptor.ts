import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { PocketbaseService } from '../services/pocketbase.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const pb = inject(PocketbaseService);

  const token = pb.authStore.token;
  let authReq = req;
  if (token) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 401:
            router.navigate(['/login']);
            break;
          case 403:
            router.navigate(['/403']);
            break;
          case 404:
            toast.error('Recurso no encontrado.');
            break;
          default:
            if (error.status >= 500) {
              toast.error(`Error del servidor (${error.status}).`);
            }
            break;
        }
      }
      return throwError(() => error);
    })
  );
};
