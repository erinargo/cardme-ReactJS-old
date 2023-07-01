//import logo from './favicon.ico';

import Homepage from './components/Homepage';
import Create from './components/Create Game';
import Game from './components/Game';
import Join from './components/Join Game';

import React, { useEffect } from "react";
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet'
import './App.scss';
import { io } from "socket.io-client";

const socket = io();
socket.on('alert', (msg) => {
    alert(msg);
});

function App() {
    useEffect(() => {
        document.title = 'Card Me Daddy'
}   );
    return (
        <>
          <Helmet>
              <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css" />
              <script async
                      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8154425255494501"
                      crossOrigin="anonymous"></script>

              <link rel={'icon'} href={ './assets/favicon.ico' } />
          </Helmet>
          <Routes>
              <Route path={ '/' } element={ <Homepage /> } />
              <Route path={ '/create-game' } element={ <Create /> } />
              <Route path={ '/game/:id' } element={ <Game /> } />
              <Route path={ '/join' } element={ <Join /> } />
          </Routes>
        </>
  );
}

export default App;
