import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forum-confirm-delete',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forum-confirm-delete.html',
  styleUrl: './forum-confirm-delete.css'
})
export class ForumConfirmDeleteComponent {
  message = input.required<string>();
  confirm = output<void>();
  cancel = output<void>();
}
