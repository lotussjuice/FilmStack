import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  status = signal<'verifying' | 'success' | 'error'>('verifying');
  message = signal('');

  async ngOnInit() {
    const token = this.route.snapshot.queryParams['token'];
    if (!token) {
      this.status.set('error');
      this.message.set('Token requerido.');
      return;
    }

    try {
      await this.authService.confirmVerification(token);
      this.status.set('success');
      this.message.set('Correo verificado exitosamente.');
    } catch (err: any) {
      this.status.set('error');
      this.message.set(err.error?.message || err.message || 'Error al verificar el correo.');
    }
  }
}
