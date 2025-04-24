import { Routes } from '@angular/router';
import { UserGuard } from './guard/user/user.guard';
import { StaffGuard } from './guard/staff/staff.guard';

export const routes: Routes = [
  // ==================== Redirect to login ====================
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // ==================== Login Route ====================
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage),
  },

  // ==================== Dashboard Route ====================
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [UserGuard],  // Hanya pengguna yang terautentikasi yang bisa mengakses
  },

  // ==================== Register Route ====================
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then(m => m.RegisterPage),
  },

  // ==================== Dashboard Petugas Route ====================
  {
    path: 'dashboard-petugas',
    loadComponent: () => import('./dashboard-petugas/dashboard-petugas.page').then(m => m.DashboardPetugasPage),
    canActivate: [StaffGuard],  // Hanya staff yang bisa mengakses
    children: [
      // ==================== Data Medis Route ====================
      {
        path: 'data-medis',
        loadComponent: () => import('./component/data-medis/data-medis.component').then(m => m.DataMedisComponent),
        canActivate: [StaffGuard],  // Hanya staff yang bisa mengakses
      }
    ]
  },

  // ==================== Forget Password Route ====================
  {
    path: 'forget-password',
    loadComponent: () => import('./forget-password/forget-password.page').then(m => m.ForgetPasswordPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then(m => m.ProfilePage),
    canActivate: [UserGuard],
  },
];
