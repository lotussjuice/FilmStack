import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  return next(req).pipe(
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
