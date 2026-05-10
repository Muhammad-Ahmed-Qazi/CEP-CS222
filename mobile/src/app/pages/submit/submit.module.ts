import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { SubmitPage } from './submit.page';
import { ExploreContainerComponentModule } from '../../explore-container/explore-container.module';

import { SubmitPageRoutingModule } from './submit-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ExploreContainerComponentModule,
    SubmitPageRoutingModule
  ],
  declarations: [SubmitPage]
})
export class SubmitPageModule {}
