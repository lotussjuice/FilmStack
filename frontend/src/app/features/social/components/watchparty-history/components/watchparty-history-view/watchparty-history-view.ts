import { Component, OnInit, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WatchpartyService } from '../../../../services/watchparty.service';
import { ExportService } from '../../../../../../core/services/export.service';
import { AuthService } from '../../../../../auth/services/auth.service';
import { WatchParty } from '../../../../interfaces/social.interface';
import { ToastService } from '../../../../../../core/services/toast.service';

interface FinishedPartyWithReviews {
  party: WatchParty;
  avgRating: number;
  reviewCount: number;
  reviews: any[];
  expanded: boolean;
}

@Component({
  selector: 'app-watchparty-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './watchparty-history-view.html',
  styleUrl: './watchparty-history-view.css'
})
export class WatchpartyHistoryComponent implements OnInit {
  private wp = inject(WatchpartyService);
  private exportService = inject(ExportService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  parties = signal<FinishedPartyWithReviews[]>([]);
  isLoading = signal<boolean>(true);

  searchName = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  hasActiveFilters = computed(() =>
    this.searchName().trim().length > 0 || this.dateFrom().length > 0 || this.dateTo().length > 0
  );

  filteredParties = computed<FinishedPartyWithReviews[]>(() => {
    const name = this.searchName().trim().toLowerCase();
    const from = this.dateFrom();
    const to = this.dateTo();
    return this.parties().filter(item => {
      if (name && !(item.party.activeMovieTitle || '').toLowerCase().includes(name)) {
        return false;
      }
      if (from || to) {
        const finished = item.party.finishedAt;
        if (!finished) return false;
        const ts = new Date(finished).getTime();
        if (isNaN(ts)) return false;
        if (from) {
          const fromTs = new Date(from + 'T00:00:00').getTime();
          if (ts < fromTs) return false;
        }
        if (to) {
          const toTs = new Date(to + 'T23:59:59').getTime();
          if (ts > toTs) return false;
        }
      }
      return true;
    });
  });

  totalSessions = computed(() => this.parties().length);
  visibleSessions = computed(() => this.filteredParties().length);
  overallAvg = computed(() => {
    const list = this.filteredParties();
    if (list.length === 0) return 0;
    const totalReviews = list.reduce((acc, p) => acc + p.reviewCount, 0);
    if (totalReviews === 0) return 0;
    const weighted = list.reduce((acc, p) => acc + (p.avgRating * p.reviewCount), 0);
    return weighted / totalReviews;
  });

  async ngOnInit() {
    await this.loadHistory();
  }

  async loadHistory() {
    this.isLoading.set(true);
    try {
      const list = await this.wp.getFinishedParties();
      const enriched: FinishedPartyWithReviews[] = [];
      for (const party of list) {
        const stats = await this.wp.getReviewsForParty(party.id);
        enriched.push({
          party,
          avgRating: stats.avg,
          reviewCount: stats.count,
          reviews: stats.reviews,
          expanded: false
        });
      }
      this.parties.set(enriched);
    } catch (e) {
      console.error('Error cargando historial de watchparties', e);
      this.toast.error('No se pudo cargar el historial');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleExpand(item: FinishedPartyWithReviews) {
    this.parties.update(all => all.map(x => x.party.id === item.party.id ? { ...x, expanded: !x.expanded } : x));
  }

  onNameChange(value: string) {
    this.searchName.set(value);
  }

  onDateFromChange(value: string) {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string) {
    this.dateTo.set(value);
  }

  clearFilters() {
    this.searchName.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  getPosterUrl(posterPath: string | null): string {
    return posterPath ? `https://image.tmdb.org/t/p/w300${posterPath}?export=${Date.now()}` : 'assets/images/poster-placeholder.png';
  }

  getRatingStars(rating: number): boolean[] {
    const r = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => i < r);
  }

  getRatingStarStates(rating: number): ('full' | 'half' | 'empty')[] {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    return Array.from({ length: 5 }, (_, i) => {
      if (i + 1 <= r) return 'full';
      if (i + 0.5 <= r) return 'half';
      return 'empty';
    });
  }

  async exportParty(item: FinishedPartyWithReviews, element: HTMLElement) {
    this.toast.info('Generando imágen...');
    const filename = `watchparty-${item.party.activeMovieTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
    const success = await this.exportService.exportReviewAsPng(element, filename);
    if (success) {
      this.toast.success('Imágen exportada correctamente');
    } else {
      this.toast.error('Error al exportar imágen');
    }
  }
}
