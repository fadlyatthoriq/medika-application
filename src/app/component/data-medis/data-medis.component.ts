import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { doc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { IonicSelectableComponent } from 'ionic-selectable';

import { DataService } from '../../service/data/data.service';
import { UserService, Users } from '../../service/user/user.service';
import { Data } from '../../service/data/data.model';

@Component({
  selector: 'app-data-medis',
  templateUrl: './data-medis.component.html',
  styleUrls: ['./data-medis.component.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    IonicSelectableComponent,
  ],
})
export class DataMedisComponent implements OnInit {
  form!: FormGroup;
  users: Users[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly dataService: DataService,
    private readonly userService: UserService,
    private readonly toastCtrl: ToastController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsers();
  }

  /** Initialize input form */
  private initializeForm(): void {
    this.form = this.fb.group({
      userId: [null, Validators.required],
      kolestrol: [null, [Validators.required, Validators.min(0)]],
      kadarGula: [null, [Validators.required, Validators.min(0)]],
      asamUrat: [null, [Validators.required, Validators.min(0)]],
    });
  }

  /** Fetch users data from Firestore */
  private loadUsers(): void {
    this.userService.getUsers().subscribe(
      (users) => {
        this.users = users.map((user) => ({
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
        }));
      },
      (error) => {
        console.error('Error loading users:', error);
        this.presentToast('Failed to load users. Please try again later.', 'danger');
      }
    );
  }

  /** Filter users based on search text */
  filterUsers(event: { component: IonicSelectableComponent; text: string }): void {
    const searchText = event.text.toLowerCase();

    event.component.items =
      !searchText || searchText.trim() === ''
        ? [...this.users]
        : this.users.filter((user) =>
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchText)
          );
  }

  /** Show toast message */
  private async presentToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top',
      color,
    });
    await toast.present();
  }

  /** Submit form to Firestore */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      await this.presentToast('The form is invalid. Please check your input.', 'danger');
      return;
    }

    const value = this.form.value;
    const data: Data = {
      userId: doc(this.dataService['firestore'], `users/${value.userId.id}`),
      kolestrol: value.kolestrol,
      kadarGula: value.kadarGula,
      asamUrat: value.asamUrat,
      createdAt: new Date(),
    };

    try {
      await this.dataService.add(data);
      this.form.reset();
      await this.presentToast('Data saved successfully.', 'success');
      await this.router.navigate(['/dashboard-petugas']);
    } catch (error) {
      console.error('Error saving data:', error);
      await this.presentToast('An error occurred while saving data. Please try again.', 'danger');
    }
  }
}
