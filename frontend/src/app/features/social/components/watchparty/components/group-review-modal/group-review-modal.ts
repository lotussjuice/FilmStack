import { Component, input, output, inject, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchParty } from '../../../../../../models/social.model';
import { FormsModule } from '@angular/forms';
import { WatchpartyService } from '../../../../../../core/services/watchparty.service';
import { FilmRepositoryService } from '../../../../../../core/services/film-repository.service';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-group-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-review-modal.html',
  styleUrl: './group-review-modal.css'
})
export class GroupReviewModalComponent implements OnInit, OnDestroy {
  private wp = inject(WatchpartyService);
  private repo = inject(FilmRepositoryService);
  private auth = inject(AuthService);

  isOpen = input.required<boolean>();
  party = input<WatchParty | null>(null);
  closed = output<void>();

  rating = signal<number>(0);
  review = signal<string>('');
  groupAvg = signal<{ avg: number; count: number; reviews: any[] } | null>(null);

  isHost = this.wp.isHost;

  pendingVoters = computed(() => {
    const p = this.party();
    const g = this.groupAvg();
    if (!p || !p.memberNames) return [];
    if (!g || !g.reviews) return p.memberNames;
    const votedNames = g.reviews.map((r: any) => r.user_name);
    return p.memberNames.filter(name => !votedNames.includes(name));
  });

  hasVoted = computed(() => {
    const me = this.auth.user();
    if (!me) return false;
    const g = this.groupAvg();
    if (!g || !g.reviews) return false;
    return g.reviews.some((r: any) => r.user === me.id);
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.timer = setInterval(() => this.refreshAvg(), 3000);
    this.refreshAvg();
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  async refreshAvg() {
    const r = await this.wp.getGroupReviews();
    if (r) this.groupAvg.set(r);
  }

  async submit() {
    const r = this.rating();
    if (r < 1) return;
    const rev = this.review();
    const p = this.party();
    
    // Group review
    await this.wp.submitGroupReview(r, rev);
    
    // Personal review (backlog)
    if (p && p.activeMovie) {
      try {
        const existing = this.repo.hybridMovies().find(m => m.tmdb_id === p.activeMovie);
        if (existing) {
          await this.repo.updateMovie(existing.id, { status: 'watched', rating: r, review: rev });
        } else {
          await this.repo.addMovieToBacklog(p.activeMovie, { status: 'watched', rating: r, review: rev });
        }
      } catch (e) {
        console.error('Error guardando en backlog personal', e);
      }
    }

    this.review.set('');
    this.rating.set(0);
    this.refreshAvg();
  }

  setRating(v: number) {
    this.rating.set(v);
  }

  async onClose() {
    this.closed.emit();
  }
}
