import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Import Router
import { AuthService } from '../auth.service';
import { IonicModule } from '@ionic/angular'; // Import IonicModule
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-dashboard-petugas',
  templateUrl: './dashboard-petugas.page.html',
  styleUrls: ['./dashboard-petugas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DashboardPetugasPage {

  constructor(private authService: AuthService, private router: Router) {}

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
