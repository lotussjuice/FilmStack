import { Component, inject, signal, ChangeDetectionStrategy, computed, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchpartyService } from '../../../../../../core/services/watchparty.service';
import { SocialService } from '../../../../../../core/services/social.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { FilmRepositoryService } from '../../../../../../core/services/film-repository.service';
import { TmdbService } from '../../../../../../core/services/tmdb.service';
import { HybridMovie } from '../../../../../../core/interfaces/movie.interface';
import { ChatPanelComponent } from '../chat-panel/chat-panel';
import { GroupRouletteComponent } from '../group-roulette/group-roulette';
import { SyncModalComponent } from '../sync-modal/sync-modal';
import { GroupReviewModalComponent } from '../group-review-modal/group-review-modal';
import { EditMovieModalComponent } from '../../../../../../shared/components/edit-movie-modal/edit-movie-modal';

@Component({
  selector: 'app-watchparty',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatPanelComponent, GroupRouletteComponent, SyncModalComponent, GroupReviewModalComponent, EditMovieModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchparty-view.html',
  styleUrl: './watchparty-view.css'
})
export class WatchpartyComponent implements OnInit {
  wp = inject(WatchpartyService);
  social = inject(SocialService);
  auth = inject(AuthService);
  private repo = inject(FilmRepositoryService);
  private tmdbService = inject(TmdbService);

  currentParty = this.wp.currentParty;
  isHost = this.wp.isHost;
  isInParty = this.wp.isInParty;
  members = computed(() => this.currentParty()?.memberNames || []);

  showCreate = signal<boolean>(true);
  showSyncModal = signal<boolean>(false);
  showReviewModal = signal<boolean>(false);
  memberSelection = signal<{ [id: string]: boolean }>({});

  showEditModal = signal<boolean>(false);
  editMovie = signal<HybridMovie | null>(null);

  showInviteMore = signal<boolean>(false);
  inviteSelection = signal<{ [id: string]: boolean }>({});

  friendSearch = signal<string>('');
  inviteSearch = signal<string>('');

  filteredFriends = computed(() => {
    const term = this.friendSearch().trim().toLowerCase();
    if (!term) return this.friends();
    return this.friends().filter(f => (f.name || '').toLowerCase().includes(term));
  });

  uninvitedFriends = computed(() => {
    const f = this.friends();
    const p = this.currentParty();
    if (!p) return f;
    const list = f.filter(friend => !p.members?.includes(friend.id));
    const term = this.inviteSearch().trim().toLowerCase();
    if (!term) return list;
    return list.filter(friend => (friend.name || '').toLowerCase().includes(term));
  });

  friends = this.social.friends;
  proposals = this.wp.proposals;
  messages = this.wp.messages;

  ngOnInit(): void {
    this.social.loadAll();
  }

  async createParty() {
    const selectedIds = Object.entries(this.memberSelection())
      .filter(([_, sel]) => sel)
      .map(([id]) => id);
    await this.wp.createParty(selectedIds);
    this.showCreate.set(false);
  }

  async leaveParty(skipConfirm = false) {
    if (!skipConfirm && !confirm('Salir de la watchparty?')) return;
    await this.wp.leaveParty();
    this.showCreate.set(true);
    this.showEditModal.set(false);
    this.editMovie.set(null);
  }

  toggleMember(id: string) {
    this.memberSelection.update(s => ({ ...s, [id]: !s[id] }));
  }

  toggleInvite(id: string) {
    this.inviteSelection.update(s => ({ ...s, [id]: !s[id] }));
  }

  async inviteSelected() {
    const selectedIds = Object.entries(this.inviteSelection())
      .filter(([_, sel]) => sel)
      .map(([id]) => id);
    if (selectedIds.length > 0) {
      await this.wp.inviteMembers(selectedIds);
    }
    this.inviteSelection.set({});
    this.showInviteMore.set(false);
  }

  onProposalAdded() {}

  watchSyncOpen() {
    if (this.currentParty()?.status === 'voting') {
      this.showSyncModal.set(true);
    }
  }

  async finishWatching() {
    if (this.isHost()) {
      await this.wp.finishAndReview();
    }
    this.showReviewModal.set(true);
  }

  private async openBacklogEditForMovie(tmdbId: number, _fallbackTitle: string, _fallbackPoster: string) {
    try {
      const existing = this.repo.hybridMovies().find(m => m.tmdb_id === tmdbId);
      if (existing) {
        this.editMovie.set({ ...existing, status: 'watched' });
        this.showEditModal.set(true);
        return;
      }
      await this.repo.addMovieToBacklog(tmdbId, { status: 'watched' });
      await new Promise(resolve => setTimeout(resolve, 200));
      const fresh = this.repo.hybridMovies().find(m => m.tmdb_id === tmdbId);
      if (fresh) {
        this.editMovie.set({ ...fresh, status: 'watched' });
        this.showEditModal.set(true);
      }
    } catch (e) {
      console.error('Error abriendo edicion de backlog:', e);
    }
  }

  async onEditConfirm(data: { status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }) {
    const movie = this.editMovie();
    if (movie) {
      await this.repo.updateMovie(movie.id, data);
    }
    this.showEditModal.set(false);
    this.editMovie.set(null);
  }

  onEditCancel() {
    this.showEditModal.set(false);
    this.editMovie.set(null);
  }

  async onReviewClosed() {
    this.showReviewModal.set(false);
    await this.leaveParty(true);
  }

  watchPartyStatusEffect = effect(() => {
    const party = this.currentParty();
    if (!party) {
      this.showSyncModal.set(false);
      this.showReviewModal.set(false);
      return;
    }
    if (party.status === 'voting' && !this.showSyncModal()) {
      this.showSyncModal.set(true);
    }
    if (party.status === 'finished' && !this.showReviewModal()) {
      this.showReviewModal.set(true);
    }
  });
}
