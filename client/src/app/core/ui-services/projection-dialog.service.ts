import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material';

import { Projectable, ProjectorElementBuildDeskriptor, isProjectable } from 'app/site/base/projectable';
import {
    ProjectionDialogComponent,
    ProjectionDialogReturnType
} from 'app/shared/components/projection-dialog/projection-dialog.component';
import { ProjectorService } from '../core-services/projector.service';
import { ConfigService } from './config.service';

/**
 * Manages the projection dialog. Projects the result of the user's choice.
 */
@Injectable({
    providedIn: 'root'
})
export class ProjectionDialogService {
    /**
     * Constructor.
     *
     * @param dialog
     * @param projectorService
     */
    public constructor(
        private dialog: MatDialog,
        private projectorService: ProjectorService,
        private configService: ConfigService
    ) {}

    /**
     * Opens the projection dialog for the given projectable. After the user's choice,
     * the projectors will be updated.
     *
     * @param obj The projectable.
     */
    public async openProjectDialogFor(obj: Projectable | ProjectorElementBuildDeskriptor): Promise<void> {
        let descriptor: ProjectorElementBuildDeskriptor;
        if (isProjectable(obj)) {
            descriptor = obj.getSlide(this.configService);
        } else {
            descriptor = obj;
        }
        const dialogRef = this.dialog.open<
            ProjectionDialogComponent,
            ProjectorElementBuildDeskriptor,
            ProjectionDialogReturnType
        >(ProjectionDialogComponent, {
            maxHeight: '90vh',
            autoFocus: false,
            data: descriptor
        });
        const response = await dialogRef.afterClosed().toPromise();
        if (response) {
            const [projectors, projectorElement]: ProjectionDialogReturnType = response;
            this.projectorService.projectOnMultiple(projectors, projectorElement);
        }
    }
}
