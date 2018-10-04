import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatExpansionPanel } from '@angular/material';

import { BaseComponent } from '../../../../base.component';
import { Category } from '../../../../shared/models/motions/category';
import { ViewportService } from '../../../../core/services/viewport.service';
import { MotionRepositoryService } from '../../services/motion-repository.service';
import { ChangeRecoMode, LineNumberingMode, ViewMotion } from '../../models/view-motion';
import { User } from '../../../../shared/models/users/user';
import { DataStoreService } from '../../../../core/services/data-store.service';
import { TranslateService } from '@ngx-translate/core';
import { Motion } from '../../../../shared/models/motions/motion';
import { BehaviorSubject } from 'rxjs';
import { LineRange } from '../../services/diff.service';
import {
    MotionChangeRecommendationComponent,
    MotionChangeRecommendationComponentData
} from '../motion-change-recommendation/motion-change-recommendation.component';
import { ChangeRecommendationRepositoryService } from '../../services/change-recommendation-repository.service';
import { ViewChangeReco } from '../../models/view-change-reco';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ViewUnifiedChange } from '../../models/view-unified-change';

/**
 * Component for the motion detail view
 */
@Component({
    selector: 'os-motion-detail',
    templateUrl: './motion-detail.component.html',
    styleUrls: ['./motion-detail.component.scss']
})
export class MotionDetailComponent extends BaseComponent implements OnInit {
    /**
     * MatExpansionPanel for the meta info
     * Only relevant in mobile view
     */
    @ViewChild('metaInfoPanel')
    public metaInfoPanel: MatExpansionPanel;

    /**
     * MatExpansionPanel for the content panel
     * Only relevant in mobile view
     */
    @ViewChild('contentPanel')
    public contentPanel: MatExpansionPanel;

    /**
     * Motions meta-info
     */
    public metaInfoForm: FormGroup;

    /**
     * Motion content. Can be a new version
     */
    public contentForm: FormGroup;

    /**
     * Determine if the motion is edited
     */
    public editMotion = false;

    /**
     * Determine if the motion is new
     */
    public newMotion = false;

    /**
     * Target motion. Might be new or old
     */
    public motion: ViewMotion;

    /**
     * Copy of the motion that the user might edit
     */
    public motionCopy: ViewMotion;

    /**
     * All change recommendations to this motion
     */
    public changeRecommendations: ViewChangeReco[];

    /**
     * All change recommendations AND amendments, sorted by line number.
     */
    public allChangingObjects: ViewUnifiedChange[];

    /**
     * Subject for the Categories
     */
    public categoryObserver: BehaviorSubject<Array<Category>>;

    /**
     * Subject for the Submitters
     */
    public submitterObserver: BehaviorSubject<Array<User>>;

    /**
     * Subject for the Supporters
     */
    public supporterObserver: BehaviorSubject<Array<User>>;

    /**
     * Constuct the detail view.
     *
     * @param vp the viewport service
     * @param router to navigate back to the motion list and to an existing motion
     * @param route determine if this is a new or an existing motion
     * @param formBuilder For reactive forms. Form Group and Form Control
     * @param dialogService For opening dialogs
     * @param repo: Motion Repository
     * @param changeRecoRepo: Change Recommendation Repository
     * @param DS: The DataStoreService
     * @param sanitizer: For making HTML SafeHTML
     * @param translate: Translation Service
     */
    public constructor(
        public vp: ViewportService,
        private router: Router,
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private dialogService: MatDialog,
        private repo: MotionRepositoryService,
        private changeRecoRepo: ChangeRecommendationRepositoryService,
        private DS: DataStoreService,
        private sanitizer: DomSanitizer,
        protected translate: TranslateService
    ) {
        super();
        this.createForm();

        if (route.snapshot.url[0].path === 'new') {
            this.newMotion = true;
            this.editMotion = true;

            // Both are (temporarily) necessary until submitter and supporters are implemented
            // TODO new Motion and ViewMotion
            this.motion = new ViewMotion();
            this.motionCopy = new ViewMotion();
        } else {
            // load existing motion
            this.route.params.subscribe(params => {
                this.repo.getViewModelObservable(params.id).subscribe(newViewMotion => {
                    this.motion = newViewMotion;
                });
                this.changeRecoRepo
                    .getChangeRecosOfMotionObservable(parseInt(params.id, 10))
                    .subscribe((recos: ViewChangeReco[]) => {
                        this.changeRecommendations = recos;
                        this.recalcUnifiedChanges();
                    });
            });
        }
        // Initial Filling of the Subjects
        this.submitterObserver = new BehaviorSubject(DS.getAll(User));
        this.supporterObserver = new BehaviorSubject(DS.getAll(User));
        this.categoryObserver = new BehaviorSubject(DS.getAll(Category));

        // Make sure the subjects are updated, when a new Model for the type arrives
        this.DS.changeObservable.subscribe(newModel => {
            if (newModel instanceof User) {
                this.submitterObserver.next(DS.getAll(User));
                this.supporterObserver.next(DS.getAll(User));
            }
            if (newModel instanceof Category) {
                this.categoryObserver.next(DS.getAll(Category));
            }
        });
    }

    /**
     * Merges amendments and change recommendations and sorts them by the line numbers.
     * Called each time one of these arrays changes.
     */
    private recalcUnifiedChanges(): void {
        // @TODO implement amendments
        this.allChangingObjects = this.changeRecommendations;
        this.allChangingObjects.sort((a: ViewUnifiedChange, b: ViewUnifiedChange) => {
            if (a.getLineFrom() < b.getLineFrom()) {
                return -1;
            } else if (a.getLineFrom() > b.getLineFrom()) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    /**
     * Async load the values of the motion in the Form.
     */
    public patchForm(formMotion: ViewMotion): void {
        this.metaInfoForm.patchValue({
            category_id: formMotion.categoryId,
            supporters_id: formMotion.supporterIds,
            submitters_id: formMotion.submitterIds,
            state_id: formMotion.stateId,
            recommendation_id: formMotion.recommendationId,
            identifier: formMotion.identifier,
            origin: formMotion.origin
        });
        this.contentForm.patchValue({
            title: formMotion.title,
            text: formMotion.text,
            reason: formMotion.reason
        });
    }

    /**
     * Creates the forms for the Motion and the MotionVersion
     *
     * TODO: Build a custom form validator
     */
    public createForm(): void {
        this.metaInfoForm = this.formBuilder.group({
            identifier: [''],
            category_id: [''],
            state_id: [''],
            recommendation_id: [''],
            submitters_id: [],
            supporters_id: [],
            origin: ['']
        });
        this.contentForm = this.formBuilder.group({
            title: ['', Validators.required],
            text: ['', Validators.required],
            reason: ['']
        });
    }

    /**
     * Save a motion. Calls the "patchValues" function in the MotionObject
     *
     * http:post the motion to the server.
     * The AutoUpdate-Service should see a change once it arrives and show it
     * in the list view automatically
     *
     * TODO: state is not yet saved. Need a special "put" command
     *
     * TODO: Repo should handle
     */
    public saveMotion(): void {
        const newMotionValues = { ...this.metaInfoForm.value, ...this.contentForm.value };
        const fromForm = new Motion();
        fromForm.deserialize(newMotionValues);

        if (this.newMotion) {
            this.repo.create(fromForm).subscribe(response => {
                if (response.id) {
                    this.router.navigate(['./motions/' + response.id]);
                }
            });
        } else {
            this.repo.update(fromForm, this.motionCopy).subscribe(response => {
                // if the motion was successfully updated, change the edit mode.
                // TODO: Show errors if there appear here
                if (response.id) {
                    this.editMotion = false;
                }
            });
        }
    }

    /**
     * get the formated motion text from the repository.
     */
    public getFormattedTextPlain(): string {
        return this.repo.formatMotion(
            this.motion.id,
            this.motion.crMode,
            this.motion.lineLength,
            this.motion.highlightedLine
        );
    }

    /**
     * get the formated motion text from the repository, as SafeHTML for [innerHTML]
     */
    public getFormattedText(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(this.getFormattedTextPlain());
    }

    /**
     * Click on the edit button (pen-symbol)
     */
    public editMotionButton(): void {
        if (this.editMotion) {
            this.saveMotion();
        } else {
            this.editMotion = true;
            this.motionCopy = this.motion.copy();
            this.patchForm(this.motionCopy);
            if (this.vp.isMobile) {
                this.metaInfoPanel.open();
                this.contentPanel.open();
            }
        }
    }

    /**
     * Cancel the editing process
     *
     * If a new motion was created, return to the list.
     */
    public cancelEditMotionButton(): void {
        if (this.newMotion) {
            this.router.navigate(['./motions/']);
        } else {
            this.editMotion = false;
        }
    }

    /**
     * Trigger to delete the motion
     *
     * TODO: Repo should handle
     */
    public deleteMotionButton(): void {
        this.repo.delete(this.motion).subscribe(answer => {
            this.router.navigate(['./motions/']);
        });
    }

    /**
     * Sets the motions line numbering mode
     * @param mode Needs to fot to the enum defined in ViewMotion
     */
    public setLineNumberingMode(mode: LineNumberingMode): void {
        this.motion.lnMode = mode;
    }

    /**
     * Returns true if no line numbers are to be shown.
     */
    public isLineNumberingNone(): boolean {
        return this.motion.lnMode === LineNumberingMode.None;
    }

    /**
     * Returns true if the line numbers are to be shown within the text with no line breaks.
     */
    public isLineNumberingInline(): boolean {
        return this.motion.lnMode === LineNumberingMode.Inside;
    }

    /**
     * Returns true if the line numbers are to be shown to the left of the text.
     */
    public isLineNumberingOutside(): boolean {
        return this.motion.lnMode === LineNumberingMode.Outside;
    }

    /**
     * Sets the motions change reco mode
     * @param mode Needs to fot to the enum defined in ViewMotion
     */
    public setChangeRecoMode(mode: number): void {
        this.motion.crMode = mode;
    }

    /**
     * Returns true if the original version (including change recommendation annotation) is to be shown
     */
    public isRecoModeOriginal(): boolean {
        return this.motion.crMode === ChangeRecoMode.Original;
    }

    /**
     * Returns true if the diff version is to be shown
     */
    public isRecoModeDiff(): boolean {
        return this.motion.crMode === ChangeRecoMode.Diff;
    }

    /**
     * In the original version, a line number range has been selected in order to create a new change recommendation
     *
     * @param lineRange
     */
    public createChangeRecommendation(lineRange: LineRange): void {
        const data: MotionChangeRecommendationComponentData = {
            editChangeRecommendation: false,
            newChangeRecommendation: true,
            lineRange: lineRange,
            changeRecommendation: this.repo.createChangeRecommendationTemplate(this.motion.id, lineRange)
        };
        this.dialogService.open(MotionChangeRecommendationComponent, {
            height: '400px',
            width: '600px',
            data: data
        });
    }

    /**
     * In the original version, a change-recommendation-annotation has been clicked
     * -> Go to the diff view and scroll to the change recommendation
     */
    public gotoChangeRecommendation(changeRecommendation: ViewChangeReco): void {
        alert('go to change recommendation: ' + changeRecommendation.getTitle());
        // @TODO
    }

    /**
     * Init. Does nothing here.
     */
    public ngOnInit(): void {}
}
