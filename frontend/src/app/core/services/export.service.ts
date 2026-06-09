import { Injectable, inject } from '@angular/core';
import { HybridMovie } from '../interfaces/movie.interface';
import { AuthService } from './auth.service';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private auth = inject(AuthService);

  async exportReviewAsPng(element: HTMLElement, filename: string): Promise<boolean> {
    if (!element) {
      console.error('ExportService: elemento nulo');
      return false;
    }
    let originalStyles: { position: string; top: string; left: string; right: string; bottom: string; visibility: string; opacity: string; zIndex: string; transform: string; pointerEvents: string; } | null = null;
    let parentOriginalStyles: { position: string; top: string; left: string; right: string; bottom: string; overflow: string; } | null = null;
    let parentEl: HTMLElement | null = null;
    try {
      const computed = window.getComputedStyle(element);
      parentEl = element.parentElement;
      const parentComputed = parentEl ? window.getComputedStyle(parentEl) : null;

      originalStyles = {
        position: element.style.position || computed.position,
        top: element.style.top || computed.top,
        left: element.style.left || computed.left,
        right: element.style.right || computed.right,
        bottom: element.style.bottom || computed.bottom,
        visibility: element.style.visibility || computed.visibility,
        opacity: element.style.opacity || computed.opacity,
        zIndex: element.style.zIndex || computed.zIndex,
        transform: element.style.transform || computed.transform,
        pointerEvents: element.style.pointerEvents || computed.pointerEvents
      };
      if (parentEl && parentComputed) {
        parentOriginalStyles = {
          position: parentEl.style.position || parentComputed.position,
          top: parentEl.style.top || parentComputed.top,
          left: parentEl.style.left || parentComputed.left,
          right: parentEl.style.right || parentComputed.right,
          bottom: parentEl.style.bottom || parentComputed.bottom,
          overflow: parentEl.style.overflow || parentComputed.overflow
        };
      }

      element.style.position = 'fixed';
      element.style.top = '0';
      element.style.left = '0';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.zIndex = '2147483647';
      element.style.transform = 'none';
      element.style.pointerEvents = 'none';

      if (parentEl && parentOriginalStyles) {
        parentEl.style.position = 'static';
        parentEl.style.top = 'auto';
        parentEl.style.left = 'auto';
        parentEl.style.right = 'auto';
        parentEl.style.bottom = 'auto';
        parentEl.style.overflow = 'visible';
      }

      await this.preloadImages(element);

      const rect = element.getBoundingClientRect();
      const canvas = await html2canvas(element, {
        backgroundColor: '#E2E8F0',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        logging: false,
        width: Math.max(rect.width, element.scrollWidth || 0),
        height: Math.max(rect.height, element.scrollHeight || 0),
        windowWidth: Math.max(document.documentElement.clientWidth, rect.width + 100),
        windowHeight: Math.max(document.documentElement.clientHeight, rect.height + 100),
        onclone: (clonedDoc, clonedElement) => {
          clonedElement.style.position = 'static';
          clonedElement.style.top = 'auto';
          clonedElement.style.left = 'auto';
          clonedElement.style.right = 'auto';
          clonedElement.style.bottom = 'auto';
          clonedElement.style.visibility = 'visible';
          clonedElement.style.opacity = '1';
          clonedElement.style.transform = 'none';
          clonedElement.style.zIndex = '0';
          clonedElement.style.pointerEvents = 'auto';
          const cards = clonedDoc.querySelectorAll('.share-card, .export-card');
          cards.forEach((node: any) => {
            node.style.position = 'static';
            node.style.top = 'auto';
            node.style.left = 'auto';
            node.style.right = 'auto';
            node.style.bottom = 'auto';
            node.style.transform = 'none';
            node.style.margin = '0';
            node.style.zIndex = '0';
            node.style.visibility = 'visible';
            node.style.opacity = '1';
            node.style.pointerEvents = 'auto';
          });
        }
      });

      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        console.error('ExportService: no se pudo generar el blob');
        return false;
      }
      this.triggerDownload(blob, filename);
      return true;
    } catch (err) {
      console.error('Error exportando reseña:', err);
      return false;
    } finally {
      if (originalStyles) {
        element.style.position = originalStyles.position;
        element.style.top = originalStyles.top;
        element.style.left = originalStyles.left;
        element.style.right = originalStyles.right;
        element.style.bottom = originalStyles.bottom;
        element.style.visibility = originalStyles.visibility;
        element.style.opacity = originalStyles.opacity;
        element.style.zIndex = originalStyles.zIndex;
        element.style.transform = originalStyles.transform;
        element.style.pointerEvents = originalStyles.pointerEvents;
      }
      if (parentEl && parentOriginalStyles) {
        parentEl.style.position = parentOriginalStyles.position;
        parentEl.style.top = parentOriginalStyles.top;
        parentEl.style.left = parentOriginalStyles.left;
        parentEl.style.right = parentOriginalStyles.right;
        parentEl.style.bottom = parentOriginalStyles.bottom;
        parentEl.style.overflow = parentOriginalStyles.overflow;
      }
    }
  }

  private async preloadImages(root: HTMLElement): Promise<void> {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 8000);
        const handler = () => { clearTimeout(timeout); resolve(); };
        img.addEventListener('load', handler, { once: true });
        img.addEventListener('error', handler, { once: true });
      });
    }));
  }

  buildFilename(movie: HybridMovie): string {
    const safeTitle = (movie.tmdb_data?.title || 'reseña')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `filmstack-${safeTitle}-${Date.now()}.png`;
  }

  getCurrentUserName(): string {
    return this.auth.user()?.name || 'FilmStack User';
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
