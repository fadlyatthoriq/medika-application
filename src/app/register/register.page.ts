import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../service/auth/auth.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

interface RegistrationForm {
  email: string;
  password: string;
  passwordConfirmation: string;
  firstName: string;
  lastName: string;
  noTelp: string;
  birthDate: string;
  gender: string;
  address: string;
  profilePicture: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class RegisterPage {
  // Form fields with proper typing
  form: RegistrationForm = {
    email: '',
    password: '',
    passwordConfirmation: '',
    firstName: '',
    lastName: '',
    noTelp: '',
    birthDate: '',
    gender: '',
    address: '',
    profilePicture: '/assets/template-admin/dist/images/profile-8.jpg'
  };
  
  // UI states
  errorMessage = '';
  passwordVisible = false;
  confirmationPasswordVisible = false;
  passwordStrength = 0;
  isLoading = false;
  formSubmitted = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  // Registration logic
  async registerUser(form: NgForm) {
    this.formSubmitted = true;
    if (!this.isFormValid(form)) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Creating your account...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService
      .register(
        this.form.email,
        this.form.password,
        this.form.firstName,
        this.form.lastName,
        this.form.noTelp,
        this.form.birthDate,
        this.form.gender,
        this.form.address,
        this.form.profilePicture
      )
      .pipe(finalize(() => {
        loading.dismiss();
        this.isLoading = false;
      }))
      .subscribe({
        next: () => this.handleRegistrationSuccess(),
        error: (error) => this.handleRegistrationError(error),
      });
  }

  private isFormValid(form: NgForm): boolean {
    if (form.invalid) {
      this.showErrorAlert('Please fill in all required fields correctly.');
      return false;
    }

    if (this.form.password !== this.form.passwordConfirmation) {
      this.showErrorAlert('Password and confirmation password do not match.');
      return false;
    }

    if (!this.isValidPassword(this.form.password)) {
      this.showErrorAlert('Password must be at least 6 characters long and contain at least one number and one uppercase letter.');
      return false;
    }

    return true;
  }

  // Password validation
  private isValidPassword(password: string): boolean {
    const hasMinLength = password.length >= 6;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    return hasMinLength && hasNumber && hasUpperCase;
  }

  calculatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      return;
    }
    
    const strength = this.computePasswordStrength(password);
    this.passwordStrength = Math.min(strength, 100);
  }

  private computePasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 6) strength += 40;
    if (/[A-Z]/.test(password)) strength += 30;
    if (/\d/.test(password)) strength += 30;
    return strength;
  }

  // UI helpers
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmationVisibility(): void {
    this.confirmationPasswordVisible = !this.confirmationPasswordVisible;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private async handleRegistrationSuccess(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Registration successful! Welcome to Medika.',
      duration: 3000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
    this.router.navigate(['/dashboard']);
  }

  private async handleRegistrationError(error: any): Promise<void> {
    const message = this.getErrorMessage(error);
    await this.showErrorAlert(message);
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (error?.code) {
      return this.mapErrorCodeToMessage(error.code);
    }
    
    return 'An unexpected error occurred. Please try again later.';
  }

  private mapErrorCodeToMessage(code: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'This email is already registered. Please use a different email or try logging in.',
      'auth/weak-password': 'Password is too weak. Please use a stronger password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'Registration is currently disabled. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your internet connection.'
    };
    
    return errorMessages[code] || 'Registration failed. Please try again.';
  }

  private async showErrorAlert(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Registration Error',
      message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    });
    await alert.present();
  }

  // Password requirement checkers
  hasMinLength(): boolean {
    return this.form.password.length >= 6;
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.form.password);
  }

  hasNumber(): boolean {
    return /\d/.test(this.form.password);
  }
}
