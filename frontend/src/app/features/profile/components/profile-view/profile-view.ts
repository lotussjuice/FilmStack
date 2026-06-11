import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';
import { UserService } from '../../services/user.service';
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

  showPasswordForm = signal(false);
  oldPassword = signal('');
  oldPasswordTouched = signal(false);
  newPassword = signal('');
  newPasswordTouched = signal(false);
  newPasswordConfirm = signal('');
  newPasswordConfirmTouched = signal(false);
  isChangingPassword = signal(false);
  passwordMessage = signal('');
  passwordMessageType = signal<'success' | 'danger'>('success');

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato de correo invalido.';
    return '';
  });

  oldPasswordError = computed(() => {
    if (!this.oldPasswordTouched()) return '';
    if (!this.oldPassword()) return 'La contrasena actual es obligatoria.';
    return '';
  });

  newPasswordError = computed(() => {
    if (!this.newPasswordTouched()) return '';
    const v = this.newPassword();
    if (!v) return 'La nueva contrasena es obligatoria.';
    if (v.length < 8) return 'Minimo 8 caracteres.';
    return '';
  });

  newPasswordConfirmError = computed(() => {
    if (!this.newPasswordConfirmTouched()) return '';
    if (!this.newPasswordConfirm()) return 'Confirma la contrasena.';
    if (this.newPassword() !== this.newPasswordConfirm()) return 'Las contrasenas no coinciden.';
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

  async onChangePassword() {
    this.oldPasswordTouched.set(true);
    this.newPasswordTouched.set(true);
    this.newPasswordConfirmTouched.set(true);

    if (this.oldPasswordError() || this.newPasswordError() || this.newPasswordConfirmError()) return;

    this.isChangingPassword.set(true);
    this.passwordMessage.set('');

    try {
      await this.auth.changePassword(this.oldPassword(), this.newPassword(), this.newPasswordConfirm());
      this.passwordMessage.set('Contrasena cambiada exitosamente.');
      this.passwordMessageType.set('success');
      this.toast.success('Contrasena cambiada exitosamente.');
      this.oldPassword.set('');
      this.newPassword.set('');
      this.newPasswordConfirm.set('');
      this.oldPasswordTouched.set(false);
      this.newPasswordTouched.set(false);
      this.newPasswordConfirmTouched.set(false);
    } catch (err: any) {
      this.passwordMessage.set(err.error?.message || err.message || 'Error al cambiar la contrasena.');
      this.passwordMessageType.set('danger');
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  togglePasswordForm() {
    this.showPasswordForm.update(v => !v);
    if (!this.showPasswordForm()) {
      this.passwordMessage.set('');
    }
  }

  onBlur(field: string) {
    if (field === 'name') this.nameTouched.set(true);
    if (field === 'email') this.emailTouched.set(true);
    if (field === 'oldPassword') this.oldPasswordTouched.set(true);
    if (field === 'newPassword') this.newPasswordTouched.set(true);
    if (field === 'newPasswordConfirm') this.newPasswordConfirmTouched.set(true);
  }
}
