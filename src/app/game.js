import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import Image from 'next/image';
import { GameContext } from './gameContext';

function Game() {
    const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : process.env.NEXT_PUBLIC_API_URL;
    const TIME_PER_ROUND = 20; // Round duration in seconds
    const NUM_IMAGES = 10; // Number of images + noisy images

    // Consolidated game state - single source of truth
    const [gameState, setGameState] = useState('initial'); // 'initial', 'loading', 'running', 'ended'
    const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
    const [guess, setGuess] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Group image-related state
    const [imageData, setImageData] = useState({
        images: [],
        loaded: {},
    });

    const {
        score,
        numRounds,
        addToScore,
        resetScore,
        incrementRounds,
        categories,
        updateCategories,
        correctWords,
        updateCorrectWords,
    } = useContext(GameContext);

    // Derived state using useMemo for efficiency
    const isNewGame = useMemo(() => numRounds === 0, [numRounds]);
    const isGameRunning = useMemo(() => gameState === 'running', [gameState]);
    const isLoading = useMemo(() => gameState === 'loading', [gameState]);
    const isGameEnded = useMemo(() => gameState === 'ended', [gameState]);
    
    const allImagesReady = useMemo(() => {
        if (imageData.images.length === 0) return false;
        const loadedCount = Object.keys(imageData.loaded).length;
        const allLoaded = Object.values(imageData.loaded).every(loaded => loaded);
        return loadedCount === imageData.images.length && allLoaded;
    }, [imageData.loaded, imageData.images.length]);

    const isGameRunningRef = useRef(isGameRunning);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => {
        isGameRunningRef.current = isGameRunning;
    }, [isGameRunning]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    // Start the game
    const startGame = async () => {
        setGameState('loading');
        setTimeLeft(TIME_PER_ROUND);
        incrementRounds();
        setGuess('');
        setCurrentImageIndex(0);
        setImageData({ images: [], loaded: {} });
        
        // Clear old game data to prevent showing stale info
        updateCategories([]);
        updateCorrectWords([]);
        
        // Fetch images and start when data is ready
        await fetchImage();
        setGameState('running');
    };

    const stopGame = () => {
        setGameState('ended');
    };

    // Main game loop using useEffect
    useEffect(() => {
        if (!isGameRunning || !allImagesReady) return; // Wait for all images to be ready

        const loadImageAndStartTimer = async () => {
            const interval = setInterval(() => {
                if (!isGameRunningRef.current) {
                    clearInterval(interval);
                    return;
                }
                setTimeLeft((prevTime) => {
                    if (prevTime - 1 <= 0) {
                        clearInterval(interval);
                        stopGame();
                        return TIME_PER_ROUND;
                    }
                    return prevTime - 1;
                });

                const timeElapsed = TIME_PER_ROUND - timeLeftRef.current;
                const divisor = Math.floor(TIME_PER_ROUND / NUM_IMAGES);
                const newImageIndex = Math.min(Math.floor(timeElapsed / divisor), NUM_IMAGES - 1);
                setCurrentImageIndex(newImageIndex);
            }, 1000);

            return () => {
                stopGame();
                clearInterval(interval)
            };
        };

        loadImageAndStartTimer();
    }, [isGameRunning, allImagesReady]);

    // Fetch the generated image from the API
    const fetchImage = async () => {
        try {
            const endpoint = `${apiUrl}/api/generate`;
            const response = await fetch(endpoint);
            const data = await response.json();
            
            // Update all data simultaneously to avoid timing issues
            setImageData(prev => ({ ...prev, images: data.images }));
            updateCategories(data.categories);
            updateCorrectWords(data.correctWords);
            
            // Ensure state updates are applied
            return data;
        } catch (error) {
            console.error('Error fetching image:', error);
            throw error;
        }
    };

    const checkAnswer = async (userGuess) => {
        const answer = `${correctWords[0]} ${correctWords[1]}`;
        try {
            const endpoint = `${apiUrl}/api/evaluate`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answer,
                    userGuess,
                }),
            });
            const data = await response.json();
            if (data.score == 1) {
                const additonalScore = timeLeftRef.current * 10;
                addToScore(additonalScore);
                stopGame();
            }
        } catch (error) {
            console.error('Error checking answer:', error);
        }
    };

    const handleAction = (submittedGuess) => {
        if (isGameRunning) {
            checkAnswer(submittedGuess);
        }
    };

    const getTimeColor = () => {
        if (timeLeft > 10) return 'text-green-500';
        if (timeLeft > 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    const handleImageLoad = (index) => {
        setImageData(prev => ({ 
            ...prev, 
            loaded: { ...prev.loaded, [index]: true } 
        }));
    };

    const handleImageError = (index) => {
        console.error(`Failed to load image at index ${index}`);
        setImageData(prev => ({ 
            ...prev, 
            loaded: { ...prev.loaded, [index]: true } 
        }));
    };

    return (
        <>
            <div className="flex flex-col w-full self-center items-center justify-items-center gap-4 font-[family-name:var(--font-geist-sans)]">
                {
                    <>
                        {isNewGame && gameState === 'initial' ? (
                            <Image
                                src="initialscreen.svg"
                                alt="Generated Image"
                                width={448}
                                height={448}
                                className="w-full max-w-[400px] bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
                                onClick={startGame}
                            />
                        ) : (
                            <div className="relative w-full max-w-[400px] h-[400px] bg-gray-200 rounded-lg overflow-hidden">
                                {imageData.images.length > 0 ? (
                                    <>
                                        {imageData.images.map((imageSrc, index) => (
                                            <div
                                                key={index}
                                                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                                                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                                                }`}
                                                style={{
                                                    willChange: 'opacity',
                                                    backfaceVisibility: 'hidden',
                                                    transform: 'translateZ(0)'
                                                }}
                                            >
                                                <Image
                                                    src={imageSrc}
                                                    alt="Generated Image"
                                                    width={448}
                                                    height={448}
                                                    className="w-full h-full object-cover"
                                                    priority={index === 0}
                                                    onLoad={() => handleImageLoad(index)}
                                                    onError={() => handleImageError(index)}
                                                    sizes="400px"
                                                />
                                            </div>
                                        ))}
                                        {!allImagesReady && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
                                                <div className="text-sm text-gray-600 animate-pulse">
                                                    Loading images...
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <Image
                                            src="placeholder.svg"
                                            alt="Loading..."
                                            width={448}
                                            height={448}
                                            className="w-full h-full object-cover opacity-50"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                }
                <p className="w-200 text-xl text-center sm:text-center font-[family-name:var(--font-geist-mono)]  font-bold">
                    Round: {numRounds} | Score: {score}
                </p>
                <p
                    className={`text-xl font-bold ${getTimeColor()} w-200 text-md text-center sm:text-center font-[family-name:var(--font-geist-mono)]`}
                >
                    Time left: {timeLeft} seconds
                </p>

                <div className="flex items-center gap-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleAction(e.target[0].value);
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            placeholder="Enter your guess"
                            className="rounded-md bg-gray-200 p-2 disabled:opacity-50 width: 400"
                            disabled={!isGameRunning}
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                        />

                        <input type="submit" disabled={!isGameRunning} hidden />
                    </form>

                    {!isGameRunning ? (
                        <button
                            onClick={startGame}
                            className={`rounded-md p-2 h-[40px] w-[100px] transition-colors duration-200 ${
                                isLoading || (imageData.images.length > 0 && !allImagesReady)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-100 hover:bg-green-200 text-gray-800'
                            }`}
                            disabled={isLoading || (imageData.images.length > 0 && !allImagesReady)}
                        >
                            {isNewGame ? 'Start Game' : (isLoading || (imageData.images.length > 0 && !allImagesReady)) ? 'Loading...' : 'Next Round'}
                        </button>
                    ) : (
                        <button
                            onClick={stopGame}
                            className="rounded-md bg-red-100 p-2 h-[40px] w-[100px]"
                        >
                            Stop Game
                        </button>
                    )}
                </div>

                {imageData.images.length === 0 ? null : (
                    <div className="mt-4 text-center">
                        {(isGameRunning || isLoading) && categories.length > 0 ? (
                            <p className="text-sm text-gray-600">
                                The categories are{' '}
                                <span className="text-blue-600 font-bold">
                                    {categories[0]}
                                </span>{' '}
                                and{' '}
                                <span className="text-green-600 font-bold">
                                    {categories[1]}
                                </span>
                                .
                            </p>
                        ) : isGameEnded && correctWords.length > 0 ? (
                            <div>
                                <p className="text-lg font-semibold text-black-500">
                                    Round over! Final Score: {score}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    Correct words were:{' '}
                                    <span className="text-blue-600 font-bold">
                                        {correctWords[0]}
                                    </span>{' '}
                                    and{' '}
                                    <span className="text-green-600 font-bold">
                                        {correctWords[1]}
                                    </span>
                                    .
                                </p>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </>
    );
}

export default Game;
