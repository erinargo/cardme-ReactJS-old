import './index.scss';
import Navbar from '../Navbar';
import { io } from 'socket.io-client';
import {useState, useEffect, useRef} from "react";
import {NavLink} from "react-router-dom";

var selected;

const socket = io();
socket.on('alert', (msg) => {
    alert(msg);
});

socket.on('redirect', (link) => {
    window.location.href = link;
});

socket.on('add-player', () => {});
socket.on('store', (data) => localStorage.setItem(data.key, data.token));

socket.on('selections', (data) => {
    selected = data;
});

socket.on('remove-response', () => {
    selected = undefined;

    document.querySelectorAll('.checked').forEach((c) => {
        c.childNodes[1].checked = false;
        c.style.background = '';
        c.classList.remove('checked');
        c.value = undefined;
    })
})

const Game = () => {
    const init = (
        <>
            Loading . . .
        </>
    );

    const [game, setGame] = useState(init);

    const kickPlayer = (p, user) => {
        socket.emit('kick', { p, user });
    }

    useEffect(() => {
        (async () => {
            const gameID = window.location.href.split('/');
            const user = localStorage.getItem('id');
            socket.emit('game-connection', ({ game: gameID[gameID.length - 1] }));

            const game = await fetch('/api/game-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game: gameID[gameID.length - 1],
                    player: user
                })
            }).then((res) => res.json());

            if(game.status) return alert(game.msg);

            const host = game.host == localStorage.getItem('id') ? <button onClick={() => socket.emit('launch-game', {
                    code: game.code,
                    user
                })
            }>Start!</button> :
                <></>;

            const page = game.started ? (
                <>
                    <div className={'wrapper-top'}>
                        <div className={ 'xar' }><a className={'daddy'}>Daddy:</a> { game.czarName }</div>
                        { game.host == user ? (<a className={ 'end' } onClick={ async () => {
                            const end = prompt('If you really want to end your game, type END');

                            socket.emit('end', { end, user });
                        } }>End Game</a>) : (<a className={ 'end' } onClick={ async () => {
                            const end = prompt('If you really want to leave your game, type END');

                            socket.emit('end', { end, user });
                        } }>Leave Game</a>) }
                        <div className={ 'call' } className={'black-card'}>{ <p> { game.cards.calls[0].text.split("_").join("＿＿") } </p> } {
                            <p className={'pick'}>Pick: { game.cards.calls[0].pick }</p>
                        }</div>
                        <a className={'confirm'} onClick={ async () => {
                            let selected = [];

                            if(game.czar == user && game.picking) {
                                return socket.emit('round-winner', { winner: document.querySelectorAll('.selected .checked')[0].attributes.name.value, user });
                            }
                            let blanks = 0;

                            document.querySelectorAll('.checked div').forEach(c => {
                                var text = c.innerHTML == '_' ? prompt('Enter your text for card #'+ (c.parentElement.value + 1)) : c.innerHTML;
                                if(c.innerHTML == '_' && !text) return;

                                if(c.innerHTML == '_') blanks++;

                                c.checked = false;
                                c.classList.remove('checked');
                                c.background = '';

                                if(c.parentElement.value == undefined) {
                                    selected = [];
                                    return;
                                }

                                const card = {
                                    order: c.parentElement.value,
                                    text,
                                    blanks
                                }

                                selected.push(card);

                                c.parentElement.value = undefined;
                            });

                            socket.emit('confirm-selection', { selected, user, blanks });
                            selected = [];
                        } }>Confirm Selection</a>

                        <div className={'selected'}>
                            { selected ? selected.selections.map((s) => (
                                <label className={ 'white-card' } name={ s.id }>{ s.selected.map((c, i) => <>Card { i+1 }: { c.text }<input type={'checkbox'} onChange={ (e) => {
                                    e.target.checked ?
                                        e.target.parentElement.style.background = '#ff8352'
                                        : e.target.parentElement.style.background = '';

                                const checked = document.querySelectorAll('.checked');
                                if(checked.length >= game.cards.calls[0].pick) {
                                    document.querySelectorAll('.checked')[0]
                                        .style.background = '';
                                    document.querySelectorAll('.checked input')[0].checked = false;
                                    document.querySelectorAll('.checked div')[0].parentElement.value = undefined;
                                    document.querySelectorAll('.checked')[0].classList.remove('checked');
                                }

                                e.target.checked ? e.target.parentElement.value = undefined : e.target.parentElement.value = checked.length;

                                e.target.checked ?
                                    e.target.parentElement.classList.add('checked') :
                                    e.target.parentElement.classList.remove('checked');
                            } } /></>) }</label>)) : (<></>) }
                        </div>

                        <div className={ 'responses' }>
                            {
                            game.players
                                .map((p) => (
                                    p.id == user ? (<>{
                                        p.hand
                                        .map((r) => (<label className={'white-card'}><div>{ r.text }</div><input type={'checkbox'} onChange={ (e) => {
                                            e.target.checked ?
                                                e.target.parentElement.style.background = '#ff8352'
                                                : e.target.parentElement.style.background = '';

                                            const checked = document.querySelectorAll('.checked');
                                            if(checked.length >= game.cards.calls[0].pick) {
                                                document.querySelectorAll('.checked')[0]
                                                    .style.background = '';
                                                document.querySelectorAll('.checked input')[0].checked = false;
                                                document.querySelectorAll('.checked')[0].value = undefined;
                                                document.querySelectorAll('.checked')[0].classList.remove('checked');
                                            }
                                            console.log(e.target.parentElement)
                                            /*e.target.parentElement.value ? e.target.parentElement.value = undefined :*/ e.target.parentElement.value = checked.length;
                                            console.log(e.target.parentElement)
                                            e.target.checked ?
                                                e.target.parentElement.classList.add('checked') :
                                                e.target.parentElement.classList.remove('checked');
                                        } } /></label>))
                                    }</>) : (<></>)
                                ))
                        }</div>
                    </div>
                    <div className={'wrapper-bottom'}>
                        <div className={ 'chat' }>
                            <div className={'chat-box'}>
                                <div>
                                    {
                                        game.messages.map((m) =>
                                            (<div><p>
                                                { game.players.filter((p) => p.id == m.user)[0].username }
                                            </p>
                                                <p> { m.msg } </p>
                                            </div>)) }</div>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const msg = document.getElementById('chat').value;
                                const parseCode = window.location.href.split('/');
                                socket.emit('chat', { msg, game: parseCode[parseCode.length - 1], user: localStorage.getItem('id') });
                                document.getElementById('chat').value = '';
                            }
                            }>
                                <input type={'text'} placeholder={'Chat'} id={'chat'} />
                            </form>
                        </div>
                        <div className={ 'points' }>
                            <p>Points:</p>
                            { game.players.map((p) => (<><> { game.host == user ? <a className={ 'kick' } onClick={() => { kickPlayer(p.id, user) } }>Kick Player</a> : <></> } </>{ p.username }: { p.points }<br /></>)) }
                        </div>
                        <div className={ 'hand' }>

                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className={ 'row-wrapper' } id={ 'pregame-screen' }>
                        Join Game Code: { game.code }<br /><br />
                        Waiting on players . . . <br />
                        {
                            game.players
                                .map((p) => (<> { p.username } </>))
                                .reduce((prev, curr) => [prev, ', ', curr])
                        }
                    </div>
                    { host }
                </>
            );

            setGame(page);
        })();
    })

    return (
        <>
            <Navbar />

            { game }
        </>
    );
}

export default Game;