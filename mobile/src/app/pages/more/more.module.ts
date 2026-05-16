import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MorePageRoutingModule } from './more-routing.module';
import { MorePage, AboutAppModalComponent } from './more.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MorePageRoutingModule // 🌟 Mapped to your routing file
  ],
  declarations: [MorePage, AboutAppModalComponent]
})
export class MorePageModule {}