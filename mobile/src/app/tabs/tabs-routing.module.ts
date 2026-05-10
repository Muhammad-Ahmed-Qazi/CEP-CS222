import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '', // Leave this empty, it's matched by 'tabs' in app-routing
    component: TabsPage,
    children: [
      {
        path: 'jobs',
        loadChildren: () => import('../pages/jobs/jobs.module').then(m => m.JobsPageModule)
      },
      {
        path: 'submit',
        loadChildren: () => import('../pages/submit/submit.module').then(m => m.SubmitPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../pages/profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'jobs', // NO leading slash here
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
