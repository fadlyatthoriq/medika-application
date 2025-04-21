import { Injectable, OnDestroy } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, onAuthStateChanged, UserCredential, Auth, fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, Firestore, getDoc } from 'firebase/firestore';
import { Observable, from, throwError, Subject, of } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface UserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: Date;
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
  getUserData(uid: string): Observable<UserData | null> {
    const userRef = doc(this.db, 'users', uid);
    return from(getDoc(userRef)).pipe(
      switchMap((docSnap) => docSnap.exists() ? of(docSnap.data() as UserData) : of(null)),
      catchError((error) => this.handleError('Error fetching user data', error)),
      takeUntil(this.destroy$)
    );
  }

  // Register user baru
  register(email: string, password: string, firstName: string, lastName: string, role: string = 'user'): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential) => {
        const user = userCredential.user;
        const userData: UserData = this.createUserData(user, firstName, lastName, role);

        // Setelah data disimpan, kembalikan Observable<User>
        return from(this.storeUserData(user.uid, userData)).pipe(
          switchMap(() => of(user))  // Mengembalikan user setelah data disimpan
        );
      }),
      catchError((error) => this.handleError('Auth Error', error))
    );
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
  private createUserData(user: User, firstName: string, lastName: string, role: string): UserData {
    return {
      email: user.email as string,
      firstName,
      lastName,
      role,
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

    const userData = await this.getUserData(uid).toPromise();
    return userData ? (userData.role === 'staff' || currentUser.uid === uid) : false;
  }

  // Bersihkan resource saat komponen dihancurkan
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
