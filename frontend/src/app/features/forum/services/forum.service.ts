import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PocketbaseService } from '../../../core/services/pocketbase.service';
import {
  ForumThread, ForumComment, ForumThreadListResponse,
  ForumThreadDetailResponse, VoteResponse,
  ForumSort, ForumOrder, ForumVisibility
} from '../interfaces/forum.interface';

export interface UserCache {
  [id: string]: { name: string };
}

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private pb = inject(PocketbaseService);

  private threadsState = signal<ForumThread[]>([]);
  private totalState = signal(0);
  private totalPagesState = signal(0);
  private currentPageState = signal(0);
  private currentThreadState = signal<ForumThread | null>(null);
  private commentsState = signal<ForumComment[]>([]);
  private loadingState = signal(false);
  private detailLoadingState = signal(false);
  private errorState = signal('');
  private sortState = signal<ForumSort>('created');
  private orderState = signal<ForumOrder>('desc');
  private visibilityState = signal<ForumVisibility>('all');
  private userCacheState = signal<UserCache>({});

  readonly threads = computed(() => this.threadsState());
  readonly total = computed(() => this.totalState());
  readonly totalPages = computed(() => this.totalPagesState());
  readonly currentPage = computed(() => this.currentPageState());
  readonly currentThread = computed(() => this.currentThreadState());
  readonly comments = computed(() => this.commentsState());
  readonly loading = computed(() => this.loadingState());
  readonly detailLoading = computed(() => this.detailLoadingState());
  readonly error = computed(() => this.errorState());
  readonly sort = computed(() => this.sortState());
  readonly order = computed(() => this.orderState());
  readonly visibility = computed(() => this.visibilityState());
  readonly userCache = computed(() => this.userCacheState());

  setSort(sort: ForumSort): void {
    this.sortState.set(sort);
    this.loadThreads(0);
  }

  setOrder(order: ForumOrder): void {
    this.orderState.set(order);
    this.loadThreads(0);
  }

  setVisibility(visibility: ForumVisibility): void {
    this.visibilityState.set(visibility);
    this.loadThreads(0);
  }

  clearError(): void {
    this.errorState.set('');
  }

  updateThreadInList(threadId: string, changes: Partial<ForumThread>): void {
    this.threadsState.update(list =>
      list.map(t => t.id === threadId ? { ...t, ...changes } : t)
    );
  }

  updateCommentVote(commentId: string, changes: Partial<ForumComment>): void {
    this.commentsState.update(tree =>
      this.applyCommentChanges(tree, commentId, changes)
    );
  }

  updateCurrentThread(changes: Partial<ForumThread>): void {
    this.currentThreadState.update(cur =>
      cur ? { ...cur, ...changes } : cur
    );
  }

  private applyCommentChanges(tree: ForumComment[], commentId: string, changes: Partial<ForumComment>): ForumComment[] {
    return tree.map(c => {
      if (c.id === commentId) {
        return { ...c, ...changes };
      }
      if (c.children && c.children.length > 0) {
        return { ...c, children: this.applyCommentChanges(c.children, commentId, changes) };
      }
      return c;
    });
  }

  async loadThreads(page: number = 0): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set('');
    this.currentPageState.set(page);

    try {
      const params: any = {
        page: page.toString(),
        perPage: '20',
        sort: this.sortState(),
        order: this.orderState(),
        visibility: this.visibilityState(),
      };
      const res = await firstValueFrom(
        this.http.get<ForumThreadListResponse>('/api/forum/threads', { params })
      );
      this.threadsState.set(res.threads);
      this.totalState.set(res.total);
      this.totalPagesState.set(res.totalPages);
      this.cacheUsers(res.threads.map(t => t.author_id));
    } catch (e: any) {
      this.errorState.set('Error al cargar hilos');
      this.toast.error('Error al cargar hilos');
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadThreadDetail(threadId: string): Promise<void> {
    this.detailLoadingState.set(true);
    this.errorState.set('');

    try {
      const res = await firstValueFrom(
        this.http.get<ForumThreadDetailResponse>(`/api/forum/threads/${threadId}`)
      );
      this.currentThreadState.set(res.thread);
      const tree = this.buildCommentTree(res.comments);
      this.commentsState.set(tree);
      const userIds = [res.thread.author_id, ...res.comments.map(c => c.author_id)];
      this.cacheUsers(userIds);
    } catch (e: any) {
      this.errorState.set('Error al cargar el hilo');
      this.toast.error('Error al cargar el hilo');
    } finally {
      this.detailLoadingState.set(false);
    }
  }

  async createThread(title: string, content: string, isPublic: boolean): Promise<string | null> {
    try {
      const res: any = await firstValueFrom(
        this.http.post('/api/forum/threads', { title, content, is_public: isPublic })
      );
      this.toast.success('Hilo creado exitosamente');
      return res.id;
    } catch (e: any) {
      this.toast.error('Error al crear el hilo');
      return null;
    }
  }

  async editThread(threadId: string, data: { title?: string; content?: string; is_public?: boolean }): Promise<boolean> {
    try {
      await firstValueFrom(this.http.patch(`/api/forum/threads/${threadId}`, data));
      this.toast.success('Hilo editado exitosamente');
      return true;
    } catch (e: any) {
      this.toast.error('Error al editar el hilo');
      return false;
    }
  }

  async deleteThread(threadId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/api/forum/threads/${threadId}/delete`, {}));
      this.toast.success('Hilo eliminado');
      return true;
    } catch (e: any) {
      this.toast.error('Error al eliminar el hilo');
      return false;
    }
  }

  async addComment(threadId: string, content: string, parentId: string | null = null): Promise<string | null> {
    try {
      const res: any = await firstValueFrom(
        this.http.post('/api/forum/comments', { thread: threadId, content, parent: parentId })
      );
      return res.id;
    } catch (e: any) {
      this.toast.error('Error al publicar comentario');
      return null;
    }
  }

  async editComment(commentId: string, content: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.patch(`/api/forum/comments/${commentId}`, { content }));
      this.toast.success('Comentario editado');
      return true;
    } catch (e: any) {
      this.toast.error('Error al editar el comentario');
      return false;
    }
  }

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/api/forum/comments/${commentId}/delete`, {}));
      this.toast.success('Comentario eliminado');
      return true;
    } catch (e: any) {
      this.toast.error('Error al eliminar el comentario');
      return false;
    }
  }

  async vote(threadId: string | null, commentId: string | null, voteType: 'upvote' | 'downvote'): Promise<VoteResponse | null> {
    try {
      return await firstValueFrom(
        this.http.post<VoteResponse>('/api/forum/vote', { thread: threadId, comment: commentId, vote_type: voteType })
      );
    } catch (e: any) {
      this.toast.error('Error al votar');
      return null;
    }
  }

  async getUserName(userId: string): Promise<string> {
    const cache = this.userCacheState();
    if (cache[userId]) return cache[userId].name;
    try {
      const user = await this.pb.collection('users').getOne(userId, { fields: 'name', $autoCancel: false });
      const name = (user as any)['name'] || 'Usuario';
      this.userCacheState.update(c => ({ ...c, [userId]: { name } }));
      return name;
    } catch {
      return 'Usuario';
    }
  }

  private async cacheUsers(userIds: string[]): Promise<void> {
    const unique = [...new Set(userIds)];
    const cache = this.userCacheState();
    const missing = unique.filter(id => !cache[id]);
    if (missing.length === 0) return;

    try {
      const map = await this.pb.fetchUsersByIds(missing);
      this.userCacheState.update(c => {
        const next = { ...c };
        for (const [id, user] of map) {
          next[id] = { name: user.name };
        }
        // fill any that were not found
        for (const id of missing) {
          if (!next[id]) next[id] = { name: 'Usuario' };
        }
        return next;
      });
    } catch {}
  }

  getCachedUserName(userId: string): string {
    return this.userCacheState()[userId]?.name || 'Usuario';
  }

  private buildCommentTree(comments: ForumComment[]): ForumComment[] {
    const map = new Map<string, ForumComment>();
    const roots: ForumComment[] = [];

    for (const c of comments) {
      map.set(c.id, { ...c, children: [] });
    }

    for (const c of comments) {
      const node = map.get(c.id)!;
      if (c.parent && map.has(c.parent)) {
        map.get(c.parent)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  relativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return 'ahora';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
