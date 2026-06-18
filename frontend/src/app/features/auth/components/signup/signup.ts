import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  name = signal('');
  email = signal('');
  password = signal('');
  passwordConfirm = signal('');
  nameTouched = signal(false);
  emailTouched = signal(false);
  passwordTouched = signal(false);
  passwordConfirmTouched = signal(false);
  errorMessage = signal('');
  isLoading = signal(false);
  public success = signal(false);
  public registeredEmail = signal('');

  nameError = computed(() => {
    if (!this.nameTouched()) return '';
    const v = this.name();
    if (!v) return 'El nombre es obligatorio.';
    if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    return '';
  });

  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const v = this.email();
    if (!v) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Formato de correo invalido.';
    return '';
  });

  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    const v = this.password();
    if (!v) return 'La contrasena es obligatoria.';
    if (v.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
    return '';
  });

  passwordConfirmError = computed(() => {
    if (!this.passwordConfirmTouched()) return '';
    if (!this.passwordConfirm()) return 'Confirma tu contrasena.';
    if (this.password() !== this.passwordConfirm()) return 'Las contrasenas no coinciden.';
    return '';
  });

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  async onRegister() {
    this.nameTouched.set(true);
    this.emailTouched.set(true);
    this.passwordTouched.set(true);
    this.passwordConfirmTouched.set(true);

    if (this.nameError() || this.emailError() || this.passwordError() || this.passwordConfirmError()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.register(this.email(), this.password(), this.passwordConfirm(), this.name());
      this.success.set(true);
      this.registeredEmail.set(this.email());
      this.toast.success(`Cuenta creada exitosamente. Revisa ${this.email()} para verificar.`);
    } catch (err: any) {
      const message = err.error?.message || err.message || 'Error al crear la cuenta.';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  onBlur(field: string) {
    if (field === 'name') this.nameTouched.set(true);
    if (field === 'email') this.emailTouched.set(true);
    if (field === 'password') this.passwordTouched.set(true);
    if (field === 'passwordConfirm') this.passwordConfirmTouched.set(true);
  }
}
