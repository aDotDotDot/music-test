const music_db = require(`${__dirname}/lib/models/index.js`);
const regexpize = (st) => {
    let po = new Array();
    for(let i=0; i<st.length; i++){
        po.push(new RegExp(st.substring(0,i)+'.{1,2}'+st.substring(i+1,st.length,'i')));
    }
    return po;
};
class Quiz{
    constructor(server){
        this._server = server;
        this._isPlaying = false;
        this._current = {song: '', singer: '', url: ''};
        this._found = {song: false, singer: false};
        this._dispatcher = null;
    }
    set dispatcher(d){
        this._dispatcher = d;
    }
    get dispatcher(){
        return this._dispatcher;
    }
    set isPlaying(b){
        this._isPlaying = b;
    }
    get isPlaying(){
        return this._isPlaying;
    }
    get found(){
        return this._found;
    }
    resetCurrent(){
        this._current = {song: '', singer: '', url: ''};
        this._found = {song: false, singer: false};
    }
    randomSong(){
        return new Promise( (resolve, reject)=>{
            music_db.Music_quiz.findAll({

            }).then((songs) => {
               //console.log(songs,`${songs.length} song${songs.length>1?'s':''} available`);
               let s = songs[Math.floor(Math.random()*songs.length)];
               this._current.song = s.dataValues.song;
               this._current.singer = s.dataValues.singer;
               this._current.url = s.dataValues.url;
               resolve(this);
            }).catch(err=>reject(err));
        });
    }
    checkSong(s){
        console.log(this._current.song);
        return regexpize(this._current.song).reduce( (a,e)=>{
            return a || (s.match(e)!==null);
        },false);
    }
    checkSinger(s){
        console.log(this._current.singer);
        return regexpize(this._current.singer).reduce( (a,e)=>{
            return a || (s.match(e)!==null);
        },false);
    }
}

module.exports = Quiz;