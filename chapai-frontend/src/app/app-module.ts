import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Navbar } from './components/navbar/navbar';
import { Sidebar } from './components/sidebar/sidebar';
import { Login } from './pages/admin/login/login';
import { Handover } from './pages/admin/handover/handover';
import { Users } from './pages/admin/users/users';
import { Operators } from './pages/admin/operators/operators';
import { Queue as OperatorQueue } from './pages/operator/queue/queue';
import { Kiosks } from './pages/admin/kiosks/kiosks';
import { Reports } from './pages/admin/reports/reports';
import { AuditLogs } from './pages/admin/audit-logs/audit-logs';
import { Bins } from './pages/operator/bins/bins';
import { Profile } from './pages/operator/profile/profile';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    App,
    Navbar,
    Sidebar,
    Login,
    Handover,
    Users,
    Operators,
    OperatorQueue,
    Kiosks,
    Reports,
    AuditLogs,
    Bins,
    Profile,
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, HttpClientModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
