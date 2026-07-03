import { Component, input, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ForumService } from '../../services/forum.service';
import { ForumCommentComponent } from '../forum-comment/forum-comment';
import { ForumConfirmDeleteComponent } from '../forum-confirm-delete/forum-confirm-delete';

@Component({
  selector: 'app-forum-thread-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ForumCommentComponent, ForumConfirmDeleteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-thread-detail.html',
  styleUrl: './forum-thread-detail.css'
})
export class ForumThreadDetailComponent implements OnInit {
  threadId = input.required<string>();
  private forum = inject(ForumService);

  thread = this.forum.currentThread;
  comments = this.forum.comments;
  loading = this.forum.detailLoading;
  error = this.forum.error;

  newCommentText = signal('');
  showDeleteConfirm = signal(false);
  editing = signal(false);
  editTitle = signal('');
  editContent = signal('');
  editIsPublic = signal(true);

  ngOnInit(): void {
    this.forum.loadThreadDetail(this.threadId());
  }

  get authorName(): string {
    const t = this.thread();
    return t ? (t.author_name || 'Usuario') : '';
  }

  get relativeTime(): string {
    const t = this.thread();
    return t ? this.forum.relativeTime(t.created) : '';
  }

  async submitComment(): Promise<void> {
    const text = this.newCommentText().trim();
    if (!text) return;
    const id = await this.forum.addComment(this.threadId(), text, null);
    if (id) {
      this.newCommentText.set('');
      this.forum.loadThreadDetail(this.threadId());
    }
  }

  async voteThread(type: 'upvote' | 'downvote'): Promise<void> {
    const t = this.thread();
    if (!t) return;
    const res = await this.forum.vote(t.id, null, type);
    if (res) {
      this.forum.updateCurrentThread({
        upvotes: res.upvotes,
        downvotes: res.downvotes,
        user_vote: t.user_vote === type ? null : type,
      });
    }
  }

  onCommentAdded(): void {
    this.forum.loadThreadDetail(this.threadId());
  }

  startEdit(): void {
    const t = this.thread();
    if (!t) return;
    this.editTitle.set(t.title);
    this.editContent.set(t.content);
    this.editIsPublic.set(t.is_public);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  async saveEdit(): Promise<void> {
    const t = this.thread();
    if (!t) return;
    const ok = await this.forum.editThread(t.id, {
      title: this.editTitle().trim(),
      content: this.editContent().trim(),
      is_public: this.editIsPublic(),
    });
    if (ok) {
      this.editing.set(false);
      this.forum.loadThreadDetail(this.threadId());
    }
  }

  requestDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  async confirmDelete(): Promise<void> {
    const t = this.thread();
    if (!t) return;
    const ok = await this.forum.deleteThread(t.id);
    if (ok) {
      this.showDeleteConfirm.set(false);
      this.forum.loadThreadDetail(this.threadId());
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  dismissError(): void {
    this.forum.clearError();
  }

  isOwnThread(): boolean {
    const t = this.thread();
    const user = this.forum['auth'].user();
    return !!t && !!user && t.author_id === user.id;
  }
}
