import React, { useState, useEffect, useContext, useRef } from 'react';
import Image from 'next/image';
import { GameContext } from './gameContext';

function Game() {
    const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : process.env.NEXT_PUBLIC_API_URL;
    const TIME_PER_ROUND = 20; // Round duration in seconds
    const NUM_IMAGES = 10; // Number of images + noisy images

    const [newGame, setNewGame] = useState(true); // State to check if this is the first time a game has loaded
    const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND); // Time elapsed in the current round
    const [isGameRunning, setIsGameRunning] = useState(false); // Whether the game is running
    const [guess, setGuess] = useState(''); // User's guess
    const [image, setImage] = useState(''); // Current image
    const [images, setImages] = useState([]); // List of generated images
    const [gameOver, setGameOver] = useState(false); // State for whether the current round is up

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

    const isGameRunningRef = useRef(isGameRunning);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => {
        isGameRunningRef.current = isGameRunning;
    }, [isGameRunning]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    // Start the game
    const startGame = () => {
        setNewGame(false);
        setTimeLeft(TIME_PER_ROUND); // Reset timer
        incrementRounds(); // Increment the number of rounds
        setGuess(''); // Reset the user's guess
        setImage(''); // Reset the image
        fetchImage().then(() => setIsGameRunning(true)); // Fetch the initial image, then start the game
    };

    const stopGame = () => {
        setIsGameRunning(false);
        setGameOver(true);
    };

    // Main game loop using useEffect
    useEffect(() => {
        if (!isGameRunning) return; // Exit if the game is not running

        const loadImageAndStartTimer = async () => {
            const interval = setInterval(() => {
                if (!isGameRunningRef.current) {
                    clearInterval(interval); // Stop the interval if the game is not running
                    return;
                }
                setTimeLeft((prevTime) => {
                    if (prevTime - 1 <= 0) {
                        clearInterval(interval); // Stop the timer when round ends
                        stopGame(); // End the game and set gameOver state
                        return TIME_PER_ROUND;
                    }
                    return prevTime - 1; // Decrement elapsed time
                });

                const timeElapsed = TIME_PER_ROUND - timeLeftRef.current;
                const divisor = Math.floor(TIME_PER_ROUND / NUM_IMAGES);
                const currentImageIndex = Math.floor(timeElapsed / divisor);
                setImage(images[currentImageIndex]);
            }, 1000); // Run every second

            return () => {
                stopGame();
                clearInterval(interval)
            };
        };

        loadImageAndStartTimer();
    }, [isGameRunning]);

    // Fetch the generated image from the API
    const fetchImage = async () => {
        try {
            const endpoint = `${apiUrl}/api/generate`;
            const response = await fetch(endpoint);
            const data = await response.json();
            setImages(data.images);
            updateCategories(data.categories);
            updateCorrectWords(data.correctWords);
        } catch (error) {
            console.error('Error fetching image:', error);
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
        if (timeLeft > 10) return 'text-green-500'; // Safe time
        if (timeLeft > 5) return 'text-yellow-500'; // Warning
        return 'text-red-500'; // Critical time
    };

    return (
        <>
            <div className="flex flex-col w-full self-center items-center justify-items-center gap-4 font-[family-name:var(--font-geist-sans)]">
                {
                    <>
                        {newGame ? (
                            <Image
                                src="initialscreen.svg"
                                alt="Generated Image"
                                width={448}
                                height={448}
                                className="w-full max-w-[400px] bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
                                onClick={() => {
                                    newGame ? startGame() : null;
                                }}
                            />
                        ) : (
                            <Image
                                src={image || '\placeholder.svg'}
                                alt="Generated Image"
                                width={448}
                                height={448}
                                className="w-full max-w-[400px] bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center"
                            />
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
                            className="rounded-md bg-green-100 p-2 h-[40px] hover:bg-green-200"
                        >
                            {numRounds == 0 ? 'Start Game' : 'Next Round'}
                        </button>
                    ) : (
                        <button
                            onClick={stopGame}
                            className="rounded-md bg-red-100 p-2 h-[40px]"
                        >
                            Stop Game
                        </button>
                    )}
                </div>

                {!image ? null : (
                    <div className="mt-4 text-center">
                        {isGameRunning ? (
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
                        ) : (
                                gameOver && (
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
                            ))
                        }
                    </div>
                )}
            </div>
        </>
    );
}

export default Game;
