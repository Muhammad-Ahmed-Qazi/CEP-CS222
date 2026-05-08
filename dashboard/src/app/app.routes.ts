import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Queue } from './pages/queue/queue';
import { Handover } from './pages/handover/handover';
import { Users } from './pages/users/users';
import { Reports } from './pages/reports/reports';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'queue', component: Queue },
  { path: 'handover', component: Handover },
  { path: 'users', component: Users },
  { path: 'reports', component: Reports }
];