import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MotionListComponent } from './motion-list/motion-list.component';
import { MotionDetailComponent } from './motion-detail/motion-detail.component';

const routes: Routes = [
    { path: '', component: MotionListComponent },
    { path: 'new', component: MotionDetailComponent },
    { path: ':id', component: MotionDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MotionsRoutingModule {}