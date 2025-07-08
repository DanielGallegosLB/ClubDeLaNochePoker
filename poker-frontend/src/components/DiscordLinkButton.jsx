// poker-frontend/src/components/DiscordLinkButton.jsx

import React, { useEffect, useState } from 'react';

const DiscordLinkButton = ({ onLoginSuccess }) => {
    const [linkStatus, setLinkStatus] = useState(null);
    const [discordInfo, setDiscordInfo] = useState(null);

    // Define la URL base del backend usando la variable de entorno
    const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        console.log('DiscordLinkButton useEffect se ha ejecutado.'); // Log al inicio del useEffect
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('discordLink');
        const discordId = urlParams.get('discordId');
        const pesos = urlParams.get('pesos');
        const username = urlParams.get('username');
        const message = urlParams.get('message');


        console.log('Parámetros de URL:', { status, discordId, pesos, username, message }); // Log de los parámetros

        if (status) {
            setLinkStatus(status);
            if (status === 'success') {
                const info = { discordId, pesos, username };
                setDiscordInfo(info);
                console.log('Login exitoso detectado. Llamando a onLoginSuccess con:', info); // Log antes de llamar a onLoginSuccess
                if (onLoginSuccess) {
                    onLoginSuccess(info);
                }
            } else {
                setDiscordInfo({ message: message || 'Ocurrió un error al iniciar sesión con Discord.' });
                console.log('Login fallido/error detectado.'); // Log para fallos
            }
            // Limpia los parámetros de la URL para que no se muestren en futuras cargas
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('Parámetros de URL limpiados.'); // Log de limpieza
        } else {
            console.log('No se encontraron parámetros discordLink en la URL.'); // Log si no hay parámetros
        }
    }, [onLoginSuccess]); // Añade onLoginSuccess a las dependencias

    const handleDiscordLink = () => {
        console.log('Botón "Continuar con Discord" clickeado. Redirigiendo al backend.'); // Log al hacer clic
        window.location.href = `${BACKEND_BASE_URL}/api/auth/discord`;
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>Inicia Sesión con Discord 🎮</h2>
            <button
                onClick={handleDiscordLink}
                style={{
                    padding: '12px 25px',
                    backgroundColor: '#7289da',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    width: '100%',
                    transition: 'background-color 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#677bc4'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7289da'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-discord"><path d="M10.89 17.58a3.14 3.14 0 0 1-4.78 0 3.14 3.14 0 0 0-1.74 2.76 3.14 3.14 0 0 0 3.14 3.14c.24 0 .47-.02.7-.06a3.14 3.14 0 0 0 2.68 0c.23.04.46.06.7.06a3.14 3.14 0 0 0 3.14-3.14 3.14 3.14 0 0 0-1.74-2.76 3.14 3.14 0 0 1-4.78 0Z"/><path d="M10.89 17.58a3.14 3.14 0 0 1-4.78 0 3.14 3.14 0 0 0-1.74 2.76 3.14 3.14 0 0 0 3.14 3.14c.24 0 .47-.02.7-.06a3.14 3.14 0 0 0 2.68 0c.23.04.46.06.7.06a3.14 3.14 0 0 0 3.14-3.14 3.14 3.14 0 0 0-1.74-2.76 3.14 3.14 0 0 1-4.78 0Z" transform="rotate(180 12 17.58)"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><path d="M16 16s-1.5-2-4-2-4 2-4 2" transform="rotate(180 12 16)"/><path d="M12 12V6"/><path d="M12 12V6" transform="rotate(180 12 9)"/><path d="M12 2a10 10 0 0 0-9.7 12.45 10 10 0 0 0 1.25 4.55 10 10 0 0 0 14.9 0 10 10 0 0 0 1.25-4.55A10 10 0 0 0 12 2Z"/></svg>
                Continuar con Discord
            </button>

            {linkStatus === 'failed' && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffe6e6', border: '1px solid #e6a3a3', borderRadius: '4px', textAlign: 'left' }}>
                    <p style={{ color: '#8b0000', fontWeight: 'bold' }}>❌ Fallo al iniciar sesión con Discord.</p>
                    <p>{discordInfo?.message || 'Hubo un problema durante la autenticación con Discord.'}</p>
                </div>
            )}
            {linkStatus === 'error' && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffe6e6', border: '1px solid #e6a3a3', borderRadius: '4px', textAlign: 'left' }}>
                    <p style={{ color: '#8b0000', fontWeight: 'bold' }}>❌ Error del servidor.</p>
                    <p>{discordInfo?.message || 'Ocurrió un error inesperado en el servidor al procesar tu solicitud.'}</p>
                </div>
            )}
        </div>
    );
};

export default DiscordLinkButton;
