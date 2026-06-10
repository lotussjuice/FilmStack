import { Injectable, signal, computed, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { ActiveSessionService } from '../../roulette/services/active-session.service';
import { Router } from '@angular/router';
import { Role, User } from '../../../core/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private router = inject(Router);
  private pbService = inject(PocketbaseService);
  private activeSession = inject(ActiveSessionService);

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
      this.logout();
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
      }
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

  logout() {
    this.activeSession.discard();
    this.pbService.authStore.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
