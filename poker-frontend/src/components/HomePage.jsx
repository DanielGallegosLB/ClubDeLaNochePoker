// poker-frontend/src/components/HomePage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react'; // ¡Importa useRef!

// Componente para representar las fichas del pozo (estático)
const PotDisplayChips = ({ amount }) => {
    const chipCount = Math.ceil(amount / 50); // Número de fichas visuales basado en la cantidad
    const chips = Array.from({ length: Math.min(chipCount, 5) }).map((_, i) => ( // Máximo 5 fichas para una visualización clara
        <div
            key={i}
            className="pot-display-chip"
            style={{
                bottom: `${i * 5}px`, // Apilarlas verticalmente
                left: `${i * 2}px`, // Ligero desplazamiento para efecto de pila
                backgroundColor: i % 3 === 0 ? '#ffbf00' : (i % 3 === 1 ? '#007bff' : '#dc3545'), // Colores diferentes para las fichas
            }}
        ></div>
    ));

    return (
        <div className="pot-display-chips-container">
            {chips}
        </div>
    );
};

// Nuevo componente para la animación de transferencia de fichas individuales
const AnimatedPotTransfer = ({ potAmount, winner }) => {
    const [chipsToAnimate, setChipsToAnimate] = useState([]);

    useEffect(() => {
        if (winner && potAmount > 0) {
            const numChips = Math.min(Math.ceil(potAmount / 50), 10); // Máximo 10 fichas para la animación
            const newChips = Array.from({ length: numChips }).map((_, i) => ({
                id: Math.random(), // ID único para cada ficha
                delay: i * 0.08, // Animación escalonada
                winner: winner,
            }));
            setChipsToAnimate(newChips);

            // Limpiar las fichas después de la animación
            const animationDuration = 1500; // Coincide con la duración de la animación CSS
            const totalDelay = (numChips - 1) * 80; // Retraso máximo para la última ficha
            setTimeout(() => {
                setChipsToAnimate([]);
            }, animationDuration + totalDelay);
        }
    }, [winner, potAmount]);

    return (
        <>
            {chipsToAnimate.map(chip => (
                <div
                    key={chip.id}
                    className={`animated-pot-transfer-chip chip-transfer-${chip.winner}`}
                    style={{
                        backgroundColor: Math.random() > 0.5 ? '#ffbf00' : (Math.random() > 0.5 ? '#007bff' : '#dc3545'), // Colores aleatorios
                        animationDelay: `${chip.delay}s`,
                    }}
                ></div>
            ))}
        </>
    );
};


// Función auxiliar para barajar un mazo
const shuffleDeck = () => {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    // Algoritmo de Fisher-Yates para barajar
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

// Función para obtener el valor numérico de una carta
const getCardValue = (card) => {
    const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return rankValues[card.rank];
};

// Mapeo de tipos de mano a nombres legibles
const handTypeNames = [
    "Carta Alta",
    "Pareja",
    "Doble Pareja",
    "Trío",
    "Escalera",
    "Color",
    "Full House",
    "Póker",
    "Escalera de Color",
    "Escalera Real"
];

// Función para evaluar una mano de póker (más realista)
// Retorna un array [handType, primaryValue, kicker1, kicker2, ...]
// handType: 9 (Royal Flush) -> 0 (High Card)
const evaluateHand = (hand, community) => {
    const allCards = [...hand, ...community].sort((a, b) => getCardValue(b) - getCardValue(a)); // Ordenar por valor descendente
    const uniqueRanks = Array.from(new Set(allCards.map(c => getCardValue(c)))).sort((a, b) => b - a);
    const rankCounts = {};
    const suitCounts = {};

    allCards.forEach(card => {
        rankCounts[getCardValue(card)] = (rankCounts[getCardValue(card)] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });

    const ranksByCount = Object.entries(rankCounts).sort(([, countA], [, countB]) => countB - countA);

    // Helper para encontrar la mejor escalera
    const findStraight = (cards) => {
        const uniqueSortedRanks = Array.from(new Set(cards.map(c => getCardValue(c)))).sort((a, b) => a - b);
        // Manejar el As como bajo para A-2-3-4-5
        if (uniqueSortedRanks.includes(14) && uniqueSortedRanks.includes(2) && uniqueSortedRanks.includes(3) && uniqueSortedRanks.includes(4) && uniqueSortedRanks.includes(5)) {
            return 5; // Valor de la escalera A-5
        }
        for (let i = uniqueSortedRanks.length - 1; i >= 4; i--) {
            if (uniqueSortedRanks[i] - 1 === uniqueSortedRanks[i - 1] &&
                uniqueSortedRanks[i - 1] - 1 === uniqueSortedRanks[i - 2] &&
                uniqueSortedRanks[i - 2] - 1 === uniqueSortedRanks[i - 3] &&
                uniqueSortedRanks[i - 3] - 1 === uniqueSortedRanks[i - 4]) {
                return uniqueSortedRanks[i]; // Valor de la carta más alta de la escalera
            }
        }
        return 0; // No hay escalera
    };

    // Comprobar si hay color (Flush)
    let flushSuit = null;
    for (const suit in suitCounts) {
        if (suitCounts[suit] >= 5) {
            flushSuit = suit;
            break;
        }
    }

    // Obtener cartas del color si existe
    let flushCards = [];
    if (flushSuit) {
        flushCards = allCards.filter(card => card.suit === flushSuit).sort((a, b) => getCardValue(b) - getCardValue(a));
    }

    // 1. Escalera Real (Royal Flush)
    if (flushSuit) {
        const royalRanks = [14, 13, 12, 11, 10]; // A, K, Q, J, 10
        const hasRoyal = royalRanks.every(rank => flushCards.some(c => getCardValue(c) === rank));
        if (hasRoyal) return [9]; // No necesita kickers, es la mejor mano
    }

    // 2. Escalera de Color (Straight Flush)
    if (flushSuit && flushCards.length >= 5) {
        const straightFlushRanks = Array.from(new Set(flushCards.map(c => getCardValue(c)))).sort((a, b) => a - b);
        const straightHighCard = findStraight(flushCards);
        if (straightHighCard) return [8, straightHighCard];
    }

    // 3. Póker (Four of a Kind)
    const fourOfAKindRank = ranksByCount.find(([, count]) => count === 4);
    if (fourOfAKindRank) {
        const quadRank = parseInt(fourOfAKindRank[0]);
        const kicker = uniqueRanks.find(rank => rank !== quadRank);
        return [7, quadRank, kicker || 0]; // El kicker puede no existir si todas son quads
    }

    // 4. Full (Full House)
    const threeOfAKindRank = ranksByCount.find(([, count]) => count === 3);
    if (threeOfAKindRank) { // Solo busca un par si ya hay un trío
        const trioRankValue = parseInt(threeOfAKindRank[0]);
        // Encuentra un par que no sea del mismo rango que el trío
        const pairRank = ranksByCount.find(([rank, count]) => count === 2 && parseInt(rank) !== trioRankValue);
        if (pairRank) {
            return [6, trioRankValue, parseInt(pairRank[0])];
        }
    }

    // 5. Color (Flush)
    if (flushSuit) {
        return [5, ...flushCards.slice(0, 5).map(c => getCardValue(c))]; // Las 5 cartas más altas del color
    }

    // 6. Escalera (Straight)
    const straightHighCard = findStraight(allCards);
    if (straightHighCard) return [4, straightHighCard];

    // 7. Trío (Three of a Kind)
    if (threeOfAKindRank) { // Ya se definió arriba, pero se reutiliza aquí si no fue un Full House
        const trioRank = parseInt(threeOfAKindRank[0]);
        const kickers = uniqueRanks.filter(rank => rank !== trioRank).slice(0, 2);
        return [3, trioRank, ...kickers];
    }

    // 8. Doble Pareja (Two Pair)
    const pairs = ranksByCount.filter(([, count]) => count === 2).map(([rank]) => parseInt(rank));
    if (pairs.length >= 2) {
        pairs.sort((a, b) => b - a); // Ordenar las parejas de mayor a menor
        const kicker = uniqueRanks.find(rank => rank !== pairs[0] && rank !== pairs[1]);
        return [2, pairs[0], pairs[1], kicker || 0];
    }

    // 9. Pareja (Pair)
    const singlePairRank = ranksByCount.find(([, count]) => count === 2);
    if (singlePairRank) {
        const pairRankVal = parseInt(singlePairRank[0]);
        const kickers = uniqueRanks.filter(rank => rank !== pairRankVal).slice(0, 3);
        return [1, pairRankVal, ...kickers];
    }

    // 10. Carta Alta (High Card)
    return [0, ...uniqueRanks.slice(0, 5)]; // Las 5 cartas más altas
};


// Componente para mostrar una carta
const Card = ({ card, hidden = false }) => {
    return (
        <div className={`card ${hidden ? 'hidden' : ''} ${card.suit === '♥️' || card.suit === '♦️' ? 'red-suit' : 'black-suit'}`}>
            {hidden ? (
                <span className="card-hidden-icon">🃏</span>
            ) : (
                <>
                    <span>{card.rank}</span>
                    <span className="card-suit-icon">{card.suit}</span>
                </>
            )}
        </div>
    );
};


// Componente principal de la página de inicio
const HomePage = ({ discordInfo, onLogout }) => {
    const username = discordInfo?.username || 'Usuario';
    const initialPesos = discordInfo?.pesos || 0;
    const discordId = discordInfo?.discordId || 'N/A';

    // Estados del juego de póker
    const [playerPesos, setPlayerPesos] = useState(initialPesos);
    const [aiPesos, setAiPesos] = useState(1000);
    const [deck, setDeck] = useState([]);
    const [playerHand, setPlayerHand] = useState([]);
    const [aiHand, setAiHand] = useState([]);
    const [communityCards, setCommunityCards] = useState([]);
    const [pot, setPot] = useState(0);
    const [gamePhase, setGamePhase] = useState('finished');
    const [gameMessage, setGameMessage] = useState('Bienvenido al Club de la Noche Poker. Haz clic en "Iniciar Nueva Partida" para jugar contra la IA.');
    const [currentBet, setCurrentBet] = useState(0); // La apuesta más alta en la ronda actual
    const [lastPlayerToBet, setLastPlayerToBet] = useState(null); // Quién hizo la última apuesta/subida
    const [playerTurn, setPlayerTurn] = useState(true);
    const [roundMessage, setRoundMessage] = useState('');
    const [showdownWinner, setShowdownWinner] = useState(null);
    const [potTransferAnimation, setPotTransferAnimation] = useState(null); // 'player' or 'ai' for animation
    const [winningChipsVisible, setWinningChipsVisible] = useState(false); // New state for winning chips animation

    // Nuevos estados para la lógica de apuestas
    const [playerContributionInRound, setPlayerContributionInRound] = useState(0); // Total de pesos que el jugador ha puesto en la ronda actual
    const [aiContributionInRound, setAiContributionInRound] = useState(0);     // Total de pesos que la IA ha puesto en la ronda actual
    const [isProcessingTurn, setIsProcessingTurn] = useState(false); // Para deshabilitar botones durante el procesamiento
    const [customBetInput, setCustomBetInput] = useState(''); // Para la entrada de apuesta personalizada

    const minRaise = 20; // Cantidad mínima para una subida

    // --- Referencias de audio ---
    const dealCardSound = useRef(null);
    const chipBetSound = useRef(null);
    const winSound = useRef(null);
    const loseSound = useRef(null);
    const buttonClickSound = useRef(null);

    // --- Funciones para reproducir sonidos ---
    const playSound = (audioRef, duration = 0) => { // Añade 'duration' como parámetro opcional (en milisegundos)
    if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reinicia el sonido al principio si ya está sonando
        audioRef.current.play().catch(e => console.error("Error playing sound:", e)); // Manejar posibles errores (ej. auto-play restrictions)

        if (duration > 0) {
            // Si se especifica una duración, pausa el sonido después de ese tiempo
            setTimeout(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0; // Opcional: Reiniciar a 0 después de pausar para futuras reproducciones limpias
            }, duration);
        }
    }
};

    // Efecto para inicializar el dinero del jugador cuando discordInfo cambia
    useEffect(() => {
        setPlayerPesos(initialPesos);
    }, [initialPesos]);

    // Efecto para reproducir sonido de victoria/derrota
    useEffect(() => {
        if (gamePhase === 'finished' && showdownWinner === 'player') {
            playSound(winSound);
        } else if (gamePhase === 'finished' && showdownWinner === 'ai') {
            playSound(loseSound);
        }
    }, [gamePhase, showdownWinner]); // Dependencias para el efecto

    // Función para determinar el ganador al final de la partida (Showdown)
    const determineWinner = useCallback(() => {
        console.log('[POKER LOG] Iniciando Showdown...');
        setGamePhase('showdown');
        setGameMessage('¡Showdown! Revelando manos...');

        const playerHandValue = evaluateHand(playerHand, communityCards);
        const aiHandValue = evaluateHand(aiHand, communityCards);

        console.log('[POKER LOG] Valor de la mano del Jugador:', playerHandValue);
        console.log('[POKER LOG] Valor de la mano de la IA:', aiHandValue);

        // Comparar las manos
        let winner = null;
        let finalMessage = '';
        let playerHandName = handTypeNames[playerHandValue[0]];
        let aiHandName = handTypeNames[aiHandValue[0]];


        // Comparar elemento por elemento del array de evaluación
        for (let i = 0; i < Math.max(playerHandValue.length, aiHandValue.length); i++) {
            const playerVal = playerHandValue[i] || 0;
            const aiVal = aiHandValue[i] || 0;

            if (playerVal > aiVal) {
                winner = 'player';
                break;
            } else if (aiVal > playerVal) {
                winner = 'ai';
                break;
            }
            // Si son iguales, continuar con el siguiente elemento (kicker)
        }

        // Trigger pot transfer animation
        setPotTransferAnimation(winner);

        // Permitir que la animación de transferencia del pozo se ejecute
        setTimeout(() => {
            let potWon = pot;
            if (winner === 'player') {
                finalMessage = `¡FELICIDADES, ${username}! Has ganado ${parseInt(pot).toLocaleString()} pesos con ${playerHandName}. 🎉`;
                setPlayerPesos(prev => prev + pot);
                console.log(`[POKER LOG] Ganador: Jugador. Nuevo saldo: ${parseInt(playerPesos + pot).toLocaleString()}`);
            } else if (winner === 'ai') {
                finalMessage = `La IA ha ganado ${parseInt(pot).toLocaleString()} pesos con ${aiHandName}. ¡Mejor suerte la próxima! 😔`;
                setAiPesos(prev => prev + pot);
                console.log(`[POKER LOG] Ganador: IA. Nuevo saldo: ${parseInt(aiPesos + pot).toLocaleString()}`);
            } else {
                winner = 'tie';
                finalMessage = `¡EMPATE! Ambos tienen ${playerHandName}. El pozo de ${parseInt(pot).toLocaleString()} pesos se divide. 🤝`;
                setPlayerPesos(prev => prev + pot / 2);
                setAiPesos(prev => prev + pot / 2);
                potWon = pot / 2; // Cada uno obtiene la mitad
                console.log(`[POKER LOG] Empate. Saldo Jugador: ${parseInt(playerPesos + pot / 2).toLocaleString()}, Saldo IA: ${parseInt(aiPesos + pot / 2).toLocaleString()}`);
            }
            setShowdownWinner(winner);
            setGameMessage(finalMessage);
            setPot(0); // Reiniciar el pozo después de la distribución (y que la animación de transferencia haya comenzado)
            setPotTransferAnimation(null); // Reiniciar el estado de la animación

            // Mostrar la animación de fichas de ganancia por un corto período en el display de dinero
            setWinningChipsVisible(true);
            setTimeout(() => {
                setWinningChipsVisible(false);
            }, 1500); // Fichas visibles por 1.5 segundos

            setGamePhase('finished'); // Establecer el juego como terminado después de todas las animaciones y actualizaciones de estado
            // Resetear contribuciones para la próxima partida
            setPlayerContributionInRound(0);
            setAiContributionInRound(0);
            console.log('[POKER LOG] Showdown finalizado. Juego en fase "finished".');
        }, 1500); // Permitir tiempo para que la animación principal de transferencia del pozo comience
    }, [playerHand, aiHand, communityCards, pot, username, playerPesos, aiPesos, winSound, loseSound]);


    // Función para iniciar una nueva partida
    const startGame = () => {
        console.log('[POKER LOG] Iniciando nueva partida...');
        playSound(buttonClickSound); // Sonido al iniciar la partida

        if (playerPesos <= 0) {
            setGameMessage('¡No tienes suficientes pesos para jugar! Recarga tu cuenta o cierra sesión.');
            console.log('[POKER LOG] Partida no iniciada: Jugador sin fondos.');
            return;
        }
        if (aiPesos <= 0) {
            setGameMessage('La IA no tiene suficientes pesos para jugar. ¡Has ganado el juego!');
            console.log('[POKER LOG] Partida no iniciada: IA sin fondos.');
            return;
        }

        const newDeck = shuffleDeck();
        setDeck(newDeck);
        setPlayerHand([]);
        setAiHand([]);
        setCommunityCards([]);
        setPot(0);
        setCurrentBet(0);
        setLastPlayerToBet(null);
        setPlayerTurn(true);
        setShowdownWinner(null);
        setPotTransferAnimation(null);
        setWinningChipsVisible(false); // Reiniciar la visibilidad de las fichas de ganancia
        setPlayerContributionInRound(0); // Resetear contribuciones
        setAiContributionInRound(0);     // Resetear contribuciones
        setCustomBetInput(''); // Limpiar input de apuesta personalizada

        const pHand = [newDeck.pop(), newDeck.pop()];
        const aHand = [newDeck.pop(), newDeck.pop()];

        // Repartir cartas con un pequeño retraso para el sonido
        setTimeout(() => {
            setPlayerHand(pHand);
            playSound(dealCardSound, 1000); // Reproduce por 1000 ms (1 segundo)
        }, 300);
        setTimeout(() => {
            setAiHand(aHand);
            playSound(dealCardSound, 1000); // Reproduce por 1000 ms (1 segundo)
        }, 600);
        
        setDeck(newDeck);

        const smallBlind = 10;
        const bigBlind = 20;

        // Asegurarse de que los jugadores tengan suficientes fondos para las ciegas
        if (playerPesos < smallBlind) {
            setGameMessage('No tienes suficientes pesos para la ciega pequeña. Recarga tu cuenta.');
            setGamePhase('finished');
            console.log('[POKER LOG] Partida no iniciada: Jugador sin fondos para ciega pequeña.');
            return;
        }
        if (aiPesos < bigBlind) {
            setGameMessage('La IA no tiene suficientes pesos para la ciega grande. ¡Has ganado el juego!');
            setGamePhase('finished');
            console.log('[POKER LOG] Partida no iniciada: IA sin fondos para ciega grande.');
            return;
        }


        setPlayerPesos(prev => prev - smallBlind);
        setPot(prev => prev + smallBlind);
        setPlayerContributionInRound(smallBlind); // Jugador contribuye con la ciega pequeña


        setAiPesos(prev => prev - bigBlind);
        setPot(prev => prev + bigBlind);
        setAiContributionInRound(bigBlind);     // IA contribuye con la ciega grande


        setCurrentBet(bigBlind); // La apuesta actual es la ciega grande

        setGamePhase('pre-flop');
        setGameMessage(`Partida iniciada. ¡Ciegas pagadas! Pozo: ${parseInt(smallBlind + bigBlind).toLocaleString()}.`);
        setRoundMessage('Es tu turno. Puedes Igualar, Apostar o Retirarte.');
        console.log('[POKER LOG] Fase: Pre-Flop. Cartas repartidas. Turno del Jugador.');
    };

    // Función para avanzar a la siguiente fase de apuestas (Flop, Turn, River)
    const nextPhase = useCallback(() => {
        console.log(`[POKER LOG] Avanzando a la siguiente fase desde ${gamePhase}...`);
        let currentDeck = [...deck];
        let newCommunityCards = [...communityCards];
        let nextPhaseName = '';
        let message = '';

        // Resetear contribuciones y apuesta actual para la nueva fase de apuestas
        setPlayerContributionInRound(0);
        setAiContributionInRound(0);
        setCurrentBet(0);

        if (gamePhase === 'pre-flop') {
            newCommunityCards = [currentDeck.pop(), currentDeck.pop(), currentDeck.pop()];
            nextPhaseName = 'flop';
            message = 'Flop revelado. ¡Es tu turno!';
             playSound(dealCardSound, 1000); // Sonido al revelar Flop
            console.log('[POKER LOG] Flop revelado:', newCommunityCards);
        } else if (gamePhase === 'flop') {
            newCommunityCards.push(currentDeck.pop());
            nextPhaseName = 'turn';
            message = 'Turn revelado. ¡Es tu turno!';
             playSound(dealCardSound, 1000); // Sonido al revelar Turn
            console.log('[POKER LOG] Turn revelado:', newCommunityCards[newCommunityCards.length - 1]);
        } else if (gamePhase === 'turn') {
            newCommunityCards.push(currentDeck.pop());
            nextPhaseName = 'river';
            message = 'River revelado. ¡Última jugada! Es tu turno.';
            playSound(dealCardSound, 1000);; // Sonido al revelar River
            console.log('[POKER LOG] River revelado:', newCommunityCards[newCommunityCards.length - 1]);
        } else if (gamePhase === 'river') {
            nextPhaseName = 'showdown';
            message = '¡Todas las cartas comunitarias están fuera! Es hora del Showdown.';
            setGamePhase(nextPhaseName);
            setGameMessage(message);
            console.log('[POKER LOG] Todas las cartas comunitarias reveladas. Pasando a Showdown.');
            determineWinner(); // Llamar a determineWinner directamente
            return;
        }
        setCommunityCards(newCommunityCards);
        setDeck(currentDeck);
        setGamePhase(nextPhaseName);
        setLastPlayerToBet(null); // Resetear el último en apostar
        setPlayerTurn(true); // Siempre empieza el jugador en las nuevas fases de apuesta
        setGameMessage(message);
        setRoundMessage('Puedes Pasar, Apostar o Retirarte.');
        console.log(`[POKER LOG] Fase actual: ${nextPhaseName}. Turno del Jugador.`);
    }, [deck, communityCards, gamePhase, determineWinner, dealCardSound]);

    // Lógica de la IA
    const aiTurn = useCallback(() => {
        console.log('[POKER LOG] AI Turn initiated. Current game phase:', gamePhase);
        setPlayerTurn(false); // El turno del jugador termina

        const timeoutId = setTimeout(() => {
            console.log('[POKER LOG] AI Turn setTimeout callback fired.');
            let aiAction = '';
            const aiAggression = 0.4; // 0.0 (pasivo) a 1.0 (agresivo)

            // Evaluar la mano actual de la IA (con cartas comunitarias reveladas hasta ahora)
            const aiCurrentHandValue = evaluateHand(aiHand, communityCards);
            const aiHandStrength = aiCurrentHandValue[0]; // Tipo de mano (0-9)
            console.log('[POKER LOG] AI Hand Strength (0-9):', aiHandStrength);
            console.log('[POKER LOG] AI Pesos:', aiPesos);
            console.log('[POKER LOG] Current Bet (from player):', currentBet);
            console.log('[POKER LOG] AI Current Contribution in Round:', aiContributionInRound);
            console.log('[POKER LOG] Last Player to Bet:', lastPlayerToBet);
            console.log('[POKER LOG] Community Cards for AI evaluation:', communityCards);
            console.log('[POKER LOG] AI Hand for evaluation:', aiHand);

            // Calcular cuánto necesita la IA para igualar la apuesta actual
            const amountToCall = currentBet - aiContributionInRound;
            console.log('[POKER LOG] AI Calculated amountToCall:', amountToCall);
            const canCall = aiPesos >= amountToCall;

            // Lógica de decisión de la IA
            if (currentBet > 0) { // Hay una apuesta activa (Igualar, Subir, Retirarse)
                console.log('[POKER LOG] AI: Hay una apuesta activa. La IA necesita responder.');
                if (!canCall) { // No puede igualar
                    aiAction = 'fold';
                    console.log('[POKER LOG] AI: Fondos insuficientes para igualar, se retira.');
                } else if (aiHandStrength >= 3) { // Trío o mejor: Confiado
                    // La IA intenta subir si tiene fondos y es agresiva, si no, iguala
                    aiAction = (Math.random() < 0.7 + aiAggression && aiPesos >= amountToCall + minRaise) ? 'bet' : 'call';
                    console.log(`[POKER LOG] AI: Mano fuerte (${aiHandStrength}). Decidió ${aiAction}.`);
                } else if (aiHandStrength >= 1) { // Pareja o Doble Pareja: Confianza moderada
                    if (Math.random() < 0.3 + aiAggression && aiPesos >= amountToCall + minRaise) { // Pequeña posibilidad de subir
                        aiAction = 'bet';
                    } else if (Math.random() < 0.9) { // Alta posibilidad de igualar
                        aiAction = 'call';
                    } else { // Pequeña posibilidad de retirarse
                        aiAction = 'fold';
                    }
                    console.log(`[POKER LOG] AI: Mano moderada (${aiHandStrength}). Decidió ${aiAction}.`);
                } else { // Carta Alta: Poca confianza
                    aiAction = (Math.random() < 0.1 + aiAggression) && aiPesos >= amountToCall + minRaise ? 'bet' : 'fold'; // Pequeña posibilidad de bluff
                    console.log('[POKER LOG] AI: Mano débil (Carta Alta). Decidió retirarse o bluffear.');
                }
            } else { // No hay apuesta activa (Pasar, Apostar)
                console.log('[POKER LOG] AI: No hay apuesta activa. La IA puede Pasar o Apostar.');
                if (aiHandStrength >= 3) { // Trío o mejor: Confiado para apostar
                    aiAction = (aiPesos >= minRaise) ? 'bet' : 'check'; // Apostar si puede permitírselo, si no, pasar
                    console.log(`[POKER LOG] AI: Mano fuerte (${aiHandStrength}). Decidió ${aiAction}.`);
                } else if (aiHandStrength >= 1) { // Pareja o Doble Pareja: Confianza moderada
                    aiAction = (Math.random() > 0.4 - aiAggression && aiPesos >= minRaise) ? 'bet' : 'check'; // Más propenso a apostar
                    console.log(`[POKER LOG] AI: Mano moderada (${aiHandStrength}). Decidió ${aiAction}.`);
                } else { // Carta Alta: Poca confianza
                    aiAction = (Math.random() < 0.05 + aiAggression && aiPesos >= minRaise) ? 'bet' : 'check'; // Muy pequeña posibilidad de bluff
                    console.log('[POKER LOG] AI: Mano débil (Carta Alta). Decidió pasar o bluffear.');
                }
            }

            console.log('[POKER LOG] AI decided action:', aiAction);

            // Ejecutar la acción elegida por la IA
            switch (aiAction) {
                case 'check':
                    setGameMessage('La IA ha pasado (Check).');
                    setRoundMessage('Es tu turno.');
                    console.log('[POKER LOG] AI Action: Check.');
                    nextPhase(); // Avanzar a la siguiente fase si no hay apuesta que igualar
                    setIsProcessingTurn(false);
                    break;
                case 'call':
                    // amountToCall ya calculado
                    setAiPesos(prev => prev - amountToCall);
                    setPot(prev => prev + amountToCall);
                    setAiContributionInRound(currentBet); // La contribución total de la IA ahora coincide con la apuesta actual
                    setGameMessage(`La IA ha igualado tu apuesta de ${amountToCall} pesos. Pozo: ${parseInt(pot + amountToCall).toLocaleString()}.`);
                    setLastPlayerToBet('ai');
                    playSound(chipBetSound); // Sonido de apuesta
                    console.log(`[POKER LOG] AI Action: Call (${amountToCall}). Pozo: ${parseInt(pot + amountToCall).toLocaleString()}.`);
                    nextPhase(); // Avanzar a la siguiente fase después de igualar
                    setIsProcessingTurn(false);
                    break;
                case 'bet':
                    // Calcular la nueva apuesta total de la IA
                    let newTotalBetAI;
                    if (currentBet === 0) { // Si no hay apuesta previa, la IA abre con minRaise
                        newTotalBetAI = minRaise;
                    } else { // Si hay apuesta previa, la IA sube por minRaise
                        newTotalBetAI = currentBet + minRaise;
                    }

                    // Asegurarse de que la IA no intente apostar más de lo que tiene
                    if (newTotalBetAI > aiPesos + aiContributionInRound) {
                        newTotalBetAI = aiPesos + aiContributionInRound; // La IA va all-in
                        console.log('[POKER LOG] AI no tiene suficientes fondos para subir lo mínimo, va All-In.');
                    }

                    const amountToPayAI = newTotalBetAI - aiContributionInRound;

                    if (aiPesos < amountToPayAI) { // Doble verificación de fondos antes de apostar (esto debería ser raro con la lógica de arriba)
                        aiAction = 'fold'; // Retroceso si los fondos se vuelven insuficientes
                        setGameMessage('La IA no tiene suficientes pesos para apostar y se ha retirado. ¡Has ganado el pozo!');
                        setPlayerPesos(prev => prev + pot);
                        setGamePhase('finished');
                        playSound(winSound); // Sonido de victoria para el jugador
                        console.log('[POKER LOG] La IA intentó apostar pero fondos insuficientes, forzada a retirarse. El jugador gana.');
                        setIsProcessingTurn(false);
                        break;
                    }

                    setAiPesos(prev => prev - amountToPayAI);
                    setPot(prev => prev + amountToPayAI);
                    setCurrentBet(newTotalBetAI); // La nueva apuesta más alta
                    setAiContributionInRound(newTotalBetAI); // La contribución total de la IA ahora coincide con la nueva apuesta
                    setLastPlayerToBet('ai');
                    setGameMessage(`La IA ha apostado ${amountToPayAI} pesos (total ${newTotalBetAI}). Pozo: ${parseInt(pot + amountToPayAI).toLocaleString()}.`);
                    setRoundMessage('¡Es tu turno! Puedes Igualar, Subir o Retirarte.');
                    setPlayerTurn(true); // El turno vuelve al jugador
                    playSound(chipBetSound); // Sonido de apuesta
                    console.log(`[POKER LOG] AI Action: Bet (${amountToPayAI}). New CurrentBet: ${newTotalBetAI}. Pozo: ${parseInt(pot + amountToPayAI).toLocaleString()}. Turno del Jugador.`);
                    setIsProcessingTurn(false);
                    break;
                case 'fold':
                    setGameMessage(`La IA se ha retirado (Fold). ¡Has ganado el pozo de ${parseInt(pot).toLocaleString()} pesos!`);
                    setPlayerPesos(prev => prev + pot);
                    setGamePhase('finished');
                    playSound(winSound); // Sonido de victoria para el jugador
                    console.log('[POKER LOG] AI Action: Fold. El jugador gana el pozo.');
                    setIsProcessingTurn(false);
                    break;
                default:
                    console.error('[POKER LOG] La IA eligió una acción inesperada:', aiAction);
                    setGameMessage('La IA ha tenido un error y se ha retirado. ¡Has ganado el pozo!');
                    setPlayerPesos(prev => prev + pot);
                    setGamePhase('finished');
                    playSound(winSound); // Sonido de victoria para el jugador
                    setIsProcessingTurn(false);
                    break;
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [aiPesos, currentBet, lastPlayerToBet, nextPhase, pot, playerPesos, determineWinner, aiHand, communityCards, gamePhase, aiContributionInRound, chipBetSound, winSound, loseSound]);

    // Función principal para que el jugador apueste o suba
    const handlePlayerBet = (targetTotalBetAmount) => {
        console.log(`[POKER LOG] Jugador: Intentando Apostar a un total de ${targetTotalBetAmount}.`);
        console.log(`[POKER LOG] Player Current Contribution in Round: ${playerContributionInRound}`);
        console.log(`[POKER LOG] Current Highest Bet: ${currentBet}`);

        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        playSound(buttonClickSound); // Sonido de clic de botón

        const amountToPay = targetTotalBetAmount - playerContributionInRound;

        // Validaciones
        if (targetTotalBetAmount <= 0) {
            setGameMessage('La apuesta debe ser una cantidad positiva.');
            console.log('[POKER LOG] Jugador: Apuesta fallida, cantidad no positiva.');
            setIsProcessingTurn(false);
            return;
        }
        if (playerPesos < amountToPay) {
            setGameMessage('No tienes suficientes pesos para esa apuesta.');
            console.log('[POKER LOG] Jugador: Apuesta fallida, fondos insuficientes.');
            setIsProcessingTurn(false);
            return;
        }
        if (currentBet > 0 && targetTotalBetAmount < currentBet) {
            setGameMessage(`Tu apuesta debe ser al menos ${currentBet} para igualar o subir.`);
            console.log(`[POKER LOG] Jugador: Apuesta fallida, cantidad (${targetTotalBetAmount}) menor que apuesta actual (${currentBet}).`);
            setIsProcessingTurn(false);
            return;
        }
        // Si es una subida (targetTotalBetAmount > currentBet)
        // Y la diferencia entre la apuesta total del jugador y la apuesta actual no es al menos el minRaise
        if (targetTotalBetAmount > currentBet && (targetTotalBetAmount - currentBet) < minRaise) {
            setGameMessage(`Debes subir al menos ${minRaise} pesos.`);
            console.log('[POKER LOG] Jugador: Apuesta fallida, subida menor que la mínima.');
            setIsProcessingTurn(false);
            return;
        }

        setPlayerPesos(prev => prev - amountToPay);
        setPot(prev => prev + amountToPay);
        setCurrentBet(targetTotalBetAmount); // La nueva apuesta más alta en la mesa
        setPlayerContributionInRound(targetTotalBetAmount); // La contribución total del jugador ahora coincide con la nueva apuesta
        setLastPlayerToBet('player');
        setGameMessage(`Has apostado ${amountToPay} pesos (total ${targetTotalBetAmount}). Pozo: ${parseInt(pot + amountToPay).toLocaleString()}.`);
        setRoundMessage('¡Es el turno de la IA!');
        setPlayerTurn(false);
        setCustomBetInput(''); // Limpiar el input de apuesta personalizada
        playSound(chipBetSound); // Sonido de apuesta
        console.log(`[POKER LOG] Jugador: Apostó ${amountToPay}. New CurrentBet: ${targetTotalBetAmount}. Pozo: ${parseInt(pot + amountToPay).toLocaleString()}. Turno de la IA.`);
        aiTurn(); // El turno de la IA se encargará de setIsProcessingTurn(false) cuando termine
    };

    // Función para que el jugador haga All-In
    const handlePlayerAllIn = () => {
        console.log('[POKER LOG] Jugador: Intentando All-In.');
        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        playSound(buttonClickSound); // Sonido de clic de botón

        const amountToCall = currentBet - playerContributionInRound;
        // Si hay una apuesta activa y el jugador no tiene suficiente para igualar, debe retirarse
        if (playerPesos < amountToCall && currentBet > 0) {
            setGameMessage('No tienes suficientes pesos para igualar. Debes retirarte.');
            console.log('[POKER LOG] Jugador: All-in fallido, fondos insuficientes para igualar.');
            setIsProcessingTurn(false);
            return;
        }

        const amountToPay = playerPesos; // El jugador apuesta todo su dinero restante
        const newTotalBet = playerContributionInRound + amountToPay; // Total comprometido por el jugador en esta ronda

        setPlayerPesos(0); // El jugador no tiene pesos restantes
        setPot(prev => prev + amountToPay);
        // La nueva apuesta actual es el máximo entre la apuesta actual y la nueva contribución total del jugador
        setCurrentBet(Math.max(currentBet, newTotalBet));
        setPlayerContributionInRound(newTotalBet);
        setLastPlayerToBet('player');
        setGameMessage(`Has ido All-In con ${amountToPay} pesos (total ${newTotalBet}). Pozo: ${parseInt(pot + amountToPay).toLocaleString()}.`);
        setRoundMessage('¡Es el turno de la IA!');
        setPlayerTurn(false);
        playSound(chipBetSound); // Sonido de apuesta
        console.log(`[POKER LOG] Jugador: All-In (${amountToPay}). New CurrentBet: ${Math.max(currentBet, newTotalBet)}. Pozo: ${parseInt(pot + amountToPay).toLocaleString()}. Turno de la IA.`);
        aiTurn();
    };

    const handlePlayerCall = () => {
        console.log('[POKER LOG] Jugador: Intentando Igualar.');
        console.log(`[POKER LOG] Player Current Contribution in Round: ${playerContributionInRound}`);
        console.log(`[POKER LOG] Current Highest Bet: ${currentBet}`);

        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        playSound(buttonClickSound); // Sonido de clic de botón

        if (currentBet === 0) {
            setGameMessage('No hay apuesta para igualar. Puedes pasar o apostar.');
            console.log('[POKER LOG] Jugador: Igualar fallido, no hay apuesta activa.');
            setIsProcessingTurn(false);
            return;
        }
        const callAmount = currentBet - playerContributionInRound; // Cantidad que el jugador necesita añadir
        console.log(`[POKER LOG] Jugador: Calculated Call Amount: ${callAmount}`);

        if (playerPesos < callAmount) {
            setGameMessage('No tienes suficientes pesos para igualar esa apuesta.');
            console.log('[POKER LOG] Jugador: Igualar fallido, fondos insuficientes.');
            setIsProcessingTurn(false);
            return;
        }
        setPlayerPesos(prev => prev - callAmount);
        setPot(prev => prev + callAmount);
        setPlayerContributionInRound(currentBet); // La contribución del jugador ahora coincide con la apuesta actual
        setGameMessage(`Has igualado la apuesta de ${callAmount} pesos. Pozo: ${parseInt(pot + callAmount).toLocaleString()}.`);
        setLastPlayerToBet('player');
        playSound(chipBetSound); // Sonido de apuesta
        console.log(`[POKER LOG] Jugador: Igualó ${callAmount}. Pozo: ${parseInt(pot + callAmount).toLocaleString()}.`);
        nextPhase();
        setIsProcessingTurn(false);
    };

    const handlePlayerFold = () => {
        console.log('[POKER LOG] Jugador: Se ha retirado (Fold).');
        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        playSound(buttonClickSound); // Sonido de clic de botón

        setGameMessage(`Te has retirado (Fold). La IA gana el pozo de ${parseInt(pot).toLocaleString()} pesos.`);
        setAiPesos(prev => prev + pot);
        setGamePhase('finished');
        playSound(loseSound); // Sonido de derrota para el jugador
        console.log('[POKER LOG] Jugador: Fold. IA gana el pozo. Juego en fase "finished".');
        setIsProcessingTurn(false);
    };

    // Función para que el jugador pase (check)
    const handlePlayerCheck = () => {
        console.log('[POKER LOG] Jugador: Intentando Pasar (Check).');
        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        playSound(buttonClickSound); // Sonido de clic de botón

        if (currentBet > 0) {
            setGameMessage('No puedes pasar, hay una apuesta activa.');
            console.log('[POKER LOG] Jugador: Pasar fallido, hay apuesta activa.');
            setIsProcessingTurn(false);
            return;
        }

        setGameMessage('Has pasado (Check).');
        setRoundMessage('¡Es el turno de la IA!');
        setPlayerTurn(false);
        console.log('[POKER LOG] Jugador: Check. Turno de la IA.');
        aiTurn();
    };


    // Calcular montos de apuesta dinámicos para mostrar en los botones
    // Estos representan el *total* al que ascendería la apuesta si se elige esa opción
    const playerMinBetAmount = currentBet === 0 ? minRaise : currentBet + minRaise;
    // Si el pozo es 0 (ej. al inicio de una ronda sin ciegas aún), evita NaN o infinitos
    const playerHalfPotBetAmount = currentBet === 0 ? Math.floor(pot / 2) : currentBet + Math.floor(pot / 2);
    const playerPotBetAmount = currentBet === 0 ? pot : currentBet + pot;

    // Helper para calcular la cantidad a pagar para un objetivo de apuesta total
    const getAmountToPayForTarget = (targetTotalBet) => {
        const amount = targetTotalBet - playerContributionInRound;
        return amount > 0 ? amount : 0; // Asegurarse de que no sea negativo
    };

    // Condicionales de deshabilitado para los botones de apuesta
    const disableMinBet = isProcessingTurn || playerPesos < getAmountToPayForTarget(playerMinBetAmount) || (currentBet > 0 && (playerMinBetAmount - currentBet) < minRaise);
    const disableHalfPotBet = isProcessingTurn || playerPesos < getAmountToPayForTarget(playerHalfPotBetAmount) || (currentBet > 0 && (playerHalfPotBetAmount - currentBet) < minRaise);
    const disablePotBet = isProcessingTurn || playerPesos < getAmountToPayForTarget(playerPotBetAmount) || (currentBet > 0 && (playerPotBetAmount - currentBet) < minRaise);

    // Condición de deshabilitado para el botón All-In
    // Se deshabilita si no tienes dinero o si tu all-in no es suficiente para igualar la apuesta actual
    const disableAllIn = isProcessingTurn || playerPesos <= 0 || (currentBet > 0 && playerPesos < (currentBet - playerContributionInRound));

    // Condición de deshabilitado para el botón de apuesta personalizada
    const customBetNumeric = parseInt(customBetInput, 10);
    const disableCustomBet = isProcessingTurn || isNaN(customBetNumeric) || customBetNumeric <= 0 || playerPesos < getAmountToPayForTarget(customBetNumeric) || (currentBet > 0 && customBetNumeric < currentBet) || (currentBet > 0 && customBetNumeric > currentBet && (customBetNumeric - currentBet) < minRaise);

    const debugButtonStyle = {
        padding: '8px 15px',
        backgroundColor: '#5a67d8',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        '&:hover': { backgroundColor: '#4c51bf' },
        '&:disabled': { backgroundColor: '#718096', cursor: 'not-allowed' }
    };


    return (
        <div className="home-page-container">
            {/* --- Elementos de Audio (ocultos) --- */}
            <audio ref={dealCardSound} src="/sounds/deal_card.mp3" preload="auto"></audio>
            <audio ref={chipBetSound} src="/sounds/chip_bet.mp3" preload="auto"></audio>
            <audio ref={winSound} src="/sounds/win_game.mp3" preload="auto"></audio>
            <audio ref={loseSound} src="/sounds/lose_game.mp3" preload="auto"></audio>
            <audio ref={buttonClickSound} src="/sounds/button_click.mp3" preload="auto"></audio>
            {/* --- Fin Elementos de Audio --- */}

            {/* Barra superior/Navbar simulada */}
            <header className="navbar">
                <div className="user-info-panel">
                    <p className="user-greeting">
                        ¡Hola, {username}!
                    </p>
                    <p className="player-pesos">
                        💰 {parseInt(playerPesos).toLocaleString()}
                        {showdownWinner === 'player' && winningChipsVisible && (
                            <span className="winning-chips-animation">
                                💸
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="logout-button"
                >
                    Cerrar Sesión
                </button>
            </header>

            {/* Contenido principal del juego */}
            <main className="game-main-content">
                <h1 className="game-title">
                    Mesa de Póker 🃏
                </h1>
                <p className="game-message">
                    {gameMessage}
                </p>
                <p className="round-message">
                    {roundMessage}
                </p>

                {/* Área de la IA */}
                <div className="ai-area">
                    <h3 className="ai-title">Oponente (IA):</h3>
                    <div className="player-hand-cards">
                        {aiHand.length > 0 ? (
                            aiHand.map((card, index) => <Card key={index} card={card} hidden={gamePhase !== 'showdown' && gamePhase !== 'finished'} />)
                        ) : (
                            <p className="placeholder-text">Esperando cartas...</p>
                        )}
                    </div>
                    <p className="ai-pesos">
                        Pesos de la IA: <span className="pesos-amount">💰 {parseInt(aiPesos).toLocaleString()}</span>
                        {showdownWinner === 'ai' && winningChipsVisible && (
                            <span className="winning-chips-animation">
                                💸
                            </span>
                        )}
                    </p>
                </div>

                {/* Área de cartas comunitarias */}
                <div className="community-cards-area">
                    <h3 className="community-cards-title">Cartas Comunitarias:</h3>
                    <div className="community-cards-display">
                        {communityCards.length > 0 ? (
                            communityCards.map((card, index) => <Card key={index} card={card} />)
                        ) : (
                            <p className="placeholder-text">No hay cartas comunitarias aún.</p>
                        )}
                    </div>
                </div>

                {/* Información del pozo y apuesta actual */}
                <div className="pot-info-area">
                    <div className="pot-value-display">
                        <h3 className="pot-title">Pozo Actual: <span className="pesos-amount">💰 {parseInt(pot).toLocaleString()}</span></h3>
                        {/* Componente PotDisplayChips para la representación visual estática del pozo */}
                        {pot > 0 && (
                            <div className="pot-chips-visualizer">
                                <PotDisplayChips amount={pot} />
                            </div>
                        )}
                    </div>
                    {gamePhase !== 'finished' && (
                        <p className="current-bet-info">
                            Apuesta Actual: <span className="bet-amount">{parseInt(currentBet).toLocaleString()} pesos</span>
                        </p>
                    )}
                    {/* Componente AnimatedPotTransfer para la animación de las fichas volando */}
                    <AnimatedPotTransfer potAmount={pot} winner={potTransferAnimation} />
                </div>

                {/* Mano del jugador */}
                <div className="player-hand-area">
                    <h3 className="player-hand-title">Tu Mano:</h3>
                    <div className="player-hand-cards">
                        {playerHand.length > 0 ? (
                            playerHand.map((card, index) => <Card key={index} card={card} />)
                        ) : (
                            <p className="placeholder-text">No tienes cartas aún. Inicia una partida.</p>
                        )}
                    </div>
                </div>

                {/* Mensaje de Ganador/Perdedor al final */}
                {gamePhase === 'finished' && showdownWinner && (
                    <div className={`showdown-result-message ${showdownWinner}`}>
                        {gameMessage} {/* Usa gameMessage que ahora contiene la información de victoria/derrota */}
                    </div>
                )}


                {/* Botones de acción del juego */}
                <div className="game-action-buttons">
                    {gamePhase === 'finished' ? (
                        <button
                            onClick={startGame}
                            className="start-game-button"
                        >
                            Iniciar Nueva Partida
                        </button>
                    ) : (
                        playerTurn && (
                            <>
                                {/* Botón Check / Call */}
                                {currentBet === 0 ? (
                                    <button
                                        onClick={handlePlayerCheck}
                                        disabled={isProcessingTurn}
                                        className="action-button check-button"
                                    >
                                        Pasar (Check)
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePlayerCall}
                                        disabled={isProcessingTurn || playerPesos < (currentBet - playerContributionInRound)}
                                        className="action-button call-button"
                                    >
                                        Igualar ({parseInt(Math.max(0, currentBet - playerContributionInRound)).toLocaleString()})
                                    </button>
                                )}

                                {/* Opciones de Apuesta / Subida */}
                                <button
                                    onClick={() => handlePlayerBet(playerMinBetAmount)}
                                    disabled={disableMinBet}
                                    className="action-button bet-button"
                                >
                                    Apostar (Mínima {parseInt(playerMinBetAmount).toLocaleString()})
                                </button>
                                <button
                                    onClick={() => handlePlayerBet(playerHalfPotBetAmount)}
                                    disabled={disableHalfPotBet}
                                    className="action-button bet-button"
                                >
                                    Apostar (Media Pozo {parseInt(playerHalfPotBetAmount).toLocaleString()})
                                </button>
                                <button
                                    onClick={() => handlePlayerBet(playerPotBetAmount)}
                                    disabled={disablePotBet}
                                    className="action-button bet-button"
                                >
                                    Apostar (Pozo {parseInt(playerPotBetAmount).toLocaleString()})
                                </button>
                                {/* Input y botón para apuesta personalizada */}
                                <div className="custom-bet-input-group">
                                    <input
                                        type="number"
                                        value={customBetInput}
                                        onChange={(e) => setCustomBetInput(e.target.value)}
                                        placeholder="Cantidad"
                                        min={currentBet > 0 ? currentBet + minRaise : minRaise} // Mínimo para subir
                                        className="custom-bet-input"
                                    />
                                    <button
                                        onClick={() => handlePlayerBet(customBetNumeric)}
                                        disabled={disableCustomBet}
                                        className="action-button custom-bet-button"
                                    >
                                        Apostar
                                    </button>
                                </div>
                                <button
                                    onClick={handlePlayerAllIn}
                                    disabled={disableAllIn}
                                    className="action-button all-in-button"
                                >
                                    All-In ({parseInt(playerPesos).toLocaleString()})
                                </button>
                                <button
                                    onClick={handlePlayerFold}
                                    disabled={isProcessingTurn}
                                    className="action-button fold-button"
                                >
                                    Retirarse (Fold)
                                </button>
                            </>
                        )
                    )}
                </div>
            </main>

            {/* Guía de Juego para Principiantes */}
            <section className="game-guide">
                <h2 className="game-guide-title">
                    Guía Rápida de Póker para Principiantes
                </h2>
                <p className="game-guide-text">
                    ¡Bienvenido al póker! Aquí te explicamos lo básico para que disfrutes la partida contra la IA:
                </p>

                <h3 className="guide-subtitle">
                    Objetivo del Juego:
                </h3>
                <p className="game-guide-text">
                    Ganar los "pesos" (fichas) de tus oponentes. Lo haces teniendo la mejor combinación de cartas al final, o haciendo que tus oponentes se retiren.
                </p>

                <h3 className="guide-subtitle">
                    Las Cartas:
                </h3>
                <ul className="guide-list">
                    <li>**Tu Mano:** Son las 2 cartas que solo tú ves.</li>
                    <li>**Cartas Comunitarias:** Son las cartas en el centro de la mesa que todos los jugadores pueden usar para formar su mejor mano. Se revelan en 3 fases:
                        <ul className="guide-sublist">
                            <li>**Flop:** Las primeras 3 cartas.</li>
                            <li>**Turn:** La cuarta carta.</li>
                            <li>**River:** La quinta y última carta.</li>
                        </ul>
                    </li>
                </ul>

                <h3 className="guide-subtitle">
                    Acciones en tu Turno:
                </h3>
                <ul className="guide-list">
                    <li>**Pasar (Check):** Si nadie ha apostado antes que tú en la ronda, puedes "pasar" y no apostar nada. El turno pasa al siguiente jugador.</li>
                    <li>**Apostar (Bet):** Pones fichas en el pozo. Si ya hay una apuesta, esto se convierte en "Subir" (Raise), lo que significa que apuestas más que la apuesta actual.</li>
                    <li>**Igualar (Call):** Si un oponente ha apostado, "igualas" su apuesta poniendo la misma cantidad de fichas en el pozo para seguir en la mano.</li>
                    <li>**Retirarse (Fold):** Si no quieres seguir jugando la mano (porque tus cartas no son buenas o no quieres igualar una apuesta), te "retiras". Pierdes las fichas que ya apostaste en esa mano.</li>
                </ul>

                <h3 className="guide-subtitle">
                    Fases del Juego:
                </h3>
                <ul className="guide-list">
                    <li>**Pre-Flop:** Recibes tus 2 cartas. Se pagan las "ciegas" (apuestas iniciales obligatorias).</li>
                    <li>**Flop:** Se revelan 3 cartas comunitarias. Hay una ronda de apuestas.</li>
                    <li>**Turn:** Se revela la 4ª carta comunitaria. Otra ronda de apuestas.</li>
                    <li>**River:** Se revela la 5ª y última carta comunitaria. Última ronda de apuestas.</li>
                    <li>**Showdown:** Si quedan al menos dos jugadores, se revelan las manos y se determina
                        quién tiene la mejor combinación de 5 cartas (usando sus 2 cartas y las 5 comunitarias). El ganador se lleva el pozo.</li>
                </ul>

                <h3 className="guide-subtitle">
                    ¡A Jugar!
                </h3>
                <p className="game-guide-text">
                    Haz clic en "Iniciar Nueva Partida" para empezar. Sigue los mensajes en pantalla y los botones de acción para guiarte. ¡Diviértete!
                </p>
            </section>

            {/* DEBUG / TESTING PANEL */}
            <div className="debug-panel">
                <h2 className="debug-panel-title">Testing Controls (Dev Only)</h2>

                <div className="debug-buttons-group">
                    <button
                        onClick={() => {
                            // Example: Give player a Royal Flush
                            setPlayerHand([{ rank: '10', suit: '♥️' }, { rank: 'J', suit: '♥️' }]);
                            setCommunityCards([
                                { rank: 'Q', suit: '♥️' },
                                { rank: 'K', suit: '♥️' },
                                { rank: 'A', suit: '♥️' },
                                { rank: '2', suit: '♠️' }, // Dummy cards
                                { rank: '7', suit: '♣️' }
                            ]);
                            setGameMessage('Player set for Royal Flush!');
                            console.log('[DEBUG] Player hand set for Royal Flush.');
                        }}
                        className="debug-button" // Apply debug-button class
                    >
                        Set Player Royal Flush 👑
                    </button>
                    <button
                        onClick={() => {
                            // Example: Give AI a Straight Flush (e.g., 5-9 of Spades)
                            setAiHand([{ rank: '5', suit: '♠️' }, { rank: '6', suit: '♠️' }]);
                            setCommunityCards([
                                { rank: '7', suit: '♠️' },
                                { rank: '8', suit: '♠️' },
                                { rank: '9', suit: '♠️' },
                                { rank: 'A', suit: '♦️' }, // Dummy cards
                                { rank: 'K', suit: '♣️' }
                            ]);
                            setGameMessage('AI set for Straight Flush!');
                            console.log('[DEBUG] AI hand set for Straight Flush.');
                        }}
                        className="debug-button" // Apply debug-button class
                    >
                        Set AI Straight Flush ⚔️
                    </button>
                    <button
                        onClick={() => {
                            // Example: Force a tie (both get two pair with A, K on board)
                            setPlayerHand([{ rank: '2', suit: '♥️' }, { rank: '3', suit: '♦️' }]);
                            setAiHand([{ rank: '4', suit: '♣️' }, { rank: '5', suit: '♠️' }]);
                            setCommunityCards([
                                { rank: 'A', suit: '♠️' },
                                { rank: 'A', suit: '♣️' },
                                { rank: 'K', suit: '♦️' },
                                { rank: 'K', suit: '♥️' },
                                { rank: 'Q', suit: '♠️' }
                            ]);
                            setGameMessage('Hands set for a potential Tie!');
                            console.log('[DEBUG] Hands set for a tie.');
                        }}
                        className="debug-button" // Apply debug-button class
                    >
                        Force Tie Scenario 🤝
                    </button>
                    <button
                        onClick={() => {
                            setPlayerPesos(50); // Set player to low funds
                            setAiPesos(1000);
                            setGameMessage('Player funds set to low for testing.');
                            console.log('[DEBUG] Player funds set to 50.');
                        }}
                        className="debug-button" // Apply debug-button class
                    >
                        Set Player Low Funds 📉
                    </button>
                    <button
                        onClick={() => {
                            setAiPesos(50); // Set AI to low funds
                            setPlayerPesos(1000);
                            setGameMessage('AI funds set to low for testing.');
                            console.log('[DEBUG] AI funds set to 50.');
                        }}
                        className="debug-button" // Apply debug-button class
                    >
                        Set AI Low Funds 📉
                    </button>
                    <button
                        onClick={() => determineWinner()}
                        disabled={gamePhase !== 'river' && gamePhase !== 'showdown'}
                        className="debug-button" // Apply debug-button class
                    >
                        Force Showdown 🏁
                    </button>
                    <button
                        onClick={() => nextPhase()}
                        disabled={gamePhase === 'finished' || gamePhase === 'showdown'}
                        className="debug-button" // Apply debug-button class
                    >
                        Advance Phase Manually ▶️
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;