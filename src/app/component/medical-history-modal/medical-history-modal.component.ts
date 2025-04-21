import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, AfterViewInit, OnChanges } from '@angular/core';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { Firestore, doc, getDoc, deleteDoc } from '@angular/fire/firestore';
import * as feather from 'feather-icons';

import { Data } from '../../service/data/data.model';
import { UserService } from '../../service/user/user.service';

@Component({
  selector: 'app-medical-history-modal',
  templateUrl: './medical-history-modal.component.html',
  styleUrls: ['./medical-history-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class MedicalHistoryModalComponent implements AfterViewInit, OnChanges {
  @Input() selectedMedicalHistory: Data[] = [];
  @Output() userDeleted = new EventEmitter<string>();

  currentUser = { role: '' };
  loadingRecordId: string | null = null;
  hasMedicalHistory = true;
  showDeleteAlert = false;
  recordIdToDelete: string | null = null;

  alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.recordIdToDelete = null;
      },
    },
    {
      text: 'Delete',
      role: 'confirm',
      handler: () => {
        if (this.recordIdToDelete) {
          this.performDelete(this.recordIdToDelete);
        }
      },
    },
  ];

  constructor(
    private modalController: ModalController,
    private userService: UserService,
    private toastController: ToastController,
    private firestore: Firestore
  ) {}

  // Lifecycle Hooks
  ngAfterViewInit(): void {
    feather.replace(); // Replaces feather icons after the view is initialized
  }

  ngOnChanges(): void {
    this.checkMedicalHistoryAvailability(); // Checks availability of medical history when inputs change
  }

  // Closes the modal
  dismiss(): void {
    this.modalController.dismiss();
  }

  // Formats the date for display
  formatDate(date: any): string {
    return date?.toDate?.() ? date.toDate().toLocaleDateString() : 'Tanggal tidak tersedia';
  }

  // Trigger the alert for confirming record deletion
  onDeleteHistoryRecord(recordId: string): void {
    if (!recordId) {
      this.presentToast('Invalid record ID. Please try again.', 'danger');
      return;
    }

    this.recordIdToDelete = recordId;
    this.showDeleteAlert = true;
  }

  // Performs the delete operation for the selected record
  private performDelete(recordId: string): void {
    this.loadingRecordId = recordId;

    this.deleteRecord(recordId)
      .then(() => {
        this.selectedMedicalHistory = this.selectedMedicalHistory.filter(record => record.id !== recordId);
        this.presentToast('Record deleted successfully.', 'success');
      })
      .catch(error => {
        console.error('Error deleting record:', error);
        this.presentToast('Failed to delete the record. Please try again.', 'danger');
      })
      .finally(() => {
        this.loadingRecordId = null;
        this.recordIdToDelete = null;
        this.showDeleteAlert = false;
      });
  }

  // Handles the dismiss event for the alert
  onAlertDismiss(event: any): void {
    const role = event.detail?.role;
    if (role !== 'confirm') {
      this.recordIdToDelete = null;
      this.showDeleteAlert = false;
    }
  }

  // Deletes the record from Firestore
  private deleteRecord(recordId: string): Promise<void> {
    const recordDoc = doc(this.firestore, `data/${recordId}`);
    return getDoc(recordDoc)
      .then(snapshot => {
        if (snapshot.exists()) {
          return deleteDoc(recordDoc);
        } else {
          this.presentToast('Document not found. It may have been deleted already.', 'danger');
          throw new Error('Document not found');
        }
      })
      .catch(error => {
        console.error('Error fetching document:', error);
        this.presentToast('Failed to retrieve document. Please try again.', 'danger');
        throw error;
      });
  }

  // Displays a toast notification
  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
    });
    await toast.present();
  }

  // Checks if medical history is available
  private checkMedicalHistoryAvailability(): void {
    this.hasMedicalHistory = this.selectedMedicalHistory.length > 0;
  }
}
