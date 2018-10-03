import { Directive, ElementRef, Renderer2, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { LineRange } from '../services/diff.service';

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
 *  <div osMotionDetailOriginalAndChangeRecommendations
 *       [html]="getFormattedText()"
 *       [changeRecommendations]="changeRecommendations"
 *       (createChangeRecommendation)="createChangeRecommendation($event)"
 *       (gotoChangeRecommendation)="gotoChangeRecommendation($event)"
 * ></div>
 * ```
 */
@Directive({
    selector: '[osMotionDetailOriginalAndChangeRecommendations]'
})
export class MotionDetailOrigChangeRecommendationsDirective implements OnInit {
    private element: Element;
    private selectedFrom: number = null;

    @Output()
    public createChangeRecommendation: EventEmitter<LineRange> = new EventEmitter<LineRange>();

    @Input()
    public set html(html: string) {
        this.element.innerHTML = html;
        this.startCreating();
    }

    @Input()
    public changeRecommendations: any; // @TODO

    public constructor(private renderer: Renderer2, private el: ElementRef) {
        this.element = <Element>el.nativeElement;
    }

    private getAffectedLineNumbers(): number[] {
        /*
            var changeRecommendations = motion.getTextChangeRecommendations(version.id),
                affectedLines = [];
            for (var i = 0; i < changeRecommendations.length; i++) {
                var change = changeRecommendations[i];
                for (var j = change.line_from; j < change.line_to; j++) {
                    affectedLines.push(j);
                }
            }
            return affectedLines;
            */
        return [];
    }

    private startCreating(): void {
        const alreadyAffectedLines = this.getAffectedLineNumbers();
        Array.from(this.element.querySelectorAll('.os-line-number')).forEach((lineNumber: Element) => {
            lineNumber.classList.remove('selected');
            if (alreadyAffectedLines.indexOf(parseInt(lineNumber.getAttribute('data-line-number'), 10)) === -1) {
                lineNumber.classList.add('selectable');
            }
        });
    }

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

    public ngOnInit(): void {
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
    }
}
