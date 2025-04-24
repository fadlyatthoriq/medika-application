import { Injectable, OnDestroy } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, onAuthStateChanged, UserCredential, Auth, fetchSignInMethodsForEmail, sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, Firestore, getDoc } from 'firebase/firestore';
import { Observable, from, throwError, Subject, of, firstValueFrom } from 'rxjs';
import { catchError, switchMap, takeUntil, map } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: Date;
  noTelp?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  profilePicture?: string;
}


@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private auth: Auth;
  private db: Firestore;
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.auth = getAuth();
    this.db = getFirestore();
  }

  // Observables untuk auth state (login status)
  get authState$(): Observable<User | null> {
    return new Observable<User | null>((observer) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => observer.next(user),
        (error) => observer.error(error)
      );
      return () => unsubscribe();
    }).pipe(takeUntil(this.destroy$));  // Menghindari memory leak
  }

  // Ambil data pengguna dari Firestore berdasarkan UID
  getUserData(uid: string): Observable<UserData> {
    const userRef = doc(this.db, 'users', uid);
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error('User tidak ditemukan');
        }
        return docSnap.data() as UserData;
      }),
      catchError((error) => this.handleError('Error fetching user data', error))
    );
  }

  // Register user baru
  register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    noTelp: string | null = null,
    birthDate: string | null = null,
    gender: string | null = null,
    address: string | null = null,
    profilePicture: string = 'assets/images/default-profile.png',
    role: string = 'user'
  ): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential) => {
        const user = userCredential.user;
        const userData: UserData = this.createUserData(user, firstName, lastName, role, noTelp, birthDate, gender, address, profilePicture);
  
        return from(this.storeUserData(user.uid, userData)).pipe(
          switchMap(() => of(user))
        );
      }),
      catchError((error) => this.handleError('Auth Error', error))
    );
  }

  async changePassword(newPassword: string): Promise<void> {
    try {
      const user = await firstValueFrom(this.authState$);
      if (!user) throw new Error('User not authenticated');
      
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      await updatePassword(user, newPassword);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please login again to change your password');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password');
      } else {
        console.error('Password change error:', error);
        throw new Error('Failed to change password');
      }
    }
  }

  async reauthenticate(currentPassword: string): Promise<void> {
    const user = await firstValueFrom(this.authState$);
    if (!user || !user.email) throw new Error('User not authenticated');
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid credentials. Please try again');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Please try again later');
      } else {
        console.error('Reauthentication error:', error);
        throw new Error('Failed to verify current password');
      }
    }
  }

  // Login user
  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      catchError((error) => this.handleError('Login Error', error))
    );
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      localStorage.removeItem('password');
      this.router.navigate(['/login']);
    } catch (error) {
      this.handleError('Logout Error', error);
    }
  }

  // Mengecek apakah email sudah terdaftar di Firebase
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const methods = await fetchSignInMethodsForEmail(this.auth, email);
      return methods.length > 0;
    } catch (error) {
      if ((error as { code: string }).code === 'auth/user-not-found') return false;
      throw error;
    }
  }

  // Mengirim email reset password
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      this.handleError('Error sending password reset email', error);
    }
  }

  // Menyimpan data pengguna ke Firestore
  private storeUserData(uid: string, userData: UserData): Promise<void> {
    return setDoc(doc(this.db, 'users', uid), userData);
  }

  // Membuat objek UserData
  private createUserData(
    user: User,
    firstName: string,
    lastName: string,
    role: string,
    noTelp: string | null,
    birthDate: string | null,
    gender: string | null,
    address: string | null,
    profilePicture: string
  ): UserData {
    return {
      email: user.email as string,
      firstName,
      lastName,
      role,
      noTelp,
      birthDate,
      gender,
      address,
      profilePicture,
      createdAt: new Date()
    };
  }
  

  // Menangani kesalahan autentikasi dari Firebase
  private handleError(message: string, error: any): Observable<never> {
    console.error(message, error);
    return throwError(() => this.transformAuthError(error));
  }

  // Transformasi error autentikasi Firebase ke pesan yang lebih ramah pengguna
  private transformAuthError(error: any): Error {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Email sudah terdaftar.',
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/weak-password': 'Password terlalu lemah, minimal 6 karakter.',
      'auth/user-not-found': 'Email atau password salah.',
      'auth/wrong-password': 'Email atau password salah.',
      'auth/too-many-requests': 'Terlalu banyak percobaan login, coba lagi nanti.',
    };

    return new Error(errorMessages[error.code] || 'Terjadi kesalahan. Silakan coba lagi.');
  }

  // Memastikan user hanya dapat mengakses data mereka sendiri atau data staff jika mereka adalah staff
  async canAccessUserData(uid: string): Promise<boolean> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;

    try {
      const userData = await firstValueFrom(this.getUserData(uid));
      return userData ? (userData.role === 'staff' || currentUser.uid === uid) : false;
    } catch (error) {
      console.error('Error checking user access:', error);
      return false;
    }
  }

  // Bersihkan resource saat komponen dihancurkan
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
