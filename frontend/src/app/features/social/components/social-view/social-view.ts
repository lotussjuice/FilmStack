import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialService } from '../../services/social.service';
import { FriendSearchComponent } from '../friend-search/friend-search';
import { FriendListComponent } from '../friend-list/friend-list';
import { FriendRequestsComponent } from '../friend-requests/friend-requests';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FriendSearchComponent, FriendListComponent, FriendRequestsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './social-view.html',
  styleUrl: './social-view.css'
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
