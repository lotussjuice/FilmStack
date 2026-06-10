import { Component, input, output, inject, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchpartyService } from '../../../../../../core/services/watchparty.service';
import { WatchParty } from '../../../../../../features/social/interfaces/social.interface';

const VOTING_DURATION_MS = 30000;

@Component({
  selector: 'app-sync-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sync-modal.html',
  styleUrl: './sync-modal.css'
})
export class SyncModalComponent implements OnInit, OnDestroy {
  private wp = inject(WatchpartyService);

  isOpen = input.required<boolean>();
  party = input<WatchParty | null>(null);
  isHost = this.wp.isHost;

  accepted = output<void>();
  declined = output<void>();

  decision = signal<'pending' | 'accept' | 'decline'>('pending');
  now = signal<number>(Date.now());
  private timer: any = null;
  private autoResolved = false;

  remainingSeconds = computed(() => {
    const p = this.party();
    if (!p || !p.votingStartedAt) return Math.ceil(VOTING_DURATION_MS / 1000);
    const start = new Date(p.votingStartedAt).getTime();
    const elapsed = this.now() - start;
    return Math.max(0, Math.ceil((VOTING_DURATION_MS - elapsed) / 1000));
  });

  allVoted = computed(() => {
    const votes = this.syncVoteCount();
    const total = this.memberCount();
    return votes.add + votes.discard >= total;
  });

  constructor() {
    effect(() => {
      const rem = this.remainingSeconds();
      const p = this.party();
      const open = this.isOpen();
      const allIn = this.allVoted();
      const expired = rem === 0;
      if (open && p && p.status === 'voting' && this.isHost() && !this.autoResolved && (allIn || expired)) {
        this.autoResolve();
      }
      if (open && p && p.status === 'voting') {
        this.autoResolved = false;
      }
    });
  }

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.now.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async autoResolve() {
    this.autoResolved = true;
    const votes = this.syncVoteCount();
    const totalMembers = this.memberCount();
    if (votes.add >= Math.ceil(totalMembers / 2) && votes.add > votes.discard) {
      await this.wp.acceptAndStart();
      this.accepted.emit();
    } else {
      await this.wp.declineAndReroll();
      this.declined.emit();
    }
  }

  async accept() {
    this.decision.set('accept');
    await this.wp.syncVote('add');
    this.accepted.emit();
  }

  async decline() {
    this.decision.set('decline');
    await this.wp.syncVote('discard');
    this.declined.emit();
  }

  syncVoteCount = computed(() => {
    const p = this.party();
    if (!p || !p.votes || !p.votes['sync_vote']) return { add: 0, discard: 0 };
    const v = p.votes['sync_vote'];
    let add = 0;
    let discard = 0;
    for (const val of Object.values(v)) {
      if (val === 'add') add++;
      if (val === 'discard') discard++;
    }
    return { add, discard };
  });

  memberCount = computed(() => {
    const p = this.party();
    if (!p) return 1;
    return p.confirmedMembers.length + 1;
  });

  posterUrl(): string | null {
    const p = this.party()?.activeMoviePoster;
    return p ? `https://image.tmdb.org/t/p/w300${p}` : null;
  }
}
