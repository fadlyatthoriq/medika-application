import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../service/auth/auth.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegisterPage {
  email = '';
  password = '';
  passwordConfirmation = '';
  firstName = '';
  lastName = '';
  errorMessage = '';
  passwordVisible = false;
  confirmationPasswordVisible = false;
  passwordStrength = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  // Helper Functions
  private isValidPassword(password: string): boolean {
    return password.length >= 6 && /\d/.test(password);
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async handleRegistrationSuccess() {
    const toast = await this.toastController.create({
      message: 'Registration successful!',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
    this.router.navigate(['/dashboard']);
  }

  private async handleRegistrationError(error: any) {
    const message = this.getErrorMessage(error);
    await this.showErrorAlert(message);
  }

  private getErrorMessage(error: any): string {
    let message = 'Registration failed. Please try again.';
    if (error?.message) {
      message = error.message;
    } else if (error?.code) {
      message = this.mapErrorCodeToMessage(error.code);
    }
    return message;
  }

  private mapErrorCodeToMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already in use.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      case 'auth/invalid-email': return 'Invalid email format.';
      default: return 'Registration failed. Please try again.';
    }
  }

  // Validation & Registration Logic
  async registerUser() {
    if (!this.isFormValid()) return;

    const loading = await this.loadingController.create({
      message: 'Registering...',
    });
    await loading.present();

    this.authService.register(this.email, this.password, this.firstName, this.lastName)
      .pipe(finalize(() => loading.dismiss()))
      .subscribe({
        next: () => this.handleRegistrationSuccess(),
        error: (error) => this.handleRegistrationError(error)
      });
  }

  private isFormValid(): boolean {
    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.passwordConfirmation) {
      this.showErrorAlert('All fields are required.');
      return false;
    }

    if (!this.email.includes('@')) {
      this.showErrorAlert('Please enter a valid email address.');
      return false;
    }

    if (this.password !== this.passwordConfirmation) {
      this.showErrorAlert('Password and confirmation password do not match.');
      return false;
    }

    if (!this.isValidPassword(this.password)) {
      this.showErrorAlert('Password must be at least 6 characters long and contain at least one number.');
      return false;
    }

    return true;
  }

  // Password Strength Calculation
  calculatePasswordStrength(password: string): void {
    const strength = this.computePasswordStrength(password);
    this.passwordStrength = Math.min(strength, 100);
  }

  private computePasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength += 15;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 15;
    if (/\d/.test(password)) strength += 15;
    if (/[@$!%*?&]/.test(password)) strength += 35;
    return strength;
  }

  // Toggle Password Visibility
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmationVisibility() {
    this.confirmationPasswordVisible = !this.confirmationPasswordVisible;
  }

  // Navigation
  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
