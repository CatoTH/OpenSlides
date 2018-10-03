import { ElementRef, Renderer2, OnInit, Output, EventEmitter, Input, Component } from '@angular/core';
import { LineRange, ModificationType } from '../../services/diff.service';
import { ViewChangeReco } from '../../models/view-change-reco';

/**
 * This directive displays the original motion text with annotated change commendations (not yet implemented)
 * and a method to create new change recommendations from the line numbers to the left of the text.
 *
 * The line numbers are provided within the pre-rendered HTML, so we have to work with raw HTML and native HTML elements.
 *
 * It takes the styling from the parent component.
 *
 * ## Examples
 *
 * ```html
 *  <os-motion-detail-original-change-recommendations
 *       [html]="getFormattedText()"
 *       [changeRecommendations]="changeRecommendations"
 *       (createChangeRecommendation)="createChangeRecommendation($event)"
 *       (gotoChangeRecommendation)="gotoChangeRecommendation($event)"
 * ></os-motion-detail-original-change-recommendations>
 * ```
 */
@Component({
    selector: 'os-motion-detail-original-change-recommendations',
    templateUrl: './motion-detail-original-change-recommendations.component.html',
    styleUrls: ['./motion-detail-original-change-recommendations.component.scss']
})
export class MotionDetailOriginalChangeRecommendationsComponent implements OnInit {
    private element: Element;
    private selectedFrom: number = null;
    private _changeRecommendations: ViewChangeReco[] = [];
    private _html: string;

    @Output()
    public createChangeRecommendation: EventEmitter<LineRange> = new EventEmitter<LineRange>();

    @Output()
    public gotoChangeRecommendation: EventEmitter<ViewChangeReco> = new EventEmitter<ViewChangeReco>();

    @Input()
    public set html(html: string) {
        this._html = html;
        this.update();
    }

    @Input()
    public set changeRecommendations(changeRecos: ViewChangeReco[]) {
        this._changeRecommendations = changeRecos;
        this.update();
    }

    public get changeRecommendations(): ViewChangeReco[] {
        return this._changeRecommendations;
    }

    /**
     * @param {Renderer2} renderer
     * @param {ElementRef} el
     */
    public constructor(private renderer: Renderer2, private el: ElementRef) {}

    /**
     * Re-creates
     */
    private update(): void {
        if (!this.element) {
            // Not yet initialized
            return;
        }
        this.element.innerHTML = this._html;

        this.startCreating();
    }

    /**
     * Returns an array with all line numbers that are currently affected by a change recommendation
     * and therefor not subject to further changes
     */
    private getAffectedLineNumbers(): number[] {
        const affectedLines = [];
        this._changeRecommendations.forEach((change: ViewChangeReco) => {
            for (let j = change.line_from; j < change.line_to; j++) {
                affectedLines.push(j);
            }
        });
        return affectedLines;
    }

    /**
     * Resetting the selection. All selected lines are unselected, and the selectable lines are marked as such
     */
    private startCreating(): void {
        const alreadyAffectedLines = this.getAffectedLineNumbers();
        Array.from(this.element.querySelectorAll('.os-line-number')).forEach((lineNumber: Element) => {
            lineNumber.classList.remove('selected');
            if (alreadyAffectedLines.indexOf(parseInt(lineNumber.getAttribute('data-line-number'), 10)) === -1) {
                lineNumber.classList.add('selectable');
            } else {
                lineNumber.classList.remove('selectable');
            }
        });
    }

    /**
     * A line number has been clicked - either to start the selection or to finish it.
     *
     * @param lineNumber
     */
    private clickedLineNumber(lineNumber: number): void {
        if (this.selectedFrom === null) {
            this.selectedFrom = lineNumber;
        } else {
            if (lineNumber > this.selectedFrom) {
                this.createChangeRecommendation.emit({
                    from: this.selectedFrom,
                    to: lineNumber + 1
                });
            } else {
                this.createChangeRecommendation.emit({
                    from: lineNumber,
                    to: this.selectedFrom + 1
                });
            }
            this.selectedFrom = null;
            this.startCreating();
        }
    }

    /**
     * A line number is hovered. If we are in the process of selecting a line range and the hovered line is selectable,
     * the plus sign is shown for this line and all lines between the first selected line.
     *
     * @param lineNumberHovered
     */
    private hoverLineNumber(lineNumberHovered: number): void {
        if (this.selectedFrom === null) {
            return;
        }
        Array.from(this.element.querySelectorAll('.os-line-number')).forEach((lineNumber: Element) => {
            const line = parseInt(lineNumber.getAttribute('data-line-number'), 10);
            if (
                (line >= this.selectedFrom && line <= lineNumberHovered) ||
                (line >= lineNumberHovered && line <= this.selectedFrom)
            ) {
                lineNumber.classList.add('selected');
            } else {
                lineNumber.classList.remove('selected');
            }
        });
    }

    /**
     * Style for the change recommendation list
     * @param reco
     */
    public calcRecoTop(reco: ViewChangeReco): string {
        const from = <HTMLElement>(
            this.element.querySelector('.os-line-number.line-number-' + reco.line_from.toString(10))
        );
        return from.offsetTop.toString() + 'px';
    }

    /**
     * Style for the change recommendation list
     * @param reco
     */
    public calcRecoHeight(reco: ViewChangeReco): string {
        const from = <HTMLElement>(
            this.element.querySelector('.os-line-number.line-number-' + reco.line_from.toString(10))
        );
        const to = <HTMLElement>this.element.querySelector('.os-line-number.line-number-' + reco.line_to.toString(10));
        if (to) {
            return (to.offsetTop - from.offsetTop).toString() + 'px';
        } else {
            // Last line - lets assume a realistic value
            return '20px';
        }
    }

    /**
     * CSS-Class for the change recommendation list
     * @param reco
     */
    public recoIsInsertion(reco: ViewChangeReco): boolean {
        return reco.type === ModificationType.TYPE_INSERTION;
    }

    /**
     * CSS-Class for the change recommendation list
     * @param reco
     */
    public recoIsDeletion(reco: ViewChangeReco): boolean {
        return reco.type === ModificationType.TYPE_DELETION;
    }

    /**
     * CSS-Class for the change recommendation list
     * @param reco
     */
    public recoIsReplacement(reco: ViewChangeReco): boolean {
        return reco.type === ModificationType.TYPE_REPLACEMENT;
    }

    /**
     * Trigger the `gotoChangeRecommendation`-event
     * @param reco
     */
    public gotoReco(reco: ViewChangeReco): void {
        this.gotoChangeRecommendation.emit(reco);
    }

    /**
     * Adding the event listeners: clicking on plus signs next to line numbers
     * and the hover-event next to the line numbers
     */
    public ngOnInit(): void {
        const nativeElement = <Element>this.el.nativeElement;
        console.log(nativeElement, nativeElement.querySelector('.text'));
        this.element = <Element>nativeElement.querySelector('.text');

        this.renderer.listen(this.el.nativeElement, 'click', (ev: MouseEvent) => {
            const element = <Element>ev.target;
            if (element.classList.contains('os-line-number') && element.classList.contains('selectable')) {
                this.clickedLineNumber(parseInt(element.getAttribute('data-line-number'), 10));
            }
        });

        this.renderer.listen(this.el.nativeElement, 'mouseover', (ev: MouseEvent) => {
            const element = <Element>ev.target;
            if (element.classList.contains('os-line-number') && element.classList.contains('selectable')) {
                this.hoverLineNumber(parseInt(element.getAttribute('data-line-number'), 10));
            }
        });

        this.update();
    }
}
