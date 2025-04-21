import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth/auth.service';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap, catchError } from 'rxjs/operators';
import { UserCredential } from 'firebase/auth';

// Define UserData interface for better type safety
interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: Date;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  errorMessage = '';
  passwordVisible = false;
  rememberMe = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  // Initialize the component and check for saved email
  ngOnInit() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      this.email = savedEmail;
      this.rememberMe = true;
    }
  }

  // Reset password field on entering the view
  ionViewWillEnter() {
    this.password = '';
  }

  // Validate password: must be at least 6 characters and contain a number
  private isValidPassword(password: string): boolean {
    const minLength = 6;
    const hasNumber = /\d/;
    return password.length >= minLength && hasNumber.test(password);
  }

  // Login the user after validation
  async loginUser() {
    console.log('Login process started');

    // Check if email and password are provided
    if (!this.email || !this.password) {
      await this.showAlert('Email and password are required.', 'Login Error');
      return;
    }

    // Validate email format
    if (!this.email.includes('@')) {
      await this.showAlert('Please enter a valid email address.', 'Login Error');
      return;
    }

    // Validate password strength
    if (!this.isValidPassword(this.password)) {
      await this.showAlert('Password must be at least 6 characters long and contain at least one number.', 'Login Error');
      return;
    }

    // Show loading indicator while processing login
    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    // Attempt login with authentication service
    this.authService.login(this.email, this.password)
      .pipe(
        switchMap((userCredential: UserCredential) => {
          const uid = userCredential.user.uid;
          return this.authService.getUserData(uid);
        }),
        finalize(() => loading.dismiss()),
        catchError((error) => {
          console.error('Login failed', error);
          this.handleLoginError(error);
          return [];
        })
      )
      .subscribe({
        next: (userData: UserData | null) => {
          if (!userData) {
            this.showAlert('User data not found.', 'Login Error');
            return;
          }

          // Store email if "Remember me" is checked
          if (this.rememberMe) {
            localStorage.setItem('rememberedEmail', this.email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          // Show success message and navigate based on user role
          this.showToast('Login successful!', 'success');
          if (userData.role === 'staff') {
            this.router.navigate(['/dashboard-petugas']);
          } else if (userData.role === 'user') {
            this.router.navigate(['/dashboard']);
          } else {
            this.showAlert('Role not recognized.', 'Login Error');
          }
        }
      });
  }

  // Display an alert with custom message and header
  private async showAlert(message: string, header: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  // Display a toast message for feedback
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
    });
    await toast.present();
  }

  // Handle login errors and display appropriate message
  private async handleLoginError(error: any) {
    let message = 'Login failed. Please try again.';
    if (error?.message) {
      message = error.message;
    } else if (error?.code) {
      message = this.getErrorMessageByCode(error.code);
    }
    await this.showAlert(message, 'Login Error');
  }

  // Map error code to human-readable message
  private getErrorMessageByCode(code: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'User not found.',
      'auth/wrong-password': 'Wrong password.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
      'auth/too-many-requests': 'Too many failed attempts. Account temporarily locked.',
    };
    return errorMessages[code] || 'An unknown error occurred.';
  }

  // Toggle password visibility
  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  // Navigate to registration page
  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  // Navigate to forgot password page
  navigateToForgetPassword(event: MouseEvent): void {
    event.preventDefault();
    console.log('Forgot Password link clicked', event);
    this.router.navigate(['/forget-password']);
  }
}
