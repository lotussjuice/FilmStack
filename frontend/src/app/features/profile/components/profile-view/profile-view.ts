import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-view.html'
})
export class ProfileComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private toast = inject(ToastService);

  name = signal(this.auth.user()?.name || '');
  email = signal(this.auth.user()?.email || '');
  nameTouched = signal(false);
  emailTouched = signal(false);
  
  isLoading = signal(false);
  message = signal('');
  messageType = signal<'success' | 'danger'>('success');

  nameError = computed(() => {
    if (!this.nameTouched()) return '';
    const v = this.name();
    if (!v.trim()) return 'El nombre es obligatorio.';
    if (v.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    return '';
  });

  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const v = this.email();
    if (!v) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato de correo inválido.';
    return '';
  });

  async onUpdateProfile() {
    const user = this.auth.user();
    if (!user) return;

    this.nameTouched.set(true);
    this.emailTouched.set(true);

    if (this.nameError() || this.emailError()) return;

    this.isLoading.set(true);
    this.message.set('');

    try {
      await this.userService.updateProfile(user.id, {
        name: this.name(),
        email: this.email()
      });
      
      this.message.set('Perfil actualizado correctamente.');
      this.messageType.set('success');
      this.toast.success('Perfil actualizado correctamente.');
      
      await this.userService.authRefresh();
    } catch (err: any) {
      this.message.set(err.message || 'Error al actualizar el perfil.');
      this.messageType.set('danger');
      this.toast.error(err.message || 'Error al actualizar el perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onNameBlur() { this.nameTouched.set(true); }
  onEmailBlur() { this.emailTouched.set(true); }
}
