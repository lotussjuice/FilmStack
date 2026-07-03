import { Component, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveSessionService } from '../../services/active-session.service';

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

  readonly session = this.sessionService.session;
  readonly isActive = this.sessionService.isActive;

  finishRequested = output<{ tmdbId: number; title: string }>();

  onFinish() {
    const s = this.session();
    if (!s) return;
    this.finishRequested.emit({ tmdbId: s.tmdbId, title: s.title });
  }

  onDiscard() {
    this.sessionService.discard();
  }

  posterUrl(): string | null {
    const path = this.session()?.posterPath;
    return path ? `https://image.tmdb.org/t/p/w200${path}` : null;
  }
}
