import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
import random
from flask import Flask, jsonify, request
from io import BytesIO
from PIL import Image
import base64
from groq import Groq
import numpy as np

# run this in the api directory: gunicorn --timoeout 120 app:app
# gunicorn -c gunicorn_config.py app:app

# Load environment variables from .env file
load_dotenv()

random_seed = random.randint(0, 1)
app = Flask(__name__)

# Initialize Hugging Face client
client = InferenceClient(
    api_key=os.getenv("HUGGINGFACE_API_KEY")
)

# Initialize Groq client
groq_client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

params = {
    "width": 448,
    "height": 448,
    "num_inference_steps": 10,
    "guidance_scale": 10,
    "seed": random_seed
}

@app.route('/')
def hello():
    return "Hello, World!"

def add_noise_to_image(image_array, noise_level=10):
    """
    Add random noise to an image.
    
    :param image_array: numpy array of shape (512, 512, 3)
    :param noise_level: float, the amount of noise to add
    :return: numpy array with noise added
    """
    noise = np.random.randn(*image_array.shape) * noise_level
    noisy_image = image_array + noise
    noisy_image = np.clip(noisy_image, 0, 255)  # Ensure values are within valid range
    return noisy_image.astype(np.uint8)

@app.route('/api/generate')
def run_model():  # prompt is text
    folder_path = "words"
    word_dict = {}

    for file in os.scandir(folder_path):
        if file.is_file():
            category = os.path.splitext(file.name)[0]

            with open(file.path, "r", encoding="utf-8") as f:
                words = [line.strip().lower() for line in f.readlines()]

            word_dict[category] = words

    category1, category2 = random.sample(tuple(word_dict.keys()), 2)
    word1, word2 = random.choice(word_dict[category1]), random.choice(word_dict[category2])
    prompt = f"A single creature that is a {word1} and a {word2} merged together into one entity"
    # neg = "split, two separate things, half-and-half, side-by-side, blurry, low resolution"
    print(f"started generation for the words {word1} and {word2}")

    try:
        img = client.text_to_image(
        prompt,
        model="stabilityai/stable-diffusion-3.5-large",
        **params
        )
        np_img = np.array(img)
        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)  # Move to the beginning of the buffer
        img_base64 = base64.b64encode(img_io.getvalue()).decode('utf-8')

        noisy_images_base64 = [f'data:image/png;base64,{img_base64}']
        np_img = np.array(img)
        # add 4 more noisy images
        for _ in range(9):
            np_img_noisy = add_noise_to_image(np_img, noise_level=20)
            img_noisy = Image.fromarray(np_img_noisy)
            img_io = BytesIO()
            img_noisy.save(img_io, 'PNG')
            img_io.seek(0)  # Move to the beginning of the buffer
            img_base64 = base64.b64encode(img_io.getvalue()).decode('utf-8')
            noisy_images_base64.append(f'data:image/png;base64,{img_base64}')
            np_img = np.array(img_noisy)
        
        print("finished generation")
    except Exception as e:
        print("generation failed:", e)
        img = Image.new('RGB', (512, 512), color='blue')
        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)  # Move to the beginning of the buffer
        img_base64 = base64.b64encode(img_io.getvalue()).decode('utf-8')
        noisy_images_base64 = [f'data:image/png;base64,{img_base64}'] * 5

    noisy_images_base64 = noisy_images_base64[::-1]
    return jsonify({'categories': [category1, category2], 'correctWords': [word1, word2],'images': noisy_images_base64})

@app.route('/api/evaluate', methods=['POST'])
def check():
    data = request.json
    guess = data.get('userGuess')
    answer = data.get('answer')
    print("GUESS", guess, "ANSWER", answer)
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
I will give you a guess and an answer. Give a score of 1 if the guess is similar semantically (i.e. a synonym) to the answer and a score of 0 otherwise.
Please only return a single number of either 0 or 1.
Guess: {guess}
Answer: {answer}"""
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    print("LLM score", chat_completion.choices[0].message.content)
    return jsonify({'score': chat_completion.choices[0].message.content, 'status': 'ok'})
