import Store from '../store';
export default class MemoryStore extends Store {
    constructor();
    get(sid: any): Promise<any>;
    set(sid: any, sess: any): Promise<void>;
    touch(sid: any, session: any): Promise<void | undefined>;
    all(): Promise<any[]>;
    destroy(sid: any): Promise<void>;
}
