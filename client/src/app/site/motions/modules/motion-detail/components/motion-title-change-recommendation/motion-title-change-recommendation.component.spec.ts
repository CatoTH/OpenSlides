import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import {
    MotionTitleChangeRecommendationComponent,
    MotionTitleChangeRecommendationComponentData
} from './motion-title-change-recommendation.component';

import { E2EImportsModule } from 'e2e-imports.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ModificationType } from 'app/core/ui-services/diff.service';
import { ViewMotionChangeRecommendation } from 'app/site/motions/models/view-motion-change-recommendation';

describe('MotionTitleChangeRecommendationComponent', () => {
    let component: MotionTitleChangeRecommendationComponent;
    let fixture: ComponentFixture<MotionTitleChangeRecommendationComponent>;

    const changeReco = <ViewMotionChangeRecommendation>{
        line_from: 0,
        line_to: 0,
        type: ModificationType.TYPE_REPLACEMENT,
        text: 'Motion title',
        rejected: false,
        motion_id: 1
    };
    const dialogData: MotionTitleChangeRecommendationComponentData = {
        newChangeRecommendation: true,
        editChangeRecommendation: false,
        changeRecommendation: changeReco
    };

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [E2EImportsModule],
            declarations: [MotionTitleChangeRecommendationComponent],
            providers: [
                { provide: MatDialogRef, useValue: {} },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: dialogData
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MotionTitleChangeRecommendationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
