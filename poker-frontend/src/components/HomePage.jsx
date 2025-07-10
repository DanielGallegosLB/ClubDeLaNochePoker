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


    // 1. Crear referencias para las funciones
    const aiTurnRef = useRef();
    const checkEndOfRoundRef = useRef();

    // Nuevos estados para la lógica de apuestas
    const [playerContributionInRound, setPlayerContributionInRound] = useState(0); // Total de pesos que el jugador ha puesto en la ronda actual
    const [aiContributionInRound, setAiContributionInRound] = useState(0);     // Total de pesos que la IA ha puesto en la ronda actual
    const [isProcessingTurn, setIsProcessingTurn] = useState(false); // Para deshabilitar botones durante el procesamiento
    const [customBetInput, setCustomBetInput] = useState(''); // Para la entrada de apuesta personalizada

    const minRaise = 20; // Cantidad mínima para una subida

    // Helper para calcular la cantidad a pagar para un objetivo de apuesta total
    const getAmountToPayForTarget = (targetTotalBet) => {
        const amount = targetTotalBet - playerContributionInRound;
        return amount > 0 ? amount : 0; // Asegurarse de que no sea negativo
    };



    // --- Referencias de audio ---
    // UPDATED AUDIO PATHS HERE
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
    }, [deck, communityCards, gamePhase, determineWinner]); // Removed audio refs from dependencies

    const checkEndOfRound = useCallback(() => {
        console.log('[POKER LOG] checkEndOfRound called.');
        console.log('playerContributionInRound:', playerContributionInRound);
        console.log('aiContributionInRound:', aiContributionInRound);
        console.log('currentBet:', currentBet);
        console.log('playerPesos:', playerPesos);
        console.log('aiPesos:', aiPesos);
        console.log('playerTurn:', playerTurn);
        console.log('lastPlayerToBet:', lastPlayerToBet);

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

        let roundComplete = false;

        if (currentBet === 0) {
            if (playerContributionInRound === 0 && aiContributionInRound === 0 && lastPlayerToBet !== null) {
                roundComplete = true;
            }
        } else {
            const playerMatched = playerContributionInRound >= currentBet || playerPesos === 0;
            const aiMatched = aiContributionInRound >= currentBet || aiPesos === 0;

            if (playerMatched && aiMatched) {
                if (lastPlayerToBet === 'player' && aiMatched) {
                    roundComplete = true;
                } else if (lastPlayerToBet === 'ai' && playerMatched) {
                    roundComplete = true;
                }
            }
        }

        if (roundComplete) {
            console.log('[POKER LOG] Betting round complete. Advancing to next phase.');
            setPlayerContributionInRound(0);
            setAiContributionInRound(0);
            setCurrentBet(0);
            setLastPlayerToBet(null);
            setTimeout(() => nextPhase(), 1000);
            return;
        }

        if (playerTurn) {
            console.log('[POKER LOG] Player acted, passing turn to AI.');
            setTimeout(() => aiTurnRef.current(), 1500); // 🎯 Llamada a través de la referencia
        } else {
            console.log('[POKER LOG] AI acted, passing turn to Player.');
            setPlayerTurn(true);
        }
    }, [playerPesos, aiPesos, playerContributionInRound, aiContributionInRound, currentBet, gameMessage, lastPlayerToBet, playerTurn, pot, nextPhase, winSound, loseSound]);


    // hereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
   const aiTurn = useCallback(() => {
        console.log('[POKER LOG] AI Turn initiated. Current game phase:', gamePhase);
        setIsProcessingTurn(true);
        setPlayerTurn(false);

        const timeoutId = setTimeout(() => {
            console.log('[POKER LOG] AI Turn setTimeout callback fired.');
            let aiAction = '';
            let finalBetAmount = 0;
            const aiCurrentHandValue = evaluateHand(aiHand, communityCards);
            const aiHandStrength = aiCurrentHandValue[0];
            const playersInHand = (playerPesos > 0 ? 1 : 0) + (aiPesos > 0 ? 1 : 0);

            console.log('[POKER LOG] AI Hand Strength (0-9):', aiHandStrength);
            console.log('[POKER LOG] AI Pesos:', aiPesos);
            console.log('[POKER LOG] Current Bet (from player):', currentBet);
            console.log('[POKER LOG] AI Current Contribution in Round:', aiContributionInRound);
            console.log('[POKER LOG] Last Player to Bet:', lastPlayerToBet);
            console.log('Community Cards for AI evaluation: \n', communityCards);
            console.log('AI Hand for evaluation: \n', aiHand);
            console.log('Pot size:', pot);

            const amountToCall = currentBet - aiContributionInRound;
            console.log('[POKER LOG] AI Calculated amountToCall:', amountToCall);

            const FOLD_THRESHOLD_WEAK = 2;
            const CALL_THRESHOLD_MEDIUM = 4;
            const BET_THRESHOLD_STRONG = 6;
            const BLUFF_CHANCE = 0.15;
            const AGGRESSION_FACTOR = 0.6;
            const MIN_BET = 20;

            if (amountToCall <= 0) {
                if (aiHandStrength >= BET_THRESHOLD_STRONG) {
                    finalBetAmount = Math.min(aiPesos, Math.round(pot * AGGRESSION_FACTOR));
                    aiAction = 'bet';
                    if (finalBetAmount < MIN_BET && aiPesos >= MIN_BET) {
                        finalBetAmount = MIN_BET;
                    } else if (finalBetAmount === 0 && aiPesos > 0) {
                        finalBetAmount = MIN_BET;
                    }
                    console.log('[POKER LOG] AI: Mano fuerte. Decidió Apostar/Subir.');
                } else if (aiHandStrength >= CALL_THRESHOLD_MEDIUM) {
                    if (Math.random() < 0.3 && aiPesos >= MIN_BET) {
                        finalBetAmount = Math.min(aiPesos, Math.max(MIN_BET, Math.round(pot * 0.15)));
                        aiAction = 'bet';
                        console.log('[POKER LOG] AI: Mano media. Decidió Apostar pequeño.');
                    } else {
                        aiAction = 'check';
                        console.log('[POKER LOG] AI: Mano media. Decidió Pasar.');
                    }
                } else {
                    if (Math.random() < BLUFF_CHANCE && playersInHand <= 2 && aiPesos >= MIN_BET) {
                        const bluffAmount = Math.min(aiPesos, Math.round(pot * 0.25));
                        finalBetAmount = bluffAmount > 0 ? Math.max(MIN_BET, bluffAmount) : MIN_BET;
                        aiAction = 'bet';
                        console.log('[POKER LOG] AI: Mano débil. Intentando Bluffear.');
                    } else {
                        aiAction = 'check';
                        console.log('[POKER LOG] AI: Mano débil. Decidió Pasar.');
                    }
                }
            } else {
                const potOdds = (pot + amountToCall) / amountToCall;
                const canCall = aiPesos >= amountToCall;
                const canRaise = aiPesos >= amountToCall + minRaise;

                if (aiHandStrength >= BET_THRESHOLD_STRONG) {
                    if (canRaise) {
                        const raiseAmount = Math.min(aiPesos, amountToCall + Math.max(minRaise, Math.round(pot * 0.75)));
                        aiAction = 'raise';
                        finalBetAmount = raiseAmount;
                        console.log('[POKER LOG] AI: Mano MUY fuerte. Decidió Subir.');
                    } else if (canCall) {
                        aiAction = 'call';
                        finalBetAmount = amountToCall;
                        console.log('[POKER LOG] AI: Mano MUY fuerte. No puede subir, así que Pagó.');
                    } else {
                        aiAction = 'fold';
                        console.log('[POKER LOG] AI: Mano MUY fuerte pero sin fondos para pagar. Se retiró.');
                    }
                } else if (aiHandStrength >= CALL_THRESHOLD_MEDIUM) {
                    const callPercentageOfPot = amountToCall / pot;
                    if (canCall && (callPercentageOfPot < 0.4 || potOdds > 2.5)) {
                        aiAction = 'call';
                        finalBetAmount = amountToCall;
                        console.log('[POKER LOG] AI: Mano media. Decidió Pagar.');
                    } else if (canRaise && Math.random() < (BLUFF_CHANCE / 2)) {
                        const bluffRaiseAmount = Math.min(aiPesos, amountToCall + Math.max(minRaise, Math.round(pot * 0.5)));
                        aiAction = 'raise';
                        finalBetAmount = bluffRaiseAmount;
                        console.log('[POKER LOG] AI: Mano media. Intentando semi-bluff Subir.');
                    } else {
                        aiAction = 'fold';
                        console.log('[POKER LOG] AI: Mano media pero apuesta demasiado alta. Se retiró.');
                    }
                } else {
                    const callPercentageOfPot = amountToCall / pot;
                    if (canCall && callPercentageOfPot < 0.1) {
                        aiAction = 'call';
                        finalBetAmount = amountToCall;
                        console.log('[POKER LOG] AI: Mano débil, pero la apuesta es muy pequeña. Decidió Pagar.');
                    } else if (canRaise && Math.random() < (BLUFF_CHANCE / 3) && playersInHand <= 2) {
                        const bluffAmount = Math.min(aiPesos, amountToCall + Math.max(minRaise, Math.round(pot * 0.3)));
                        aiAction = 'raise';
                        finalBetAmount = bluffAmount;
                        console.log('[POKER LOG] AI: Mano débil. Intentando bluff-Subir.');
                    } else {
                        aiAction = 'fold';
                        console.log('[POKER LOG] AI: Mano débil y apuesta significativa. Decidió Retirarse.');
                    }
                }
            }

            if (aiAction === 'fold') {
                setGameMessage('La IA se ha retirado. ¡Has ganado el pozo!');
                setGamePhase('finished');
                setPot(0);
                setPlayerTurn(true);
                setIsProcessingTurn(false);
                setRoundMessage('');
                setPlayerContributionInRound(0);
                setAiContributionInRound(0);
                playSound(winSound);
                console.log('[POKER LOG] AI Action: Fold. El jugador gana el pozo.');
            } else if (aiAction === 'check') {
                setGameMessage('La IA ha pasado.');
                setPlayerTurn(true);
                setIsProcessingTurn(false);
                setLastPlayerToBet(prev => (prev === null ? 'ai' : prev));
                console.log('[POKER LOG] AI Action: Check.');
                checkEndOfRoundRef.current(); // 🎯 Llamada a través de la referencia
            } else if (aiAction === 'call') {
                if (aiPesos < amountToCall) {
                    finalBetAmount = aiPesos;
                    setGameMessage(`La IA ha ido All-in con ${parseInt(finalBetAmount).toLocaleString()} pesos.`);
                    console.log('[POKER LOG] AI Action: All-in (Call).');
                } else {
                    setGameMessage(`La IA ha pagado ${parseInt(amountToCall).toLocaleString()} pesos.`);
                    console.log('[POKER LOG] AI Action: Call.');
                }
                setAiPesos(prev => prev - finalBetAmount);
                setPot(prev => prev + finalBetAmount);
                setAiContributionInRound(prev => prev + finalBetAmount);
                setCurrentBet(currentBet);
                setLastPlayerToBet('ai');
                setPlayerTurn(true);
                setIsProcessingTurn(false);
                playSound(chipBetSound);
                checkEndOfRoundRef.current(); // 🎯 Llamada a través de la referencia
            } else if (aiAction === 'bet' || aiAction === 'raise') {
                let actualBetAmount = finalBetAmount;
                if (aiPesos < actualBetAmount) {
                    actualBetAmount = aiPesos;
                }
                setAiPesos(prev => prev - actualBetAmount);
                setPot(prev => prev + actualBetAmount);
                setAiContributionInRound(prev => prev + actualBetAmount);
                setCurrentBet(aiContributionInRound + actualBetAmount);
                setLastPlayerToBet('ai');
                setGameMessage(`La IA ha ${aiAction === 'bet' ? 'apostado' : 'subido a'} ${parseInt(aiContributionInRound + actualBetAmount).toLocaleString()} pesos.`);
                setRoundMessage('Es tu turno. Necesitas Pagar o Subir.');
                setPlayerTurn(true);
                setIsProcessingTurn(false);
                playSound(chipBetSound);
                console.log(`[POKER LOG] AI Action: ${aiAction}. New CurrentBet: ${aiContributionInRound + actualBetAmount}. Pozo: ${pot + actualBetAmount}. Turno de la IA.`);
                checkEndOfRoundRef.current(); // 🎯 Llamada a través de la referencia
            }
        }, 1500);
        return () => clearTimeout(timeoutId);
    }, [aiHand, communityCards, aiPesos, pot, currentBet, aiContributionInRound, lastPlayerToBet, gamePhase, determineWinner, setGameMessage, setAiPesos, setPot, setAiContributionInRound, setCurrentBet, setLastPlayerToBet, setPlayerTurn, setIsProcessingTurn, setRoundMessage, minRaise, chipBetSound, loseSound]); // MinRaise y sonidos si son usados dentro

    
    useEffect(() => {
        aiTurnRef.current = aiTurn;
    }, [aiTurn]);

    useEffect(() => {
        checkEndOfRoundRef.current = checkEndOfRound;
    }, [checkEndOfRound]);


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

    

    // Lógica de la IA (MODIFICADA)

    




    

    // Manejadores de acciones del jugador
    const handleFold = () => {
        playSound(buttonClickSound);
        if (isProcessingTurn) return; // Prevenir acciones mientras la IA piensa
        setGameMessage('Te has retirado. La IA gana el pozo.');
        setGamePhase('finished');
        setPot(0); // El pozo se transfiere en checkEndOfRound
        setPlayerTurn(false); // No es el turno del jugador
        setRoundMessage('');
        setPlayerContributionInRound(0);
        setAiContributionInRound(0);
        playSound(loseSound);
        console.log('[POKER LOG] Jugador: Se ha retirado.');
        // No llamamos checkEndOfRound porque el juego termina para esta mano
    };

    const handleCheck = () => {
        playSound(buttonClickSound);
        if (isProcessingTurn) return;
        if (currentBet > playerContributionInRound) {
            setGameMessage('No puedes pasar si hay una apuesta activa. Debes Igualar, Subir o Retirarte.');
            return;
        }
        setGameMessage('Has pasado.');
        setLastPlayerToBet('player'); // El jugador fue el último en actuar (pasar)
        setPlayerTurn(false); // Pasa el turno a la IA
        console.log('[POKER LOG] Jugador: Ha pasado.');
        checkEndOfRound(); // Verificar si la ronda ha terminado
    };

    const handleCall = () => {
        playSound(buttonClickSound);
        if (isProcessingTurn) return;
        const amountToCall = currentBet - playerContributionInRound;
        if (amountToCall <= 0) {
            setGameMessage('No hay apuesta para igualar. Puedes Apostar o Pasar.');
            return;
        }
        if (playerPesos < amountToCall) {
            setGameMessage('No tienes suficientes pesos para Igualar. ¡Estás All-in!');
            const allInAmount = playerPesos;
            setPlayerPesos(0);
            setPot(prev => prev + allInAmount);
            setPlayerContributionInRound(prev => prev + allInAmount);
            setCurrentBet(Math.max(currentBet, playerContributionInRound + allInAmount)); // La apuesta actual es el total que el jugador ha puesto
            setLastPlayerToBet('player'); // El jugador fue el último en actuar (all-in)
            console.log(`[POKER LOG] Jugador: All-in con ${allInAmount}. New CurrentBet: ${currentBet}. Pozo: ${pot + allInAmount}. Turno de la IA.`);
        } else {
            setPlayerPesos(prev => prev - amountToCall);
            setPot(prev => prev + amountToCall);
            setPlayerContributionInRound(prev => prev + amountToCall);
            setLastPlayerToBet('player'); // El jugador fue el último en actuar (igualar)
            setGameMessage(`Has igualado ${parseInt(amountToCall).toLocaleString()} pesos.`);
            console.log(`[POKER LOG] Jugador: Igualó ${amountToCall}. New CurrentBet: ${currentBet}. Pozo: ${pot + amountToCall}. Turno de la IA.`);
        }
        setPlayerTurn(false); // Pasa el turno a la IA
        playSound(chipBetSound);
        checkEndOfRound(); // Verificar si la ronda ha terminado
    };

    const handleBet = (amount) => {
        playSound(buttonClickSound);
        if (isProcessingTurn) return;

        // Si se llama desde el input personalizado, `amount` será el evento
        let betAmount = amount;
        if (typeof amount !== 'number') {
            betAmount = parseInt(customBetInput, 10);
        }

        if (isNaN(betAmount) || betAmount <= 0) {
            setGameMessage('Por favor, ingresa una cantidad de apuesta válida.');
            return;
        }

        const amountToCall = currentBet - playerContributionInRound;
        const totalBet = playerContributionInRound + betAmount;

        // Regla de póker: una apuesta o subida debe ser al menos el tamaño de la apuesta previa + la subida previa
        // O si no hay apuesta previa, al menos la ciega grande (o minRaise)
        const minimumBetOrRaise = currentBet > 0 ? (currentBet + minRaise) : minRaise;

        if (betAmount < minimumBetOrRaise && playerPesos > betAmount) { // Solo si no es all-in
            setGameMessage(`La apuesta debe ser al menos ${parseInt(minimumBetOrRaise).toLocaleString()} o igualar la apuesta actual (${parseInt(currentBet).toLocaleString()}) y luego subir.`);
            return;
        }

        if (totalBet < currentBet) {
             setGameMessage(`Tu apuesta total (${parseInt(totalBet).toLocaleString()}) es menor que la apuesta actual (${parseInt(currentBet).toLocaleString()}). Debes Igualar o Subir.`);
             return;
         }

        if (playerPesos < betAmount) {
            // El jugador va all-in
            const allInAmount = playerPesos;
            setPlayerPesos(0);
            setPot(prev => prev + allInAmount);
            setPlayerContributionInRound(prev => prev + allInAmount);
            setCurrentBet(Math.max(currentBet, playerContributionInRound + allInAmount)); // La apuesta actual es el total que el jugador ha puesto
            setLastPlayerToBet('player'); // El jugador fue el último en apostar (all-in)
            setGameMessage(`¡Has ido All-in con ${parseInt(allInAmount).toLocaleString()} pesos!`);
            console.log(`[POKER LOG] Jugador: All-in con ${allInAmount}. New CurrentBet: ${currentBet}. Pozo: ${pot + allInAmount}. Turno de la IA.`);
        } else {
            setPlayerPesos(prev => prev - betAmount);
            setPot(prev => prev + betAmount);
            setPlayerContributionInRound(prev => prev + betAmount);
            setCurrentBet(Math.max(currentBet, totalBet)); // Actualizar la apuesta más alta
            setLastPlayerToBet('player'); // El jugador fue el último en apostar
            setGameMessage(`Has apostado ${parseInt(betAmount).toLocaleString()} pesos.`);
            console.log(`[POKER LOG] Jugador: Apostó ${betAmount}. New CurrentBet: ${Math.max(currentBet, totalBet)}. Pozo: ${pot + betAmount}. Turno de la IA.`);
        }
        setCustomBetInput(''); // Limpiar el input después de apostar
        setPlayerTurn(false); // Pasa el turno a la IA
        playSound(chipBetSound);
        checkEndOfRound(); // Verificar si la ronda ha terminado
    };

    const handleRaise = () => {
        playSound(buttonClickSound);
        if (isProcessingTurn) return;
        let raiseAmount = parseInt(customBetInput, 10); // Asumimos que se usa el input para el raise

        if (isNaN(raiseAmount) || raiseAmount <= 0) {
            setGameMessage('Por favor, ingresa una cantidad de subida válida.');
            return;
        }

        const amountToCall = currentBet - playerContributionInRound;
        const totalBetIfCall = playerContributionInRound + amountToCall;
        const newTotalBet = totalBetIfCall + raiseAmount;

        // Validar que la subida sea al menos el minRaise
        if (raiseAmount < minRaise) {
            setGameMessage(`La subida debe ser de al menos ${parseInt(minRaise).toLocaleString()} pesos.`);
            return;
        }

        // Validar que el jugador tenga suficientes pesos para la subida
        if (playerPesos < amountToCall + raiseAmount) {
            setGameMessage('No tienes suficientes pesos para esa subida. ¡Considera ir All-in!');
            return;
        }

        setPlayerPesos(prev => prev - (amountToCall + raiseAmount));
        setPot(prev => prev + (amountToCall + raiseAmount));
        setPlayerContributionInRound(prev => prev + (amountToCall + raiseAmount));
        setCurrentBet(newTotalBet); // La nueva apuesta más alta es el total de la subida
        setLastPlayerToBet('player'); // El jugador fue el último en subir
        setGameMessage(`Has subido a ${parseInt(newTotalBet).toLocaleString()} pesos.`);
        setRoundMessage('La IA necesita responder a tu subida.');
        setCustomBetInput(''); // Limpiar el input después de subir
        setPlayerTurn(false); // Pasa el turno a la IA
        playSound(chipBetSound);
        console.log(`[POKER LOG] Jugador: Subió ${raiseAmount}. New CurrentBet: ${newTotalBet}. Pozo: ${pot + amountToCall + raiseAmount}. Turno de la IA.`);
        checkEndOfRound(); // Verificar si la ronda ha terminado
    };


    const handleCustomBetChange = (e) => {
        setCustomBetInput(e.target.value);
    };

    // Función para obtener el botón de acción adecuado para "Apostar" / "Subir"
    const getBetOrRaiseButton = () => {
        const amountToCall = currentBet - playerContributionInRound;
        const isPlayerBehind = amountToCall > 0;
        const playerCanBet = playerPesos > 0;

        if (!playerCanBet) {
            return <button disabled className="action-button disabled">Sin Fondos</button>;
        }

        if (isPlayerBehind) { // Si hay una apuesta que igualar
            // Puedes Igualar o Subir
            const canCall = playerPesos >= amountToCall;
            const canRaise = playerPesos >= amountToCall + minRaise;

            if (canCall && !canRaise) { // Solo puede igualar o ir all-in
                return (
                    <button
                        onClick={handleCall}
                        disabled={isProcessingTurn || !playerTurn || playerPesos === 0}
                        className="action-button call-button"
                    >
                        Igualar ({parseInt(amountToCall).toLocaleString()})
                    </button>
                );
            } else if (canRaise) { // Puede igualar o subir
                return (
                    <>
                        <button
                            onClick={handleCall}
                            disabled={isProcessingTurn || !playerTurn || playerPesos === 0}
                            className="action-button call-button"
                        >
                            Igualar ({parseInt(amountToCall).toLocaleString()})
                        </button>
                        <input
                            type="number"
                            value={customBetInput}
                            onChange={handleCustomBetChange}
                            placeholder="Cantidad de subida"
                            min={minRaise}
                            step="10"
                            className="bet-input"
                            disabled={isProcessingTurn || !playerTurn}
                        />
                        <button
                            onClick={handleRaise}
                            disabled={isProcessingTurn || !playerTurn || isNaN(parseInt(customBetInput, 10)) || parseInt(customBetInput, 10) < minRaise || playerPesos < (amountToCall + parseInt(customBetInput, 10))}
                            className="action-button raise-button"
                        >
                            Subir
                        </button>
                    </>
                );
            } else { // No puede igualar (menos fondos que amountToCall) -> solo Fold o All-in (manejado en handleCall)
                 return (
                    <button
                        onClick={handleCall} // Esto manejará el All-in si no tiene suficiente
                        disabled={isProcessingTurn || !playerTurn || playerPesos === 0}
                        className="action-button call-button"
                    >
                        All-in ({parseInt(playerPesos).toLocaleString()})
                    </button>
                );
            }

        } else { // No hay apuesta que igualar (Puede Pasar o Apostar)
            return (
                <>
                    <button
                        onClick={handleCheck}
                        disabled={isProcessingTurn || !playerTurn}
                        className="action-button check-button"
                    >
                        Pasar
                    </button>
                    <input
                        type="number"
                        value={customBetInput}
                        onChange={handleCustomBetChange}
                        placeholder="Cantidad de apuesta"
                        min={minRaise} // Puedes ajustar el mínimo de la primera apuesta
                        step="10"
                        className="bet-input"
                        disabled={isProcessingTurn || !playerTurn}
                    />
                    <button
                        onClick={handleBet}
                        disabled={isProcessingTurn || !playerTurn || isNaN(parseInt(customBetInput, 10)) || parseInt(customBetInput, 10) <= 0 || playerPesos < parseInt(customBetInput, 10)}
                        className="action-button bet-button"
                    >
                        Apostar
                    </button>
                </>
            );
        }
    };

    const handlePlayerCall = () => {
        console.log('[POKER LOG] Jugador: Intentando Igualar.');
        console.log(`[POKER LOG] Player Current Contribution in Round: ${playerContributionInRound}`);
        console.log(`[POKER LOG] Current Highest Bet: ${currentBet}`);

        if (isProcessingTurn) return;
        setIsProcessingTurn(true);
        // Asegúrate de que 'playSound' y 'buttonClickSound' estén definidos/importados
        // playSound(buttonClickSound); // Sonido de clic de botón

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
        // Asegúrate de que 'playSound' y 'chipBetSound' estén definidos/importados
        // playSound(chipBetSound); // Sonido de apuesta
        console.log(`[POKER LOG] Jugador: Igualó ${callAmount}. Pozo: ${parseInt(pot + callAmount).toLocaleString()}.`);
        nextPhase();
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

    // Calcular montos de apuesta dinámicos para mostrar en los botones
    // Estos representan el *total* al que ascendería la apuesta si se elige esa opción
    const playerMinBetAmount = currentBet === 0 ? minRaise : currentBet + minRaise;
    // Si el pozo es 0 (ej. al inicio de una ronda sin ciegas aún), evita NaN o infinitos
    const playerHalfPotBetAmount = currentBet === 0 ? Math.floor(pot / 2) : currentBet + Math.floor(pot / 2);
    const playerPotBetAmount = currentBet === 0 ? pot : currentBet + pot;

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


    return (
        <div className="home-page-container">
            {/* UPDATED AUDIO SOURCE PATHS */}
            <audio ref={dealCardSound} src="/sounds/deal_card.mp3" preload="auto"></audio>
            <audio ref={chipBetSound} src="/sounds/chip_bet.mp3" preload="auto"></audio>
            <audio ref={winSound} src="/sounds/win_game.mp3" preload="auto"></audio>
            <audio ref={loseSound} src="/sounds/lose_game.mp3" preload="auto"></audio>
            <audio ref={buttonClickSound} src="/sounds/button_click.mp3" preload="auto"></audio>

            <div className="navbar">
                <div className='user-info-panel'>
                    <h1 className="game-title">Club de la Noche Poker</h1>
                <div className="user-info-panel">
                    <p>Bienvenido, <span className="user-greeting">{username}</span>!</p>
                    <p>Pesos: <span className={`player-pesos ${winningChipsVisible ? 'winning-chips-animation' : ''}`}>{parseInt(playerPesos).toLocaleString()}</span></p>
                    <button onClick={onLogout} className="logout-button">Cerrar Sesión</button>
                </div>

                </div>
                
            </div>

            <div className="game-main-content">
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
            </div>

            {/* Mensaje de Ganador/Perdedor al final */}
                {gamePhase === 'finished' && showdownWinner && (
                    <div className={`showdown-result-message ${showdownWinner}`}>
                        {gameMessage} {/* Usa gameMessage que ahora contiene la información de victoria/derrota */}
                    </div>
                )}

                
            



            <div className="game-action-buttons">
    <p className="game-message">{gameMessage}</p>
    <p className="round-message">{roundMessage}</p>

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

    {/* Debug Controls (visible only in development) */}
    {import.meta.env.DEV && (
        <div className="debug-controls">
            <h4>Debug Controls</h4>
            <div className="debug-buttons-row">
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