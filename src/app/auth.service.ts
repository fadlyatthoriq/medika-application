import { Injectable, OnDestroy } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, onAuthStateChanged, UserCredential, Auth, fetchSignInMethodsForEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, Firestore, getDoc } from 'firebase/firestore';
import { Observable, from, throwError, Subject, takeUntil, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

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

  constructor() {
    this.auth = getAuth();
    this.db = getFirestore();
  }

  get authState$(): Observable<User | null> {
    return new Observable<User | null>((observer) => { // Explicitly type the Observable
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => observer.next(user),
        (error) => observer.error(error)
      );
      
      return () => unsubscribe();
    }).pipe(
      takeUntil(this.destroy$) // Sekarang type-safe
    );
  }

  getUserData(uid: string): Observable<UserData | null> {
    const userRef = doc(this.db, 'users', uid);
    return from(getDoc(userRef)).pipe(
      switchMap((docSnap) => {
        if (docSnap.exists()) {
          return of(docSnap.data() as UserData);
        } else {
          return of(null);
        }
      }),
      catchError((error) => {
        console.error('Error fetching user data:', error);
        return throwError(() => new Error('Gagal mengambil data pengguna.'));
      })
    );
  }  

  register(email: string, password: string, firstName: string, lastName: string): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential) => {
        const user = userCredential.user;
        const userData: UserData = {
          email: user.email as string,
          firstName,
          lastName,
          role: 'user',
          createdAt: new Date()
        };
        
        return from(this.storeUserData(user.uid, userData)).pipe(
          switchMap(() => of(user)) // Menggunakan 'of' yang sudah diimpor
        );
      }),
      catchError((error) => {
        console.error('Auth Error:', error);
        return throwError(() => this.transformAuthError(error));
      })
    );
  }

  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      catchError((error) => {
        console.error('Login Error:', error);
        return throwError(() => this.transformAuthError(error));
      })
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      catchError((error) => {
        console.error('Logout Error:', error);
        return throwError(() => error);
      })
    );
  }

  private storeUserData(uid: string, userData: UserData): Promise<void> {
    return setDoc(doc(this.db, 'users', uid), userData);
  }

  private transformAuthError(error: any): Error {
    // Custom error messages based on Firebase error codes
    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('Email sudah terdaftar.');
      case 'auth/invalid-email':
        return new Error('Format email tidak valid.');
      case 'auth/weak-password':
        return new Error('Password terlalu lemah, minimal 6 karakter.');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return new Error('Email atau password salah.');
      default:
        return new Error('Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async checkEmailExists(email: string): Promise<string[]> {
    try {
      return await fetchSignInMethodsForEmail(this.auth, email);
    } catch (error) {
      console.error('Error checking email:', error);
      return [];
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}