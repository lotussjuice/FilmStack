import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
}
