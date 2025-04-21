import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { enableProdMode } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from './environments/environment';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// ==================== Firebase Configuration ====================
const firebaseConfig = {
  apiKey: "AIzaSyAAnLW4bjB-71M4UqqjRG8UQ7EmUr4JwTQ",
  authDomain: "app-medika.firebaseapp.com",
  projectId: "app-medika",
  storageBucket: "app-medika.appspot.com",
  messagingSenderId: "1064552739259",
  appId: "1:1064552739259:web:3bd590cfceccbd658e149e",
  measurementId: "G-V97EKBCL9J"
};

// ==================== Firebase Initialization ====================
initializeApp(firebaseConfig);

// ==================== Angular App Bootstrap ====================
bootstrapApplication(AppComponent, {
  providers: [
    // ==================== Route Strategy ====================
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    // ==================== Ionic Angular Providers ====================
    provideIonicAngular(),

    // ==================== Router Setup ====================
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // ==================== Firebase Setup ====================
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
  ],
});
