import { Component, Input, OnInit } from '@angular/core';
import { ViewMotion } from '../../models/view-motion';
import { ViewUnifiedChange } from '../../models/view-unified-change';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MotionRepositoryService } from '../../services/motion-repository.service';
import { LineRange } from '../../services/diff.service';

/**
 * This component displays the original motion text with the change blocks inside.
 * If the user is an administrator, each change block can be rejected.
 *
 * The line numbers are provided within the pre-rendered HTML, so we have to work with raw HTML and native HTML elements.
 *
 * It takes the styling from the parent component.
 *
 * ## Examples
 *
 * ```html
 *  <os-motion-detail-diff
 *       [motion]="motion"
 *       [changes]="changes"
 * ></os-motion-detail-diff>
 * ```
 */
@Component({
    selector: 'os-motion-detail-diff',
    templateUrl: './motion-detail-diff.component.html',
    styleUrls: ['./motion-detail-diff.component.scss']
})
export class MotionDetailDiffComponent implements OnInit {
    @Input()
    public motion: ViewMotion;
    @Input()
    public changes: ViewUnifiedChange[];

    public constructor(private sanitizer: DomSanitizer, private repo: MotionRepositoryService) {}

    public ngOnInit(): void {}

    /**
     * Returns the part of this motion between two change objects
     * @param {ViewUnifiedChange} change1
     * @param {ViewUnifiedChange} change2
     */
    public getTextBetweenChanges(change1: ViewUnifiedChange, change2: ViewUnifiedChange): SafeHtml {
        // @TODO Highlighting
        const lineRange: LineRange = {
            from: change1 ? change1.getLineTo() : 1,
            to: change2 ? change2.getLineFrom() : null
        };

        if (lineRange.from > lineRange.to) {
            const msg = 'Inconsistent data.';
            return '<em style="color: red; font-weight: bold;">' + msg + '</em>';
        }
        if (lineRange.from === lineRange.to) {
            return '';
        }

        const html = this.repo.extractMotionLineRange(this.motion.id, lineRange, true);

        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    /**
     * Returns true if this change is colliding with another change
     * @param change
     */
    public hasCollissions(change: ViewUnifiedChange): boolean {
        // @TODO Implementation
        return false;
    }

    /**
     * Returns the diff string from the motion to the change
     * @param {ViewUnifiedChange} change
     */
    public getDiff(change: ViewUnifiedChange): SafeHtml {
        const html = this.repo.getChangeDiff(this.motion, change);
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    /**
     * Returns the remainder text of the motion after the last change
     */
    public getTextRemainderAfterLastChange(): SafeHtml {
        const html = this.repo.getTextRemainderAfterLastChange(this.motion, this.changes);
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
