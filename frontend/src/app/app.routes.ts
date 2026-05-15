import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { SearchComponent } from './features/search/search';
import { BacklogComponent } from './features/backlog/backlog';
import { MovieDetailComponent } from './features/movie-detail/movie-detail';
import { UsersComponent } from './features/admin/users/users';
import { ProfileComponent } from './features/profile/profile';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'search', component: SearchComponent, canActivate: [authGuard] },
  { path: 'backlog', component: BacklogComponent, canActivate: [authGuard] },
  { path: 'movie/:movieId', component: MovieDetailComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: UsersComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: '**', redirectTo: 'search' }
];
