import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';
import { 
  ProfilePage, 
  TransactionDetailModalComponent, 
  ChangePasswordModalComponent 
} from './profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilePageRoutingModule
  ],
  declarations: [
    ProfilePage,
    TransactionDetailModalComponent, // 🌟 Declare here so it knows Ionic components & Pipes
    ChangePasswordModalComponent    // 🌟 Declare here so it can use ngModel and Ionic
  ]
})
export class ProfilePageModule {}