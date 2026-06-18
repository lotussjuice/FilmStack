import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login';
import { SignupComponent } from './features/auth/components/signup/signup';
import { ForgotPasswordComponent } from './features/auth/components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './features/auth/components/reset-password/reset-password';
import { VerifyEmailComponent } from './features/auth/components/verify-email/verify-email';
import { SearchComponent } from './features/search/components/search-view/search-view';
import { BacklogComponent } from './features/backlog/components/backlog-view/backlog-view';
import { MovieDetailComponent } from './features/movie-detail/components/movie-detail-view/movie-detail-view';
import { UsersComponent } from './features/admin/users/components/users-view/users-view';
import { ProfileComponent } from './features/profile/components/profile-view/profile-view';
import { RouletteComponent } from './features/roulette/components/roulette-view/roulette-view';
import { SocialComponent } from './features/social/components/social-view/social-view';
import { WatchpartyComponent } from './features/social/components/watchparty/components/watchparty-view/watchparty-view';
import { WatchpartyHistoryComponent } from './features/social/components/watchparty-history/components/watchparty-history-view/watchparty-history-view';
import { HomeComponent } from './features/home/components/home-view/home-view';
import { StatsComponent } from './features/stats/components/stats-view/stats-view';
import { RecommendationsComponent } from './features/recommendations/components/recommendations-view/recommendations-view';
import { authGuard } from './core/guards/auth.guard';
import { NotFoundComponent } from './features/error/pages/not-found/not-found';
import { NotAuthorizedComponent } from './features/error/pages/not-authorized/not-authorized';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'stats', component: StatsComponent, canActivate: [authGuard] },
  { path: 'recommendations', component: RecommendationsComponent, canActivate: [authGuard] },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'backlog', component: BacklogComponent, canActivate: [authGuard] },
  { path: 'roulette', component: RouletteComponent, canActivate: [authGuard] },
  { path: 'social', component: SocialComponent, canActivate: [authGuard] },
  { path: 'watchparty', component: WatchpartyComponent, canActivate: [authGuard] },
  { path: 'watchparty/history', component: WatchpartyHistoryComponent, canActivate: [authGuard] },
  { path: 'movie/:movieId', component: MovieDetailComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: UsersComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '404', component: NotFoundComponent },
  { path: '403', component: NotAuthorizedComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent }
];
