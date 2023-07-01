import './index.scss';
import Navbar from '../Navbar';
import { io } from 'socket.io-client';
import { useState, useEffect } from "react";
import {NavLink} from "react-router-dom";

var calls = 0, responses = 0;

const socket = io();
socket.on('alert', (msg) => {
    alert(msg);
});

socket.on('cards', (data) => {
    calls = data.calls;
    responses = data.responses;
});

socket.on('redirect', (link) => {
    window.location.href = link;
});

const Create = () => {
    document.addEventListener('keyup', (e) => {
        e.preventDefault();
        if (e.key === 'ENTER') crHandler(e);
    });

    const init = (
        <div>
            Loading . . .
        </div>
    );

    const modalInit = (
        <></>
    );

    const crInit = (
        <>
            <title>Card Me Daddy | Create a Game</title>
            <form className={'settings'} onSubmit={(e) => e.preventDefault()}>
                <label name={ 'blank' }><input type={ 'checkbox' }/>Add Blank Cards?</label>
                <label name={ 'rounds' }>Enter number of rounds: <input type={'number'} placeholder={'10'} /></label>
                <label name={ 'max-players' }>Enter Max number of Players: <input type={'number'} placeholder={'5'} /></label>
            </form>
            <a className={ 'cr-add' }>
                <input type={ 'text' } placeholder={'Custom CR Cast decks can be added with the deck code'} id={ 'cr-cast-input' } />
                <input type={'submit'} onClick={ (e) => crHandler(e) } value={ 'Add CR Cast Deck' } id={ 'cr-cast-submit' } />
            </a>
            <h3>Added CR Packs</h3>
        </>
    );

    const [packs, setPacks] = useState(init);
    let [crPacks, setCR] = useState(crInit);

    let [modal, setModal] = useState(modalInit);

    async function crHandler(e) {
        e.preventDefault();
        var id = document.getElementById('cr-cast-input').value;
        if(!id) return alert('Please enter a CR Cast ID');

        const pack = await fetch('/api/cr-cast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deck: id
            })
        }).then((res) => res.json());

        if(pack.status) return alert(pack.msg);

        if(pack.error > 1) return alert('Invalid pack, please check that you entered the right code.');

        const packID = ( <label className={ 'pack-container' }>
            <input type={ 'checkbox' } className={'cr'} value={ id } onLoad={(e) => e.target.checked = true} /> { pack.name }: { pack.description } </label>);
        const add = (
            <>
                { crPacks }
                { packID }
            </>
        );

        crPacks = add;

        setCR(add);
    }

    useEffect(() => {
        (async () => {
            const getPacks = await fetch('https://www.restagainsthumanity.com/api/v2/packs', {
                method: 'GET'
            }).then((res) => res.json());

            setPacks(
                (
                    <div className={ 'column-wrapper' }>
                        <p id={ 'pre-title' }>Premade Packs</p>
                        <div id={ 'base-packs' }>
                            { getPacks.map((p) => (
                                    <label className={ 'pack-container' }>
                                        <input type={ 'checkbox' } className={'cah'} value={ p.split(" ").join("%20").trim() } />
                                        { p }
                                    </label>
                                )
                            )}
                        </div>
                    </div>
                )
            );
        })();
    });

    return (
        <>
            <Navbar />

            <div className={ 'main' }>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />

                <form id={ 'game-create' }>
                    <div className={ 'row-wrapper' }>
                        { packs }
                        <div className={ 'column-wrapper' } id={ 'cr-cast-div' }>
                            <h1> CR Cast <i className={ 'fa fa-question-circle' }>
                                <p className={ 'hide-tip' }>CR Cast is a custom deck builder for cards against humanity. To import your deck, please copy the deck code (the url will not work) and
                                paste into the field. <NavLink to={'https://cast.clrtd.com/'}>Visit CR Cast to make your deck today!</NavLink></p>
                            </i></h1>
                            { crPacks }
                        </div>
                    </div>

                    <div id={ 'create-game-top' }>
                        <input type={'text'} placeholder={ 'Password, if left blank game will be public' } id={ 'pass' } />
                        <input type={ 'submit' } value={ 'Start Game!' } onClick={ async (e) => {
                            e.preventDefault();

                            let accept = window.confirm('Are you sure you want to continue with these settings? You can\'t go back and change them.');

                            if(!accept) return;

                            const cah = [], cr =[], settings = [], password = document.getElementById('pass').value
                                ? document.getElementById('pass').value : false;
                            let set = document.querySelectorAll('.settings label input');

                            settings.push(set[0].checked);
                            settings.push(set[1].value);
                            settings.push(set[2].value);

                            document.querySelectorAll('.cah').forEach((d) => {
                                if(d.checked == true) cah.push(d.value);
                            });

                            document.querySelectorAll('.cr').forEach((d) => {
                                if(d.checked == true) cr.push(d.value);
                            });

                            socket.emit('start-game',
                                {
                                    id: localStorage.getItem('id'),
                                    cah,
                                    cr,
                                    settings,
                                    password
                                })
                        }
                        } />
                    </div>
                </form>
            </div>
        </>
    );
}

export default Create;