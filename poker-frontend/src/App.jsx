// poker-frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import DiscordLinkButton from './components/DiscordLinkButton';
import HomePage from './components/HomePage';
import Register from './components/Register';
import Login from './components/Login';
import './App.css';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    // Cambiamos 'loading' para que indique si la verificación inicial de auth ha terminado
    // No bloquearemos la UI inicial con él.
    const [authCheckCompleted, setAuthCheckCompleted] = useState(false);
    const [authMessage, setAuthMessage] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(true);
    // Nuevo estado para mostrar un indicador de carga de sesión si es necesario
    const [isCheckingSession, setIsCheckingSession] = useState(true);


    // Define la URL base del backend usando la variable de entorno
    const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const checkAuth = async () => {
            setIsCheckingSession(true); // Indicar que la verificación de sesión está en curso
            try {
                const response = await fetch(`${BACKEND_BASE_URL}/api/check-auth`, {
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.isAuthenticated) {
                    setUserInfo({
                        discordId: data.discordId,
                        username: data.username,
                        pesos: data.pesos
                    });
                    setIsLoggedIn(true);
                    console.log('App.jsx - Sesión existente detectada:', data);
                } else {
                    console.log('App.jsx - No hay sesión activa.');
                }
            } catch (error) {
                console.error('App.jsx - Error al verificar la autenticación:', error);
            } finally {
                setIsCheckingSession(false); // La verificación de sesión ha terminado
                setAuthCheckCompleted(true); // Marcar que la verificación inicial ha concluido
            }
        };

        checkAuth();

        // Manejo de redirección de Discord (esto puede ocurrir en cualquier momento, no solo al cargar)
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('discordLink');
        if (status === 'success') {
            const discordId = urlParams.get('discordId');
            const pesos = urlParams.get('pesos');
            const username = urlParams.get('username');
            const info = { discordId, pesos, username };
            setUserInfo(info);
            setIsLoggedIn(true);
            window.history.replaceState({}, document.title, window.location.pathname);
            // Si el login de Discord fue exitoso, no necesitamos mostrar el indicador de carga de sesión
            setIsCheckingSession(false);
            setAuthCheckCompleted(true);
        } else if (status === 'failed' || status === 'error') {
            console.error('Discord login failed or had an error.');
            window.history.replaceState({}, document.title, window.location.pathname);
            setIsCheckingSession(false);
            setAuthCheckCompleted(true);
        }

    }, []); // El array de dependencias vacío asegura que se ejecute solo una vez al montar

    const handleLoginSuccess = (info) => {
        setUserInfo(info);
        setIsLoggedIn(true);
        console.log('App.jsx - Login exitoso:', info);
        setAuthMessage('');
        // Una vez logueado, la verificación de sesión ya no es relevante
        setIsCheckingSession(false);
        setAuthCheckCompleted(true);
    };

    const handleLogout = async () => {
        try {
            const response = await fetch(`${BACKEND_BASE_URL}/api/logout`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok) {
                console.log('App.jsx - Sesión cerrada exitosamente:', data.message);
                setIsLoggedIn(false);
                setUserInfo(null);
                setAuthMessage('');
                setShowRegisterForm(true);
            } else {
                console.error('App.jsx - Error al cerrar sesión:', data.message);
            }
        } catch (error) {
            console.error('App.jsx - Error de red al cerrar sesión:', error);
        }
    };

    const handleSwitchForm = (formType) => {
        setAuthMessage('');
        setShowRegisterForm(formType === 'register');
    };

    // No bloqueamos la renderización inicial con 'loading'
    // En su lugar, mostramos la UI de login/registro
    return (
        <div className="App">
            {!isLoggedIn ? (
                <div className="auth-page-container"
                    style={{
                        width: '100%',
                        maxWidth: '450px',
                        margin: '0 auto',
                        padding: '20px',
                        boxSizing: 'border-box',
                        // Otros estilos que ya tengas en este div, como background, border, etc.
                    }}>
                    <h1 className="auth-title">Club de la Noche Poker 🃏</h1>
                    <h2 className="auth-subtitle">
                        {showRegisterForm ? 'Regístrate para Jugar' : 'Inicia Sesión para Jugar'}
                    </h2>

                    {/* Indicador de carga de sesión */}
                    {isCheckingSession && (
                        <p style={{ color: '#63b3ed', marginBottom: '15px', fontSize: '0.9em' }}>
                            Cargando sesión existente...
                        </p>
                    )}

                    {/* Botones para alternar entre registro e inicio de sesión */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        width: '100%',
                        maxWidth: '400px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}>
                        <button
                            onClick={() => handleSwitchForm('register')}
                            style={{
                                flex: 1,
                                padding: '15px 10px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: showRegisterForm ? '#2d3748' : '#4a5568',
                                color: showRegisterForm ? '#fff' : '#cbd5e0',
                                transition: 'background-color 0.3s ease, color 0.3s ease',
                                borderRight: showRegisterForm ? 'none' : '1px solid #2d3748'
                            }}
                        >
                            Registrarse
                        </button>
                        <button
                            onClick={() => handleSwitchForm('login')}
                            style={{
                                flex: 1,
                                padding: '15px 10px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: !showRegisterForm ? '#2d3748' : '#4a5568',
                                color: !showRegisterForm ? '#fff' : '#cbd5e0',
                                transition: 'background-color 0.3s ease, color 0.3s ease',
                                borderLeft: !showRegisterForm ? 'none' : '1px solid #2d3748'
                            }}
                        >
                            Iniciar Sesión
                        </button>
                    </div>

                    {showRegisterForm ? (
                        <Register
                            onRegisterSuccess={handleLoginSuccess}
                            setMessage={setAuthMessage}
                            message={authMessage}
                            onSwitchToLogin={() => handleSwitchForm('login')}
                        />
                    ) : (
                        <Login
                            onLoginSuccess={handleLoginSuccess}
                            setMessage={setAuthMessage}
                            message={authMessage}
                            onSwitchToRegister={() => handleSwitchForm('register')}
                        />
                    )}

                    <div className="auth-divider">
                        <span>o inicia sesión con</span>
                    </div>

                    <DiscordLinkButton onLoginSuccess={handleLoginSuccess} />
                </div>
            ) : (
                <HomePage discordInfo={userInfo} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;
