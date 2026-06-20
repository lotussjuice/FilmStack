import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './features/auth/services/auth.service';
import { ActiveSessionBannerComponent } from './features/roulette/components/active-session-banner/active-session-banner';
import { ActiveSessionService } from './features/roulette/services/active-session.service';
import { FilmRepositoryService } from './features/backlog/services/film-repository.service';
import { EditMovieModalComponent } from './shared/components/edit-movie-modal/edit-movie-modal';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';
import { HybridMovie } from './core/interfaces/movie.interface';
import { WatchpartyService } from './features/social/services/watchparty.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ActiveSessionBannerComponent, EditMovieModalComponent, ToastContainerComponent],
  templateUrl: './app.html'
})
export class AppComponent {
  title = 'FilmStack';
  auth = inject(AuthService);
  private wp = inject(WatchpartyService);
  private router = inject(Router);
  private sessionService = inject(ActiveSessionService);
  private repo = inject(FilmRepositoryService);

  isEditModalOpen = signal(false);
  editMovie = signal<HybridMovie | null>(null);

  protected isErrorRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => ['/404', '/403', '/verify-email', '/reset-password'].includes(this.router.url))
    ),
    { initialValue: ['/404', '/403', '/verify-email', '/reset-password'].includes(location.pathname) }
  );

  onFinishSession(data: { tmdbId: number; title: string }) {
    const movie = this.repo.hybridMovies().find(m => m.tmdb_id === data.tmdbId);
    if (movie) {
      this.editMovie.set(movie);
      this.isEditModalOpen.set(true);
    }
    this.sessionService.finish();
  }

  onSaveEdit(data: { status: 'pending' | 'watched' | 'dropped'; rating: number; review: string; is_favorite: boolean }) {
    const m = this.editMovie();
    if (m) {
      this.repo.updateMovie(m.id, data);
    }
    this.isEditModalOpen.set(false);
    this.editMovie.set(null);
  }

  onCancelEdit() {
    this.isEditModalOpen.set(false);
    this.editMovie.set(null);
  }

  closeSidebar() {
    const offcanvas = document.getElementById('sidebarOffcanvas');
    if (offcanvas) {
      const bsOffcanvas = (window as any).bootstrap?.Offcanvas;
      if (bsOffcanvas) {
        const instance = bsOffcanvas.getInstance(offcanvas);
        instance?.hide();
      }
    }
  }
}
