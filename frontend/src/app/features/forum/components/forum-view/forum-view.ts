import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForumService } from '../../services/forum.service';
import { ForumThreadCardComponent } from '../forum-thread-card/forum-thread-card';
import { ForumCreateModalComponent } from '../forum-create-modal/forum-create-modal';
import { ForumSort, ForumOrder, ForumVisibility } from '../../interfaces/forum.interface';

@Component({
  selector: 'app-forum-view',
  standalone: true,
  imports: [CommonModule, ForumThreadCardComponent, ForumCreateModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-view.html',
  styleUrl: './forum-view.css'
})
export class ForumViewComponent implements OnInit {
  private forum = inject(ForumService);

  threads = this.forum.threads;
  loading = this.forum.loading;
  error = this.forum.error;
  sort = this.forum.sort;
  order = this.forum.order;
  visibility = this.forum.visibility;
  currentPage = this.forum.currentPage;
  totalPages = this.forum.totalPages;

  showCreateModal = false;

  ngOnInit(): void {
    this.forum.loadThreads(0);
  }

  setSort(sort: ForumSort): void {
    this.forum.setSort(sort);
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.forum.setSort(value as ForumSort);
  }

  setOrder(order: ForumOrder): void {
    this.forum.setOrder(order);
  }

  setVisibility(v: ForumVisibility): void {
    this.forum.setVisibility(v);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.forum.loadThreads(page);
    }
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onThreadCreated(threadId: string): void {
    this.showCreateModal = false;
    this.forum.loadThreads(0);
  }

  dismissError(): void {
    this.forum.clearError();
  }
}
