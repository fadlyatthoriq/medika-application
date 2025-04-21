import {
    Directive,
    ElementRef,
    HostListener,
    Renderer2,
    inject,
  } from '@angular/core';
  
  @Directive({
    selector: '[appDropdown]',
    standalone: true,
  })
  export class DropdownDirective {
    private el = inject(ElementRef);
    private renderer = inject(Renderer2);
  
    @HostListener('document:click', ['$event'])
    handleClick(event: MouseEvent) {
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
            el.classList.remove('show');
          });
  
          // Jika dropdown belum terbuka, buka dropdown ini
          if (!isShown) {
            this.renderer.addClass(box, 'show');
          }
        }
      }
    }
  }
  