import { Injectable, signal, computed, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { ActiveSessionService } from '../../roulette/services/active-session.service';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Role, User } from '../../../core/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private router = inject(Router);
  private pbService = inject(PocketbaseService);
  private activeSession = inject(ActiveSessionService);
  private http = inject(HttpClient);

  public user = computed(() => this.currentUser());
  public isAuthenticated = computed(() => this.currentUser() !== null && this.pbService.authStore.isValid);
  public role = computed<Role>(() => this.currentUser()?.role || 'guest');
  public isAdmin = computed(() => this.role() === 'admin');

  constructor() {
    this.initAuth();
  }

  private initAuth() {
    const authStore = this.pbService.authStore;
    if (authStore.isValid && authStore.record) {
      this.currentUser.set(authStore.record as unknown as User);
      this.checkTokenExpiration();
    } else {
      this.clearAuth();
    }

    this.pbService.authStore.onChange((token, record) => {
      if (token && record && this.pbService.authStore.isValid) {
        this.currentUser.set(record as unknown as User);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  async login(email: string, pass: string): Promise<void> {
    try {
      await this.pbService.collection('users').authWithPassword(email, pass);
      if (this.pbService.authStore.record) {
        const user = this.pbService.authStore.record as unknown as User;
        if (user.deleted) {
          this.logout();
          throw new Error('La cuenta ha sido suspendida.');
        }
        if (!user.verified) {
          this.clearAuth();
          throw new Error('Debes verificar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada.');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, passwordConfirm: string, name: string): Promise<void> {
    try {
      await this.http.post('/api/register', { email, password, passwordConfirm, name }).toPromise();
    } catch (error) {
      throw error;
    }
  }

  async confirmVerification(token: string): Promise<void> {
    try {
      const params = new HttpParams().set('token', token);
      await this.http.get('/api/verify-email', { params }).toPromise();
    } catch (error) {
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.http.post('/api/forgot-password', { email }).toPromise();
    } catch (error) {
      throw error;
    }
  }

  async confirmPasswordReset(token: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    try {
      await this.http.post('/api/reset-password', { token, newPassword, newPasswordConfirm }).toPromise();
    } catch (error) {
      throw error;
    }
  }

  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    try {
      await this.http.post('/api/change-password', { oldPassword, newPassword, newPasswordConfirm }).toPromise();
    } catch (error) {
      throw error;
    }
  }

  private async checkTokenExpiration() {
    try {
      await this.pbService.collection('users').authRefresh();
    } catch (err) {
      this.logout();
    }
  }

  private clearAuth() {
    this.activeSession.discard();
    this.pbService.authStore.clear();
    this.currentUser.set(null);
  }

  logout() {
    this.clearAuth();
    this.router.navigate(['/login']);
  }
}
