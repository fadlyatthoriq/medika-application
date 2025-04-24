import {
  Component,
  AfterViewInit,
  AfterViewChecked,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { DropdownDirective } from '../../assets/template-admin/dropdown.directive';
import { AuthService } from '../service/auth/auth.service';
import { UserService, Users } from '../service/user/user.service';
import { firstValueFrom, Subject } from 'rxjs';
import * as feather from 'feather-icons';
import { CloudinaryService } from '../service/cloudinary.service';

const DEFAULT_PROFILE_PICTURE = '/assets/template-admin/dist/images/profile-8.jpg';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    DropdownDirective,
    RouterModule,
  ],
})
export class ProfilePage implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  isMobileMenuOpen = false;
  isLoading = false;
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  errorMessage: string | null = null;

  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    noTelp: ['', [Validators.pattern(/^[0-9+\-()\s]*$/)]],
    birthDate: [''],
    gender: [''],
    address: [''],
    profilePicture: ['']
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  showPersonalInfo = true;
  showChangePassword = false;
  showPasswordForm = false;
  activeSection: 'personal' | 'password' = 'personal';

  // Password validation flags
  hasMinLength = false;
  hasUpperCase = false;
  hasNumbers = false;
  passwordStrength = 0;
  isChangingPassword = false;

  currentUser = {
    name: '',
    role: '',
    profilePicture: DEFAULT_PROFILE_PICTURE,
  };

  currentUserData: Users = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    noTelp: '',
    birthDate: '',
    gender: '',
    address: '',
    profilePicture: '',
    createdAt: new Date(),
  };

  menuItems = [
    { title: 'Dashboard', icon: 'home', route: '/dashboard', isActive: true },
    { title: 'Profile', icon: 'user', route: '/profile', isActive: false },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private toastController: ToastController,
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  ngAfterViewInit(): void {
    this.initializeFeatherIcons();
    this.loadCustomScript();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========================================
  // === AUTH & USER DATA LOADING ===========
  // ========================================
  private async loadUserData(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.authState$);
      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      const data = await firstValueFrom(this.userService.getUserByEmail(user.email!));
      if (!data) return;

      this.currentUserData = { ...data };
      this.profileForm.patchValue(data);

      this.currentUser = {
        name: `${data.firstName} ${data.lastName}`,
        role: data.role,
        profilePicture: data.profilePicture ?? DEFAULT_PROFILE_PICTURE,
      };
    } catch (error) {
      this.showToast('Authentication failed', 'danger', error);
    }
  }

  // ========================================
  // ========== PROFILE ACTIONS =============
  // ========================================
  async saveProfile(): Promise<void> {
    this.isLoading = true;

    try {
      if (this.profileForm.invalid) {
        this.showToast('Form tidak valid. Mohon lengkapi semua data wajib.', 'warning');
        return;
      }

      const formValues = this.profileForm.value;

      if (!this.currentUserData.id) {
        this.showToast('ID pengguna tidak valid.', 'danger');
        return;
      }

      const existingUser = await firstValueFrom(this.userService.getUser(this.currentUserData.id));
      if (!existingUser) {
        this.showToast('Data pengguna tidak ditemukan.', 'danger');
        return;
      }

      // Check if there are actual changes
      const hasChanged = Object.keys(formValues).some(key => {
        const formValue = formValues[key as keyof typeof formValues];
        const existingValue = existingUser[key as keyof Users];
        return formValue !== existingValue;
      });

      if (!hasChanged) {
        this.showToast('Tidak ada perubahan data.', 'warning');
        return;
      }

      // Prepare updated user data
      const updatedUser: Users = {
        ...existingUser,
        firstName: formValues.firstName || existingUser.firstName,
        lastName: formValues.lastName || existingUser.lastName,
        email: existingUser.email, // Keep existing email
        noTelp: formValues.noTelp || existingUser.noTelp,
        birthDate: formValues.birthDate || existingUser.birthDate,
        gender: formValues.gender || existingUser.gender,
        address: formValues.address || existingUser.address,
        profilePicture: formValues.profilePicture || existingUser.profilePicture,
        role: existingUser.role,
        id: existingUser.id,
        createdAt: existingUser.createdAt
      };

      // Update user data
      await this.userService.updateUser(updatedUser);

      // Update local state
      this.currentUserData = { ...updatedUser };
      this.currentUser = {
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture || DEFAULT_PROFILE_PICTURE,
      };

      this.showToast('Profil berhasil diperbarui.', 'success');
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showToast('Gagal menyimpan profil', 'danger', error);
    } finally {
      this.isLoading = false;
    }
  }

  // ========================================
  // ========== PASSWORD SECTION ============
  // ========================================
  calculatePasswordStrength(event: any): void {
    const password = this.passwordForm.get('newPassword')?.value || '';
    
    // Update requirement flags
    this.hasMinLength = password.length >= 6;
    this.hasUpperCase = /[A-Z]/.test(password);
    this.hasNumbers = /\d/.test(password);

    // Calculate strength
    let strength = 0;
    if (this.hasMinLength) strength += 40;
    if (this.hasUpperCase) strength += 30;
    if (this.hasNumbers) strength += 30;

    this.passwordStrength = strength;
  }

  getPasswordStrengthColor(): string {
    if (this.passwordStrength <= 25) return 'danger';
    if (this.passwordStrength <= 50) return 'warning';
    if (this.passwordStrength <= 75) return 'primary';
    return 'success';
  }

  getPasswordStrengthText(): string {
    if (this.passwordStrength <= 25) return 'Weak';
    if (this.passwordStrength <= 50) return 'Fair';
    if (this.passwordStrength <= 75) return 'Good';
    return 'Strong';
  }

  isPasswordValid(): boolean {
    const form = this.passwordForm;
    if (!form.valid) return false;

    const currentPassword = form.get('currentPassword')?.value;
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    return Boolean(
      currentPassword && 
      newPassword && 
      confirmPassword && 
      this.hasMinLength && 
      this.hasUpperCase && 
      this.hasNumbers && 
      newPassword === confirmPassword
    );
  }

  async changePassword(): Promise<void> {
    if (!this.isPasswordValid()) {
      await this.showToast('Please fill in all required fields correctly.', 'warning');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      await this.showToast('All password fields are required.', 'warning');
      return;
    }

    this.isChangingPassword = true;

    try {
      // First verify current password
      const user = await firstValueFrom(this.authService.authState$);
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Reauthenticate with current password
      await this.authService.reauthenticate(currentPassword);

      // If reauthentication successful, change password
      await this.authService.changePassword(newPassword);

      // Reset form and states
      this.passwordForm.reset();
      this.passwordStrength = 0;
      this.hasMinLength = false;
      this.hasUpperCase = false;
      this.hasNumbers = false;

      await this.showToast('Password successfully changed.', 'success');
      this.toggleSection('personal');
    } catch (error) {
      console.error('Password change error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password.';
      if (errorMessage.includes('auth/wrong-password')) {
        await this.showToast('Current password is incorrect.', 'danger');
      } else {
        await this.showToast(errorMessage, 'danger');
      }
    } finally {
      this.isChangingPassword = false;
    }
  }

  // ========================================
  // ========== FILE UPLOAD =================
  // ========================================
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.errorMessage = null;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      this.errorMessage = 'Invalid file type. Please upload JPG, PNG, or GIF.';
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'File size too large. Maximum size is 5MB.';
      return;
    }

    this.selectedFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedFilePreview = e.target?.result as string;
      // Reinitialize Feather Icons after preview update
      this.initializeFeatherIcons();
    };
    reader.readAsDataURL(file);

    try {
      this.isLoading = true;
      const imageUrl = await this.cloudinaryService.uploadImage(file);
      this.profileForm.patchValue({ profilePicture: imageUrl });
      this.currentUserData.profilePicture = imageUrl;
      this.selectedFile = null;
      this.selectedFilePreview = null;
      // Reinitialize Feather Icons after upload
      this.initializeFeatherIcons();
    } catch (error) {
      this.errorMessage = 'Failed to upload image. Please try again.';
      console.error('Upload error:', error);
    } finally {
      this.isLoading = false;
      // Reinitialize Feather Icons after loading state change
      this.initializeFeatherIcons();
    }
  }

  // ========================================
  // ========== TOAST & UI ==================
  // ========================================
  async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'danger',
    error: any = null
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : '';
    const fullMessage = errorMessage ? `${message}: ${errorMessage}` : message;

    const toast = await this.toastController.create({
      message: fullMessage,
      duration: 3000,
      position: 'bottom',
      color,
    });

    await toast.present();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSection(section: 'personal' | 'password'): void {
    this.activeSection = section;
    this.showPersonalInfo = section === 'personal';
    this.showChangePassword = section === 'password';
    this.showPasswordForm = section === 'password';
    // Reinitialize icons after section change
    setTimeout(() => {
      this.initializeFeatherIcons();
    }, 0);
  }

  private loadCustomScript(): void {
    const script = document.createElement('script');
    script.src = 'assets/template-admin/dist/js/app.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  private initializeFeatherIcons(): void {
    feather.replace();
    // Reinitialize icons after view updates
    setTimeout(() => {
      feather.replace();
      this.cdr.detectChanges();
    }, 0);
  }

  // ========================================
  // ========== LOGOUT ======================
  // ========================================
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      localStorage.removeItem('password');
      this.router.navigate(['/login']);
    } catch (error) {
      this.showToast('Logout failed', 'danger', error);
    }
  }
}