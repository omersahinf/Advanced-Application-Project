import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FlowerIconComponent } from '../flower-icon/flower-icon';

/**
 * Modal dialog — copied character-for-character from
 * `Flower Prototype.html` `Dialog` component.
 *
 * Renders a semi-transparent scrim, a centered card with a header (serif
 * title + close X), slotted body, and optional footer. Clicking the scrim
 * OR pressing Escape fires the `closed` output. Parents control open/close
 * via @if-wrapping the component.
 *
 * Layout:
 *   header       18px 22px  serif title
 *   body         22px       content projection
 *   footer       14px 22px  flex row, slot for action buttons
 *
 * Usage:
 *   @if (modal()) {
 *     <flower-dialog title="Add product" [width]="520" (closed)="modal.set(false)">
 *       …form markup…
 *       <ng-container footer>
 *         <button class="btn btn-ghost" (click)="modal.set(false)">Cancel</button>
 *         <button class="btn btn-primary" (click)="save()">Save</button>
 *       </ng-container>
 *     </flower-dialog>
 *   }
 */
@Component({
  selector: 'flower-dialog',
  standalone: true,
  imports: [FlowerIconComponent],
  template: `
    <div class="scrim" (click)="onScrimClick($event)" #scrim>
      <div class="dialog-card card" [style.width.px]="width" (click)="$event.stopPropagation()">
        <header class="dlg-header">
          <h2>{{ title }}</h2>
          <button
            type="button"
            class="btn btn-ghost close-btn"
            (click)="closed.emit()"
            aria-label="Close"
          >
            <flower-icon name="close" [size]="16" />
          </button>
        </header>
        <div class="dlg-body">
          <ng-content></ng-content>
        </div>
        <footer class="dlg-footer">
          <ng-content select="[footer]"></ng-content>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .scrim {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(26, 26, 26, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .dialog-card {
        max-width: 100%;
        max-height: 85vh;
        overflow: auto;
        padding: 0;
        box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.4);
      }
      .dlg-header {
        padding: 18px 22px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .dlg-header h2 {
        font-family: var(--serif);
        font-size: 18px;
      }
      .close-btn {
        padding: 6px;
      }
      .dlg-body {
        padding: 22px;
      }
      .dlg-footer {
        padding: 14px 22px;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        background: var(--hover);
      }
      /* Hide footer bar entirely when no footer is projected */
      .dlg-footer:empty {
        display: none;
      }
    `,
  ],
})
export class FlowerDialogComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() width = 480;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('scrim', { static: false }) scrimRef?: ElementRef<HTMLElement>;

  private previousOverflow = '';

  ngOnInit(): void {
    // Lock page scroll while the modal is mounted — restored on destroy.
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  onScrimClick(event: MouseEvent): void {
    if (event.target === this.scrimRef?.nativeElement) {
      this.closed.emit();
    }
  }
}
