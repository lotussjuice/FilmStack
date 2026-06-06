import { Component, inject, signal, ChangeDetectionStrategy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocialService } from '../../../../core/services/social.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-friend-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-search.html',
  styleUrl: './friend-search.css'
})
export class FriendSearchComponent {
  private social = inject(SocialService);
  private toast = inject(ToastService);

  query = signal<string>('');
  results = this.social.searchResults;
  loading = this.social.loading;
  friends = this.social.friends;
  sentRequests = computed(() => this.social.requests().sent.map(r => r.id));

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const q = this.query();
      if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.social.searchByName(q);
      }, 350);
    });
  }

  onInput(value: string) {
    this.query.set(value);
  }

  isFriend(userId: string): boolean {
    return this.friends().some(f => f.id === userId);
  }

  hasSentRequest(userId: string): boolean {
    return this.sentRequests().includes(userId);
  }

  async sendRequest(userId: string) {
    const target = this.results().find(r => r.id === userId);
    const ok = await this.social.sendRequest(userId);
    if (ok) {
      this.toast.success(`Solicitud enviada a ${target?.name || 'el usuario'}`);
    } else {
      this.toast.error('No se pudo enviar la solicitud');
    }
  }

  async cancelRequest(userId: string) {
    const target = this.results().find(r => r.id === userId);
    const ok = await this.social.rejectRequest(userId);
    if (ok) {
      this.toast.info(`Solicitud a ${target?.name || 'el usuario'} cancelada`);
    } else {
      this.toast.error('No se pudo cancelar la solicitud');
    }
  }
}
