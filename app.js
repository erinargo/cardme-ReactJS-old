// Dependencies
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');

// Server Set up
const express = require('express');
const http = require('http');
const app = express();
const httpServer = http.createServer(app);

// Directory Setup
app.use(bodyParser.json());
app.use(express.static(__dirname + '/front-end/build'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/front-end/build/index.html'));
});

// Socket stuff

const { Server } = require('socket.io');
const io = new Server(httpServer);

const users = [];
const games = [];
const connections = [];

// TODO: before launch, refractor this ENTIRE FILE INTO MULTIPLE FUNCTION FILES
// The game should be a class!

io.on('connection', async (socket) => {

    function respond(msg) {
        io.to(socket.id).emit('alert', msg);
    }

    function gameCleanup(game) {
        for(var i in games[game].players) users[games[game].players[i].id].game = false;
        delete games[game];
    }

    function removePlayer(user) {
        if(games[users[user].game].host == user) {
            io.to(users[user].game).emit('redirect', '/');
            return gameCleanup(users[user].game);
        }

        delete games[users[user].game].players[user];

        games[users[user].game].joined = games[users[user].game].joined.filter(u => u !== user);
        games[users[user].game].selected = games[users[user].game].selected.filter(u => u.id !== user);
        games[users[user].game].selectedUsers = games[users[user].game].selectedUsers.filter(u => u !== user);

        users[user].game = false;
    }

    socket.on('online', async (data) => {
        if(!users[data.id]) users[data.id] = {
            username: data.username,
            id: data.id,
            game: false
        }
    });

    socket.on('change-username', (data) => {
        users[data.id].username = data.username;

        if(users[data.id].game) games[users[data.id].game].players[data.id].username = data.username;
    });

    socket.on('game-connection', async (data) => {
        const { game } = data;

        socket.join(game);
    })

    socket.on('start-game', async (data) => {
        const { id, cah, cr, settings, password } = data;

        if(!id || (id && !users[id])) return respond('Something went wrong! No need to reload (yet) wait a moment and try again. ' +
            'If it doesn\'t work again, then reload. If the issue persists please contact the webmaster at ' +
            'erinjamieargo@gmail.com');

        if (users[id].game) {
            if(users[id].game.host !== id) return respond('You\'re already in a game!');
        }
        var cards = {
            calls: [],
            responses: []
        };

        var getCah;
        if(cah[0]) {
            try {
                getCah = await fetch('https://www.restagainsthumanity.com/api/v2/cards?packs='+cah.join(',')).then((res) => res.json());
                cards.calls = getCah.black;
                cards.responses = getCah.white
            } catch(e) {
                if(e) console.log(e);
                return respond('Something went wrong! Please contact the webmaster at erinjamieargo@gmail.com');
            }
        }

        for(var i in cr) {
            var getCr;
            if(cr[0]) getCr = await fetch('https://api.crcast.cc/v1/cc/decks/'+ cr[i] +'/cards').then((res) => res.json());
            else break;

            for(var i in getCr.calls) {
                var pick = getCr.calls[i].text.length - 1;
                getCr.calls[i].text = getCr.calls[i].text.join(" _ ").trim();
                getCr.calls[i].pick = pick;
                cards.calls.push(getCr.calls[i]);
            }

            for(var i in getCr.responses) {
                getCr.responses[i].text = getCr.responses[i].text.join('');
                cards.responses.push(getCr.responses[i]);
            }
        }

        if(cards.calls.length == 0 || cards.responses.length == 0) return respond('Please add a pack with cards.');
        let options = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        var join = '';
        do {
            join += options[Math.floor(Math.random() * options.length)];
            if(games[join]) join = '';
        } while(join.length < 5);

        const blank = {
            text: '_'
        }

        if(settings[0]) {
            var percent = Math.floor(cards.responses.length * (0.25));
            for(var i = 0; i < percent; i++) {
                cards.responses.push(blank);
            }
        }

        if(!settings[1]) settings[1] = 10;
        if(!settings[2]) settings[2] = 5;

        let requiredCards = ((settings[2] * 10) * settings[1]);

        if(cards.responses.length < requiredCards)
            return respond('Not enough response cards! You need to add ' + (requiredCards - cards.responses.length) + ' more.');

        games[join] = {
            cards,
            players: [],
            czar: '',
            czarName: '',
            rounds: settings[1],
            maxPlayers: settings[2],
            round: 1,
            host: id,
            started: false,
            code: join,
            joined: [],
            selected: [],
            selectedUsers: [],
            picking: false,
            messages: [],
            password,
            cah,
            cr
        }

        games[join].players[id] = { id, username: users[id].username, hand: [], points: 0 }
        games[join].joined.push(id);

        users[id].game = join;

        io.to(socket.id).emit('redirect', '/game/'+join);
    });

    socket.on('join-game', (data) => {
        const { code, id, password } = data;
        if(!users[id]) return respond('Something went wrong! Try reloading');
        if(users[id].game) return socket.emit('redirect', '/game/'+users[id].game);
        if(!games[code.toUpperCase()]) return respond('Invalid game, please check that you have the right code');
        if(games[code.toUpperCase()].started) return respond('That game has already started!');
        if(games[code.toUpperCase()].joined.length >= games[code.toUpperCase()].maxPlayers) return respond('That game has enough players.');

        if(games[code.toUpperCase()].password && games[code.toUpperCase()].password !== password)
            return respond('Invalid password');

        users[id].game = code.toUpperCase();

        games[code.toUpperCase()].players[id] = { id, username: users[id].username, hand: [], points: 0 }
        games[code.toUpperCase()].joined.push(id);

        socket.emit('redirect', '/game/'+code.toUpperCase());
    })

    socket.on('launch-game', (data) => {
        const { code, user } = data;

        if(!games[code]) return respond('Something went wrong! Try reloading');
        if(games[code].host !== user) return respond('Something went wrong! Try reloading!');

        games[code].cards.responses = games[code].cards.responses.sort(() => 0.5 - Math.random());
        games[code].cards.calls = games[code].cards.calls.sort(() => 0.5 - Math.random());

        for(var i in games[code].players) {
            const hand = games[code].cards.responses.splice(0, 10);
            games[code].players[i].hand = hand;
        }

        games[code].czar = games[code].joined[0];
        games[code].czarName = games[code].players[games[code].joined[0]].username;
        games[code].started = true;
    })

    socket.on('end', async (data) => {
        const { end, user } = data;
        if(end !== "END") return respond('Invalid entry, make sure to use all caps');

        if(!games[users[user].game]) return respond('You\'re not in a game!');

        removePlayer(user);
    });

    socket.on('kick', (data) => {
        const { user, p } = data;
        if(!users[user] || !users[p]) return respond('That user does not exist!');
        if(!games[users[user].game]) return respond('You\'re not in a game!');
        if(!games[users[user].game].players[p]) return respond('That user isn\'t in that game!');
        if(games[users[user].game].host !== user) return respond('You\'re not that game\'s host!');

        removePlayer(p);
    });

    socket.on('confirm-selection', async (data) => {
        const { selected, user, blanks } = data;

        if(!games[users[user].game]) return respond('You\'re not in a game!');

        const game = users[user].game;

        const testForUser = games[game].selectedUsers;
        if(testForUser.indexOf(user) !== -1) return respond('You\'ve already selected!');
        if(games[game].czar == user) return respond('You\'re the Daddy!');
        if(games[game].cards.calls[0].pick !== selected.map(c => c.order).length) return respond('Please pick the right number of cards');

        const option = {
            id: user,
            selected: selected.sort((a, b) => a.order - b.order),
            blanks
        }

        games[game].selected.push(option);
        games[game].selectedUsers.push(user);

        if(games[game].selectedUsers.length == Object.keys(games[game].players).length - 1) {
            games[game].picking = true;
            io.to(game).emit('selections', { selections: games[game].selected });
        }
    });

    socket.on('round-winner', (data) => {
        const { winner, user } = data;

        if(!users[user]) return respond('Something went wrong!');
        if(!users[user].game) return respond('Something went wrong! You\'re not in a game!');
        const game = users[user].game;

        if(!games[game].picking) return respond('The players are still choosing!');

        games[game].picking = false;
        io.to(game).emit('remove-response');

        games[game].players[winner].points += 1;

        for(var i in games[game].selected) {
            for(var j = 0; j < games[game].selected[i].selected.length; j++) {
                games[game].players[games[game].selected[i].id].hand =
                    games[game].players[games[game].selected[i].id].hand.filter(c =>
                        games[game].selected[i].selected[j].text !== c.text);

                games[game].players[games[game].selected[i].id].hand.push(games[game].cards.responses.splice(0,1)[0]);

                for(var k = -1; k < games[game].selected[i].blanks; k++) {
                    var index;
                    if(games[game].players[games[game].selected[i].id].hand.indexOf('_') !== -1) {
                        index = games[game].players[games[game].selected[i].id].hand.indexOf('_');
                        games[game].players[games[game].selected[i].id].hand.splice(index, 1);
                    }
                }
            }
        }

        games[game].cards.calls.shift();

        var temp;

        while(!users[games[game].joined[0]]) {
            delete games[game].players[games[game].joined[0]];
        }

        temp = games[game].joined.shift();

        games[game].joined.push(temp);

        games[game].czar = games[game].joined[0];
        games[game].czarName = users[games[game].joined[0]].username;

        games[game].selected = [];
        games[game].selectedUsers = [];

        games[game].rounds--;

        if(games[game].rounds == 0) {
            const a = Object.values(games[game].players);
            const points = Math.max(...a.map(p => p.points));

            const winners = a.filter(p => p.points == points);
            const winnersUsernames = winners.map((w) => w.username);
            const formatted = winnersUsernames.join(' and ').trimEnd();

            io.to(games[game].code).emit('alert', formatted + ' won!');
            io.to(games[game].code).emit('redirect', '/');

            gameCleanup(game);
        }
    });

    socket.on('chat', async (data) => {
        const { msg, game, user } = data;
        if(!games[game]) return respond('Invalid game');
        if(!users[user]) return respond('Something went wrong, please try reloading');

        const message = {
            msg,
            user
        }

        games[game].messages.push(message)
    });
});

// API
app.post('/api/get-data', async (req, res) => {

    if(req.body.id && users[req.body.id]) {
        return res.send(users[req.body.id]);
    }

    const name = await fetch('https://randomuser.me/api/').then((res) => res.json());
    const username = name.results[0].login.username;
    const id = await bcrypt.hash(username, 10);

    const user = { username, id };

    return res.send(user);
});

app.post('/api/cr-cast', async (req, res) => {
    const { deck } = req.body;
    const getDeck = await fetch('https://api.crcast.cc/v1/cc/decks/' + deck).then((res) => res.json());
    res.send(getDeck);
});

app.post('/api/game-info', async (req, res) => {
    const { game, player } = req.body;
    if(!games[game]) return res.send({ status: 'error', msg: 'This game does not exist!' });
    if(!games[game].players[player]) return res.send({ status: 'error', msg: 'You\'re not part of this game!' })

    const players = [];
    for(var i in games[game].players) players.push(games[game].players[i]);

    return res.send( {
        started: games[game].started,
        cards: games[game].cards,
        czar: games[game].czar,
        czarName: games[game].czarName,
        rounds: games[game].rounds,
        round: games[game].round,
        players,
        code: games[game].code,
        host: games[game].host,
        selected: games[game].selected,
        selectedUsers: games[game].selectedUsers,
        picking: games[game].picking,
        messages: games[game].messages
    } );
});

app.post('/api/get-games', async (req, res) => {
    const gamesToGet = Object.values(games);
    const gameList = gamesToGet.filter((g) => !g.password);
    const hosts = gamesToGet.map((g) => Object.values(g.players));

    return res.send({ gameList, hosts: hosts[0] });
});

httpServer.listen((process.env.port || 80), () => console.log('Listening on ' + (process.env.port || 80)));
