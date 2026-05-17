import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './pages/admin/login/login';
import { OperatorShell } from './components/operator-shell/operator-shell';
import { Queue } from './pages/operator/queue/queue';
import { AuthGuard } from './guards/auth-guard';
import { OperatorGuard } from './guards/operator-guard';

// Stubs for remaining operator views
import { Component } from '@angular/core';
import { Handover } from './pages/operator/handover/handover';
import { Bins } from './pages/operator/bins/bins';
import { Profile } from './pages/operator/profile/profile';

@Component({ template: '<div style="padding:24px;"><h3>Admin Systems Workspace</h3></div>' })
export class AdminDashboardStubComponent {}

const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: 'operator',
    component: OperatorShell,
    canActivate: [AuthGuard, OperatorGuard],
    children: [
      { path: 'queue', component: Queue },
      { path: 'handover', component: Handover },
      { path: 'bins', component: Bins },
      { path: 'profile', component: Profile },
      { path: '', redirectTo: 'queue', pathMatch: 'full' }
    ]
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardStubComponent,
    canActivate: [AuthGuard] // AdminGuard will protect this downstream
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }