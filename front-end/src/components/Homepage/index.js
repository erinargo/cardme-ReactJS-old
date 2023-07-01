import './index.scss';
import Navbar from '../Navbar';
import { io } from 'socket.io-client';
import { useState, useEffect } from "react";
import {NavLink} from "react-router-dom";

const socket = io();
socket.on('alert', (msg) => {
    alert(msg);
});

socket.on('redirect', (link) => {
    window.location.href = link;
});

const Homepage = () => {
    const init = (
        <div className={ 'loading' }>Loading . . . </div>
    )

    const page = (
        <div className={ 'home' }>
            <div className={ 'game-options' }>
                <NavLink to={ '/create-game' }>+ Create Game</NavLink>

                <NavLink to={ '/join' }>+ Join Game</NavLink>
            </div>
        </div>
    )

    const [main, setMain] = useState(init);

    useEffect(() => {
        window.addEventListener('storage', () => {
            setMain(page);
        });
    })

    return (
        <>
            <Navbar />

            { main }
        </>
    );
}

export default Homepage;