import { BaseViewModel } from '../../base/base-view-model';
import { MotionChangeReco } from '../../../shared/models/motions/motion-change-reco';
import { BaseModel } from '../../../shared/models/base/base-model';
import { ModificationType } from '../services/diff.service';

/**
 * Change recommendation class for the View
 *
 * Stores a motion including all (implicit) references
 * Provides "safe" access to variables and functions in {@link MotionChangeReco}
 * @ignore
 */
export class ViewChangeReco extends BaseViewModel {
    private _changeReco: MotionChangeReco;

    public get id(): number {
        return this._changeReco ? this._changeReco.id : null;
    }

    public get changeRecommendation(): MotionChangeReco {
        return this._changeReco;
    }

    public constructor(changeReco?: MotionChangeReco) {
        super();

        this._changeReco = changeReco;
    }

    public getTitle(): string {
        return this._changeReco.getTitle();
    }

    public updateValues(update: BaseModel): void {
        // @TODO Is there any need for this function?
    }

    public updateChangeReco(type: number, text: string): void {
        // @TODO HTML sanitazion
        this._changeReco.type = type;
        this._changeReco.text = text;
    }

    public get rejected(): boolean {
        return this._changeReco ? this._changeReco.rejected : null;
    }

    public get type(): number {
        return this._changeReco ? this._changeReco.type : ModificationType.TYPE_REPLACEMENT;
    }

    public get other_description(): string {
        return this._changeReco ? this._changeReco.other_description : null;
    }

    public get line_from(): number {
        return this._changeReco ? this._changeReco.line_from : null;
    }

    public get line_to(): number {
        return this._changeReco ? this._changeReco.line_to : null;
    }

    public get text(): string {
        return this._changeReco ? this._changeReco.text : null;
    }
}
