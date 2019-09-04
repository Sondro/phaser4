class Game {
    constructor(width = 800, height = 600) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        document.body.appendChild(this.canvas);
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = '#2d2d2d';
        this.context.fillRect(0, 0, width, height);
    }
    draw(text) {
        this.context.fillStyle = '#ff0000';
        this.context.fillText(text, 10, 40);
        this.context.fillStyle = '#0000ff';
        this.context.fillText(text, 10, 20);
        this.context.fillStyle = '#ffff00';
        this.context.fillText(text, 10, 60);
    }
}
//# sourceMappingURL=Game.js.map

function XHRLoader(file) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', file.url, true);
    xhr.responseType = 'blob';
    return new Promise((resolve, reject) => {
        xhr.onload = () => {
            file.onLoad(xhr);
            resolve(file);
        };
        xhr.onerror = () => {
            file.onError(xhr);
            reject(file);
        };
        xhr.send();
    });
}
//# sourceMappingURL=XHRLoader.js.map

var FileState;
(function (FileState) {
    FileState[FileState["PENDING"] = 0] = "PENDING";
    FileState[FileState["LOADING"] = 1] = "LOADING";
    FileState[FileState["LOADED"] = 2] = "LOADED";
    FileState[FileState["FAILED"] = 3] = "FAILED";
    FileState[FileState["PROCESSING"] = 4] = "PROCESSING";
    FileState[FileState["ERRORED"] = 5] = "ERRORED";
    FileState[FileState["COMPLETE"] = 6] = "COMPLETE";
    FileState[FileState["DESTROYED"] = 7] = "DESTROYED";
    FileState[FileState["POPULATED"] = 8] = "POPULATED";
})(FileState || (FileState = {}));
function File(key, url, type) {
    return {
        key,
        url,
        type,
        data: null,
        state: FileState.PENDING,
        onStateChange(value) {
            console.log('onStateChange', value);
            if (this.state !== value) {
                this.state = value;
                //  Loaded AND Processed
                if (value === FileState.COMPLETE) {
                    if (this.resolve) {
                        this.resolve(this);
                    }
                }
                else if (value === FileState.FAILED) {
                    if (this.reject) {
                        this.reject(this);
                    }
                }
            }
        },
        load() {
            console.log('File.load', this.key);
            this.onStateChange(FileState.LOADING);
            return XHRLoader(this);
        },
        onLoad() {
            //  If overridden it must set `state` to LOADED
            this.onStateChange(FileState.LOADED);
            this.onStateChange(FileState.COMPLETE);
        },
        onError() {
            //  If overridden it must set `state` to FAILED
            this.onStateChange(FileState.FAILED);
        },
        onProcess() {
            //  If overridden it must set `state` to PROCESSING
            this.onStateChange(FileState.PROCESSING);
        },
        onComplete() {
            //  If overridden it must set `state` to COMPLETE
            this.onStateChange(FileState.COMPLETE);
        },
        onDestroy() {
            //  If overridden it must set `state` to DESTROYED
            this.onStateChange(FileState.DESTROYED);
        }
    };
}

var LoaderState;
(function (LoaderState) {
    LoaderState[LoaderState["IDLE"] = 0] = "IDLE";
    LoaderState[LoaderState["LOADING"] = 1] = "LOADING";
    LoaderState[LoaderState["PROCESSING"] = 2] = "PROCESSING";
    LoaderState[LoaderState["COMPLETE"] = 3] = "COMPLETE";
    LoaderState[LoaderState["SHUTDOWN"] = 4] = "SHUTDOWN";
    LoaderState[LoaderState["DESTROYED"] = 5] = "DESTROYED";
})(LoaderState || (LoaderState = {}));
class BaseLoader {
    constructor() {
        this.fileGroup = '';
        this.prefix = '';
        this.baseURL = '';
        this.path = '';
        this.maxParallelDownloads = 32;
        this.crossOrigin = '';
        this.state = LoaderState.IDLE;
        this.progress = 0;
        this.totalToLoad = 0;
        this.totalFailed = 0;
        this.totalComplete = 0;
        this.list = new Set();
        this.inflight = new Set();
        this.queue = new Set();
        this._deleteQueue = new Set();
        this.state = LoaderState.IDLE;
    }
    setBaseURL(value = '') {
        if (value !== '' && value.substr(-1) !== '/') {
            value = value.concat('/');
        }
        this.baseURL = value;
        return this;
    }
    setPath(value = '') {
        if (value !== '' && value.substr(-1) !== '/') {
            value = value.concat('/');
        }
        this.path = value;
        return this;
    }
    setFileGroup(name = '') {
        this.fileGroup = name;
        return this;
    }
    isLoading() {
        return (this.state === LoaderState.LOADING || this.state === LoaderState.PROCESSING);
    }
    isReady() {
        return (this.state === LoaderState.IDLE || this.state === LoaderState.COMPLETE);
    }
    addFile(key, url) {
        console.log('addFile');
        const file = File(key, url, 'image');
        this.list.add(file);
        this.totalToLoad++;
        console.log(file);
        return new Promise((resolve, reject) => {
            file.resolve = resolve;
            file.reject = reject;
        });
    }
    start() {
        if (!this.isReady()) {
            return;
        }
        this.progress = 0;
        this.totalFailed = 0;
        this.totalComplete = 0;
        this.totalToLoad = this.list.size;
        if (this.totalToLoad === 0) {
            this.loadComplete();
        }
        else {
            this.state = LoaderState.LOADING;
            this.inflight.clear();
            this.queue.clear();
            this._deleteQueue.clear();
            this.updateProgress();
            this.checkLoadQueue();
        }
    }
    updateProgress() {
        this.progress = 1 - ((this.list.size + this.inflight.size) / this.totalToLoad);
    }
    checkLoadQueue() {
        for (const entry of this.list) {
            if ((entry.state === FileState.POPULATED) ||
                (entry.state === FileState.PENDING && this.inflight.size < this.maxParallelDownloads)) {
                this.inflight.add(entry);
                this.list.delete(entry);
                //  Apply CORS
                entry.load()
                    .then((file) => this.nextFile(file, true))
                    .catch((file) => this.nextFile(file, false));
            }
            if (this.inflight.size === this.maxParallelDownloads) {
                break;
            }
        }
    }
    nextFile(previousFile, success) {
        console.log('nextFile', previousFile, success);
        if (success) {
            this.queue.add(previousFile);
        }
        else {
            this._deleteQueue.add(previousFile);
        }
        this.inflight.delete(previousFile);
        if (this.list.size > 0) {
            console.log('nextFile - still something in the list');
            this.checkLoadQueue();
        }
        else if (this.inflight.size === 0) {
            console.log('nextFile calling finishedLoading');
            this.loadComplete();
        }
    }
    loadComplete() {
        this.list.clear();
        this.inflight.clear();
        this.queue.clear();
        this.progress = 1;
        this.state = LoaderState.COMPLETE;
        //  Call 'destroy' on each file ready for deletion
        // this._deleteQueue.iterateLocal('destroy');
        // this._deleteQueue.clear();
    }
}

class Loader extends BaseLoader {
    constructor() {
        super();
    }
    image(key, url = '') {
        return this.addFile(key, url);
    }
}
//# sourceMappingURL=Loader.js.map

export { BaseLoader, File, FileState, Game, Loader, LoaderState };
