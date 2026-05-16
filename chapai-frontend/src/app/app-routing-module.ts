import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './pages/admin/login/login';
import { Handover as AdminHandover } from './pages/admin/handover/handover';
import { Users } from './pages/admin/users/users';
import { Operators } from './pages/admin/operators/operators';
import { Kiosks } from './pages/admin/kiosks/kiosks';
import { Reports } from './pages/admin/reports/reports';
import { AuditLogs } from './pages/admin/audit-logs/audit-logs';

import { Queue as OperatorQueue } from './pages/operator/queue/queue';
import { Bins } from './pages/operator/bins/bins';
import { Handover as OperatorHandover } from './pages/operator/handover/handover';
import { Profile } from './pages/operator/profile/profile';

import { AuthGuard } from './guards/auth-guard';

const routes: Routes = [
  { path: '', component: Login },

  // 🏢 ADMIN VIEWS (Enforced Role Lockdown)
  { path: 'admin/handover', component: AdminHandover, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/users', component: Users, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/operators', component: Operators, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/kiosks', component: Kiosks, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/reports', component: Reports, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/audit-logs', component: AuditLogs, canActivate: [AuthGuard], data: { roles: ['admin'] } },

  // ⚡ OPERATOR WORKSTATION VIEWS (Enforced Role Lockdown)
  { path: 'operator/queue', component: OperatorQueue, canActivate: [AuthGuard], data: { roles: ['operator'] } },
  { path: 'operator/bins', component: Bins, canActivate: [AuthGuard], data: { roles: ['operator'] } },
  { path: 'operator/handover', component: OperatorHandover, canActivate: [AuthGuard], data: { roles: ['operator'] } },
  { path: 'operator/profile', component: Profile, canActivate: [AuthGuard], data: { roles: ['operator'] } },

  // Catch-all safety boundary redirection
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }