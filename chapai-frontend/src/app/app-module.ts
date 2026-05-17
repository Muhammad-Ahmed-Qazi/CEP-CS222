import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing-module';

// Components
import { App } from './app';
import { Login } from './pages/admin/login/login';
import { OperatorShell } from './components/operator-shell/operator-shell'; // 💡 Fixed class name and path reference
import { Queue } from './pages/operator/queue/queue';
import { AdminDashboardStubComponent } from './app-routing-module';
import { Queue as AdminQueue} from './pages/admin/queue/queue';

// Services & Guards
import { AuthService } from './services/auth';
import { PrintData } from './services/print-data';
import { AuthGuard } from './guards/auth-guard';
import { AdminGuard } from './guards/admin-guard';
import { OperatorGuard } from './guards/operator-guard';
import { Handover } from './pages/operator/handover/handover';
import { Bins } from './pages/operator/bins/bins';
import { Profile } from './pages/operator/profile/profile';
import { AdminShell } from './components/admin-shell/admin-shell';
import { Operators } from './pages/admin/operators/operators';

@NgModule({
  declarations: [
    App,
    Login, // 💡 CRITICAL: Added to declarations so template bindings like onLogin, email, and password work
    OperatorShell, // 💡 Updated to match the actual generated class name
    Queue, // 💡 CRITICAL: Added to declarations so pipe errors and selectedJob variables evaluate cleanly
    Handover,
    Bins,
    Profile,
    AdminShell,
    AdminQueue, // 💡 CRITICAL: Added to declarations so template bindings like onRefresh and queues work without errors
    Operators
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    AppRoutingModule,

    // Standalone Components belong here in imports
    AdminDashboardStubComponent,
  ],
  providers: [AuthService, PrintData, AuthGuard, AdminGuard, OperatorGuard],
  bootstrap: [App],
})
export class AppModule {}
