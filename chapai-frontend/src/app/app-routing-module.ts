import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './pages/admin/login/login';
import { OperatorShell } from './components/operator-shell/operator-shell';
import { Queue } from './pages/operator/queue/queue';
import { AuthGuard } from './guards/auth-guard';
import { OperatorGuard } from './guards/operator-guard';

// Stubs for remaining operator views
import { Component } from '@angular/core';
@Component({ template: '<div style="padding:24px;"><h3>Handover Verification Workspace</h3></div>' })
export class HandoverStubComponent {}
@Component({ template: '<div style="padding:24px;"><h3>Kiosk Physical Bin Management Matrix</h3></div>' })
export class BinsStubComponent {}
@Component({ template: '<div style="padding:24px;"><h3>Operator Account Profile Matrix</h3></div>' })
export class ProfileStubComponent {}
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
      { path: 'handover', component: HandoverStubComponent },
      { path: 'bins', component: BinsStubComponent },
      { path: 'profile', component: ProfileStubComponent },
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