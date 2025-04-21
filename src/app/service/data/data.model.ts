import { DocumentReference } from '@angular/fire/firestore';

export interface Data {
  id?: string;          // optional, for document ID
  kadarGula: number;
  kolestrol: number;
  asamUrat: number;
  userId: DocumentReference;       // ini menyimpan ID user dari koleksi "users"
  createdAt: Date; // 🆕 Tanggal input data

}