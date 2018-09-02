import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectorComponent } from './projector.component';

describe('ProjectorComponent', () => {
    let component: ProjectorComponent;
    let fixture: ComponentFixture<ProjectorComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ProjectorComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        try {
            fixture = TestBed.createComponent(ProjectorComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        } catch (e) {
            console.log(e);
        }
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
