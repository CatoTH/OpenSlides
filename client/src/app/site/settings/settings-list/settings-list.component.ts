import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { BaseComponent } from '../../../base.component';

/**
 * List view for the global settings
 *
 * TODO: Not yet implemented
 */
@Component({
    selector: 'app-settings-list',
    templateUrl: './settings-list.component.html',
    styleUrls: ['./settings-list.component.css']
})
export class SettingsListComponent extends BaseComponent implements OnInit {
    /**
     * The usual component constructor
     * @param titleService
     * @param translate
     */
    constructor(titleService: Title, protected translate: TranslateService) {
        super(titleService, translate);
    }

    /**
     * Init function. Sets the title
     */
    ngOnInit() {
        super.setTitle('Settings');
    }
}