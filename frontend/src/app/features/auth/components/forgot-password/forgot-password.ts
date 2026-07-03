import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  email = signal('');
  emailTouched = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);
  sent = signal(false);

  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const v = this.email();
    if (!v) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato de correo invalido.';
    return '';
  });

  async onSubmit() {
    this.emailTouched.set(true);
    if (this.emailError()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.requestPasswordReset(this.email());
      this.sent.set(true);
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || err.message || 'Error al solicitar el restablecimiento.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onBlur() { this.emailTouched.set(true); }
}
