import { TestBed, inject } from '@angular/core/testing';

import { ChangeRecommendationRepositoryService } from './change-recommendation-repository.service';

describe('CategoryRepositoryService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ChangeRecommendationRepositoryService]
        });
    });

    it('should be created', inject(
        [ChangeRecommendationRepositoryService],
        (service: ChangeRecommendationRepositoryService) => {
            expect(service).toBeTruthy();
        }
    ));
});
