import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'runtime',
  standalone: true
})
export class RuntimePipe implements PipeTransform {
  transform(value: number | undefined): string {
    if (!value) return '0h 0m';
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours}h ${minutes}m`;
  }
}
