import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsPage } from './jobs.page';
import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { JobsPageRoutingModule } from './jobs-routing.module';
import { JobDetailPage } from './job-detail.page';
import { QrPage } from './qr.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    IonicModule,
    ExploreContainerComponentModule,
    JobsPageRoutingModule
  ],
  declarations: [JobsPage, JobDetailPage, QrPage]
})
export class JobsPageModule {}
