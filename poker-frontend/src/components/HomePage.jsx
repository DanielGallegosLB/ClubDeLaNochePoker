// poker-frontend/src/components/HomePage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';

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
        setLastPlayerToBet(null); // Resetear último en apostar al inicio de nueva fase
        setPlayerTurn(true); // Siempre empieza el jugador en las nuevas fases de apuesta

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
             playSound(dealCardSound, 1000); // Sonido al revelar River
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
        setGameMessage(message);
        setRoundMessage('Puedes Pasar, Apostar o Retirarte.');
        console.log(`[POKER LOG] Fase actual: ${nextPhaseName}. Turno del Jugador.`);
    }, [deck, communityCards, gamePhase, determineWinner, dealCardSound]);


    const checkEndOfRound = useCallback(() => {
        console.log('[POKER LOG] checkEndOfRound called.');
        console.log('playerContributionInRound:', playerContributionInRound);
        console.log('aiContributionInRound:', aiContributionInRound);
        console.log('currentBet:', currentBet);
        console.log('playerPesos:', playerPesos);
        console.log('aiPesos:', aiPesos);
        console.log('playerTurn:', playerTurn);
        console.log('lastPlayerToBet:', lastPlayerToBet);

        // Check for folds first (game-ending condition for the hand)
        if (gameMessage.includes('se ha retirado') && gameMessage.includes('Jugador')) {
            console.log('[POKER LOG] Player folded, AI wins the pot.');
            setAiPesos(prev => prev + pot);
            setPot(0);
            setGamePhase('finished');
            setRoundMessage('');
            setPlayerContributionInRound(0);
            setAiContributionInRound(0);
            playSound(loseSound);
            return;
        }
        if (gameMessage.includes('se ha retirado') && gameMessage.includes('IA')) {
            console.log('[POKER LOG] AI folded, Player wins the pot.');
            setPlayerPesos(prev => prev + pot);
            setPot(0);
            setGamePhase('finished');
            setRoundMessage('');
            setPlayerContributionInRound(0);
            setAiContributionInRound(0);
            playSound(winSound);
            return;
        }

        // Determine if the betting round is complete
        let roundComplete = false;

        // Condition 1: No current bet (all checked)
        if (currentBet === 0) {
            // Both players checked (implicitly or explicitly by cycle)
            if (playerContributionInRound === 0 && aiContributionInRound === 0 && lastPlayerToBet !== null) {
                roundComplete = true; // Both checked through a full cycle
            }
        }
        // Condition 2: There is a current bet
        else {
            const playerMatched = playerContributionInRound >= currentBet || playerPesos === 0; // Player matched or all-in
            const aiMatched = aiContributionInRound >= currentBet || aiPesos === 0;             // AI matched or all-in

            // Both matched the bet, or both are all-in, or one is all-in and the other matched/called.
            if (playerMatched && aiMatched) {
                // Now check if turns have cycled or one forced the other all-in
                if (lastPlayerToBet === 'player' && aiMatched) {
                     // Player raised, AI matched or went all-in
                    roundComplete = true;
                } else if (lastPlayerToBet === 'ai' && playerMatched) {
                     // AI raised, Player matched or went all-in
                    roundComplete = true;
                }
            }
        }

        if (roundComplete) {
            console.log('[POKER LOG] Betting round complete. Advancing to next phase.');
            setPlayerContributionInRound(0); // Reset for next phase
            setAiContributionInRound(0);     // Reset for next phase
            setCurrentBet(0);                // Reset current bet for next phase
            setLastPlayerToBet(null);        // Reset last player to bet for next phase
            setTimeout(() => nextPhase(), 1000);
            return;
        }

        // If round is NOT complete, pass the turn
        if (playerTurn) {
            console.log('[POKER LOG] Player acted, passing turn to AI.');
            setTimeout(() => aiTurn(), 1500);
        } else {
            console.log('[POKER LOG] AI acted, passing turn to Player.');
            setPlayerTurn(true);
        }
    }, [playerPesos, aiPesos, playerContributionInRound, aiContributionInRound, currentBet, gameMessage, lastPlayerToBet, playerTurn, pot, nextPhase, aiTurn, winSound, loseSound]);


    // Lógica de la IA
    const aiTurn = useCallback(() => {
        console.log('[POKER LOG] AI Turn initiated. Current game phase:', gamePhase);
        setIsProcessingTurn(true); // Disable buttons while AI thinks
        setPlayerTurn(false); // The player's turn ends

        const timeoutId = setTimeout(() => {
            console.log('[POKER LOG] AI Turn setTimeout callback fired.');
            let aiAction = '';
            let finalBetAmount = 0;
            const aiAggression = 0.4; // 0.0 (pasivo) a 1.0 (agresivo)

            const aiCurrentHandValue = evaluateHand(aiHand, communityCards);
            const aiHandStrength = aiCurrentHandValue[0]; // Tipo de mano (0-9)
            console.log('[POKER LOG] AI Hand Strength (0-9):', aiHandStrength);
            console.log('[POKER LOG] AI Pesos:', aiPesos);
            console.log('[POKER LOG] Current Bet (from player/blinds):', currentBet);
            console.log('[POKER LOG] AI Current Contribution in Round:', aiContributionInRound);
            console.log('[POKER LOG] Last Player to Bet:', lastPlayerToBet);
            console.log('[POKER LOG] Community Cards for AI evaluation:', communityCards);
            console.log('[POKER LOG] AI Hand for evaluation:', aiHand);

            // Calculate how much AI needs to match the current bet
            const amountToCall = currentBet - aiContributionInRound;
            console.log('[POKER LOG] AI Calculated amountToCall (to match currentBet):', amountToCall);

            if (currentBet > 0) { // There's an active bet (Call, Raise, Fold)
                console.log('[POKER LOG] AI: Hay una apuesta activa. La IA necesita responder.');

                if (aiPesos <= 0) { // AI has no money left, must fold if not already all-in
                    aiAction = 'fold';
                    console.log('[POKER LOG] AI: No tiene fondos, se retira.');
                } else if (aiHandStrength >= 3) { // Strong hand (Trío o mejor)
                    // Consider raising if enough funds, otherwise call, or all-in if cannot call fully
                    const potentialRaiseAmount = amountToCall + minRaise;
                    if (aiPesos >= potentialRaiseAmount && Math.random() < 0.7 + aiAggression) {
                        finalBetAmount = potentialRaiseAmount; // Full raise
                        aiAction = 'bet';
                        console.log(`[POKER LOG] AI: Mano fuerte, decide subir a ${finalBetAmount}.`);
                    } else if (aiPesos >= amountToCall) {
                        finalBetAmount = amountToCall; // Full call
                        aiAction = 'call';
                        console.log(`[POKER LOG] AI: Mano fuerte, decide igualar ${finalBetAmount}.`);
                    } else { // Cannot fully call, but has some money: Go all-in
                        finalBetAmount = aiPesos;
                        aiAction = 'all-in';
                        console.log(`[POKER LOG] AI: Mano fuerte, pero fondos insuficientes para igualar. Va All-In con ${finalBetAmount}.`);
                    }
                } else if (aiHandStrength >= 1) { // Moderate hand (Pareja o Doble Pareja)
                    // Higher chance to call, smaller chance to raise, some chance to fold
                    const potentialRaiseAmount = amountToCall + minRaise;
                    if (aiPesos >= potentialRaiseAmount && Math.random() < 0.3 + aiAggression) { // Small chance to raise
                        finalBetAmount = potentialRaiseAmount;
                        aiAction = 'bet';
                        console.log(`[POKER LOG] AI: Mano moderada, decide subir a ${finalBetAmount}.`);
                    } else if (aiPesos >= amountToCall) { // High chance to call
                        finalBetAmount = amountToCall;
                        aiAction = 'call';
                        console.log(`[POKER LOG] AI: Mano moderada, decide igualar ${finalBetAmount}.`);
                    } else { // Cannot fully call, but has some money: Go all-in or fold
                        if (Math.random() < 0.4) { // Small chance to all-in on desperation
                            finalBetAmount = aiPesos;
                            aiAction = 'all-in';
                            console.log(`[POKER LOG] AI: Mano moderada, fondos insuficientes. Va All-In con ${finalBetAmount}.`);
                        } else {
                            aiAction = 'fold';
                            console.log('[POKER LOG] AI: Mano moderada, fondos insuficientes. Decide retirarse.');
                        }
                    }
                } else { // Weak hand (Carta Alta)
                    // High chance to fold, small chance to bluff all-in if currentBet is low
                    if (aiPesos >= amountToCall) { // Can call, but hand is weak
                        if (Math.random() < 0.1) { // Very small chance to call/bluff call
                             finalBetAmount = amountToCall;
                             aiAction = 'call';
                             console.log(`[POKER LOG] AI: Mano débil, decide bluff-igualar ${finalBetAmount}.`);
                        } else {
                            aiAction = 'fold';
                            console.log('[POKER LOG] AI: Mano débil, decide retirarse.');
                        }
                    } else if (aiPesos > 0) { // Cannot fully call, but has some money, very small chance for all-in bluff
                        if (Math.random() < 0.05 + aiAggression) {
                            finalBetAmount = aiPesos;
                            aiAction = 'all-in';
                            console.log(`[POKER LOG] AI: Mano débil, intenta bluffear All-In con ${finalBetAmount}.`);
                        } else {
                            aiAction = 'fold';
                            console.log('[POKER LOG] AI: Mano débil, fondos insuficientes. Decide retirarse.');
                        }
                    } else { // No funds
                        aiAction = 'fold';
                        console.log('[POKER LOG] AI: No tiene fondos, se retira.');
                    }
                }
            } else { // No active bet (Check, Bet)
                console.log('[POKER LOG] AI: No hay apuesta activa. La IA puede Pasar o Apostar.');
                if (aiPesos <= 0) {
                    aiAction = 'check'; // Cannot bet
                    console.log('[POKER LOG] AI: No tiene fondos, pasa.');
                } else if (aiHandStrength >= 3) { // Strong hand: likely to bet
                    if (aiPesos >= minRaise) {
                        finalBetAmount = minRaise;
                        aiAction = 'bet';
                        console.log(`[POKER LOG] AI: Mano fuerte, decide apostar ${finalBetAmount}.`);
                    } else { // Not enough for minRaise, but wants to bet
                        finalBetAmount = aiPesos;
                        aiAction = 'all-in';
                        console.log(`[POKER LOG] AI: Mano fuerte, pero no suficiente para la subida mínima. Va All-In con ${finalBetAmount}.`);
                    }
                } else if (aiHandStrength >= 1) { // Moderate hand: some chance to bet, otherwise check
                    if (Math.random() > 0.4 - aiAggression && aiPesos >= minRaise) {
                        finalBetAmount = minRaise;
                        aiAction = 'bet';
                        console.log(`[POKER LOG] AI: Mano moderada, decide apostar ${finalBetAmount}.`);
                    } else if (aiPesos > 0 && Math.random() > 0.2 - aiAggression) { // Try all-in if cannot minRaise
                        finalBetAmount = aiPesos;
                        aiAction = 'all-in';
                        console.log(`[POKER LOG] AI: Mano moderada, pero no suficiente para la subida mínima. Va All-In con ${finalBetAmount}.`);
                    } else {
                        aiAction = 'check';
                        console.log('[POKER LOG] AI: Mano moderada, decide pasar.');
                    }
                } else { // Weak hand: mostly check, very small bluff bet
                    if (Math.random() < 0.05 + aiAggression && aiPesos >= minRaise) {
                        finalBetAmount = minRaise;
                        aiAction = 'bet';
                        console.log(`[POKER LOG] AI: Mano débil, intenta bluffear con ${finalBetAmount}.`);
                    } else if (aiPesos > 0 && Math.random() < 0.02) { // Very small all-in bluff
                        finalBetAmount = aiPesos;
                        aiAction = 'all-in';
                        console.log(`[POKER LOG] AI: Mano débil, intenta un all-in bluff con ${finalBetAmount}.`);
                    } else {
                        aiAction = 'check';
                        console.log('[POKER LOG] AI: Mano débil, decide pasar.');
                    }
                }
            }

            console.log('[POKER LOG] AI decided action:', aiAction);

            // Execute AI's chosen action
            switch (aiAction) {
                case 'call':
                    const actualCallAmount = Math.min(amountToCall, aiPesos); // Ensure AI doesn't over-call if all-in
                    setAiPesos(prev => prev - actualCallAmount);
                    setPot(prev => prev + actualCallAmount);
                    setAiContributionInRound(prev => prev + actualCallAmount);
                    setRoundMessage(`La IA iguala con ${parseInt(actualCallAmount).toLocaleString()} pesos.`);
                    playSound(chipBetSound);
                    break;
                case 'bet': // This is a raise
                    setAiPesos(prev => prev - finalBetAmount);
                    setPot(prev => prev + finalBetAmount);
                    setAiContributionInRound(prev => prev + finalBetAmount);
                    setCurrentBet(aiContributionInRound + finalBetAmount); // AI's new total contribution is the current highest bet
                    setLastPlayerToBet('ai');
                    setRoundMessage(`La IA sube a ${parseInt(aiContributionInRound + finalBetAmount).toLocaleString()} pesos.`);
                    playSound(chipBetSound);
                    break;
                case 'all-in':
                    const allInAmount = aiPesos; // Take all remaining AI pesos
                    setAiPesos(0);
                    setPot(prev => prev + allInAmount);
                    setAiContributionInRound(prev => prev + allInAmount);
                    // If AI's all-in is MORE than currentBet, it becomes the new current bet.
                    // If less, currentBet remains what it was (player's bet).
                    if (aiContributionInRound + allInAmount > currentBet) {
                        setCurrentBet(aiContributionInRound + allInAmount);
                    }
                    setLastPlayerToBet('ai');
                    setGameMessage(`La IA va All-In con ${parseInt(allInAmount).toLocaleString()} pesos.`); // Use gameMessage for prominent status
                    setRoundMessage(''); // Clear round message
                    playSound(chipBetSound);
                    break;
                case 'fold':
                    setGameMessage('La IA se ha retirado de la mano.'); // Set global game message for fold
                    setRoundMessage('');
                    setAiHand([]); // AI's hand is no longer active
                    // The pot distribution for folds is handled by checkEndOfRound
                    break;
                case 'check':
                    setRoundMessage('La IA pasa.');
                    break;
                default:
                    console.error("AI: Acción desconocida:", aiAction);
                    break;
            }

            setIsProcessingTurn(false);
            // After AI acts, always check end of round
            if (aiAction !== 'fold') { // If AI folded, checkEndOfRound will be triggered by gameMessage change
                checkEndOfRound();
            }
        }, 1500); // AI thinking time
        return () => clearTimeout(timeoutId); // Cleanup timeout if component unmounts
    }, [aiHand, aiPesos, communityCards, currentBet, aiContributionInRound, lastPlayerToBet, gamePhase, minRaise, pot, checkEndOfRound, chipBetSound, winSound, loseSound]); // Added all necessary dependencies

    // Player Actions
    const handleFold = () => {
        playSound(buttonClickSound);
        setIsProcessingTurn(true);
        setGameMessage(`¡${username} se ha retirado de la mano!`); // This message is critical for checkEndOfRound to detect fold
        setRoundMessage('');
        setPlayerHand([]); // Player's hand is no longer active
        // Pot distribution for folds is handled by checkEndOfRound
        setTimeout(() => {
            setIsProcessingTurn(false);
            setPlayerTurn(false); // End player's turn to trigger checkEndOfRound flow
            // checkEndOfRound will be called by effect on gameMessage change or directly if needed
        }, 500);
    };

    const handleCheck = () => {
        playSound(buttonClickSound);
        setIsProcessingTurn(true);
        if (currentBet > playerContributionInRound) {
            setRoundMessage('No puedes pasar, hay una apuesta activa. Debes igualar, subir o retirarte.');
            setIsProcessingTurn(false);
            return;
        }
        setRoundMessage('Has pasado.');
        setLastPlayerToBet('player'); // Player checked
        setCustomBetInput('');
        setTimeout(() => {
            setIsProcessingTurn(false);
            setPlayerTurn(false); // Pass turn to AI
            checkEndOfRound(); // Check if round ends after player check
        }, 1000);
    };

    const handleCall = () => {
        playSound(chipBetSound);
        setIsProcessingTurn(true);
        const amountToCall = currentBet - playerContributionInRound;

        if (amountToCall <= 0) { // Should not happen if button disabled correctly
            setRoundMessage('No hay apuesta para igualar.');
            setIsProcessingTurn(false);
            return;
        }

        let actualMoneyPutIn;
        if (playerPesos < amountToCall) {
            // Player cannot afford to call fully, goes All-In with remaining pesos
            actualMoneyPutIn = playerPesos;
            setPlayerPesos(0);
            setRoundMessage(`No tienes suficientes para igualar, ¡Has ido All-In con ${parseInt(actualMoneyPutIn).toLocaleString()} pesos!`);
        } else {
            // Player can afford to call fully
            actualMoneyPutIn = amountToCall;
            setPlayerPesos(prev => prev - actualMoneyPutIn);
            setRoundMessage(`Has igualado la apuesta de ${parseInt(currentBet).toLocaleString()} pesos.`);
        }

        setPot(prev => prev + actualMoneyPutIn);
        setPlayerContributionInRound(prev => prev + actualMoneyPutIn); // Add to current round contribution
        setLastPlayerToBet('player'); // Player is last to act
        setCustomBetInput(''); // Clear custom bet input

        setTimeout(() => {
            setIsProcessingTurn(false);
            setPlayerTurn(false);
            checkEndOfRound();
        }, 1000);
    };

    const handleBet = () => {
        playSound(chipBetSound);
        setIsProcessingTurn(true);
        let betAmount = parseInt(customBetInput);
        if (isNaN(betAmount) || betAmount <= 0) {
            setRoundMessage('Por favor, ingresa una cantidad válida para apostar.');
            setIsProcessingTurn(false);
            return;
        }

        const amountToMatchCurrentBet = currentBet - playerContributionInRound; // How much player needs to put to match currentBet
        let totalPlayerCommitment = playerContributionInRound + betAmount;

        // Validation for bet amount
        if (currentBet > 0) { // If there's an existing bet (this is a raise or call)
            // Player must at least match currentBet and raise by minRaise
            const minimumRaiseAmount = amountToMatchCurrentBet + minRaise;
            if (betAmount < minimumRaiseAmount && betAmount !== playerPesos) { // If it's not an all-in
                setRoundMessage(`Para subir, tu apuesta debe ser al menos ${minimumRaiseAmount} pesos (igualar ${amountToMatchCurrentBet} y subir ${minRaise}).`);
                setIsProcessingTurn(false);
                return;
            }
        } else { // No current bet (this is an initial bet)
            if (betAmount < minRaise && betAmount !== playerPesos) { // If it's not an all-in
                setRoundMessage(`La apuesta inicial debe ser de al menos ${minRaise} pesos.`);
                setIsProcessingTurn(false);
                return;
            }
        }

        let actualMoneyPutIn;
        let newPlayerTotalContribution;

        if (betAmount >= playerPesos) { // Player goes All-In
            actualMoneyPutIn = playerPesos;
            newPlayerTotalContribution = playerContributionInRound + actualMoneyPutIn;
            setPlayerPesos(0); // Player has 0 pesos left
            setRoundMessage(`¡Has ido All-In con ${parseInt(actualMoneyPutIn).toLocaleString()} pesos!`);
        } else { // Normal bet/raise
            actualMoneyPutIn = betAmount;
            newPlayerTotalContribution = playerContributionInRound + actualMoneyPutIn;
            setPlayerPesos(prev => prev - actualMoneyPutIn);

            if (newPlayerTotalContribution > currentBet) { // This is a raise
                setRoundMessage(`Has subido a ${parseInt(newPlayerTotalContribution).toLocaleString()} pesos.`);
            } else { // This is a call (should be handled by handleCall mostly, but included for completeness)
                setRoundMessage(`Has apostado ${parseInt(actualMoneyPutIn).toLocaleString()} pesos.`);
            }
        }

        setPot(prev => prev + actualMoneyPutIn);
        setPlayerContributionInRound(newPlayerTotalContribution); // Update player's total contribution in this round

        // Update currentBet only if player's total contribution is now higher
        if (newPlayerTotalContribution > currentBet) {
            setCurrentBet(newPlayerTotalContribution);
        }
        setLastPlayerToBet('player');
        setCustomBetInput('');

        setTimeout(() => {
            setIsProcessingTurn(false);
            setPlayerTurn(false);
            checkEndOfRound();
        }, 1000);
    };

    const handleAllIn = () => {
        playSound(chipBetSound);
        setIsProcessingTurn(true);

        if (playerPesos <= 0) {
            setRoundMessage('No tienes pesos para ir All-In.');
            setIsProcessingTurn(false);
            return;
        }

        const allInAmount = playerPesos; // Player puts all their money in
        const newPlayerTotalContribution = playerContributionInRound + allInAmount;

        setPlayerPesos(0); // Player's pesos go to 0
        setPot(prev => prev + allInAmount);
        setPlayerContributionInRound(newPlayerTotalContribution);

        // If player's all-in is more than the current highest bet, it becomes the new current bet
        if (newPlayerTotalContribution > currentBet) {
            setCurrentBet(newPlayerTotalContribution);
        }
        setLastPlayerToBet('player');
        setGameMessage(`¡Has ido All-In con ${parseInt(allInAmount).toLocaleString()} pesos!`);
        setRoundMessage(''); // Clear round message
        setCustomBetInput(''); // Clear custom bet input

        setTimeout(() => {
            setIsProcessingTurn(false);
            setPlayerTurn(false);
            checkEndOfRound();
        }, 1000);
    };

    // Use effect to trigger AI turn or check end of round when playerTurn changes
    useEffect(() => {
        if (!playerTurn && gamePhase !== 'finished' && gamePhase !== 'showdown') {
            console.log('[POKER LOG] PlayerTurn is false, triggering AI turn if not already folded.');
            if (!(gameMessage.includes('se ha retirado') && gameMessage.includes('Jugador'))) { // Only if player hasn't folded
                 aiTurn();
            }
        }
    }, [playerTurn, gamePhase, gameMessage, aiTurn]);

    // Use effect for checking end of round logic related to game messages
    useEffect(() => {
        // If a fold message appears, trigger checkEndOfRound to distribute pot
        if ((gameMessage.includes('se ha retirado') && (gameMessage.includes('Jugador') || gameMessage.includes('IA')))) {
            console.log('[POKER LOG] Fold detected via gameMessage. Triggering checkEndOfRound.');
            // Allow a small delay for UI updates before checking end of round
            setTimeout(() => {
                checkEndOfRound();
            }, 500);
        }
    }, [gameMessage, checkEndOfRound]);


    return (
        <div className="homepage-container">
            {/* Audio elements */}
            <audio ref={dealCardSound} src="/sounds/card_deal.mp3" preload="auto"></audio>
            <audio ref={chipBetSound} src="/sounds/chip_bet.mp3" preload="auto"></audio>
            <audio ref={winSound} src="/sounds/win_sound.mp3" preload="auto"></audio>
            <audio ref={loseSound} src="/sounds/lose_sound.mp3" preload="auto"></audio>
            <audio ref={buttonClickSound} src="/sounds/button_click.mp3" preload="auto"></audio>


            <div className="game-container">
                {/* AI Area */}
                <div className="player-area ai-area">
                    <div className="player-info">
                        <h3>IA</h3>
                        <p>Pesos: <span className={`player-pesos ${winningChipsVisible && showdownWinner === 'ai' ? 'winning-chips-animation' : ''}`}>{parseInt(aiPesos).toLocaleString()}</span></p>
                    </div>
                    <div className="hand-area">
                        {aiHand.map((card, index) => (
                            <Card key={index} card={card} hidden={gamePhase !== 'showdown' && gamePhase !== 'finished'} />
                        ))}
                    </div>
                </div>

                {/* Community Cards Area */}
                <div className="community-cards-area">
                    <div className="pot-display">
                        <h2>Pozo: {parseInt(pot).toLocaleString()}</h2>
                        <PotDisplayChips amount={pot} />
                    </div>
                    <div className="community-cards">
                        {communityCards.map((card, index) => (
                            <Card key={index} card={card} />
                        ))}
                    </div>
                </div>

                {/* Player Area */}
                <div className="player-area player-main-area">
                    <div className="hand-area player-hand-area">
                        {playerHand.map((card, index) => (
                            <Card key={index} card={card} />
                        ))}
                    </div>
                    <div className="player-info">
                        <h3>{username}</h3>
                        <p>Pesos: <span className={`player-pesos ${winningChipsVisible && showdownWinner === 'player' ? 'winning-chips-animation' : ''}`}>{parseInt(playerPesos).toLocaleString()}</span></p>
                    </div>
                </div>
            </div>

            {/* Game Controls and Messages */}
            <div className="game-controls">
                <p className="game-message">{gameMessage}</p>
                <p className="round-message">{roundMessage}</p>

                {gamePhase === 'finished' ? (
                    <button onClick={startGame} disabled={isProcessingTurn}>Iniciar Nueva Partida</button>
                ) : (
                    <div className="action-buttons">
                        {playerTurn && (
                            <>
                                <button onClick={handleFold} disabled={isProcessingTurn}>Retirarse</button>
                                <button
                                    onClick={handleCheck}
                                    disabled={isProcessingTurn || currentBet > playerContributionInRound}
                                >
                                    Pasar
                                </button>
                                <button
                                    onClick={handleCall}
                                    disabled={isProcessingTurn || currentBet === playerContributionInRound || playerPesos === 0}
                                >
                                    {currentBet > 0 ? `Igualar ${parseInt(currentBet - playerContributionInRound).toLocaleString()}` : 'No hay apuesta para igualar'}
                                </button>
                                <input
                                    type="number"
                                    value={customBetInput}
                                    onChange={(e) => setCustomBetInput(e.target.value)}
                                    placeholder="Apuesta/Subida"
                                    min={currentBet > 0 ? (currentBet - playerContributionInRound) + minRaise : minRaise} // Min bet/raise
                                    max={playerPesos}
                                    disabled={isProcessingTurn}
                                />
                                <button
                                    onClick={handleBet}
                                    disabled={isProcessingTurn || (customBetInput === '' || parseInt(customBetInput) <= 0) || (parseInt(customBetInput) < ((currentBet > 0 ? (currentBet - playerContributionInRound) + minRaise : minRaise)) && parseInt(customBetInput) !== playerPesos) || playerPesos === 0}
                                >
                                    Apostar/Subir
                                </button>
                                <button
                                    onClick={handleAllIn}
                                    disabled={isProcessingTurn || playerPesos === 0}
                                >
                                    All-In {playerPesos > 0 ? parseInt(playerPesos).toLocaleString() : ''}
                                </button>
                            </>
                        )}
                        {/* Debug Buttons - Remove in production */}
                        <div className="debug-panel">
                            <h3>Debug Panel</h3>
                            <button
                                onClick={() => {
                                    setPlayerPesos(50); // Set player to low funds
                                    setAiPesos(1000);
                                    setGameMessage('Player funds set to low for testing.');
                                    console.log('[DEBUG] Player funds set to 50.');
                                }}
                                className="debug-button"
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
                                className="debug-button"
                            >
                                Set AI Low Funds 📉
                            </button>
                            <button
                                onClick={() => determineWinner()}
                                disabled={gamePhase !== 'river' && gamePhase !== 'showdown'}
                                className="debug-button"
                            >
                                Force Showdown 🏁
                            </button>
                            <button
                                onClick={() => nextPhase()}
                                disabled={gamePhase === 'finished' || gamePhase === 'showdown'}
                                className="debug-button"
                            >
                                Advance Phase Manually ▶️
                            </button>
                        </div>
                    </div>
                )}
            </div>
             <AnimatedPotTransfer potAmount={pot} winner={showdownWinner} />
        </div>
    );
};

export default HomePage;