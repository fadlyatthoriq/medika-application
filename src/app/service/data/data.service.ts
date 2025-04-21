import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  docData,
  addDoc,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Data } from './data.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly collectionName = 'data';

  constructor(private firestore: Firestore) {}

  // ==================== GET ====================

  /**
   * Ambil semua data dari koleksi 'data'
   */
  getAll(): Observable<Data[]> {
    const dataRef = collection(this.firestore, this.collectionName);
    return collectionData(dataRef, { idField: 'id' }) as Observable<Data[]>;
  }

  /**
   * Ambil data berdasarkan ID pengguna
   * @param userId ID pengguna
   */
  getByUserId(userId: string): Observable<Data[]> {
    const dataRef = collection(this.firestore, this.collectionName);
    const userRef = doc(this.firestore, `users/${userId}`);
    const q = query(dataRef, where('userId', '==', userRef));
    return collectionData(q, { idField: 'id' }) as Observable<Data[]>;
  }

  /**
   * Ambil satu data berdasarkan ID
   * @param id ID data
   */
  getById(id: string): Observable<Data> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return docData(docRef, { idField: 'id' }) as Observable<Data>;
  }

  // ==================== ADD ====================

  /**
   * Tambahkan data baru ke koleksi 'data'
   * @param data Data yang akan ditambahkan
   */
  add(data: Data) {
    const dataRef = collection(this.firestore, this.collectionName);
    return addDoc(dataRef, data);
  }

  // ==================== UPDATE ====================

  /**
   * Update sebagian data berdasarkan ID
   * @param id ID data yang akan diupdate
   * @param data Data yang akan diperbarui
   */
  update(id: string, data: Partial<Data>) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(docRef, data);
  }

  // ==================== DELETE ====================

  /**
   * Hapus data berdasarkan ID
   * @param id ID data yang akan dihapus
   */
  delete(id: string) {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }
}
