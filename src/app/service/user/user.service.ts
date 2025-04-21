import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  addDoc,
  deleteDoc,
  updateDoc,
  DocumentReference,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Timestamp } from 'firebase/firestore';

// Menyesuaikan interface dengan field yang ada di Firestore
export interface Users {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: Date | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly userCollection = collection(this.firestore, 'users'); // Koleksi 'users' di Firestore

  constructor(private firestore: Firestore) {}

  // ==================== GET ====================

  /**
   * Mendapatkan semua pengguna.
   * Hanya staff yang bisa mengakses semua pengguna.
   */
  getUsers(): Observable<Users[]> {
    return collectionData(this.userCollection, { idField: 'id' }).pipe(
      map((users) =>
        users
          .map((user) => ({
            id: user['id'],
            firstName: user['firstName'],
            lastName: user['lastName'],
            email: user['email'],
            role: user['role'],
            createdAt: user['createdAt']
              ? (user['createdAt'] as Timestamp).toDate()
              : null,
          }) as Users)
          .filter((u) => u.role === 'user') // Hanya menampilkan pengguna dengan role 'user'
      )
    );
  }

  /**
   * Mendapatkan pengguna berdasarkan ID.
   * Hanya pengguna yang terautentikasi atau staff yang bisa mengakses data ini.
   * @param id ID pengguna
   */
  getUser(id: string): Observable<Users> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return docData(userDoc, { idField: 'id' }) as Observable<Users>;
  }

  /**
   * Mendapatkan pengguna berdasarkan email.
   * @param email Email pengguna
   */
  getUserByEmail(email: string): Observable<Users | null> {
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where('email', '==', email), limit(1));

    return collectionData(q, { idField: 'id' }).pipe(
      map((users) => {
        const mapped = users as Users[];
        return mapped.length > 0 ? mapped[0] : null;
      })
    );
  }

  // ==================== ADD ====================

  /**
   * Menambahkan pengguna baru.
   * Hanya staff yang dapat menambah pengguna.
   * @param users Data pengguna baru
   */
  addUser(users: Users): Promise<DocumentReference> {
    return addDoc(this.userCollection, users);
  }

  // ==================== UPDATE ====================

  /**
   * Memperbarui informasi pengguna.
   * Hanya pengguna yang terautentikasi atau staff yang bisa memperbarui data ini.
   * @param users Data pengguna yang akan diperbarui
   */
  updateUser(users: Users): Promise<void> {
    const userDoc = doc(this.firestore, `users/${users.id}`);
    return updateDoc(userDoc, {
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    });
  }

  // ==================== DELETE ====================

  /**
   * Menghapus pengguna berdasarkan ID.
   * Hanya staff yang dapat menghapus pengguna.
   * @param id ID pengguna yang akan dihapus
   */
  deleteUser(id: string): Promise<void> {
    const userDoc = doc(this.firestore, `users/${id}`);
    return deleteDoc(userDoc);
  }
}
