import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { UserGuard } from './user.guard';
import { StaffGuard } from './staff.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then( m => m.DashboardPage),
    canActivate: [UserGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'dashboard-petugas',
    loadComponent: () => import('./dashboard-petugas/dashboard-petugas.page').then( m => m.DashboardPetugasPage),
    canActivate: [StaffGuard],
  },
  {
    path: 'forget-password',
    loadComponent: () => import('./forget-password/forget-password.page').then( m => m.ForgetPasswordPage)
  },
];
