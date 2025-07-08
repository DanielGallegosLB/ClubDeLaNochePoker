// poker-frontend/src/components/Login.jsx

import React, { useState } from 'react';

const Login = ({ onLoginSuccess, setMessage, message, onSwitchToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); // Limpiar mensajes previos

        try {
            const response = await fetch('http://localhost:5000/api/login', { // Ruta de login en el backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'Inicio de sesión exitoso.');
                setUsername('');
                setPassword('');
                if (onLoginSuccess) {
                    onLoginSuccess({
                        username: data.username,
                        pesos: data.pesos,
                        discordId: data.discordId // Será null para usuarios manuales
                    });
                }
            } else {
                setMessage(data.message || 'Credenciales inválidas. Intenta de nuevo.');
            }

        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            setMessage('Error de conexión con el servidor. Por favor, intenta de nuevo más tarde.');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', backgroundColor: '#f9f9f9' }}>
            <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>Iniciar Sesión 🔑</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="loginUsername" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Nombre de Usuario:</label>
                    <input
                        type="text"
                        id="loginUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: 'calc(100% - 20px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="loginPassword" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Contraseña:</label>
                    <input
                        type="password"
                        id="loginPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: 'calc(100% - 20px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    />
                </div>
                <button
                    type="submit"
                    style={{
                        padding: '12px 25px',
                        backgroundColor: '#007bff', // Un azul para login
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        width: '100%',
                        transition: 'background-color 0.3s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                >
                    Iniciar Sesión
                </button>
            </form>
            {message && (
                <p style={{
                    marginTop: '20px',
                    padding: '10px',
                    backgroundColor: message.includes('exitoso') ? '#d4edda' : '#f8d7da',
                    color: message.includes('exitoso') ? '#155724' : '#721c24',
                    border: `1px solid ${message.includes('exitoso') ? '#c3e6cb' : '#f5c6cb'}`,
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '14px'
                }}>
                    {message}
                </p>
            )}

            {/* Opción para registrarse si no tiene cuenta */}
            {onSwitchToRegister && (
                <p style={{
                    marginTop: '15px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#555'
                }}>
                    ¿No tienes una cuenta? {' '}
                    <a
                        href="#"
                        onClick={onSwitchToRegister}
                        style={{
                            color: '#28a745', // Verde para el enlace de registro
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Regístrate aquí
                    </a>
                </p>
            )}
        </div>
    );
};

export default Login;