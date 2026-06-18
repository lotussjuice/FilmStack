import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeService } from '../../services/home.service';
import { HomeData } from '../../../stats/services/stats.service';
import { TmdbService } from '../../../../core/services/tmdb.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-view.html',
  styleUrl: './home-view.css'
})
export class HomeComponent implements OnInit {
  private homeService = inject(HomeService);
  private tmdb = inject(TmdbService);
  private router = inject(Router);
  public auth = inject(AuthService);

  homeData = signal<HomeData | null>(null);
  lastWatchedMovie = signal<any>(null);
  friendsMovies = signal<any[]>([]);
  isLoading = signal(true);

  async ngOnInit() {
    this.isLoading.set(true);
    const data = await this.homeService.getHomeData();
    this.homeData.set(data);

    if (data?.lastWatched) {
      const movie = await this.homeService.getTmdbMovie(data.lastWatched.tmdb_id);
      this.lastWatchedMovie.set(movie);
    }

    if (data?.friendsRecent) {
      const movies: any[] = [];
      for (const review of data.friendsRecent.slice(0, 6)) {
        if (!movies.find(m => m.id === review.tmdb_id)) {
          const movie = await this.homeService.getTmdbMovie(review.tmdb_id);
          if (movie) {
            movies.push({ ...movie, friendName: review.user_name, friendRating: review.rating });
          }
        }
      }
      this.friendsMovies.set(movies);
    }

    this.isLoading.set(false);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  getPosterUrl(path: string | null): string {
    return path ? `https://image.tmdb.org/t/p/w300${path}` : 'assets/no-poster.png';
  }

  getBackdropUrl(path: string | null): string {
    return path ? `https://image.tmdb.org/t/p/w780${path}` : '';
  }
}
