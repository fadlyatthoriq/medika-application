import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authState$.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return of(this.router.parseUrl('/login'));
        }

        return this.authService.getUserData(user.uid).pipe(
          map(userData => {
            if (!userData) {
              return this.router.parseUrl('/login');
            }

            const role = userData.role;
            const url = this.router.url;

            // Hanya role "staff" yang boleh akses dashboard-petugas
            if (url.includes('/dashboard-petugas') && role !== 'staff') {
              return this.router.parseUrl('/dashboard');
            }

            // Hanya role "user" yang boleh akses dashboard
            if (url.includes('/dashboard') && !url.includes('/dashboard-petugas') && role !== 'user') {
              return this.router.parseUrl('/dashboard-petugas');
            }

            return true;
          })
        );
      })
    );
  }
}
