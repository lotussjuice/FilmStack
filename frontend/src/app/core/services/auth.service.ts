import { Injectable, signal, computed, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { Router } from '@angular/router';

export type Role = 'guest' | 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  deleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private router = inject(Router);
  private pbService = inject(PocketbaseService);

  public user = computed(() => this.currentUser());
  public isAuthenticated = computed(() => this.currentUser() !== null && this.pbService.pb.authStore.isValid);
  public role = computed<Role>(() => this.currentUser()?.role || 'guest');
  public isAdmin = computed(() => this.role() === 'admin');

  constructor() {
    this.initAuth();
  }

  private initAuth() {
    const authStore = this.pbService.pb.authStore;
    if (authStore.isValid && authStore.record) {
      this.currentUser.set(authStore.record as unknown as User);
      this.checkTokenExpiration();
    } else {
      this.logout();
    }

    this.pbService.pb.authStore.onChange((token, record) => {
      if (token && record && this.pbService.pb.authStore.isValid) {
        this.currentUser.set(record as unknown as User);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  async login(email: string, pass: string): Promise<void> {
    try {
      await this.pbService.pb.collection('users').authWithPassword(email, pass);
      if (this.pbService.pb.authStore.record) {
        const user = this.pbService.pb.authStore.record as unknown as User;
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
      await this.pbService.pb.collection('users').authRefresh();
    } catch (err) {
      this.logout();
    }
  }

  logout() {
    this.pbService.pb.authStore.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}

