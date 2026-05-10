import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsPage } from './jobs.page';
import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { JobsPageRoutingModule } from './jobs-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    JobsPageRoutingModule
  ],
  declarations: [JobsPage]
})
export class JobsPageModule {}
