import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { UserSummary } from '../interfaces/user.interface';

export type Role = 'guest' | 'user' | 'admin';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  deleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private pbService = inject(PocketbaseService);

  /** Actualiza el perfil del usuario actual */
  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<void> {
    await this.pbService.pb.collection('users').update(userId, data);
  }

  /** Refresca el token de autenticación */
  async authRefresh(): Promise<void> {
    await this.pbService.pb.collection('users').authRefresh();
  }

  // ── Admin: gestión de usuarios ──

  /** Obtiene la lista completa de usuarios (admin) */
  async getUsers(): Promise<AppUser[]> {
    return this.pbService.pb.collection('users').getFullList<AppUser>({
      sort: '-created'
    });
  }

  /** Actualiza el rol de un usuario */
  async updateRole(userId: string, newRole: Role): Promise<void> {
    await this.pbService.pb.collection('users').update(userId, { role: newRole });
  }

  /** Suspende o restaura una cuenta */
  async toggleUserDeleted(userId: string, deleted: boolean): Promise<void> {
    await this.pbService.pb.collection('users').update(userId, { deleted });
  }

  // ── Consultas de usuarios por IDs ──

  /** Obtiene datos resumidos de múltiples usuarios por sus IDs */
  async fetchUsersByIds(ids: string[]): Promise<Map<string, UserSummary>> {
    const map = new Map<string, UserSummary>();
    if (ids.length === 0) return map;
    try {
      const filter = ids.map(id => `id = "${this.escapeFilterValue(id)}"`).join(' || ');
      const records = await this.pbService.pb.collection('users').getFullList({
        filter,
        fields: 'id,name,email',
        $autoCancel: false
      });
      for (const r of records as any[]) {
        map.set(r.id, { id: r.id, name: r['name'] || 'Sin nombre', email: r['email'] || '' });
      }
    } catch (e: any) {
      console.error('Error fetching users by ids:', e?.message || e);
    }
    return map;
  }

  private escapeFilterValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
