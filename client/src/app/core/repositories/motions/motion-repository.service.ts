import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Category } from 'app/shared/models/motions/category';
import { ChangeRecoMode, MotionTitleInformation, ViewMotion } from 'app/site/motions/models/view-motion';
import { CollectionStringMapperService } from '../../core-services/collection-string-mapper.service';
import { ConfigService } from 'app/core/ui-services/config.service';
import { DataSendService } from '../../core-services/data-send.service';
import { DataStoreService } from '../../core-services/data-store.service';
import { DiffLinesInParagraph, DiffService, LineRange, ModificationType } from '../../ui-services/diff.service';
import { HttpService } from 'app/core/core-services/http.service';
import { LinenumberingService, LineNumberRange } from '../../ui-services/linenumbering.service';
import { Mediafile } from 'app/shared/models/mediafiles/mediafile';
import { Motion } from 'app/shared/models/motions/motion';
import { MotionBlock } from 'app/shared/models/motions/motion-block';
import { MotionChangeRecommendation } from 'app/shared/models/motions/motion-change-reco';
import { MotionPoll } from 'app/shared/models/motions/motion-poll';
import { TreeIdNode } from 'app/core/ui-services/tree.service';
import { User } from 'app/shared/models/users/user';
import { ViewMotionChangeRecommendation } from 'app/site/motions/models/view-motion-change-recommendation';
import { ViewMotionAmendedParagraph } from 'app/site/motions/models/view-motion-amended-paragraph';
import { ViewUnifiedChange } from 'app/shared/models/motions/view-unified-change';
import { ViewStatuteParagraph } from 'app/site/motions/models/view-statute-paragraph';
import { Workflow } from 'app/shared/models/motions/workflow';
import { WorkflowState } from 'app/shared/models/motions/workflow-state';
import { Tag } from 'app/shared/models/core/tag';
import { ViewModelStoreService } from 'app/core/core-services/view-model-store.service';
import { ViewCategory } from 'app/site/motions/models/view-category';
import { ViewUser } from 'app/site/users/models/view-user';
import { ViewWorkflow } from 'app/site/motions/models/view-workflow';
import { ViewItem } from 'app/site/agenda/models/view-item';
import { ViewMotionBlock } from 'app/site/motions/models/view-motion-block';
import { ViewMediafile } from 'app/site/mediafiles/models/view-mediafile';
import { ViewTag } from 'app/site/tags/models/view-tag';
import { ViewPersonalNote } from 'app/site/users/models/view-personal-note';
import { OperatorService } from 'app/core/core-services/operator.service';
import { CollectionIds } from 'app/core/core-services/data-store-update-manager.service';
import { PersonalNote, PersonalNoteContent } from 'app/shared/models/users/personal-note';
import { ViewListOfSpeakers } from 'app/site/agenda/models/view-list-of-speakers';
import { BaseIsAgendaItemAndListOfSpeakersContentObjectRepository } from '../base-is-agenda-item-and-list-of-speakers-content-object-repository';

type SortProperty = 'weight' | 'identifier';

/**
 * Describes the single paragraphs from the base motion.
 */
export interface ParagraphToChoose {
    /**
     * The paragraph number.
     */
    paragraphNo: number;

    /**
     * The raw HTML of this paragraph.
     */
    rawHtml: string;

    /**
     * The HTML of this paragraph, wrapped in a `SafeHtml`-object.
     */
    safeHtml: SafeHtml;

    /**
     * The first line number
     */
    lineFrom: number;

    /**
     * The last line number
     */
    lineTo: number;
}

/**
 * Repository Services for motions (and potentially categories)
 *
 * The repository is meant to process domain objects (those found under
 * shared/models), so components can display them and interact with them.
 *
 * Rather than manipulating models directly, the repository is meant to
 * inform the {@link DataSendService} about changes which will send
 * them to the Server.
 */
@Injectable({
    providedIn: 'root'
})
export class MotionRepositoryService extends BaseIsAgendaItemAndListOfSpeakersContentObjectRepository<
    ViewMotion,
    Motion,
    MotionTitleInformation
> {
    /**
     * The property the incoming data is sorted by
     */
    protected sortProperty: SortProperty;

    /**
     * Creates a MotionRepository
     *
     * Converts existing and incoming motions to ViewMotions
     * Handles CRUD using an observer to the DataStore
     *
     * @param DS The DataStore
     * @param mapperService Maps collection strings to classes
     * @param dataSend sending changed objects
     * @param httpService OpenSlides own Http service
     * @param sanitizer DOM Sanitizer
     * @param lineNumbering Line numbering for motion text
     * @param diff Display changes in motion text as diff.
     * @param personalNoteService service fo personal notes
     * @param config ConfigService (subscribe to sorting config)
     */
    public constructor(
        DS: DataStoreService,
        dataSend: DataSendService,
        mapperService: CollectionStringMapperService,
        viewModelStoreService: ViewModelStoreService,
        translate: TranslateService,
        config: ConfigService,
        private httpService: HttpService,
        private readonly sanitizer: DomSanitizer,
        private readonly lineNumbering: LinenumberingService,
        private readonly diff: DiffService,
        private operator: OperatorService
    ) {
        super(DS, dataSend, mapperService, viewModelStoreService, translate, Motion, [
            Category,
            User,
            Workflow,
            MotionBlock,
            Mediafile,
            Tag,
            MotionChangeRecommendation,
            PersonalNote,
            Motion
        ]);
        config.get<SortProperty>('motions_motions_sorting').subscribe(conf => {
            this.sortProperty = conf;
            this.setConfigSortFn();
        });
    }

    public getTitle = (titleInformation: MotionTitleInformation) => {
        if (titleInformation.identifier) {
            return titleInformation.identifier + ': ' + titleInformation.title;
        } else {
            return titleInformation.title;
        }
    };

    public getTitleWithChanges = (motion: ViewMotion, change: ViewUnifiedChange, crMode: ChangeRecoMode): string => {
        if (change) {
            if (crMode === ChangeRecoMode.Changed) {
                return change.getChangeNewText();
            } else if (
                (crMode === ChangeRecoMode.Final || crMode === ChangeRecoMode.ModifiedFinal) &&
                !change.isRejected()
            ) {
                return change.getChangeNewText();
            } else {
                return motion.title;
            }
        } else {
            return motion.title;
        }
    };

    public getIdentifierOrTitle = (titleInformation: MotionTitleInformation) => {
        if (titleInformation.identifier) {
            return titleInformation.identifier;
        } else {
            return titleInformation.title;
        }
    };

    public getAgendaSlideTitle = (titleInformation: MotionTitleInformation) => {
        const numberPrefix = titleInformation.agenda_item_number ? `${titleInformation.agenda_item_number} · ` : '';
        // if the identifier is set, the title will be 'Motion <identifier>'.
        if (titleInformation.identifier) {
            return numberPrefix + this.translate.instant('Motion') + ' ' + titleInformation.identifier;
        } else {
            return numberPrefix + titleInformation.title;
        }
    };

    public getAgendaListTitle = (titleInformation: MotionTitleInformation) => {
        const numberPrefix = titleInformation.agenda_item_number ? `${titleInformation.agenda_item_number} · ` : '';
        // Append the verbose name only, if not the special format 'Motion <identifier>' is used.
        if (titleInformation.identifier) {
            return numberPrefix + this.translate.instant('Motion') + ' ' + titleInformation.identifier;
        } else {
            return numberPrefix + titleInformation.title + ' (' + this.getVerboseName() + ')';
        }
    };

    public getVerboseName = (plural: boolean = false) => {
        return this.translate.instant(plural ? 'Motions' : 'Motion');
    };

    /**
     * Converts a motion to a ViewMotion and adds it to the store.
     *
     * Foreign references of the motion will be resolved (e.g submitters to users)
     * Expandable to all (server side) changes that might occur on the motion object.
     *
     * @param motion blank motion domain object
     */
    protected createViewModel(motion: Motion): ViewMotion {
        const category = this.viewModelStoreService.get(ViewCategory, motion.category_id);
        const submitters = this.viewModelStoreService.getMany(ViewUser, motion.sorted_submitters_id);
        const supporters = this.viewModelStoreService.getMany(ViewUser, motion.supporters_id);
        const workflow = this.viewModelStoreService.get(ViewWorkflow, motion.workflow_id);
        const item = this.viewModelStoreService.get(ViewItem, motion.agenda_item_id);
        const listOfSpeakers = this.viewModelStoreService.get(ViewListOfSpeakers, motion.list_of_speakers_id);
        const block = this.viewModelStoreService.get(ViewMotionBlock, motion.motion_block_id);
        const attachments = this.viewModelStoreService.getMany(ViewMediafile, motion.attachments_id);
        const tags = this.viewModelStoreService.getMany(ViewTag, motion.tags_id);
        const parent = this.viewModelStoreService.get(ViewMotion, motion.parent_id);
        const amendments = this.viewModelStoreService.filter(ViewMotion, m => m.parent_id && m.parent_id === motion.id);
        const changeRecommendations = this.viewModelStoreService.filter(
            ViewMotionChangeRecommendation,
            cr => cr.motion_id === motion.id
        );
        let state: WorkflowState = null;
        if (workflow) {
            state = workflow.getStateById(motion.state_id);
        }
        const personalNote = this.getPersonalNoteForMotion(motion.id);
        const viewMotion = new ViewMotion(
            motion,
            category,
            submitters,
            supporters,
            workflow,
            state,
            item,
            listOfSpeakers,
            block,
            attachments,
            tags,
            parent,
            changeRecommendations,
            amendments,
            personalNote
        );
        viewMotion.getIdentifierOrTitle = () => this.getIdentifierOrTitle(viewMotion);
        viewMotion.getProjectorTitle = () => this.getAgendaSlideTitle(viewMotion);
        return viewMotion;
    }

    /**
     * Get the personal note content for one motion by their id
     *
     * @param motionId the id of the motion
     * @returns the personal note content for this motion or null
     */
    private getPersonalNoteForMotion(motionId: number): PersonalNoteContent | null {
        if (this.operator.isAnonymous) {
            return;
        }

        const personalNote = this.viewModelStoreService.find(ViewPersonalNote, pn => {
            return pn.userId === this.operator.user.id;
        });

        if (!personalNote) {
            return;
        }

        const notes = personalNote.notes;
        const collection = Motion.COLLECTIONSTRING;
        if (notes && notes[collection] && notes[collection][motionId]) {
            return notes[collection][motionId];
        }
    }

    /**
     * Special handling of updating personal notes.
     * @override
     */
    public updateDependencies(changedModels: CollectionIds): void {
        if (!this.depsModelCtors || this.depsModelCtors.length === 0) {
            return;
        }
        const viewModels = this.getViewModelList();
        let somethingUpdated = false;
        Object.keys(changedModels).forEach(collection => {
            const dependencyChanged: boolean = this.depsModelCtors.some(ctor => {
                return ctor.COLLECTIONSTRING === collection;
            });
            if (!dependencyChanged) {
                return;
            }

            // Do not update personal notes, if the operator is anonymous
            if (collection === PersonalNote.COLLECTIONSTRING && this.operator.isAnonymous) {
                return;
            }

            viewModels.forEach(ownViewModel => {
                changedModels[collection].forEach(id => {
                    const viewModel = this.viewModelStoreService.get(collection, id);
                    // Only update the personal note, if the operator is the right user.
                    if (
                        collection === PersonalNote.COLLECTIONSTRING &&
                        (<ViewPersonalNote>viewModel).userId !== this.operator.user.id
                    ) {
                        return;
                    }
                    ownViewModel.updateDependencies(viewModel);
                });
            });
            somethingUpdated = true;
        });
        if (somethingUpdated) {
            viewModels.forEach(ownViewModel => {
                this.updateViewModelObservable(ownViewModel.id);
            });
            this.updateViewModelListObservable();
        }
    }

    /**
     * Set the state of a motion
     *
     * @param viewMotion target motion
     * @param stateId the number that indicates the state
     */
    public async setState(viewMotion: ViewMotion, stateId: number): Promise<void> {
        const restPath = `/rest/motions/motion/${viewMotion.id}/set_state/`;
        await this.httpService.put(restPath, { state: stateId });
    }

    /**
     * Set the state of motions in bulk
     *
     * @param viewMotion target motion
     * @param stateId the number that indicates the state
     */
    public async setMultiState(viewMotions: ViewMotion[], stateId: number): Promise<void> {
        const restPath = `/rest/motions/motion/manage_multiple_state/`;
        const motionsIdMap: { id: number; state: number }[] = viewMotions.map(motion => {
            return { id: motion.id, state: stateId };
        });
        await this.httpService.post(restPath, { motions: motionsIdMap });
    }

    /**
     * Set the motion blocks of motions in bulk
     *
     * @param viewMotion target motion
     * @param motionblockId the number that indicates the motion block
     */
    public async setMultiMotionBlock(viewMotions: ViewMotion[], motionblockId: number): Promise<void> {
        const restPath = `/rest/motions/motion/manage_multiple_motion_block/`;
        const motionsIdMap: { id: number; motion_block: number }[] = viewMotions.map(motion => {
            return { id: motion.id, motion_block: motionblockId };
        });
        await this.httpService.post(restPath, { motions: motionsIdMap });
    }

    /**
     * Set the category of motions in bulk
     *
     * @param viewMotion target motion
     * @param categoryId the number that indicates the category
     */
    public async setMultiCategory(viewMotions: ViewMotion[], categoryId: number): Promise<void> {
        const restPath = `/rest/motions/motion/manage_multiple_category/`;
        const motionsIdMap: { id: number; category: number }[] = viewMotions.map(motion => {
            return { id: motion.id, category: categoryId };
        });
        await this.httpService.post(restPath, { motions: motionsIdMap });
    }

    /**
     * Set the recommenders state of a motion
     *
     * @param viewMotion target motion
     * @param recommendationId the number that indicates the recommendation
     */
    public async setRecommendation(viewMotion: ViewMotion, recommendationId: number): Promise<void> {
        const restPath = `/rest/motions/motion/${viewMotion.id}/set_recommendation/`;
        await this.httpService.put(restPath, { recommendation: recommendationId });
    }

    /**
     * Set the category of a motion
     *
     * @param viewMotion target motion
     * @param categoryId the number that indicates the category
     */
    public async setCatetory(viewMotion: ViewMotion, categoryId: number): Promise<void> {
        await this.patch({ category_id: categoryId }, viewMotion);
    }

    /**
     * Add the motion to a motion block
     *
     * @param viewMotion the motion to add
     * @param blockId the ID of the motion block
     */
    public async setBlock(viewMotion: ViewMotion, blockId: number): Promise<void> {
        await this.patch({ motion_block_id: blockId }, viewMotion);
    }

    /**
     * Adds new or removes existing tags from motions
     *
     * @param viewMotion the motion to tag
     * @param tagId the tags id to add or remove
     */
    public async setTag(viewMotion: ViewMotion, tagId: number): Promise<void> {
        const tags = viewMotion.motion.tags_id.map(tag => tag);
        const tagIndex = tags.findIndex(tag => tag === tagId);

        if (tagIndex === -1) {
            // add tag to motion
            tags.push(tagId);
        } else {
            // remove tag from motion
            tags.splice(tagIndex, 1);
        }
        await this.patch({ tags_id: tags }, viewMotion);
    }

    /**
     * Sets the submitters by sending a request to the server,
     *
     * @param viewMotion The motion to change the submitters from
     * @param submitters The submitters to set
     */
    public async setSubmitters(viewMotion: ViewMotion, submitters: ViewUser[]): Promise<void> {
        const requestData = {
            motions: [
                {
                    id: viewMotion.id,
                    submitters: submitters.map(s => s.id)
                }
            ]
        };
        this.httpService.post('/rest/motions/motion/manage_multiple_submitters/', requestData);
    }

    /**
     * Sends the changed nodes to the server.
     *
     * @param data The reordered data from the sorting
     */
    public async sortMotions(data: TreeIdNode[]): Promise<void> {
        await this.httpService.post('/rest/motions/motion/sort/', data);
    }

    /**
     * Supports the motion
     *
     * @param viewMotion target motion
     */
    public async support(viewMotion: ViewMotion): Promise<void> {
        const url = `/rest/motions/motion/${viewMotion.id}/support/`;
        await this.httpService.post(url);
    }

    /**
     * Unsupports the motion
     *
     * @param viewMotion target motion
     */
    public async unsupport(viewMotion: ViewMotion): Promise<void> {
        const url = `/rest/motions/motion/${viewMotion.id}/support/`;
        await this.httpService.delete(url);
    }

    /** Returns an observable returning the amendments to a given motion
     *
     * @param {number} motionId
     * @returns {Observable<ViewMotion[]>}
     */
    public amendmentsTo(motionId: number): Observable<ViewMotion[]> {
        return this.getViewModelListObservable().pipe(
            map((motions: ViewMotion[]): ViewMotion[] => {
                return motions.filter((motion: ViewMotion): boolean => {
                    return motion.parent_id === motionId;
                });
            })
        );
    }

    /**
     * Returns the amendments to a given motion
     *
     * @param motionId the motion ID to get the amendments to
     */
    public getAmendmentsInstantly(motionId: number): ViewMotion[] {
        return this.getViewModelList().filter(motion => motion.parent_id === motionId);
    }

    /**
     * Format the motion text using the line numbering and change
     * reco algorithm.
     *
     * Can be called from detail view and exporter
     * @param id Motion ID - will be pulled from the repository
     * @param crMode indicator for the change reco mode
     * @param changes all change recommendations and amendments, sorted by line number
     * @param lineLength the current line
     * @param highlightLine the currently highlighted line (default: none)
     */
    public formatMotion(
        id: number,
        crMode: ChangeRecoMode,
        changes: ViewUnifiedChange[],
        lineLength: number,
        highlightLine?: number
    ): string {
        const targetMotion = this.getViewModel(id);

        if (targetMotion && targetMotion.text) {
            switch (crMode) {
                case ChangeRecoMode.Original:
                    return this.lineNumbering.insertLineNumbers(targetMotion.text, lineLength, highlightLine);
                case ChangeRecoMode.Changed:
                    return this.diff.getTextWithChanges(targetMotion.text, changes, lineLength, highlightLine);
                case ChangeRecoMode.Diff:
                    let text = '';
                    changes
                        .filter(change => {
                            return change.showInDiffView();
                        })
                        .forEach((change: ViewUnifiedChange, idx: number) => {
                            if (idx === 0) {
                                text += this.extractMotionLineRange(
                                    id,
                                    {
                                        from: 1,
                                        to: change.getLineFrom()
                                    },
                                    true,
                                    lineLength,
                                    highlightLine
                                );
                            } else if (changes[idx - 1].getLineTo() < change.getLineFrom()) {
                                text += this.extractMotionLineRange(
                                    id,
                                    {
                                        from: changes[idx - 1].getLineTo(),
                                        to: change.getLineFrom()
                                    },
                                    true,
                                    lineLength,
                                    highlightLine
                                );
                            }
                            text += this.diff.getChangeDiff(targetMotion.text, change, lineLength, highlightLine);
                        });
                    text += this.diff.getTextRemainderAfterLastChange(
                        targetMotion.text,
                        changes,
                        lineLength,
                        highlightLine
                    );
                    return text;
                case ChangeRecoMode.Final:
                    const appliedChanges: ViewUnifiedChange[] = changes.filter(change => change.showInFinalView());
                    return this.diff.getTextWithChanges(targetMotion.text, appliedChanges, lineLength, highlightLine);
                case ChangeRecoMode.ModifiedFinal:
                    if (targetMotion.modified_final_version) {
                        return this.lineNumbering.insertLineNumbers(
                            targetMotion.modified_final_version,
                            lineLength,
                            highlightLine,
                            null,
                            1
                        );
                    } else {
                        // Use the final version as fallback, if the modified does not exist.
                        return this.formatMotion(id, ChangeRecoMode.Final, changes, lineLength, highlightLine);
                    }
                default:
                    console.error('unrecognized ChangeRecoMode option (' + crMode + ')');
                    return null;
            }
        } else {
            return null;
        }
    }

    public formatStatuteAmendment(
        paragraphs: ViewStatuteParagraph[],
        amendment: ViewMotion,
        lineLength: number
    ): string {
        const origParagraph = paragraphs.find(paragraph => paragraph.id === amendment.statute_paragraph_id);
        if (origParagraph) {
            let diffHtml = this.diff.diff(origParagraph.text, amendment.text);
            diffHtml = this.lineNumbering.insertLineBreaksWithoutNumbers(diffHtml, lineLength, true);
            return diffHtml;
        }
    }

    /**
     * Extracts a renderable HTML string representing the given line number range of this motion
     *
     * @param {number} id
     * @param {LineRange} lineRange
     * @param {boolean} lineNumbers - weather to add line numbers to the returned HTML string
     * @param {number} lineLength
     * @param {number|null} highlightedLine
     */
    public extractMotionLineRange(
        id: number,
        lineRange: LineRange,
        lineNumbers: boolean,
        lineLength: number,
        highlightedLine: number
    ): string {
        const origHtml = this.formatMotion(id, ChangeRecoMode.Original, [], lineLength);
        const extracted = this.diff.extractRangeByLineNumbers(origHtml, lineRange.from, lineRange.to);
        let html =
            extracted.outerContextStart +
            extracted.innerContextStart +
            extracted.html +
            extracted.innerContextEnd +
            extracted.outerContextEnd;
        if (lineNumbers) {
            html = this.lineNumbering.insertLineNumbers(html, lineLength, highlightedLine, null, lineRange.from);
        }
        return html;
    }

    /**
     * Returns the last line number of a motion
     *
     * @param {ViewMotion} motion
     * @param {number} lineLength
     * @return {number}
     */
    public getLastLineNumber(motion: ViewMotion, lineLength: number): number {
        const numberedHtml = this.lineNumbering.insertLineNumbers(motion.text, lineLength);
        const range = this.lineNumbering.getLineNumberRange(numberedHtml);
        return range.to;
    }

    /**
     * Creates a {@link ViewMotionChangeRecommendation} object based on the motion ID and the given lange range.
     * This object is not saved yet and does not yet have any changed HTML. It's meant to populate the UI form.
     *
     * @param {number} motionId
     * @param {LineRange} lineRange
     * @param {number} lineLength
     */
    public createChangeRecommendationTemplate(
        motionId: number,
        lineRange: LineRange,
        lineLength: number
    ): ViewMotionChangeRecommendation {
        const changeReco = new MotionChangeRecommendation();
        changeReco.line_from = lineRange.from;
        changeReco.line_to = lineRange.to;
        changeReco.type = ModificationType.TYPE_REPLACEMENT;
        changeReco.text = this.extractMotionLineRange(motionId, lineRange, false, lineLength, null);
        changeReco.rejected = false;
        changeReco.motion_id = motionId;

        return new ViewMotionChangeRecommendation(changeReco);
    }

    /**
     * Creates a {@link ViewMotionChangeRecommendation} object to change the title, based on the motion ID.
     * This object is not saved yet and does not yet have any changed title. It's meant to populate the UI form.
     *
     * @param {number} motionId
     * @param {number} lineLength
     */
    public createTitleChangeRecommendationTemplate(
        motionId: number,
        lineLength: number
    ): ViewMotionChangeRecommendation {
        const targetMotion = this.getViewModel(motionId);
        const changeReco = new MotionChangeRecommendation();
        changeReco.line_from = 0;
        changeReco.line_to = 0;
        changeReco.type = ModificationType.TYPE_REPLACEMENT;
        changeReco.text = targetMotion.title;
        changeReco.rejected = false;
        changeReco.motion_id = motionId;

        return new ViewMotionChangeRecommendation(changeReco);
    }

    /**
     * Given an amendment, this returns the motion affected by this amendments
     *
     * @param {ViewMotion} amendment
     * @returns {ViewMotion}
     */
    public getAmendmentBaseMotion(amendment: ViewMotion): ViewMotion {
        return this.getViewModel(amendment.parent_id);
    }

    /**
     * Splits a motion into paragraphs, optionally adding line numbers
     *
     * @param {ViewMotion} motion
     * @param {boolean} lineBreaks
     * @param {number} lineLength
     * @returns {string[]}
     */
    public getTextParagraphs(motion: ViewMotion, lineBreaks: boolean, lineLength: number): string[] {
        if (!motion) {
            return [];
        }
        let html = motion.text;
        if (lineBreaks) {
            html = this.lineNumbering.insertLineNumbers(html, lineLength);
        }
        return this.lineNumbering.splitToParagraphs(html);
    }

    /**
     * Returns the data structure used for creating and editing amendments
     *
     * @param {ViewMotion} motion
     * @param {number} lineLength
     */
    public getParagraphsToChoose(motion: ViewMotion, lineLength: number): ParagraphToChoose[] {
        return this.getTextParagraphs(motion, true, lineLength).map((paragraph: string, index: number) => {
            const affected: LineNumberRange = this.lineNumbering.getLineNumberRange(paragraph);
            return {
                paragraphNo: index,
                safeHtml: this.sanitizer.bypassSecurityTrustHtml(paragraph),
                rawHtml: this.lineNumbering.stripLineNumbers(paragraph),
                lineFrom: affected.from,
                lineTo: affected.to
            };
        });
    }

    /**
     * Returns all paragraphs that are affected by the given amendment in diff-format
     *
     * @param {ViewMotion} amendment
     * @param {number} lineLength
     * @param {boolean} includeUnchanged
     * @returns {DiffLinesInParagraph}
     */
    public getAmendmentParagraphs(
        amendment: ViewMotion,
        lineLength: number,
        includeUnchanged: boolean
    ): DiffLinesInParagraph[] {
        const motion = this.getAmendmentBaseMotion(amendment);
        const baseParagraphs = this.getTextParagraphs(motion, true, lineLength);

        return amendment.amendment_paragraphs
            .map(
                (newText: string, paraNo: number): DiffLinesInParagraph => {
                    if (newText !== null) {
                        return this.diff.getAmendmentParagraphsLinesByMode(
                            paraNo,
                            baseParagraphs[paraNo],
                            newText,
                            lineLength
                        );
                    } else {
                        // Nothing has changed in this paragraph
                        if (includeUnchanged) {
                            const paragraph_line_range = this.lineNumbering.getLineNumberRange(baseParagraphs[paraNo]);
                            return {
                                paragraphNo: paraNo,
                                paragraphLineFrom: paragraph_line_range.from,
                                paragraphLineTo: paragraph_line_range.to,
                                diffLineFrom: paragraph_line_range.to,
                                diffLineTo: paragraph_line_range.to,
                                textPre: baseParagraphs[paraNo],
                                text: '',
                                textPost: ''
                            } as DiffLinesInParagraph;
                        } else {
                            return null; // null will make this paragraph filtered out
                        }
                    }
                }
            )
            .filter((para: DiffLinesInParagraph) => para !== null);
    }

    /**
     * Returns all paragraphs that are affected by the given amendment as unified change objects.
     *
     * @param {ViewMotion} amendment
     * @param {number} lineLength
     * @returns {ViewMotionAmendedParagraph[]}
     */
    public getAmendmentAmendedParagraphs(amendment: ViewMotion, lineLength: number): ViewMotionAmendedParagraph[] {
        const motion = this.getAmendmentBaseMotion(amendment);
        const baseParagraphs = this.getTextParagraphs(motion, true, lineLength);

        return amendment.amendment_paragraphs
            .map(
                (newText: string, paraNo: number): ViewMotionAmendedParagraph => {
                    if (newText === null) {
                        return null;
                    }

                    const origText = baseParagraphs[paraNo],
                        diff = this.diff.diff(origText, newText),
                        affectedLines = this.diff.detectAffectedLineRange(diff);

                    if (affectedLines === null) {
                        return null;
                    }
                    const affectedDiff = this.diff.formatDiff(
                        this.diff.extractRangeByLineNumbers(diff, affectedLines.from, affectedLines.to)
                    );
                    const affectedConsolidated = this.diff.diffHtmlToFinalText(affectedDiff);

                    return new ViewMotionAmendedParagraph(amendment, paraNo, affectedConsolidated, affectedLines);
                }
            )
            .filter((para: ViewMotionAmendedParagraph) => para !== null);
    }

    /**
     * Returns motion duplicates (sharing the identifier)
     *
     * @param viewMotion the ViewMotion to compare against the list of Motions
     * in the data
     * @returns An Array of ViewMotions with the same identifier of the input, or an empty array
     */
    public getMotionDuplicates(motion: ViewMotion): ViewMotion[] {
        const duplicates = this.DS.filter(Motion, item => motion.identifier === item.identifier);
        const viewMotions: ViewMotion[] = [];
        duplicates.forEach(item => viewMotions.push(this.createViewModel(item)));
        return viewMotions;
    }

    /**
     * Sends a request to the server, creating a new poll for the motion
     */
    public async createPoll(motion: ViewMotion): Promise<void> {
        const url = '/rest/motions/motion/' + motion.id + '/create_poll/';
        await this.httpService.post(url);
    }

    /**
     * Sends an update request for a poll.
     *
     * @param poll
     */
    public async updatePoll(poll: MotionPoll): Promise<void> {
        const url = '/rest/motions/motion-poll/' + poll.id + '/';
        const data = {
            motion_id: poll.motion_id,
            id: poll.id,
            votescast: poll.votescast,
            votesvalid: poll.votesvalid,
            votesinvalid: poll.votesinvalid,
            votes: {
                Yes: poll.yes,
                No: poll.no,
                Abstain: poll.abstain
            }
        };
        await this.httpService.put(url, data);
    }

    /**
     * Sends a http request to delete the given poll
     *
     * @param poll
     */
    public async deletePoll(poll: MotionPoll): Promise<void> {
        const url = '/rest/motions/motion-poll/' + poll.id + '/';
        await this.httpService.delete(url);
    }

    /**
     * Signals the acceptance of the current recommendation to the server
     *
     * @param motion A ViewMotion
     */
    public async followRecommendation(motion: ViewMotion): Promise<void> {
        if (motion.recommendation_id) {
            const restPath = `/rest/motions/motion/${motion.id}/follow_recommendation/`;
            await this.httpService.post(restPath);
        }
    }
    /**
     * Check if a motion currently has any amendments
     *
     * @param motion A viewMotion
     * @returns True if there is at eleast one amendment
     */
    public hasAmendments(motion: ViewMotion): boolean {
        return this.getViewModelList().filter(allMotions => allMotions.parent_id === motion.id).length > 0;
    }

    /**
     * updates the state Extension with the string given, if the current workflow allows for it
     *
     * @param viewMotion
     * @param value
     */
    public async setStateExtension(viewMotion: ViewMotion, value: string): Promise<void> {
        if (viewMotion.state.show_state_extension_field) {
            return this.patch({ state_extension: value }, viewMotion);
        }
    }

    /**
     * updates the recommendation extension with the string given, if the current workflow allows for it
     *
     * @param viewMotion
     * @param value
     */
    public async setRecommendationExtension(viewMotion: ViewMotion, value: string): Promise<void> {
        if (viewMotion.recommendation.show_recommendation_extension_field) {
            return this.patch({ recommendation_extension: value }, viewMotion);
        }
    }

    /**
     * Get the label for the motion's current state with the extension
     * attached (if available). For cross-referencing other motions, `[motion:id]`
     * will replaced by the referenced motion's identifier (see {@link solveExtensionPlaceHolder})
     *
     * @param motion
     * @returns the translated state with the extension attached
     */
    public getExtendedStateLabel(motion: ViewMotion): string {
        if (!motion.state) {
            return null;
        }
        let state = this.translate.instant(motion.state.name);
        if (motion.stateExtension && motion.state.show_state_extension_field) {
            state += ' ' + this.parseMotionPlaceholders(motion.stateExtension);
        }
        return state;
    }

    /**
     * Get the label for the motion's current recommendation with the extension
     * attached (if available)
     *
     * @param motion
     * @returns the translated extension with the extension attached
     */
    public getExtendedRecommendationLabel(motion: ViewMotion): string {
        if (motion.recommendation) {
            let rec = this.translate.instant(motion.recommendation.recommendation_label);
            if (motion.recommendationExtension && motion.recommendation.show_recommendation_extension_field) {
                rec += ' ' + this.parseMotionPlaceholders(motion.recommendationExtension);
            }
            return rec;
        }
        return '';
    }

    /**
     * Replaces any motion placeholder (`[motion:id]`) with the motion's title(s)
     *
     * @param value
     * @returns the string with the motion titles replacing the placeholders
     */
    public parseMotionPlaceholders(value: string): string {
        return value.replace(/\[motion:(\d+)\]/g, (match, id) => {
            const motion = this.getViewModel(id);
            if (motion) {
                return motion.getIdentifierOrTitle();
            } else {
                return this.translate.instant('<unknown motion>');
            }
        });
    }

    /**
     * Triggers an update for the sort function responsible for the default sorting of data items
     */
    public setConfigSortFn(): void {
        this.setSortFunction((a: ViewMotion, b: ViewMotion) => {
            if (a[this.sortProperty] && b[this.sortProperty]) {
                if (a[this.sortProperty] === b[this.sortProperty]) {
                    return this.languageCollator.compare(a.title, b.title);
                } else {
                    if (this.sortProperty === 'weight') {
                        // handling numerical values
                        return a.weight - b.weight;
                    } else {
                        return this.languageCollator.compare(a[this.sortProperty], b[this.sortProperty]);
                    }
                }
            } else if (a[this.sortProperty]) {
                return -1;
            } else if (b[this.sortProperty]) {
                return 1;
            } else {
                return this.languageCollator.compare(a.title, b.title);
            }
        });
    }
}
