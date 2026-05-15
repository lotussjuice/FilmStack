import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  email = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);
  
  constructor() {
    // If already logged in, go to search
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/search']);
    }
  }

  async onLogin() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor, ingresa correo y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.login(this.email(), this.password());
      // On success, redirect to search
      this.router.navigate(['/search']);
    } catch (err: any) {
      console.error(err);
      this.errorMessage.set(err.message || 'Credenciales incorrectas o cuenta suspendida.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
