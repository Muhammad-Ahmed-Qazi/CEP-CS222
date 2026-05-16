import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JobsPage } from './jobs.page'; 
import { JobDetailPage } from './job-detail.page';
import { QrPage } from './qr.page'; // 🌟 Import your QR component page target

const routes: Routes = [
  {
    path: '',
    component: JobsPage,
  },
  {
    path: 'detail/:id', 
    component: JobDetailPage,
  },
  {
    // 🌟 Maps directly to /tabs/jobs/qr/YOUR_JOB_ID
    path: 'qr/:id',
    component: QrPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class JobsPageRoutingModule {}