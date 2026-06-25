import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ForumThread } from '../../interfaces/forum.interface';
import { ForumService } from '../../services/forum.service';

@Component({
  selector: 'app-forum-thread-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-thread-card.html',
  styleUrl: './forum-thread-card.css'
})
export class ForumThreadCardComponent {
  thread = input.required<ForumThread>();
  private forum = inject(ForumService);

  get authorName(): string {
    return this.forum.getCachedUserName(this.thread().author_id);
  }

  get relativeTime(): string {
    return this.forum.relativeTime(this.thread().created);
  }

  get previewText(): string {
    const text = this.thread().content;
    if (this.thread().deleted) return 'El usuario ha eliminado esta entrada';
    return text;
  }

  async vote(type: 'upvote' | 'downvote', e: Event): Promise<void> {
    e.stopPropagation();
    e.preventDefault();
    const thread = this.thread();
    const res = await this.forum.vote(thread.id, null, type);
    if (res) {
      thread.upvotes = res.upvotes;
      thread.downvotes = res.downvotes;
      thread.user_vote = thread.user_vote === type ? null : type;
    }
  }
}
