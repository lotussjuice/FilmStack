import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import { User, Role } from '../../../core/services/auth.service';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class UsersComponent implements OnInit {
  private pbService = inject(PocketbaseService);
  
  users = signal<User[]>([]);
  isLoading = signal<boolean>(true);

  // Control del modal de confirmación
  isModalOpen = signal(false);
  targetUser = signal<User | null>(null);

  async ngOnInit() {
    await this.loadUsers();
  }

  // Carga la lista completa de usuarios (solo accesible para administradores)
  async loadUsers() {
    try {
      this.isLoading.set(true);
      const records = await this.pbService.pb.collection('users').getFullList<User>({
        sort: '-created'
      });
      this.users.set(records);
    } catch (e) {
      console.error('Error al cargar usuarios', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Actualiza el rol de un usuario (admin/user)
  async updateRole(userId: string, newRole: string) {
    try {
      await this.pbService.pb.collection('users').update(userId, { role: newRole as Role });
      this.users.update(list => list.map(u => u.id === userId ? { ...u, role: newRole as Role } : u));
    } catch (e) {
      console.error('Error al actualizar rol', e);
    }
  }

  // Solicita confirmación para suspender o activar una cuenta
  requestToggleDelete(user: User) {
    this.targetUser.set(user);
    this.isModalOpen.set(true);
  }

  async confirmToggleDelete() {
    const user = this.targetUser();
    if (user) {
      try {
        const newStatus = !user.deleted;
        await this.pbService.pb.collection('users').update(user.id, { deleted: newStatus });
        this.users.update(list => list.map(u => u.id === user.id ? { ...u, deleted: newStatus } : u));
      } catch (e) {
        console.error('Error al actualizar estado de suspensión', e);
      }
    }
    this.closeModal();
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.targetUser.set(null);
  }
}
