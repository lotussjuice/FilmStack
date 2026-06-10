import { Component, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActiveSessionService } from '../../services/active-session.service';
import { FilmRepositoryService } from '../../../backlog/services/film-repository.service';

@Component({
  selector: 'app-active-session-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './active-session-banner.html',
  styleUrl: './active-session-banner.css'
})
export class ActiveSessionBannerComponent {
  private sessionService = inject(ActiveSessionService);
  private router = inject(Router);
  private repo = inject(FilmRepositoryService);

  readonly session = this.sessionService.session;
  readonly isActive = this.sessionService.isActive;

  finishRequested = output<{ tmdbId: number; title: string }>();

  onFinish() {
    const s = this.session();
    if (!s) return;
    this.finishRequested.emit({ tmdbId: s.tmdbId, title: s.title });
    const inBacklog = this.repo.hybridMovies().find(m => m.tmdb_id === s.tmdbId);
    if (inBacklog) {
      this.router.navigate(['/backlog'], { queryParams: { edit: s.tmdbId } });
    } else {
      this.router.navigate(['/search'], { queryParams: { q: s.title } });
    }
    this.sessionService.discard();
  }

  onDiscard() {
    this.sessionService.discard();
  }

  posterUrl(): string | null {
    const path = this.session()?.posterPath;
    return path ? `https://image.tmdb.org/t/p/w200${path}` : null;
  }
}
