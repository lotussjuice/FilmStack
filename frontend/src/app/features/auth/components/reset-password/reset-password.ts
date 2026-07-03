import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  token = signal('');
  newPassword = signal('');
  newPasswordTouched = signal(false);
  newPasswordConfirm = signal('');
  newPasswordConfirmTouched = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);
  success = signal(false);
  tokenInvalid = signal(false);

  newPasswordError = computed(() => {
    if (!this.newPasswordTouched()) return '';
    const v = this.newPassword();
    if (!v) return 'La contrasena es obligatoria.';
    if (v.length < 8) return 'Minimo 8 caracteres.';
    return '';
  });

  newPasswordConfirmError = computed(() => {
    if (!this.newPasswordConfirmTouched()) return '';
    const v = this.newPasswordConfirm();
    if (!v) return 'Confirma la contrasena.';
    if (v !== this.newPassword()) return 'Las contrasenas no coinciden.';
    return '';
  });

  constructor() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.tokenInvalid.set(true);
      this.errorMessage.set('Token requerido. Usa el enlace que recibiste por correo.');
    } else {
      this.token.set(token);
    }
  }

  async onSubmit() {
    this.newPasswordTouched.set(true);
    this.newPasswordConfirmTouched.set(true);
    if (this.newPasswordError() || this.newPasswordConfirmError()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.confirmPasswordReset(this.token(), this.newPassword(), this.newPasswordConfirm());
      this.success.set(true);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || err.message || 'Error al restablecer la contrasena.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onBlur(field: 'newPassword' | 'newPasswordConfirm') {
    if (field === 'newPassword') this.newPasswordTouched.set(true);
    if (field === 'newPasswordConfirm') this.newPasswordConfirmTouched.set(true);
  }
}
