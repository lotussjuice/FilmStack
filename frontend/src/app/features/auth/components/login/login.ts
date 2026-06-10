import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = signal('');
  password = signal('');
  emailTouched = signal(false);
  passwordTouched = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);

  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const v = this.email();
    if (!v) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato de correo inválido.';
    return '';
  });

  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    const v = this.password();
    if (!v) return 'La contraseña es obligatoria.';
    if (v.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    return '';
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/search']);
    }
  }

  async onLogin() {
    this.emailTouched.set(true);
    this.passwordTouched.set(true);

    if (this.emailError() || this.passwordError()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.login(this.email(), this.password());
      this.toast.success('Inicio de sesión exitoso. ¡Bienvenido!');
      this.router.navigate(['/search']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Credenciales incorrectas o cuenta suspendida.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onEmailBlur() { this.emailTouched.set(true); }
  onPasswordBlur() { this.passwordTouched.set(true); }
}
