import { Component, OnInit, Input } from '@angular/core';
import { MatDialog, MatSnackBar } from '@angular/material';

import { TranslateService } from '@ngx-translate/core';

import { AssignmentPollDialogComponent } from './assignment-poll-dialog.component';
import { AssignmentPollService } from '../../services/assignment-poll.service';
import { AssignmentRepositoryService } from 'app/core/repositories/assignments/assignment-repository.service';
import { MajorityMethod, CalculablePollKey } from 'app/core/ui-services/poll.service';
import { OperatorService } from 'app/core/core-services/operator.service';
import { Poll } from 'app/shared/models/assignments/poll';
import { PollOption } from 'app/shared/models/assignments/poll-option';
import { PromptService } from 'app/core/ui-services/prompt.service';
import { ViewAssignment } from '../../models/view-assignment';
import { BaseViewComponent } from 'app/site/base/base-view';
import { Title } from '@angular/platform-browser';

/**
 * Component for a single assignment poll. Used in assignment detail view
 */
@Component({
    selector: 'os-assignment-poll',
    templateUrl: './assignment-poll.component.html',
    styleUrls: ['./assignment-poll.component.scss']
})
export class AssignmentPollComponent extends BaseViewComponent implements OnInit {
    /**
     * The related assignment (used for metainfos, e.g. related user names)
     */
    @Input()
    public assignment: ViewAssignment;

    /**
     * The poll represented in this component
     */
    @Input()
    public poll: Poll;

    /**
     * The selected Majority method to display quorum calculations. Will be
     * set/changed by the user
     */
    public majorityChoice: MajorityMethod | null;

    /**
     * permission checks.
     * TODO stub
     *
     * @returns true if the user is permitted to do operations
     */
    public get canManage(): boolean {
        return this.operator.hasPerms('assignments.can_manage');
    }

    /**
     * Gets the voting options
     *
     * @returns all used (not undefined) option-independent values that are
     * used in this poll (e.g.)
     */
    public get pollValues(): CalculablePollKey[] {
        return this.pollService.pollValues.filter(name => this.poll[name] !== undefined);
    }

    /**
     * Gets the translated poll method name
     *
     * TODO: check/improve text here
     *
     * @returns a name for the poll method this poll is set to (which is determined
     * by the number of candidates and config settings).
     */
    public get pollMethodName(): string {
        if (!this.poll) {
            return '';
        }
        switch (this.poll.pollmethod) {
            case 'votes':
                return this.translate.instant('Vote per Candidate');
            case 'yna':
                return this.translate.instant('Yes/No/Abstain per Candidate');
            case 'yn':
                return this.translate.instant('Yes/No per Candidate');
            default:
                return '';
        }
    }

    /**
     * constructor. Does nothing
     *
     * @param pollService poll related calculations
     * @param operator permission checks
     * @param assignmentRepo The repository to the assignments
     * @param translate Translation service
     * @param dialog MatDialog for the vote entering dialog
     * @param promptService Prompts for confirmation dialogs
     */
    public constructor(
        titleService: Title,
        matSnackBar: MatSnackBar,
        public pollService: AssignmentPollService,
        private operator: OperatorService,
        private assignmentRepo: AssignmentRepositoryService,
        public translate: TranslateService,
        public dialog: MatDialog,
        private promptService: PromptService
    ) {
        super(titleService, translate, matSnackBar);
    }

    /**
     * Gets the currently selected majority choice option from the repo
     */
    public ngOnInit(): void {
        this.majorityChoice =
            this.pollService.majorityMethods.find(method => method.value === this.pollService.defaultMajorityMethod) ||
            null;
    }

    /**
     * Handler for the 'delete poll' button
     *
     * TODO: Some confirmation (advanced logic (e.g. not deleting published?))
     */
    public async onDeletePoll(): Promise<void> {
        const title = this.translate.instant('Are you sure you want to delete this poll?');
        if (await this.promptService.open(title, null)) {
            await this.assignmentRepo.deletePoll(this.poll).then(null, this.raiseError);
        }
    }

    /**
     * Print the PDF of this poll with the corresponding options and numbers
     *
     * TODO Print the ballots for this poll.
     */
    public printBallot(poll: Poll): void {
        this.raiseError('Not yet implemented');
    }

    /**
     * Fetches the name for a candidate from the assignment
     *
     * @param option Any poll option
     * @returns the full_name for the candidate
     */
    public getCandidateName(option: PollOption): string {
        const user = this.assignment.candidates.find(candidate => candidate.id === option.candidate_id);
        return user ? user.full_name : '';
        // TODO this.assignment.candidates may not contain every candidates' name (if deleted later)
        // so we should rather use this.userRepo.getViewModel(option.id).full_name
        // TODO is this name always available?
        // TODO error handling
    }

    /**
     * Determines whether the candidate has reached the majority needed to pass
     * the quorum
     *
     * @param option
     * @returns true if the quorum is successfully met
     */
    public quorumReached(option: PollOption): boolean {
        const yesValue = this.poll.pollmethod === 'votes' ? 'Votes' : 'Yes';
        const amount = option.votes.find(v => v.value === yesValue).weight;
        const yesQuorum = this.pollService.yesQuorum(this.majorityChoice, this.poll, option);
        return yesQuorum && amount >= yesQuorum;
    }

    /**
     * Opens the {@link AssignmentPollDialogComponent} dialog and then updates the votes, if the dialog
     * closes successfully (validation is done there)
     */
    public enterVotes(): void {
        // TODO deep copy of this.poll (JSON parse is ugly workaround)
        // or sending just copy of the options
        const data = {
            poll: JSON.parse(JSON.stringify(this.poll)),
            users: this.assignment.candidates // used to get the names of the users
        };
        const dialogRef = this.dialog.open(AssignmentPollDialogComponent, {
            data: data,
            maxHeight: '90vh',
            minWidth: '300px',
            maxWidth: '80vw',
            disableClose: true
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.assignmentRepo.updateVotes(result, this.poll).then(null, this.raiseError);
            }
        });
    }

    /**
     * Updates the majority method for this poll
     *
     * @param method the selected majority method
     */
    public setMajority(method: MajorityMethod): void {
        this.majorityChoice = method;
    }

    /**
     * Toggles the 'published' state
     */
    public togglePublished(): void {
        this.assignmentRepo.updatePoll({ published: !this.poll.published }, this.poll);
    }

    /**
     * Mark/unmark an option as elected
     *
     * @param option
     */
    public toggleElected(option: PollOption): void {
        if (!this.operator.hasPerms('assignments.can_manage')) {
            return;
        }

        // TODO additional conditions: assignment not finished?
        const candidate = this.assignment.assignment.assignment_related_users.find(
            user => user.user_id === option.candidate_id
        );
        if (candidate) {
            this.assignmentRepo.markElected(candidate, this.assignment, !option.is_elected);
        }
    }
}