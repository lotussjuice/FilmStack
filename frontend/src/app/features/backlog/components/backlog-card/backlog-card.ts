import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HybridMovie } from '../../../../core/interfaces/movie.interface';

@Component({
  selector: 'app-backlog-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backlog-card.html',
  styleUrl: './backlog-card.css'
})
export class BacklogCardComponent {
  movie = input.required<HybridMovie>();
  info = output<HybridMovie>();
  edit = output<HybridMovie>();
  delete = output<{ id: string; event: Event }>();

  onInfoClick(event: Event) {
    event.stopPropagation();
    this.info.emit(this.movie());
  }

  onEditClick(event: Event) {
    event.stopPropagation();
    this.edit.emit(this.movie());
  }

  onDeleteClick(event: Event) {
    this.delete.emit({ id: this.movie().id, event });
  }
}
