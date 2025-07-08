// poker-backend/server.js

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy; // NUEVO: Importar LocalStrategy
const bcrypt = require('bcrypt'); // NUEVO: Importar bcrypt
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = [
    'http://localhost:5173', // Para desarrollo local del frontend
    'https://clubdelanochepoker-1.onrender.com' // ¡Esta es la URL de tu frontend en Render!
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite peticiones sin origen (como las de Postman/cURL, o del mismo servidor)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json()); // Para parsear JSON en el cuerpo de las peticiones

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // ¡IMPORTANTE para desarrollo con HTTP!
        maxAge: 1000 * 60 * 60 * 24, // 1 día
        sameSite: 'Lax'
    }
}));

// Inicializar Passport y usar sesiones
app.use(passport.initialize());
app.use(passport.session());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 MongoDB conectado con éxito!'))
    .catch(err => console.error('🔴 Error de conexión a MongoDB:', err));

// Esquema y Modelo de Usuario para registro manual
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    // discordId es opcional aquí, ya que este modelo es para usuarios manuales principalmente
    discordId: { type: String, unique: true, sparse: true, default: null }, // Asegurarse de que sea null por defecto
    money: { type: Number, default: 100000 } // MODIFICADO: Saldo inicial de 100,000
});

// NUEVO: Hook pre-save para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Esquema y Modelo para profilemodels (usado para usuarios de Discord)
const profileModelSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    serverID: { type: String },
    pesos: { type: Number, default: 0 }
}, { collection: 'profilemodels' });
const ProfileModel = mongoose.model('ProfileModel', profileModelSchema);


// Configuración de Passport Discord Strategy (EXISTENTE)
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'https://clubdelanochepoker.onrender.com/api/auth/discord/callback',
    scope: ['identify']
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const discordId = profile.id;
        const discordUsername = profile.username;

        const discordProfile = await ProfileModel.findOne({ userID: discordId });
        let pesosFromDiscord = 0;
        if (discordProfile) {
            pesosFromDiscord = discordProfile.pesos;
            console.log(`💰 Pesos encontrados para Discord ID ${discordId}: ${pesosFromDiscord}`);
        } else {
            console.log(`❌ No se encontró un perfil en 'profilemodels' para el Discord ID: ${discordId}. Pesos por defecto: 0`);
        }
        // Devuelve un objeto que Passport serializará
        return done(null, { discordId, discordUsername, pesosFromDiscord, type: 'discord' });

    } catch (err) {
        console.error('🔴 Error en DiscordStrategy:', err);
        return done(err, null);
    }
}));

// NUEVO: Configuración de Passport Local Strategy para usuarios manuales
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                return done(null, false, { message: 'Nombre de usuario incorrecto.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Contraseña incorrecta.' });
            }
            // Devuelve el usuario encontrado. Passport lo serializará.
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// MODIFICADO: Serialización de usuarios para Passport (maneja ambos tipos)
passport.serializeUser((user, done) => {
    // Si el usuario viene de DiscordStrategy (tiene discordId)
    if (user.discordId) {
        done(null, { id: user.discordId, type: 'discord', username: user.discordUsername });
    }
    // Si el usuario viene de LocalStrategy (tiene _id de MongoDB)
    else if (user._id) {
        done(null, { id: user._id, type: 'local' });
    }
    else {
        done(new Error('Tipo de usuario no reconocido para serialización'), null);
    }
});

// MODIFICADO: Deserialización de usuarios para Passport (maneja ambos tipos)
passport.deserializeUser(async (serializedUser, done) => {
    try {
        if (serializedUser.type === 'discord') {
            const discordProfile = await ProfileModel.findOne({ userID: serializedUser.id });
            if (!discordProfile) {
                return done(null, false); // Perfil de Discord no encontrado
            }
            done(null, {
                discordId: serializedUser.id,
                username: serializedUser.username, // Usar el username guardado en la serialización
                pesos: discordProfile.pesos
            });
        } else if (serializedUser.type === 'local') {
            const localUser = await User.findById(serializedUser.id);
            if (!localUser) {
                return done(null, false); // Usuario local no encontrado
            }
            done(null, {
                username: localUser.username,
                pesos: localUser.money, // Usar el campo 'money' para pesos en usuarios locales
                discordId: null // Los usuarios locales no tienen discordId
            });
        } else {
            done(new Error('Tipo de usuario desconocido para deserialización'), null);
        }
    } catch (err) {
        console.error('🔴 Error en deserializeUser:', err);
        done(err, null);
    }
});


// RUTAS DE LA API

// Ruta para iniciar el proceso de autenticación de Discord (EXISTENTE)
app.get('/api/auth/discord', passport.authenticate('discord'));

// Ruta de callback de Discord después de la autorización del usuario (EXISTENTE)
app.get('/api/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: 'http://localhost:5173/?discordLink=failed' }),
    async (req, res) => {
        const { discordId, username, pesos } = req.user;

        console.log(`✅ Redirigiendo al frontend con datos: discordId=${discordId}, username=${username}, pesos=${pesos}`);

        res.redirect(`http://localhost:5173/?discordLink=success&discordId=${discordId}&pesos=${pesos}&username=${username}`);
    }
);

// NUEVO: Ruta para el registro manual de usuarios
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Nombre de usuario y contraseña son requeridos.' });
        }

        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        }

        const newUser = new User({ username, password, money: 100000 }); // Saldo inicial de 100,000
        await newUser.save();

        // Iniciar sesión automáticamente al usuario después de un registro exitoso
        req.login(newUser, (err) => {
            if (err) {
                console.error('Error al iniciar sesión después del registro:', err);
                return res.status(500).json({ message: 'Registro exitoso, pero no se pudo iniciar sesión automáticamente.' });
            }
            res.status(201).json({
                message: 'Registro exitoso. ¡Sesión iniciada!',
                username: newUser.username,
                pesos: newUser.money,
                discordId: null // Es un usuario manual
            });
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
});

// NUEVO: Ruta para el login manual de usuarios
app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Error en autenticación local:', err);
            return res.status(500).json({ message: 'Error interno del servidor.' });
        }
        if (!user) {
            // `info.message` contendrá el mensaje de error de LocalStrategy (ej. 'Incorrect username.')
            return res.status(401).json({ message: info.message || 'Credenciales inválidas.' });
        }
        // Si la autenticación es exitosa, establece la sesión
        req.login(user, (err) => {
            if (err) {
                console.error('Error al iniciar sesión con usuario local:', err);
                return res.status(500).json({ message: 'Error al iniciar sesión.' });
            }
            res.status(200).json({
                message: 'Inicio de sesión exitoso.',
                username: user.username,
                pesos: user.money, // Devuelve el saldo del usuario
                discordId: null // Es un usuario manual
            });
        });
    })(req, res, next); // Asegura que el middleware de Passport se ejecute
});


// NUEVA RUTA: Para cerrar la sesión del usuario (EXISTENTE, sin cambios)
app.get('/api/logout', (req, res, next) => {
    req.logout((err) => { // req.logout() es un método de Passport para cerrar la sesión
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return next(err);
        }
        req.session.destroy((err) => { // Destruir la sesión en el servidor
            if (err) {
                console.error('Error al destruir la sesión:', err);
                return next(err);
            }
            res.clearCookie('connect.sid'); // Limpiar la cookie de sesión del navegador
            console.log('✅ Sesión cerrada y cookie eliminada.');
            res.json({ message: 'Sesión cerrada exitosamente.' });
        });
    });
});


// Ruta para que el frontend verifique si hay una sesión activa (EXISTENTE, sin cambios)
app.get('/api/check-auth', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            isAuthenticated: true,
            username: req.user.username,
            discordId: req.user.discordId, // Será null para usuarios manuales
            pesos: req.user.pesos
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});


// Iniciar el servidor (EXISTENTE)
app.listen(PORT, () => {
    console.log(`🚀 Servidor Node.js (API) escuchando en http://localhost:${PORT}`);
});