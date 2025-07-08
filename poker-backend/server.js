// poker-backend/server.js

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = [
//   'http://localhost:5173', // Para desarrollo local del frontend
    'https://clubdelanochepoker-1.onrender.com' // ¡Esta es la URL de tu frontend en Render!
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // ¡CAMBIO IMPORTANTE: Usar 'true' en producción con HTTPS!
        sameSite: 'None', // ¡CAMBIO IMPORTANTE: Usar 'None' para CORS y cookies de terceros!
        maxAge: 1000 * 60 * 60 * 24 // 1 día
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
    discordId: { type: String, unique: true, sparse: true, default: null },
    money: { type: Number, default: 100000 }
});

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
}, { collection: 'profilemodels' }); // Asegúrate de que 'profilemodels' es la colección correcta.
const ProfileModel = mongoose.model('ProfileModel', profileModelSchema);


// Configuración de Passport Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'https://clubdelanochepoker.onrender.com/api/auth/discord/callback',
    scope: ['identify']
},
async (accessToken, refreshToken, profile, done) => {
    console.log('--- DiscordStrategy: Inicio ---');
    console.log(`Discord ID del perfil: ${profile.id}`);
    console.log(`Nombre de usuario de Discord: ${profile.username}`);

    try {
        const discordId = profile.id;
        const discordUsername = profile.username;

        let discordProfile = await ProfileModel.findOne({ userID: discordId });
        let pesosFromDiscord = 0;

        if (discordProfile) {
            // Si el perfil existe, usa sus pesos
            pesosFromDiscord = discordProfile.pesos || 0; // Asegura que sea un número
            console.log(`💰 DiscordStrategy: Perfil existente encontrado. Pesos: ${pesosFromDiscord}`);
        } else {
            // Si el perfil NO existe, creamos uno nuevo
            console.log(`❌ DiscordStrategy: Perfil no encontrado para Discord ID ${discordId}. Creando nuevo perfil.`);
            discordProfile = new ProfileModel({
                userID: discordId,
                serverID: null, // Puedes establecer un valor por defecto o dejarlo null
                pesos: 100000 // Valor inicial para nuevos usuarios de Discord
            });
            await discordProfile.save();
            pesosFromDiscord = discordProfile.pesos;
            console.log(`✅ DiscordStrategy: Nuevo perfil creado con ID ${discordId} y ${pesosFromDiscord} pesos.`);
        }

        // Devolvemos el objeto que Passport serializará
        console.log(`--- DiscordStrategy: Datos a serializar: discordId=${discordId}, username=${discordUsername}, pesos=${pesosFromDiscord} ---`);
        return done(null, {
            discordId: discordId,
            username: discordUsername,
            pesos: pesosFromDiscord,
            type: 'discord'
        });

    } catch (err) {
        console.error('🔴 DiscordStrategy: Error inesperado:', err);
        return done(err, null);
    }
}));

// NUEVO: Configuración de Passport Local Strategy para usuarios manuales
passport.use(new LocalStrategy(
    async (username, password, done) => {
        console.log(`--- LocalStrategy: Intentando autenticar usuario: ${username} ---`);
        try {
            const user = await User.findOne({ username: username });
            if (!user) {
                console.log(`❌ LocalStrategy: Usuario ${username} no encontrado.`);
                return done(null, false, { message: 'Nombre de usuario incorrecto.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log(`❌ LocalStrategy: Contraseña incorrecta para el usuario ${username}.`);
                return done(null, false, { message: 'Contraseña incorrecta.' });
            }
            console(`✅ LocalStrategy: Autenticación exitosa para el usuario: ${username}`);
            return done(null, user);
        } catch (err) {
            console.error('🔴 LocalStrategy: Error inesperado:', err);
            return done(err);
        }
    }
));

// MODIFICADO: Serialización de usuarios para Passport (maneja ambos tipos)
passport.serializeUser((user, done) => {
    console.log('--- serializeUser: Inicio ---');
    console.log('serializeUser: Objeto de usuario recibido:', user);
    if (user.discordId) {
        const serializedData = { id: user.discordId, type: 'discord', username: user.username };
        console.log('serializeUser: Serializando usuario de Discord:', serializedData);
        done(null, serializedData);
    } else if (user._id) {
        const serializedData = { id: user._id, type: 'local' };
        console.log('serializeUser: Serializando usuario local:', serializedData);
        done(null, serializedData);
    } else {
        console.error('🔴 serializeUser: Tipo de usuario no reconocido para serialización:', user);
        done(new Error('Tipo de usuario no reconocido para serialización'), null);
    }
});

// MODIFICADO: Deserialización de usuarios para Passport (maneja ambos tipos)
passport.deserializeUser(async (serializedUser, done) => {
    console.log('--- deserializeUser: Inicio ---');
    console.log('deserializeUser: Objeto serializado recibido:', serializedUser);
    try {
        if (serializedUser.type === 'discord') {
            const discordProfile = await ProfileModel.findOne({ userID: serializedUser.id });
            let currentPesos = 0;
            if (discordProfile) {
                currentPesos = discordProfile.pesos || 0; // Asegura que pesos sea un número
                console.log(`✅ deserializeUser: Perfil de Discord encontrado. Pesos: ${currentPesos}`);
            } else {
                console.log(`❌ deserializeUser: Perfil de Discord ${serializedUser.id} NO encontrado en profilemodels. Usando pesos por defecto.`);
                // Opcional: Aquí podrías decidir qué hacer si el perfil no se encuentra durante la deserialización.
                // Si la estrategia de Discord ya lo crea, esto solo debería pasar si el documento fue eliminado.
            }
            const deserializedUser = {
                discordId: serializedUser.id,
                username: serializedUser.username,
                pesos: currentPesos
            };
            console.log('deserializeUser: Deserializando usuario de Discord:', deserializedUser);
            done(null, deserializedUser);
        } else if (serializedUser.type === 'local') {
            const localUser = await User.findById(serializedUser.id);
            if (!localUser) {
                console.log(`❌ deserializeUser: Usuario local ${serializedUser.id} no encontrado.`);
                return done(null, false);
            }
            const deserializedUser = {
                username: localUser.username,
                pesos: localUser.money,
                discordId: null
            };
            console.log('deserializeUser: Deserializando usuario local:', deserializedUser);
            done(null, deserializedUser);
        } else {
            console.error('🔴 deserializeUser: Tipo de usuario desconocido para deserialización:', serializedUser);
            done(new Error('Tipo de usuario desconocido para deserialización'), null);
        }
    } catch (err) {
        console.error('🔴 deserializeUser: Error inesperado:', err);
        done(err, null);
    }
});


// RUTAS DE LA API

// Ruta para iniciar el proceso de autenticación de Discord
app.get('/api/auth/discord', passport.authenticate('discord'));

// Ruta de callback de Discord después de la autorización del usuario
app.get('/api/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: 'https://clubdelanochepoker-1.onrender.com/?discordLink=failed' }),
    async (req, res) => {
        // req.user ya debería estar poblado por Passport
        const { discordId, username, pesos } = req.user;
        console.log(`--- /api/auth/discord/callback: Usuario autenticado ---`);
        console.log(`Datos finales para redirección: discordId=${discordId}, username=${username}, pesos=${pesos}`);

        res.redirect(`https://clubdelanochepoker-1.onrender.com/?discordLink=success&discordId=${discordId}&pesos=${pesos}&username=${username}`);
    }
);

// NUEVO: Ruta para el registro manual de usuarios
app.post('/api/register', async (req, res) => {
    console.log('--- /api/register: Solicitud de registro manual ---');
    try {
        const { username, password } = req.body;
        console.log(`Datos de registro: username=${username}, password length=${password ? password.length : 0}`);

        if (!username || !password) {
            console.log('❌ /api/register: Falta nombre de usuario o contraseña.');
            return res.status(400).json({ message: 'Nombre de usuario y contraseña son requeridos.' });
        }

        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            console.log(`❌ /api/register: El nombre de usuario '${username}' ya existe.`);
            return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        }

        const newUser = new User({ username, password, money: 100000 });
        await newUser.save();
        console.log(`✅ /api/register: Nuevo usuario manual registrado: ${newUser.username}`);

        req.login(newUser, (err) => {
            if (err) {
                console.error('🔴 /api/register: Error al iniciar sesión después del registro:', err);
                return res.status(500).json({ message: 'Registro exitoso, pero no se pudo iniciar sesión automáticamente.' });
            }
            console.log(`✅ /api/register: Sesión iniciada automáticamente para ${newUser.username}.`);
            res.status(201).json({
                message: 'Registro exitoso. ¡Sesión iniciada!',
                username: newUser.username,
                pesos: newUser.money,
                discordId: null
            });
        });

    } catch (error) {
        console.error('🔴 /api/register: Error interno del servidor al registrar:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
});

// NUEVO: Ruta para el login manual de usuarios
app.post('/api/login', (req, res, next) => {
    console.log('--- /api/login: Solicitud de login manual ---');
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('🔴 /api/login: Error en autenticación local:', err);
            return res.status(500).json({ message: 'Error interno del servidor.' });
        }
        if (!user) {
            console.log(`❌ /api/login: Autenticación fallida: ${info.message}`);
            return res.status(401).json({ message: info.message || 'Credenciales inválidas.' });
        }
        req.login(user, (err) => {
            if (err) {
                console.error('🔴 /api/login: Error al iniciar sesión con usuario local:', err);
                return res.status(500).json({ message: 'Error al iniciar sesión.' });
            }
            console.log(`✅ /api/login: Inicio de sesión exitoso para ${user.username}.`);
            res.status(200).json({
                message: 'Inicio de sesión exitoso.',
                username: user.username,
                pesos: user.money,
                discordId: null
            });
        });
    })(req, res, next);
});


// NUEVA RUTA: Para cerrar la sesión del usuario
app.get('/api/logout', (req, res, next) => {
    console.log('--- /api/logout: Solicitud de cierre de sesión ---');
    req.logout((err) => {
        if (err) {
            console.error('🔴 /api/logout: Error al cerrar sesión:', err);
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('🔴 /api/logout: Error al destruir la sesión:', err);
                return next(err);
            }
            res.clearCookie('connect.sid');
            console.log('✅ /api/logout: Sesión cerrada y cookie eliminada.');
            res.json({ message: 'Sesión cerrada exitosamente.' });
        });
    });
});


// Ruta para que el frontend verifique si hay una sesión activa
app.get('/api/check-auth', (req, res) => {
    console.log('--- /api/check-auth: Verificando sesión ---');
    if (req.isAuthenticated()) {
        console.log(`✅ /api/check-auth: Usuario autenticado. ID: ${req.user.discordId || req.user.username}, Username: ${req.user.username}, Pesos: ${req.user.pesos}`);
        res.json({
            isAuthenticated: true,
            username: req.user.username,
            discordId: req.user.discordId,
            pesos: req.user.pesos
        });
    } else {
        console.log('❌ /api/check-auth: No hay sesión activa.');
        res.json({ isAuthenticated: false });
    }
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Node.js (API) escuchando en http://localhost:${PORT}`);
});