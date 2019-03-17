class Playlist{
    constructor(server_id){
        this._server = server_id;
        this._urls = new Set();
        this._isPlaying = false;
        this._dispatcher = null;
        this._currentIndex = 0;
    }
    add(u){
        this._urls.add(u);
    }
    remove(u){
        this._urls.delete(u);
    }
    get urls(){
        return [...this._urls];
    }
}

module.exports = Playlist;