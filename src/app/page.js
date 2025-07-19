'use client';

config();

import Image from 'next/image';
import { GameProvider } from './gameContext';
import Game from './game';
import { config } from 'dotenv';

export default function Home() {
    return (
        <main className="flex flex-col m-8 gap-8 row-start-1 items-center font-[family-name:var(--font-geist-sans)]">
            <Image
                src="/wordlogo.svg"
                alt="Guesscaso logo"
                width={360}
                height={120}
                priority
            />
            <GameProvider>
                <Game />
            </GameProvider>

            <footer className="row-start-2 gap-4 flex flex-col flex-wrap items-center justify-center">
                <p className="text-center max-w-lg text-xs">
                    The backend may take a few seconds to deploy from a cold
                    start. Please give the image a few seconds to generate.
                    Thanks for playing!
                </p>

                <a
                    className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                    href="https://github.com/deenasun/guesscasso"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        aria-hidden
                        src="/globe.svg"
                        alt="Globe icon"
                        width={16}
                        height={16}
                    />
                    Guesscasso on Github
                </a>
            </footer>
        </main>
    );
}
