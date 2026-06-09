import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login';
import { SearchComponent } from './features/search/components/search-view/search-view';
import { BacklogComponent } from './features/backlog/components/backlog-view/backlog-view';
import { MovieDetailComponent } from './features/movie-detail/components/movie-detail-view/movie-detail-view';
import { UsersComponent } from './features/admin/users/components/users-view/users-view';
import { ProfileComponent } from './features/profile/components/profile-view/profile-view';
import { RouletteComponent } from './features/roulette/components/roulette-view/roulette-view';
import { SocialComponent } from './features/social/components/social-view/social-view';
import { WatchpartyComponent } from './features/social/components/watchparty/watchparty';
import { WatchpartyHistoryComponent } from './features/social/components/watchparty-history/watchparty-history';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'backlog', component: BacklogComponent, canActivate: [authGuard] },
  { path: 'roulette', component: RouletteComponent, canActivate: [authGuard] },
  { path: 'social', component: SocialComponent, canActivate: [authGuard] },
  { path: 'watchparty', component: WatchpartyComponent, canActivate: [authGuard] },
  { path: 'watchparty/history', component: WatchpartyHistoryComponent, canActivate: [authGuard] },
  { path: 'movie/:movieId', component: MovieDetailComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: UsersComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: '**', redirectTo: 'search' }
];
