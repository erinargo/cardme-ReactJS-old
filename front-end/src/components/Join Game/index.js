import Navbar from "../Navbar";
import { io } from 'socket.io-client';
import {useEffect, useState} from "react";

import './index.scss';

const socket = io();
socket.on('alert', (msg) => {
    alert(msg);
});

socket.on('redirect', (link) => {
    window.location.href = link;
});

const Join = () => {

    const init = (<></>);

    const [pub, setPublic] = useState(init);

    useEffect( () => {

        (async () => {
            const games = await fetch('/api/get-games', { method: 'POST' }).then((res) => res.json());

            let pubGames = (<> { games.gameList.map((g, i) =>
                (
                    <div className={'public-game'} onClick={() => {
                        socket.emit('join-game', {
                            code: g.code,
                            id: localStorage.getItem('id')
                        });
                    }
                    }>
                        <p>Host: { games.hosts[i].username } </p>
                        <p>Players: { g.joined.length } </p>
                    </div>
                )
            ) } </>)

            setPublic(pubGames);
        })();
    })

    return (
        <>
            <Navbar />
            <div className={ 'game-options' }>
                <form id={ 'join-form' } onSubmit={ (e) => {
                    e.preventDefault();
                    socket.emit('join-game', {
                        code: document.getElementById('join-code').value,
                        id: localStorage.getItem('id'),
                        password: document.getElementById('join-password').value
                    });
                }}>
                    <input type={ 'text' } placeholder={ 'Game Code' } id={ 'join-code' } />
                    <input type={ 'text' } placeholder={ 'Game Password' } id={ 'join-password' } />
                    <input type={ 'submit' } value={ 'Join' } />
                </form>

                <div className={'public-options'}>
                    Join Game
                    { pub }
                </div>
            </div>
        </>
    );
}

export default Join;