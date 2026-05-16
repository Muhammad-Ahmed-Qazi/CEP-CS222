import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
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
        path: 'more',
        loadChildren: () => import('../pages/more/more.module').then(m => m.MorePageModule)
      },
      {
        path: '',
        redirectTo: 'jobs',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadChildren: () => import('../pages/profile/profile.module').then(m => m.ProfilePageModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageRoutingModule { }