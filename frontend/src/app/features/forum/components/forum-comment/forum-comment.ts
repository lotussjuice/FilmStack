import { Component, input, output, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumService } from '../../services/forum.service';
import { ForumComment } from '../../interfaces/forum.interface';
import { ForumConfirmDeleteComponent } from '../forum-confirm-delete/forum-confirm-delete';

@Component({
  selector: 'app-forum-comment',
  standalone: true,
  imports: [CommonModule, FormsModule, ForumConfirmDeleteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-comment.html',
  styleUrl: './forum-comment.css'
})
export class ForumCommentComponent {
  comment = input.required<ForumComment>();
  threadId = input.required<string>();
  commentAdded = output<void>();

  private forum = inject(ForumService);

  showReplyForm = signal(false);
  replyText = signal('');
  editing = signal(false);
  editText = signal('');
  showDeleteConfirm = signal(false);

  get authorName(): string {
    return this.forum.getCachedUserName(this.comment().author_id);
  }

  get relativeTime(): string {
    return this.forum.relativeTime(this.comment().created);
  }

  get indentPx(): number {
    const depth = this.comment().depth;
    return Math.min(depth, 3) * 24;
  }

  get parentAuthorName(): string {
    return this.forum.getCachedUserName(this.comment().author_id);
  }

  isOwnComment(): boolean {
    const user = this.forum['auth'].user();
    return !!user && this.comment().author_id === user.id;
  }

  getCommentAuthorName(comment: ForumComment): string {
    return this.forum.getCachedUserName(comment.author_id);
  }

  async vote(type: 'upvote' | 'downvote'): Promise<void> {
    const c = this.comment();
    const res = await this.forum.vote(null, c.id, type);
    if (res) {
      c.upvotes = res.upvotes;
      c.downvotes = res.downvotes;
      c.user_vote = c.user_vote === type ? null : type;
    }
  }

  toggleReplyForm(): void {
    this.showReplyForm.update(v => !v);
    if (!this.showReplyForm()) this.replyText.set('');
  }

  async submitReply(): Promise<void> {
    const text = this.replyText().trim();
    if (!text) return;
    const id = await this.forum.addComment(this.threadId(), text, this.comment().id);
    if (id) {
      this.replyText.set('');
      this.showReplyForm.set(false);
      this.commentAdded.emit();
    }
  }

  startEdit(): void {
    this.editText.set(this.comment().content);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editText.set('');
  }

  async saveEdit(): Promise<void> {
    const text = this.editText().trim();
    if (!text) return;
    const ok = await this.forum.editComment(this.comment().id, text);
    if (ok) {
      this.editing.set(false);
      this.commentAdded.emit();
    }
  }

  requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  async confirmDelete(): Promise<void> {
    const ok = await this.forum.deleteComment(this.comment().id);
    if (ok) {
      this.showDeleteConfirm.set(false);
      this.commentAdded.emit();
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }
}
