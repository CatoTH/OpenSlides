import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MotionChangeRecommendationComponent } from './motion-change-recommendation.component';

describe('MotionChangeRecommendationComponent', () => {
    let component: MotionChangeRecommendationComponent;
    let fixture: ComponentFixture<MotionChangeRecommendationComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MotionChangeRecommendationComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MotionChangeRecommendationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
