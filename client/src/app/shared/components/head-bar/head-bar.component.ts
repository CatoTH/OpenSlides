import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

/**
 * Reusable head bar component for Apps.
 *
 * Will translate the title automatically.
 *
 * Use `PlusButton=true` and `(plusButtonClicked)=myFunction()` if a plus button is needed
 *
 * Use `[menuLust]=myArray` and `(ellipsisMenuItem)=myFunction($event)` if a menu is needed
 *
 * ## Examples:
 *
 * ### Usage of the selector:
 *
 * ```html
 * <app-head-bar
 *   appName="Files"
 *   PlusButton=true
 *   [menuList]=myMenu
 *   (plusButtonClicked)=onPlusButton()
 *   (ellipsisMenuItem)=onEllipsisItem($event)>
 * </app-head-bar>
 * ```
 *
 * ### Declaration of a menu provided as `[menuList]=myMenu`:
 *
 * ```ts
 * myMenu = [
 *   {
 *     text: 'Download All',
 *     icon: 'download',
 *     action: 'downloadAllFiles'
 *   },
 * ];
 * ```
 * The parent needs to react to `action` like the following.
 * This will execute a function with the name provided in the
 * `action` field.
 * ```ts
 * onEllipsisItem(event: any) {
 *   if (event.action) {
 *     this[event.action]();
 *   }
 * }
 * ```
 */
@Component({
    selector: 'app-head-bar',
    templateUrl: './head-bar.component.html',
    styleUrls: ['./head-bar.component.scss']
})
export class HeadBarComponent implements OnInit {
    /**
     * Input declaration for the app name
     */
    @Input() appName: string;

    /**
     * Determine if there should be a plus button.
     */
    @Input() plusButton: false;

    /**
     * If not empty shows a ellipsis menu on the right side
     *
     * The parent needs to provide a menu, i.e `[menuList]=myMenu`.
     */
    @Input() menuList: any[];

    /**
     * Emit a signal to the parent component if the plus button was clicked
     */
    @Output() plusButtonClicked = new EventEmitter<boolean>();

    /**
     * Emit a signal to the parent of an item in the menuList was selected.
     */
    @Output() ellipsisMenuItem = new EventEmitter<any>();

    /**
     * Empty constructor
     */
    constructor() {}

    /**
     * empty onInit
     */
    ngOnInit() {}

    /**
     * Emits a signal to the parent if an item in the menu was clicked.
     * @param item
     */
    clickMenu(item: any) {
        this.ellipsisMenuItem.emit(item);
    }

    /**
     * Emits a signal to the parent if
     */
    clickPlusButton() {
        this.plusButtonClicked.emit(true);
    }
}