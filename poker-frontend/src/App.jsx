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
    const [loading, setLoading] = useState(true);
    const [authMessage, setAuthMessage] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(true);

    // Define la URL base del backend usando la variable de entorno
    const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        const checkAuth = async () => {
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
                setLoading(false);
            }
        };

        checkAuth();

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
            setLoading(false);
        } else if (status === 'failed' || status === 'error') {
            console.error('Discord login failed or had an error.');
            window.history.replaceState({}, document.title, window.location.pathname);
            setLoading(false);
        }

    }, []);

    const handleLoginSuccess = (info) => {
        setUserInfo(info);
        setIsLoggedIn(true);
        console.log('App.jsx - Login exitoso:', info);
        setAuthMessage('');
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

    if (loading) {
        return (
            <div className="loading-screen">
                Cargando sesión...
            </div>
        );
    }

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

                    {/* NUEVO: Botones para alternar entre registro e inicio de sesión */}
                    <div style={{
                        display: 'flex', // Convierte este div en un contenedor flex
                        justifyContent: 'center', // Centra sus elementos hijos (los botones) horizontalmente
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
                                backgroundColor: showRegisterForm ? '#2d3748' : '#4a5568', // Fondo activo/inactivo
                                color: showRegisterForm ? '#fff' : '#cbd5e0', // Texto activo/inactivo
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
                    {/* FIN NUEVOS BOTONES */}

                    {showRegisterForm ? (
                        <Register
                            onRegisterSuccess={handleLoginSuccess}
                            setMessage={setAuthMessage}
                            message={authMessage}
                            onSwitchToLogin={() => handleSwitchForm('login')} // Mantener para el mensaje de "usuario ya existe"
                        />
                    ) : (
                        <Login
                            onLoginSuccess={handleLoginSuccess}
                            setMessage={setAuthMessage}
                            message={authMessage}
                            onSwitchToRegister={() => handleSwitchForm('register')} // Mantener para el enlace "no tienes cuenta"
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