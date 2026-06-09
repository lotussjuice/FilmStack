import { Component, inject, ChangeDetectionStrategy, OnInit, OnDestroy, signal, effect, ElementRef, viewChild, AfterViewChecked, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchpartyService } from '../../../../../../core/services/watchparty.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { WatchParty, MovieProposal } from '../../../../../../features/social/interfaces/social.interface';
import { TmdbService } from '../../../../../../core/services/tmdb.service';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css'
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  private wp = inject(WatchpartyService);
  private auth = inject(AuthService);

  private tmdbService = inject(TmdbService);

  party = input.required<WatchParty>();
  messages = this.wp.messages;
  proposals = this.wp.proposals;

  newMessage = signal<string>('');
  
  showProposeForm = signal<boolean>(false);
  searchQuery = signal<string>('');
  searchResults = signal<any[]>([]);
  selectedMovie = signal<any | null>(null);
  isSearching = signal<boolean>(false);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  private timer: ReturnType<typeof setInterval> | null = null;
  now = signal<number>(Date.now());

  private scrollEl = viewChild<ElementRef<HTMLElement>>('scrollEl');

  ngOnInit(): void {
    this.timer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  ngAfterViewChecked(): void {
    const el = this.scrollEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async send() {
    const text = this.newMessage().trim();
    if (!text) return;
    await this.wp.sendMessage(text);
    this.newMessage.set('');
  }

  onSearchQueryChange(value: string) {
    this.searchQuery.set(value);
    this.selectedMovie.set(null);
    if (this.searchTimeout !== null) clearTimeout(this.searchTimeout);
    if (!value.trim()) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }
    this.isSearching.set(true);
    this.searchTimeout = setTimeout(async () => {
      try {
        const results = await this.tmdbService.searchMovies(value);
        this.searchResults.set(results.slice(0, 5));
      } catch (e) {
        this.searchResults.set([]);
      } finally {
        this.isSearching.set(false);
      }
    }, 400);
  }

  selectMovie(m: any) {
    this.selectedMovie.set(m);
  }

  async propose() {
    const movie = this.selectedMovie();
    if (!movie) return;
    await this.wp.proposeMovie(movie.id, movie.title, movie.poster_path || null);
    
    // reset form
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.selectedMovie.set(null);
    this.showProposeForm.set(false);
  }

  async vote(proposal: MovieProposal, v: 'add' | 'discard') {
    await this.wp.vote(this.wp.proposalKey(proposal), v);
  }

  remainingSeconds(p: MovieProposal): number {
    const end = new Date(p.expiresAt).getTime();
    return Math.max(0, Math.ceil((end - this.now()) / 1000));
  }

  proposalVoteCount(p: MovieProposal): { add: number; discard: number } {
    const votes = Object.values(p.votes || {});
    return {
      add: votes.filter(v => v === 'add').length,
      discard: votes.filter(v => v === 'discard').length
    };
  }

  getFreshProposal(p: MovieProposal): MovieProposal | undefined {
    return this.proposals().find(prop => prop.tmdbId === p.tmdbId);
  }

  isOwnMessage(userId: string): boolean {
    return this.auth.user()?.id === userId;
  }

  isSystemMessage(m: any): boolean {
    return m.type === 'system' || m.userId === 'system';
  }
}
