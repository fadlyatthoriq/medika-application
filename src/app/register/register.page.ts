import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../auth.service';
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
  password: string = '';
  passwordConfirmation = '';
  firstName = '';
  lastName = '';
  errorMessage = '';
  passwordVisible = false;
  confirmationPasswordVisible = false;
  passwordStrength: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  private isValidPassword(password: string): boolean {
    const minLength = 6;
    const hasNumber = /\d/;
    return password.length >= minLength && hasNumber.test(password);
  }

  async registerUser() {
    // Validasi input
    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.passwordConfirmation) {
      this.showErrorAlert('All fields are required.');
      return;
    }
    
    if (!this.email.includes('@')) {
      this.showErrorAlert('Please enter a valid email address.');
      return;
    }
    
    if (this.password !== this.passwordConfirmation) {
      this.showErrorAlert('Password and confirmation password do not match.');
      return;
    }
    
    if (!this.isValidPassword(this.password)) {
      this.showErrorAlert('Password must be at least 6 characters long and contain at least one number.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registering...',
    });
    await loading.present();

    // Menggunakan Observable dari AuthService
    this.authService.register(this.email, this.password, this.firstName, this.lastName)
      .pipe(
        finalize(() => loading.dismiss())
      )
      .subscribe({
        next: () => this.handleRegistrationSuccess(),
        error: (error) => this.handleRegistrationError(error)
      });
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  calculatePasswordStrength(password: string): void {
    let strength = 0;
  
    if (password.length >= 8) strength += 15;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 15;
    if (/\d/.test(password)) strength += 15;
    if (/[@$!%*?&]/.test(password)) strength += 35;
  
    this.passwordStrength = Math.min(strength, 100);
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
    let message = 'Registration failed. Please try again.';

    if (error?.message) {
      message = error.message;
    } else if (error?.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Email already in use.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email format.';
          break;
      }
    }

    await this.showErrorAlert(message);
    console.error('Registration error:', error);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmationVisibility() {
    this.confirmationPasswordVisible = !this.confirmationPasswordVisible;
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}