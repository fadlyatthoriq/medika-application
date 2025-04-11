import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service'; // Gunakan AuthService yang sudah ada

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.page.html',
  styleUrls: ['./forget-password.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ForgetPasswordPage {
  email = '';
  isLoading = false;

  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private authService: AuthService // Inject AuthService
  ) {}

  async resetPassword() {
    // Validasi input
    if (!this.email.trim()) {
      await this.showToast('Email tidak boleh kosong', 'danger');
      return;
    }

    const email = this.email.trim().toLowerCase();
    
    if (!this.isValidEmail(email)) {
      await this.showToast('Format email tidak valid', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Memproses...',
    });
    await loading.present();
    this.isLoading = true;

    try {
      // Cek apakah email terdaftar
      const methods = await this.authService.checkEmailExists(email);
      
      if (!methods || methods.length === 0) {
        await this.showToast('Email tidak terdaftar', 'danger');
        return;
      }

      // Kirim email reset password
      await this.authService.sendPasswordResetEmail(email);
      await this.showToast('Instruksi reset password telah dikirim ke email Anda', 'success');
      this.navigateToLogin();
    } catch (error: unknown) {
      const errorMessage = this.getErrorMessage(error);
      await this.showToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errorCode = (error as { code: string }).code;
      
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Email tidak terdaftar',
        'auth/invalid-email': 'Format email tidak valid',
        'auth/too-many-requests': 'Terlalu banyak permintaan. Silakan coba lagi nanti',
        'auth/network-request-failed': 'Gagal terhubung ke jaringan',
      };

      return errorMessages[errorCode] || 'Terjadi kesalahan. Silakan coba lagi';
    }
    return 'Terjadi kesalahan. Silakan coba lagi';
  }

  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
    });
    await toast.present();
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}