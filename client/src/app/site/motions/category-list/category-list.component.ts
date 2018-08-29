import { Component, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MatSort, MatTable, MatTableDataSource } from '@angular/material';
import { TranslateService } from '@ngx-translate/core';

import { BaseComponent } from '../../../base.component';
import { Category } from '../../../shared/models/motions/category';

/**
 * List view for the categories.
 *
 * TODO: Creation of new Categories
 */
@Component({
    selector: 'app-category-list',
    templateUrl: './category-list.component.html',
    styleUrls: ['./category-list.component.scss']
})
export class CategoryListComponent extends BaseComponent implements OnInit {
    /**
     * Store the categories
     */
    categoryArray: Array<Category>;

    /**
     * Will be processed by the mat-table
     */
    dataSource: MatTableDataSource<Category>;

    /**
     * The table itself.
     */
    @ViewChild(MatTable) table: MatTable<Category>;

    /**
     * Sort the Table
     */
    @ViewChild(MatSort) sort: MatSort;

    /**
     * The usual component constructor
     * @param titleService
     * @param translate
     */
    constructor(protected titleService: Title, protected translate: TranslateService) {
        super(titleService, translate);
    }

    /**
     * Init function.
     *
     * Sets the title and gets/observes categories from DataStore
     */
    ngOnInit() {
        super.setTitle('Category');
        this.categoryArray = this.DS.get(Category) as Category[];
        this.dataSource = new MatTableDataSource(this.categoryArray);
        this.dataSource.sort = this.sort;

        // Observe DataStore for motions. Initially, executes once for every motion.
        // The alternative approach is to put the observable as DataSource to the table
        this.DS.getObservable().subscribe(newModel => {
            if (newModel instanceof Category) {
                this.categoryArray = this.DS.get(Category) as Category[];
                this.dataSource.data = this.categoryArray;
            }
        });
    }

    /**
     * Add a new Category.
     *
     * TODO: Not yet implemented
     */
    onPlusButton() {
        console.log('Add New Category');
    }
}