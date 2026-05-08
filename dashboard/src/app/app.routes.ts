import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Queue } from './pages/queue/queue';
import { Handover } from './pages/handover/handover';
import { Users } from './pages/users/users';
import { Reports } from './pages/reports/reports';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Login },

  { path: 'queue', component: Queue, canActivate: [AuthGuard] },
  { path: 'handover', component: Handover, canActivate: [AuthGuard] },
  { path: 'users', component: Users, canActivate: [AuthGuard] },
  { path: 'reports', component: Reports, canActivate: [AuthGuard] },
];