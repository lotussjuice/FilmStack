import { Component, output, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumService } from '../../services/forum.service';

@Component({
  selector: 'app-forum-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-create-modal.html',
  styleUrl: './forum-create-modal.css'
})
export class ForumCreateModalComponent {
  close = output<void>();
  created = output<string>();

  private forum = inject(ForumService);

  title = signal('');
  content = signal('');
  isPublic = signal(true);
  submitting = signal(false);

  async submit(): Promise<void> {
    const t = this.title().trim();
    const c = this.content().trim();
    if (!t || !c) return;

    this.submitting.set(true);
    const id = await this.forum.createThread(t, c, this.isPublic());
    this.submitting.set(false);

    if (id) {
      this.created.emit(id);
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
