import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HybridMovie } from '../../../../core/interfaces/movie.interface';

@Component({
  selector: 'app-roulette-result-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roulette-result-modal.html',
  styleUrl: './roulette-result-modal.css'
})
export class RouletteResultModalComponent {
  isOpen = input.required<boolean>();
  movie = input<HybridMovie | null>(null);

  accepted = output<void>();
  dismissed = output<void>();
  closed = output<void>();

  posterUrl(): string | null {
    const m = this.movie();
    const path = m?.tmdb_data?.poster_path;
    return path ? `https://image.tmdb.org/t/p/w300${path}` : null;
  }

  year(): string {
    const d = this.movie()?.tmdb_data?.release_date;
    return d ? new Date(d).getFullYear().toString() : '';
  }

  rating(): number {
    return this.movie()?.rating ?? this.movie()?.tmdb_data?.vote_average ?? 0;
  }

  onAccept() {
    this.accepted.emit();
  }

  onDismiss() {
    this.dismissed.emit();
  }
}
