// user.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import { AuthService } from '../../service/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.authState$.pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          return of(this.router.parseUrl('/login'));
        }

        return this.authService.getUserData(user.uid).pipe(
          map(userData => {
            if (userData?.role === 'user') {
              return true;
            } else {
              return this.router.parseUrl('/dashboard-petugas');
            }
          })
        );
      })
    );
  }
}
