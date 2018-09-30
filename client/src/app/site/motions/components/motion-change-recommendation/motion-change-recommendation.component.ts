import { Component, Inject, OnInit } from '@angular/core';
import { LineRange } from '../../services/diff.service';
import { MAT_DIALOG_DATA } from '@angular/material';
import { ViewMotion } from '../../models/view-motion';
import { MotionRepositoryService } from '../../services/motion-repository.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

/**
 * Data that needs to be provided to the MotionChangeRecommendationComponent dialog
 */
export interface MotionChangeRecommendationComponentData {
    editChangeRecommendation: boolean;
    newChangeRecommendation: boolean;
    lineRange: LineRange;
    motion: ViewMotion;
}

/**
 * The dialog for creating and editing change recommendations from within the os-motion-detail-component.
 *
 * @example
 * ```ts
 * const data: MotionChangeRecommendationComponentData = {
 *     editChangeRecommendation: false,
 *     newChangeRecommendation: true,
 *     lineRange: lineRange,
 *     motion: this.motion,
 * };
 * this.dialogService.open(MotionChangeRecommendationComponent, {
 *      height: '400px',
 *      width: '600px',
 *      data: data,
 * });
 * ```
 *
 */
@Component({
    selector: 'os-motion-change-recommendation',
    templateUrl: './motion-change-recommendation.component.html',
    styleUrls: ['./motion-change-recommendation.component.scss']
})
export class MotionChangeRecommendationComponent implements OnInit {
    /**
     * Determine if the change recommendation is edited
     */
    public editMotion = false;

    /**
     * Determine if the change recommendation is new
     */
    public newMotion = false;

    /**
     * The motion this change recommendation is intended for
     */
    public motion: ViewMotion;

    /**
     * The line range affected by this change recommendation
     */
    public lineRange: LineRange;

    /**
     * Change recommendation content.
     */
    public contentForm: FormGroup;

    public constructor(
        @Inject(MAT_DIALOG_DATA) public data: MotionChangeRecommendationComponentData,
        private formBuilder: FormBuilder,
        private repo: MotionRepositoryService
    ) {
        this.editMotion = data.editChangeRecommendation;
        this.newMotion = data.newChangeRecommendation;
        this.motion = data.motion;
        this.lineRange = data.lineRange;

        this.createForm();
    }

    /**
     * Creates the forms for the Motion and the MotionVersion
     */
    public createForm(): void {
        if (this.newMotion) {
            this.contentForm = this.formBuilder.group({
                text: [this.repo.extractMotionLineRange(this.motion.id, this.lineRange), Validators.required]
            });
        } else {
            this.contentForm = this.formBuilder.group({
                text: ['@TODO', Validators.required]
            });
        }
    }

    public saveChangeRecommendation(): void {
        console.log('saving');
        console.log(this.contentForm.controls.text.value);
    }

    public ngOnInit(): void {}
}
