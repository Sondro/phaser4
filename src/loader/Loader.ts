import { BaseLoader } from "./BaseLoader";
import { ImageFile } from "./filetypes/ImageFile";

export class Loader extends BaseLoader
{
    constructor ()
    {
        super();
    }

    public image (key: string, url: string = ''): Promise<any>
    {
        return this.addFile(ImageFile(key, url));
    }
}
