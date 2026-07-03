import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsState = signal<Toast[]>([]);
  readonly toasts = this.toastsState.asReadonly();
  private nextId = 1;

  show(message: string, type: ToastType = 'info', duration: number = 3500): void {
    const id = this.nextId++;
    this.toastsState.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration?: number) { this.show(message, 'success', duration); }
  error(message: string, duration?: number) { this.show(message, 'error', duration); }
  info(message: string, duration?: number) { this.show(message, 'info', duration); }
  warning(message: string, duration?: number) { this.show(message, 'warning', duration); }

  dismiss(id: number): void {
    this.toastsState.update(t => t.filter(x => x.id !== id));
  }
}
