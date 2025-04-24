import {
    Directive,
    ElementRef,
    HostListener,
    Renderer2,
    inject,
    OnDestroy,
    OnInit,
  } from '@angular/core';
  
  @Directive({
    selector: '[appDropdown]',
    standalone: true,
  })
  export class DropdownDirective implements OnInit, OnDestroy {
    private el = inject(ElementRef);
    private renderer = inject(Renderer2);
    private clickListener: (() => void) | null = null;
  
    ngOnInit(): void {
      // Initialize click listener
      this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
        this.handleClick(event);
      });
    }
  
    ngOnDestroy(): void {
      // Clean up click listener
      if (this.clickListener) {
        this.clickListener();
      }
    }
  
    private handleClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const dropdown = this.el.nativeElement as HTMLElement;
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const box = dropdown.querySelector('.dropdown-box');
  
      if (box) {
        // Jika klik di luar dropdown, sembunyikan dropdown
        if (!dropdown.contains(target)) {
          this.renderer.removeClass(box, 'show');
        } else if (toggle?.contains(target)) {
          const isShown = box?.classList.contains('show');
          // Tutup semua dropdown lain yang sedang terbuka
          document.querySelectorAll('.dropdown-box.show').forEach(el => {
            if (el !== box) {
              this.renderer.removeClass(el, 'show');
            }
          });
  
          // Jika dropdown belum terbuka, buka dropdown ini
          if (!isShown) {
            this.renderer.addClass(box, 'show');
          }
        }
      }
    }
  }
  