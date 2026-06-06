import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialService } from '../../../../core/services/social.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-list.html',
  styleUrl: './friend-list.css'
})
export class FriendListComponent implements OnInit {
  private social = inject(SocialService);
  private toast = inject(ToastService);
  friends = this.social.friends;

  isConfirmOpen = signal<boolean>(false);
  pendingRemoveId = signal<string | null>(null);

  ngOnInit(): void {
    this.social.loadFriends();
  }

  askRemove(userId: string) {
    this.pendingRemoveId.set(userId);
    this.isConfirmOpen.set(true);
  }

  cancelRemove() {
    this.isConfirmOpen.set(false);
    this.pendingRemoveId.set(null);
  }

  async confirmRemove() {
    const id = this.pendingRemoveId();
    if (!id) return;
    const target = this.friends().find(f => f.id === id);
    const ok = await this.social.removeFriend(id);
    if (ok) {
      this.toast.info(`${target?.name || 'Amigo'} eliminado de tu lista`);
    } else {
      this.toast.error('No se pudo eliminar al amigo');
    }
    this.isConfirmOpen.set(false);
    this.pendingRemoveId.set(null);
  }
}
