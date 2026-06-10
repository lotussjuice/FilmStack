import { Injectable, signal, computed, effect } from '@angular/core';

export interface ActiveSession {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: string;
  startedAt: string;
  source: 'roulette' | 'watchparty' | 'direct';
  watchpartyId?: string;
}

const STORAGE_KEY = 'filmstack:active-session';

@Injectable({
  providedIn: 'root'
})
export class ActiveSessionService {
  private sessionState = signal<ActiveSession | null>(this.loadFromStorage());

  readonly session = computed(() => this.sessionState());
  readonly isActive = computed(() => this.sessionState() !== null);
  readonly title = computed(() => this.sessionState()?.title ?? '');
  readonly posterPath = computed(() => this.sessionState()?.posterPath ?? null);

  constructor() {
    effect(() => {
      const s = this.sessionState();
      if (s) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        } catch (e) {}
      } else {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }
    });
  }

  start(payload: Omit<ActiveSession, 'startedAt'>): void {
    this.sessionState.set({
      ...payload,
      startedAt: new Date().toISOString()
    });
  }

  finish(): ActiveSession | null {
    const current = this.sessionState();
    this.sessionState.set(null);
    return current;
  }

  discard(): void {
    this.sessionState.set(null);
  }

  private loadFromStorage(): ActiveSession | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveSession;
      if (!parsed || !parsed.tmdbId || !parsed.title) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }
}
