const Discord = require('discord.js');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const auth = require('./auth.json');
const moment = require('moment');
const music_db = require(`${__dirname}/lib/models/index.js`);
const bot = new Discord.Client();
const Quiz = require('./game.js');
const Playlist = require('./playlist.js');
let playlist = new Playlist('123');
const levenshtein = (str,str2) => {
    let cost = new Array(),
        str1 = str,
        n = str1.length,
        m = str2.length,
        i, j;
    if(n == 0) {
        return m;  
    } 
    if(m == 0) {
        return n;  
    }
    for(let i=0;i<=n;i++) {
        cost[i] = new Array();
    }
    for(let i=0;i<=n;i++) {
        cost[i][0] = i;
    }
    for(let j=0;j<=m;j++) {
        cost[0][j] = j;
    }
    for(let i=1;i<=n;i++) {
        const x = str1.charAt(i-1);
        for(j=1;j<=m;j++) {
            const y = str2.charAt(j-1);
            if(x == y) {
               cost[i][j] = cost[i-1][j-1]; 
            } else {
               cost[i][j] = 1 + Math.min(cost[i-1][j-1], cost[i][j-1], cost[i-1][j]);
            } 
        }
    }
return cost[n][m];  
};

const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};


const runPlaylist = (message, index = 0)=>{
    const streamOptions = { seek: 0, volume: 1 };
    let voiceChannel = message.member.voiceChannel;
    if(!voiceChannel){
        message.channel.send('Please join a vocal channel before using this command');
        return;
    }
    if(index >= playlist.urls.length || index < 0){
        message.channel.send('I ran out of songs !');
        return;
    }
    playlist._currentIndex = index;
    voiceChannel.join().then(connection => {
        console.log("joined channel");
        const stream = ytdl(playlist.urls[index], { filter : 'audioonly' });
        const dispatcher = connection.playStream(stream, streamOptions);
        playlist._dispatcher = dispatcher;
        playlist._isPlaying = true;
        dispatcher.on("end", end => {
            if(end!='user')
                runPlaylist(message, index+1);
        });
        dispatcher.on("error", err => {
            console.log("error - left channel", err);
            voiceChannel.leave();
        });
    }).catch(err => {
        voiceChannel.leave();
        console.log("error - left channel", err)
    });
}

const playStream = (message, urlyt, quiz)=>{
    const streamOptions = { seek: 0, volume: 1 };
    let voiceChannel = message.member.voiceChannel;
    if(!voiceChannel){
        message.channel.send('Please join a vocal channel before using this command');
        return;
    }
    voiceChannel.join().then(connection => {
        console.log("joined channel");
        message.channel.send(`Let's play !`);
        const stream = ytdl(urlyt, { filter : 'audioonly' });
        const dispatcher = connection.playStream(stream, streamOptions);
        quiz.dispatcher = dispatcher;
        quiz.isPlaying = true;
        dispatcher.on("end", end => {
            console.log("left channel", end);
            if(end=='found')
                message.channel.send(`Congratulations, it was **${toTitleCase(quiz._current.song)}** by **${toTitleCase(quiz._current.singer)}**`);
            if(end=='timeout'){
                if(!quiz.found.song && !quiz.found.singer)
                    message.channel.send(`No one found **${toTitleCase(quiz._current.song)}** by **${toTitleCase(quiz._current.singer)}**`);
                else{
                    if(!quiz.found.song)
                        message.channel.send(`Almost ! It was **${toTitleCase(quiz._current.singer)}**, you missed the song : **${toTitleCase(quiz._current.song)}**`);
                    if(!quiz.found.singer)
                        message.channel.send(`Almost ! It was **${toTitleCase(quiz._current.song)}**, you missed the singer : **${toTitleCase(quiz._current.singer)}**`);
                }
            }
            quiz.isPlaying = false;
            quiz.resetCurrent();
            voiceChannel.leave();
        });
        dispatcher.on("error", err => {
            console.log("error - left channel", err);
            quiz.isPlaying = false;
            quiz.resetCurrent();
            voiceChannel.leave();
        });
        setTimeout(() => {
            dispatcher.end('timeout');
        }, 60000);
    }).catch(err => {
        voiceChannel.leave();
        console.log("error - left channel", err)
    });
}

let quizzes = new Map();
let playlists = new Map();
bot.on('ready', (evt) => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.user.username + ' - (' + bot.user.id + ')');
    [...bot.guilds.keys()].map(e=>{
        quizzes.set(e.toString(),new Quiz(e.toString()));
        playlists.set(e.toString(),new Playlist(e.toString()));
    });
});



bot.on('disconnect', (evt) => {
    bot.login(auth.token);
});
bot.on('error', (err)=>{
    console.log(err);
});
bot.on('message', (message) => {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `prefix`
    let prefix = "µbt-";
    if(message.author.id == bot.user.id)
        return;
    if (message.content.substring(0, prefix.length) == prefix) {
        let args = message.content.substring(prefix.length).split(' ');
        let cmd = args[0];
        args = args.splice(1);
        switch(cmd) {
            case 'test':
                console.log(message.channel.guild.id);
                //playStream(message, 'https://www.youtube.com/watch?v=gOMhN-hfMtY');
                quizzes.get(message.channel.guild.id.toString()).randomSong().then(o=>{
                    playStream(message, o._current.url, o);
                }).catch(err=>{console.log(err)});
            break;
            case 'chill':
                runPlaylist(message);
            break;
            case 'chill-add':
                if(args.length>0)
                    playlist.add(args[0]);
            break;
            case 'chill-next':
                playlist._dispatcher.end('user');
                runPlaylist(message, playlist._currentIndex+1);
            break;
            case 'chill-previous':
                playlist._dispatcher.end('user');
                runPlaylist(message, playlist._currentIndex-1);
            break;
            case 'chill-pause':
                if(playlist._dispatcher.paused)
                    playlist._dispatcher.resume();
                else
                    playlist._dispatcher.pause();
            break;
            case 'add':
                args = args.join(' ').trim().replace(/^"/,'').replace(/"$/,'').split('" "');
                if(args.length==3){
                    music_db.Music_quiz.create({
                        server_id:message.channel.guild.id,
                        url:args[0],
                        song: args[1].toLowerCase(),
                        singer: args[2].toLowerCase()
                      }).then((todo) => message.channel.send('song added'));
                }else{
                    message.channel.send(`Invalid command\nSyntax : ${prefix}add "url" "song" "singer"`);
                }
            break;
            case 'list':
                music_db.Music_quiz.findAll({}).then((songs) => {
                    console.log(songs);
                    message.channel.send(`${songs.length} song${songs.length>1?'s':''} available`);
                }).catch(err=>console.log(err));
            break;
            case 'remove':
                args = args.join(' ').trim().replace(/^"/,'').replace(/"$/,'').split('" "');
                if(args.length==2){
                    music_db.Music_quiz.destroy({
                        where: {
                          server_id: message.channel.guild.id,
                          song: args[0].toLowerCase(),
                          singer: args[1].toLowerCase()
                        }
                      }).then((todo) => todo ? message.channel.send('deleted') : message.channel.send('no song found'));
                }else{
                    message.channel.send(`Invalid command\nSyntax : ${prefix}remove "song" "singer"`);
                }
            break;
        }
    }else{//checking if someone says the right answer
        if(quizzes.has(message.channel.guild.id.toString())){
            let cq = quizzes.get(message.channel.guild.id.toString());
            if(cq.isPlaying){
                let score = 0;
                if(cq.checkSong(message.content) && !cq.found.song){
                    score += 1;
                    cq.found.song = true;
                }
                if(cq.checkSinger(message.content) && !cq.found.singer){
                    score += 1;
                    cq.found.singer = true;
                }
                if(cq.found.song && cq.found.singer){
                    cq.dispatcher.end('found');
                }else{
                    if(score==1)
                        message.channel.send(`The ${cq.found.singer?'singer':'song'} has been found by ${message.author}, there is still time to find the ${cq.found.singer?'song':'singer'}`);
                }
            }
        }
    }
});



bot.login(auth.token);
