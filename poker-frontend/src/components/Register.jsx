// poker-frontend/src/components/Register.jsx

import React, { useState } from 'react';

const Register = ({ onRegisterSuccess, setMessage, message, onSwitchToLogin }) => { // Agregamos onSwitchToLogin
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");

        if (password !== confirmPassword) {
            setMessage("Las contraseñas no coinciden. Por favor, verifica.");
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || 'Registro exitoso. ¡Bienvenido!');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                if (onRegisterSuccess) {
                    onRegisterSuccess({
                        username: data.username,
                        pesos: data.pesos,
                        discordId: data.discordId
                    });
                }
            } else {
                setMessage(data.message || 'Error al registrarse. Intenta de nuevo.');
            }

        } catch (error) {
            console.error('Error al registrar:', error);
            setMessage('Error de conexión con el servidor. Por favor, intenta de nuevo más tarde.');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', backgroundColor: '#f9f9f9' }}>
            <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>Registro de Usuario 📝</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="username" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Nombre de Usuario:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ width: 'calc(100% - 20px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: 'calc(100% - 20px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Confirmar Contraseña:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: 'calc(100% - 20px)', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
                    />
                </div>
                <button
                    type="submit"
                    style={{
                        padding: '12px 25px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        width: '100%',
                        transition: 'background-color 0.3s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                >
                    Registrar
                </button>
            </form>
            {/* Muestra mensajes de éxito o error */}
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

            {/* NUEVO: Opción para iniciar sesión si el usuario ya existe */}
            {message.includes('El nombre de usuario ya existe') && onSwitchToLogin && (
                <p style={{
                    marginTop: '15px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#555'
                }}>
                    ¿Ya tienes una cuenta? {' '}
                    <a
                        href="#"
                        onClick={onSwitchToLogin} // Llama a la función pasada por prop
                        style={{
                            color: '#007bff',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Inicia sesión aquí
                    </a>
                </p>
            )}
        </div>
    );
};

export default Register;