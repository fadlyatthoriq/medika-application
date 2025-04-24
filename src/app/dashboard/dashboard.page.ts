import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { DropdownDirective } from '../../assets/template-admin/dropdown.directive';
import { AuthService } from '../service/auth/auth.service';
import { UserService } from '../service/user/user.service';
import { DataService } from '../service/data/data.service';
import { Subject, BehaviorSubject, firstValueFrom, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  collectionData,
  doc,
  DocumentReference,
  Timestamp,
} from '@angular/fire/firestore';
import * as feather from 'feather-icons';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

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

interface DailyAverage {
  date: string;
  cholesterol: number | null;
  bloodSugar: number | null;
  uricAcid: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, DropdownDirective, FormsModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit {
  // ========== State ==========
  isMobileMenuOpen = false;
  currentUser: CurrentUser = {
    name: '',
    role: '',
    profilePicture: '/assets/template-admin/dist/images/profile-8.jpg',
  };
  menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: 'home', route: '/dashboard', isActive: true },
    { title: 'Profile', icon: 'user', route: '/profile', isActive: true },
  ];
  private destroy$ = new Subject<void>();

  // ========== Medical Data & Report State ==========
  searchQuery = '';
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 0;
  pages: number[] = [];
  allMedicalData: any[] = [];
  medicalData: any[] = [];

  averageCholesterol = 0;
  averageBloodSugar = 0;
  averageUricAcid = 0;
  lastUpdate: Date | null = null;
  newDataCount = 0;

  cholesterolTrendsData: any;
  bloodSugarTrendsData: any;
  uricAcidTrendsData: any;

  cholesterolChartInstance?: Chart;
  searchSubject = new BehaviorSubject<string>('');

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService,
    private dataService: DataService,
    private firestore: Firestore
  ) {}

  // ========== Lifecycle ==========
  ngOnInit(): void {
    this.checkAuth();
    this.setupSearch();
    this.authService.authState$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        const userDocRef = doc(this.firestore, 'users', user.uid) as DocumentReference;
        this.loadMedicalData(userDocRef);
        this.loadReportData(userDocRef);
        this.loadHealthTrendsData(userDocRef);
      }
    });

    feather.replace();
    this.loadScript('assets/template-admin/dist/js/app.js');
  }

  ngAfterViewInit(): void {
    this.renderCholesterolChart();
    this.renderBloodSugarChart();
    this.renderUricAcidChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== Auth ==========
  private async checkAuth(): Promise<void> {
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async user => {
        if (!user?.email) {
          this.router.navigate(['/login']);
          return;
        }

        const userData = await firstValueFrom(this.userService.getUserByEmail(user.email));
        if (userData) {
          this.currentUser.name = `${userData.firstName} ${userData.lastName}`;
          this.currentUser.role = userData.role;
          this.currentUser.profilePicture = userData.profilePicture || '/assets/template-admin/dist/images/profile-8.jpg';
        }
      });
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']).then(() => window.location.reload());
  }

  // ========== Search ==========
  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters());
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  private applyFilters(): void {
    const query = this.searchQuery.toLowerCase();

    const filtered = this.allMedicalData.filter(item =>
      item.kolestrol?.toString().toLowerCase().includes(query) ||
      item.kadarGula?.toString().toLowerCase().includes(query) ||
      item.asamUrat?.toString().toLowerCase().includes(query) ||
      (item.createdAt as Timestamp)?.toDate()?.toLocaleDateString()?.toLowerCase().includes(query)
    );

    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    this.pages = this.generatePageNumbers();

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.medicalData = filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // ========== Pagination ==========
  goToPage(event: Event, page: number): void {
    event.preventDefault();
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilters();
  }

  updatePagination(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private generatePageNumbers(): number[] {
    const maxVisiblePages = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(this.totalPages, start + maxVisiblePages - 1);
    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ========== Helpers ==========
  private loadScript(scriptUrl: string): void {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.defer = true;
    document.body.appendChild(script);
  }

  private calculateAverage(data: any[], field: string): number {
    const validValues = data.map(item => item[field]).filter(value => value != null && !isNaN(value));
    return validValues.length ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
  }

  private getLastUpdate(medicalData: any[]): Date | null {
    const latest = medicalData[0];
    return latest?.createdAt?.toDate() || null;
  }

  private getNewDataCount(medicalData: any[]): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return medicalData.filter(item => (item.createdAt as Timestamp)?.toDate() >= oneWeekAgo).length;
  }

  // ========== Data Loading ==========
  private loadMedicalData(userDocRef: DocumentReference): void {
    this.dataService.getByUserId(userDocRef.id).pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.allMedicalData = data || [];
      this.applyFilters();
    });
  }

  loadReportData(userDocRef: DocumentReference): void {
    const dataCollection = collection(this.firestore, 'data');
    const q = query(dataCollection, where('userId', '==', userDocRef), orderBy('createdAt', 'desc'));

    collectionData(q, { idField: 'id' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (medicalData) => {
        if (Array.isArray(medicalData) && medicalData.length > 0) {
          this.averageCholesterol = this.calculateAverage(medicalData, 'kolestrol');
          this.averageBloodSugar = this.calculateAverage(medicalData, 'kadarGula');
          this.averageUricAcid = this.calculateAverage(medicalData, 'asamUrat');
          this.lastUpdate = this.getLastUpdate(medicalData);
          this.newDataCount = this.getNewDataCount(medicalData);
        }
      },
      error: (error) => {
        console.error('Failed to load report data:', error);
      }
    });
  }

  loadHealthTrendsData(userDocRef: DocumentReference): void {
    const dataCollection = collection(this.firestore, 'data');
    const currentDate = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const q = query(
      dataCollection,
      where('userId', '==', userDocRef),
      where('createdAt', '>=', Timestamp.fromDate(oneWeekAgo)),
      orderBy('createdAt', 'asc')
    );

    collectionData(q, { idField: 'id' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (medicalData: any[]) => {
        const dailyAverages: { [key: string]: { cholesterolTotal: number; cholesterolCount: number; bloodSugarTotal: number; bloodSugarCount: number; uricAcidTotal: number; uricAcidCount: number; date: string } } = {};
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const formattedDates: string[] = [];

        // Initialize data for the last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(currentDate.getDate() - i);
          const formattedDate = `${daysOfWeek[date.getDay()]} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          dailyAverages[formattedDate] = { cholesterolTotal: 0, cholesterolCount: 0, bloodSugarTotal: 0, bloodSugarCount: 0, uricAcidTotal: 0, uricAcidCount: 0, date: formattedDate };
          formattedDates.unshift(formattedDate);
        }

        // Aggregate data per day
        medicalData.forEach(item => {
          const createdAt = (item.createdAt as Timestamp)?.toDate();
          if (createdAt) {
            const formattedDate = `${daysOfWeek[createdAt.getDay()]} ${createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            if (dailyAverages[formattedDate]) {
              dailyAverages[formattedDate].cholesterolTotal += (item.kolestrol || 0);
              dailyAverages[formattedDate].cholesterolCount++;
              dailyAverages[formattedDate].bloodSugarTotal += (item.kadarGula || 0);
              dailyAverages[formattedDate].bloodSugarCount++;
              dailyAverages[formattedDate].uricAcidTotal += (item.asamUrat || 0);
              dailyAverages[formattedDate].uricAcidCount++;
            }
          }
        });

        // Calculate daily averages
        const sortedDailyAverages: DailyAverage[] = formattedDates.map(date => ({
          date,
          cholesterol: dailyAverages[date].cholesterolCount > 0 ? dailyAverages[date].cholesterolTotal / dailyAverages[date].cholesterolCount : null,
          bloodSugar: dailyAverages[date].bloodSugarCount > 0 ? dailyAverages[date].bloodSugarTotal / dailyAverages[date].bloodSugarCount : null,
          uricAcid: dailyAverages[date].uricAcidCount > 0 ? dailyAverages[date].uricAcidTotal / dailyAverages[date].uricAcidCount : null,
        }));

        const labels = sortedDailyAverages.map(avg => avg.date);
        this.cholesterolTrendsData = {
          labels: labels,
          datasets: [{
            label: 'Average Cholestrol',
            data: sortedDailyAverages.map(avg => avg.cholesterol),
            borderColor: '#3b82f6',
            fill: false
          }]
        };
        this.bloodSugarTrendsData = {
          labels: labels,
          datasets: [{
            label: 'Average Blood Sugar',
            data: sortedDailyAverages.map(avg => avg.bloodSugar),
            borderColor: '#16a34a',
            fill: false
          }]
        };
        this.uricAcidTrendsData = {
          labels: labels,
          datasets: [{
            label: 'Average Uric Acid',
            data: sortedDailyAverages.map(avg => avg.uricAcid),
            borderColor: '#dc2626',
            fill: false
          }]
        };

        this.renderCholesterolChart();
        this.renderBloodSugarChart();
        this.renderUricAcidChart();
      },
      error: (error) => {
        console.error('Gagal memuat data tren kesehatan:', error);
      }
    });
  }

  private renderChart(canvasId: string, chartData: any, chartType: 'line' | 'bar' = 'line'): void {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (ctx && chartData) {
      new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  renderCholesterolChart(): void {
    this.renderChart('cholesterol-trend-chart', this.cholesterolTrendsData);
  }

  renderBloodSugarChart(): void {
    this.renderChart('blood-sugar-trend-chart', this.bloodSugarTrendsData);
  }

  renderUricAcidChart(): void {
    this.renderChart('uric-acid-trend-chart', this.uricAcidTrendsData);
  }
}