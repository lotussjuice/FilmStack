import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserSummary, Role, User } from '../../../core/interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private pbService = inject(PocketbaseService);
  private toast = inject(ToastService);

  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<void> {
    await this.pbService.collection('users').update(userId, data);
  }

  async authRefresh(): Promise<void> {
    await this.pbService.collection('users').authRefresh();
  }

  async getUsers(): Promise<User[]> {
    return this.pbService.collection('users').getFullList<User>({
      sort: '-created'
    });
  }

  async updateRole(userId: string, newRole: Role): Promise<void> {
    await this.pbService.collection('users').update(userId, { role: newRole });
  }

  async toggleUserDeleted(userId: string, deleted: boolean): Promise<void> {
    await this.pbService.collection('users').update(userId, { deleted });
  }

  async fetchUsersByIds(ids: string[]): Promise<Map<string, UserSummary>> {
    const map = await this.pbService.fetchUsersByIds(ids);
    if (map.size === 0 && ids.length > 0) {
      this.toast.error('Error al cargar usuarios.');
    }
    return map;
  }
}
