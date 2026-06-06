import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialService } from '../../../../core/services/social.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-friend-requests',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-requests.html',
  styleUrl: './friend-requests.css'
})
export class FriendRequestsComponent implements OnInit {
  private social = inject(SocialService);
  private toast = inject(ToastService);
  requests = this.social.requests;

  ngOnInit(): void {
    this.social.loadRequests();
  }

  async accept(userId: string) {
    const target = this.requests().received.find(r => r.id === userId);
    const ok = await this.social.acceptRequest(userId);
    if (ok) {
      this.toast.success(`Ahora eres amigo de ${target?.name || 'este usuario'}`);
    } else {
      this.toast.error('No se pudo aceptar la solicitud');
    }
  }

  async reject(userId: string) {
    const target = this.requests().received.find(r => r.id === userId);
    const ok = await this.social.rejectRequest(userId);
    if (ok) {
      this.toast.info(`Solicitud de ${target?.name || 'este usuario'} rechazada`);
    } else {
      this.toast.error('No se pudo rechazar la solicitud');
    }
  }

  async cancelSent(userId: string) {
    const target = this.requests().sent.find(r => r.id === userId);
    const ok = await this.social.rejectRequest(userId);
    if (ok) {
      this.toast.info(`Solicitud a ${target?.name || 'este usuario'} cancelada`);
    } else {
      this.toast.error('No se pudo cancelar la solicitud');
    }
  }
}
