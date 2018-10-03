import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MotionsRoutingModule } from './motions-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { MotionListComponent } from './components/motion-list/motion-list.component';
import { MotionDetailComponent } from './components/motion-detail/motion-detail.component';
import { CategoryListComponent } from './components/category-list/category-list.component';
import { MotionChangeRecommendationComponent } from './components/motion-change-recommendation/motion-change-recommendation.component';
import { MotionDetailOriginalChangeRecommendationsComponent } from './components/motion-detail-original-change-recommendations/motion-detail-original-change-recommendations.component';

@NgModule({
    imports: [CommonModule, MotionsRoutingModule, SharedModule],
    declarations: [
        MotionListComponent,
        MotionDetailComponent,
        CategoryListComponent,
        MotionChangeRecommendationComponent,
        MotionDetailOriginalChangeRecommendationsComponent
    ],
    entryComponents: [MotionChangeRecommendationComponent]
})
export class MotionsModule {}
