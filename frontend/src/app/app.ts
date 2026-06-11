import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from './features/auth/services/auth.service';
import { ActiveSessionBannerComponent } from './features/roulette/components/active-session-banner/active-session-banner';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container';
import { WatchpartyService } from './features/social/services/watchparty.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ActiveSessionBannerComponent, ToastContainerComponent],
  templateUrl: './app.html'
})
export class AppComponent {
  title = 'FilmStack';
  auth = inject(AuthService);
  private wp = inject(WatchpartyService);
  private router = inject(Router);

  protected isErrorRoute = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => ['/404', '/403', '/verify-email', '/reset-password'].includes(this.router.url))
    ),
    { initialValue: ['/404', '/403', '/verify-email', '/reset-password'].includes(location.pathname) }
  );

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
