import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { IonicModule, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs/operators';
import { UserCredential } from 'firebase/auth';

// Tambahkan interface untuk user data
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
  rememberMe: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      this.email = savedEmail;
      this.rememberMe = true;
    }
  }

  ionViewWillEnter() {
    this.password = '';
  }

  private isValidPassword(password: string): boolean {
    const minLength = 6;
    const hasNumber = /\d/;
    return password.length >= minLength && hasNumber.test(password);
  }

  async loginUser() {
    console.log('Login process started');

    if (!this.email || !this.password) {
      this.showErrorAlert('Email and password are required.');
      return;
    }

    if (!this.email.includes('@')) {
      this.showErrorAlert('Please enter a valid email address.');
      return;
    }

    if (!this.isValidPassword(this.password)) {
      this.showErrorAlert('Password must be at least 6 characters long and contain at least one number.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    this.authService.login(this.email, this.password)
      .pipe(
        switchMap((userCredential: UserCredential) => {
          const uid = userCredential.user.uid;
          return this.authService.getUserData(uid);
        }),
        finalize(() => loading.dismiss())
      )
      .subscribe({
        next: (userData: UserData | null) => {
          if (!userData) {
            this.showErrorAlert('Data pengguna tidak ditemukan.');
            return;
          }

          if (this.rememberMe) {
            localStorage.setItem('rememberedEmail', this.email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          this.showSuccessToast('Login successful!');

          if (userData.role === 'staff') {
            this.router.navigate(['/dashboard-petugas']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (error) => {
          console.log('Login failed', error);
          this.handleLoginError(error);
        }
      });
  }

  private handleLoginSuccess() {
    this.showSuccessToast('Login successful!');
    this.router.navigate(['/dashboard']);
  }

  private async handleLoginError(error: any) {
    let message = 'Login failed. Please try again.';

    if (error?.message) {
      message = error.message;
    } else if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'User not found.';
          break;
        case 'auth/wrong-password':
          message = 'Wrong password.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
        case 'auth/invalid-credential':
          message = 'Invalid credentials. Please check your email and password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Account temporarily locked.';
          break;
      }
    }

    await this.showErrorAlert(message);
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Login Error',
      message: message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToForgetPassword() {
    this.router.navigate(['/forget-password']);
  }
}
