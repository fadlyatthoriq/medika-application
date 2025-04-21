import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth/auth.service';

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
    private authService: AuthService
  ) {}

  // Main method for resetting password
  async resetPassword() {
    if (this.isEmailEmpty()) {
      await this.showToast('Email cannot be empty', 'danger');
      return;
    }

    const email = this.email.trim().toLowerCase();

    if (!this.isValidEmail(email)) {
      await this.showToast('Invalid email format', 'danger');
      return;
    }

    await this.processPasswordReset(email);
  }

  // Check if the email is empty
  private isEmailEmpty(): boolean {
    return !this.email.trim();
  }

  // Validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Create and display loading indicator
  private async createLoadingIndicator() {
    const loading = await this.loadingController.create({
      message: 'Processing...',
    });
    await loading.present();
    return loading;
  }

  // Display toast notifications
  private async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
    });
    await toast.present();
  }

  // Handle the process of sending password reset email
  private async processPasswordReset(email: string) {
    const loading = await this.createLoadingIndicator();
    this.isLoading = true;

    try {
      await this.authService.sendPasswordResetEmail(email);
      await this.showToast(
        'If the email is registered, we have sent password reset instructions',
        'success'
      );
      this.navigateToLogin();
    } catch (error) {
      console.error('Reset password error:', error);
      await this.showToast('Failed to process request. Please try again later', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // Navigate back to login page
  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
