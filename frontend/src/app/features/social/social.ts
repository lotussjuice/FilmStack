import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialService } from '../../core/services/social.service';
import { FriendSearchComponent } from './components/friend-search/friend-search';
import { FriendListComponent } from './components/friend-list/friend-list';
import { FriendRequestsComponent } from './components/friend-requests/friend-requests';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FriendSearchComponent, FriendListComponent, FriendRequestsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social.html',
  styleUrl: './social.css'
})
export class SocialComponent implements OnInit {
  private social = inject(SocialService);

  loading = this.social.loading;
  error = this.social.error;

  ngOnInit(): void {
    this.social.loadAll();
  }

  dismissError() {
    this.social.clearError();
  }
}
