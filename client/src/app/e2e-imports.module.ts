import { NgModule, NgModuleRef } from '@angular/core';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { SharedModule } from './shared/shared.module';
import { AppModule, HttpLoaderFactory } from './app.module';
import { AppRoutingModule } from './app-routing.module';
import { LoginModule } from './site/login/login.module';
import { RootInjector } from './core/rootInjector';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

/**
 * Share Module for all "dumb" components and pipes.
 *
 * These components don not import and inject services from core or other features
 * in their constructors.
 *
 * Should receive all data though attributes in the template of the component using them.
 * No dependency to the rest of our application.
 */

@NgModule({
    imports: [
        AppModule,
        CommonModule,
        SharedModule,

        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
        LoginModule,
        BrowserAnimationsModule,
        AppRoutingModule
    ],
    exports: [CommonModule, SharedModule, HttpClientModule, TranslateModule, AppRoutingModule],
    providers: [{ provide: APP_BASE_HREF, useValue: '/' }]
})
export class E2EImportsModule {
    constructor(moduleRef: NgModuleRef<AppModule>) {
        RootInjector.injector = moduleRef.injector;
    }
}
