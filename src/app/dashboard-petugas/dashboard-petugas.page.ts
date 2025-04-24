import {
  Component,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  OnDestroy,
  NgZone
} from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, first, takeUntil, filter } from 'rxjs/operators';
import feather from 'feather-icons';

import { DropdownDirective } from '../../assets/template-admin/dropdown.directive';
import { AuthService } from '../service/auth/auth.service';
import { UserService, Users } from '../service/user/user.service';
import { Data } from '../service/data/data.model';
import { DataService } from '../service/data/data.service';
import { MedicalHistoryModalComponent } from '../component/medical-history-modal/medical-history-modal.component';

// Interfaces
interface MenuItem {
  title: string;
  icon: string;
  route: string;
  isActive: boolean;
}

interface CurrentUser {
  name: string;
  role: string;
  profilePicture: string;
}

@Component({
  selector: 'app-dashboard-petugas',
  templateUrl: './dashboard-petugas.page.html',
  styleUrls: ['./dashboard-petugas.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, IonicModule, FormsModule, DropdownDirective, RouterModule],
})
export class DashboardPetugasPage implements OnInit, AfterViewInit, OnDestroy {
  // UI State
  isMobileMenuOpen = false;
  isLoading = false;
  showDataMedis = false;

  // Data State
  allUsers: Users[] = [];
  displayedUsers: Users[] = [];
  searchQuery = '';
  selectedMedicalHistory: Data[] = [];

  // Pagination State
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pages: number[] = [];

  // User State
  currentUser: CurrentUser = {
    name: '',
    role: '',
    profilePicture: '/assets/template-admin/dist/images/profile-8.jpg'
  };

  // Navigation
  menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: 'home', route: '/dashboard-petugas', isActive: true },
    { title: 'Medical Data', icon: 'activity', route: '/dashboard-petugas/data-medis', isActive: false }
  ];

  // Observables
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private modal: HTMLIonModalElement | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService,
    private dataService: DataService,
    private modalController: ModalController,
    private ngZone: NgZone,
    private activatedRoute: ActivatedRoute
  ) {}

  // ==================== Lifecycle Hooks ====================
  ngOnInit(): void {
    this.initializeApp();
  }

  ngAfterViewInit(): void {
    this.initializeUI();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ==================== Initialization ====================
  private initializeApp(): void {
    this.checkAuth();
    this.setupSearch();
    this.loadUsers();
    this.initializeFeatherIcons();
    this.setupRouteListener();
  }

  private initializeUI(): void {
    this.initializeFeatherIcons();
    this.loadCustomScript();
  }

  private setupRouteListener(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkRoute());
    this.checkRoute();
  }

  // ==================== Authentication ====================
  private async checkAuth(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.authState$);
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
  
      const userData = await firstValueFrom(this.userService.getUserByEmail(user.email!));
      if (userData) {
        this.updateCurrentUser(userData);
        if (userData.role !== 'staff') this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      this.showError('Authentication failed', error);
    }
  }

  private updateCurrentUser(userData: Users): void {
    this.currentUser = {
      name: `${userData.firstName} ${userData.lastName}`,
      role: userData.role,
      profilePicture: userData.profilePicture || '/assets/template-admin/dist/images/profile-8.jpg'
    };
  }

  // ==================== User Management ====================
  private loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.allUsers = users || [];
      this.applyFilters();
    });
  }

  // ==================== Search & Filtering ====================
  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => this.applyFilters());
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  private applyFilters(): void {
    const filtered = this.allUsers.filter(user =>
      user.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
    
    this.updatePagination(filtered);
  }

  // ==================== Pagination ====================
  private updatePagination(filteredUsers: Users[]): void {
    this.totalPages = Math.ceil(filteredUsers.length / this.itemsPerPage);
    this.pages = this.generatePageNumbers();
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedUsers = filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  goToPage(event: Event, page: number): void {
    event.preventDefault();
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private generatePageNumbers(): number[] {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  // ==================== Medical History ====================
  async viewMedicalHistory(userId: string): Promise<void> {
    if (this.modal) return;
    this.isLoading = true;
    try {
      const dataList = await firstValueFrom(this.dataService.getByUserId(userId));
      this.selectedMedicalHistory = (dataList || []).sort((a, b) => 
        this.getTimestamp(b.createdAt) - this.getTimestamp(a.createdAt)
      );
      await this.openModal();
    } catch (error) {
      this.showError('Failed to load medical history', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getTimestamp(date: any): number {
    if (date?.toDate) return date.toDate().getTime();
    if (date instanceof Date) return date.getTime();
    return new Date(date).getTime();
  }

  private async openModal(): Promise<void> {
    this.ngZone.run(async () => {
      const modal = await this.modalController.create({
        component: MedicalHistoryModalComponent,
        componentProps: { selectedMedicalHistory: this.selectedMedicalHistory }
      });
      this.modal = modal;
      await modal.present();
      modal.onWillDismiss().then(() => this.modal = null);
    });
  }

  // ==================== UI Helpers ====================
  private initializeFeatherIcons(): void {
    feather.replace();
  }

  private loadCustomScript(): void {
    const script = document.createElement('script');
    script.src = 'assets/template-admin/dist/js/app.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  private showError(title: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`${title}: ${message}`);
  }

  // ==================== Cleanup ====================
  private cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== Public Methods ====================
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      localStorage.removeItem('password');
      this.router.navigate(['/login']).then(() => window.location.reload());
    } catch (error) {
      this.showError('Logout failed', error);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleDataMedis(): void {
    this.showDataMedis = !this.showDataMedis;
  }

  reloadPage(): void {
    window.location.reload();
  }

  private checkRoute(): void {
    this.showDataMedis = this.router.url.includes('data-medis');
  }
}

