import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../profile/services/user.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../../../../shared/components/confirm-modal/confirm-modal';
import { User } from '../../../../../core/interfaces/user.interface';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './users-view.html',
  styleUrl: './users-view.css'
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  
  users = signal<User[]>([]);
  isLoading = signal<boolean>(true);

  isModalOpen = signal(false);
  targetUser = signal<User | null>(null);

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    try {
      this.isLoading.set(true);
      const records = await this.userService.getUsers();
      this.users.set(records);
    } catch (e) {
      this.toast.error('Error al cargar usuarios');
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateRole(userId: string, newRole: string) {
    try {
      await this.userService.updateRole(userId, newRole as any);
      this.users.update(list => list.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    } catch (e) {
      this.toast.error('Error al actualizar rol');
    }
  }

  requestToggleDelete(user: User) {
    this.targetUser.set(user);
    this.isModalOpen.set(true);
  }

  async confirmToggleDelete() {
    const user = this.targetUser();
    if (user) {
      try {
        const newStatus = !user.deleted;
        await this.userService.toggleUserDeleted(user.id, newStatus);
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, deleted: newStatus } : u));
      } catch (e) {
        this.toast.error('Error al actualizar estado de suspensión');
      }
    }
    this.closeModal();
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.targetUser.set(null);
  }

  isCurrentUser(user: User): boolean {
    return user.id === this.auth.user()?.id;
  }

  canChangeRole(user: User): boolean {
    return !this.isCurrentUser(user) && user.role !== 'admin';
  }
}
