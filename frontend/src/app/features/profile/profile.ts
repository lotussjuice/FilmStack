import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PocketbaseService } from '../../core/services/pocketbase.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private pbService = inject(PocketbaseService);

  name = signal(this.auth.user()?.name || '');
  email = signal(this.auth.user()?.email || '');
  
  isLoading = signal(false);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  // Actualiza los datos del perfil del usuario actual
  async onUpdateProfile() {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);
    this.message.set('');

    try {
      // Usamos el ID del record para actualizar en PocketBase v0.25+
      await this.pbService.pb.collection('users').update(user.id, {
        name: this.name(),
        email: this.email()
      });
      
      this.message.set('Perfil actualizado correctamente.');
      this.messageType.set('success');
      
      // Refrescar el estado de autenticación para que los cambios se reflejen en la interfaz
      await this.pbService.pb.collection('users').authRefresh();
    } catch (err: any) {
      this.message.set(err.message || 'Error al actualizar el perfil.');
      this.messageType.set('danger');
    } finally {
      this.isLoading.set(false);
    }
  }
}
