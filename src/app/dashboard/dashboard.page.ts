import { Component, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router'; // Import Router
import { AuthService } from '../service/auth/auth.service';
import { IonicModule } from '@ionic/angular'; // Import IonicModule
import { CommonModule } from '@angular/common'; // Import CommonModule
import feather from 'feather-icons';
import { DropdownDirective } from '../../assets/template-admin/dropdown.directive'; // Import DropdownDirective

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Use CUSTOM_ELEMENTS_SCHEMA to avoid errors with custom elements
  standalone: true, // Mark as standalone
  imports: [CommonModule, IonicModule, DropdownDirective],
})
export class DashboardPage implements AfterViewInit {
  constructor(private authService: AuthService, private router: Router) {}

  isMobileMenuOpen = false;

toggleMobileMenu() {
  this.isMobileMenuOpen = !this.isMobileMenuOpen;
}

ngAfterViewInit(): void {
  feather.replace();
  this.loadScript(); // Load script after view initialization
}

loadScript() {
  const script = document.createElement('script');
  script.src = 'assets/template-admin/dist/js/app.js'; // pastikan path-nya benar
  script.defer = true;
  document.body.appendChild(script);
}

  reloadPage() {
    location.reload();
  }

  async logout() {
    try {
      await this.authService.logout();
      console.log('User logged out');

      // Hapus data password dari localStorage (opsional, jika disimpan)
      localStorage.removeItem('password');

      // Navigasi ke halaman login
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
      alert('Logout failed: ' + errorMessage);
    }
  }
}