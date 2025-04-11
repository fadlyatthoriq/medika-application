import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { enableProdMode } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { environment } from './environments/environment';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAAnLW4bjB-71M4UqqjRG8UQ7EmUr4JwTQ",
  authDomain: "app-medika.firebaseapp.com",
  projectId: "app-medika",
  storageBucket: "app-medika.firebasestorage.app",
  messagingSenderId: "1064552739259",
  appId: "1:1064552739259:web:3bd590cfceccbd658e149e",
  measurementId: "G-V97EKBCL9J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
