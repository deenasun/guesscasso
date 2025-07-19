# Guesscasso

## [Try Guesscasso online!](https://guesscasso.onrender.com/)

Guesscasso is a funky spin on the popular online multiplayer game [skribbl.io](https://skribbl.io/) and the exciting party game Pictionary! Instead of competing to guess what another human player is drawing, in Guesscasso a diffusion model generates a wacky image by combining two random words. Players must try to guess the correct word before the diffusion model's output denoises fully. Experience the unexpected creativity of diffusion models, watch as the models try to generate their best interpretation of what an eagle-banana hybrid might look like, and have fun unraveling the artistic creations they cook up as you race against the clock and increase your score!

## Tech stack
**Backend**: Python, Flask, Gunicorn, Gradio, Groq

**Frontend**: Next.js, Javascript, React, CSS, Tailwind

**Deployment**: Render

## Running Guesscasso locally
Clone the Guesscasso repository
```
git clone https://github.com/deenasun/guesscasso.git
```

Start the backend Flask service
```
cd src/api && gunicorn -c gunicorn_config.py app:app
```

In another terminal, start the frontend
```
npm run dev
```

Open up your browser, navigate to localhost:3000, and start playing with Guesscasso!
