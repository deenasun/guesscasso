import os
import random
from flask import Flask, jsonify, request
from flask_cors import CORS
from io import BytesIO
from PIL import Image
import base64
from groq import Groq
import numpy as np
from gradio_client import Client


# run this in the api directory: gunicorn --timeout 120 app:app
# gunicorn -c gunicorn_config.py app:app

app = Flask(__name__)

# Configure CORS to allow requests from your frontend
CORS(app, origins=[
    "http://localhost:3000",
    "https://guesscasso.onrender.com"
])

# Initialize Gradio client to connect to HuggingFace image generation model
client = Client("black-forest-labs/FLUX.1-schnell")


# Initialize Groq client
groq_client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)


@app.route('/')
def hello():
    return "Hello, World!"


def add_gaussian_noise_to_image(image_array, noise_level=10):
    """
    Add Gaussian noise to an image.

    :param image_array: numpy array of shape (H, W, 3)
    :param noise_level: float, the amount of noise to add 
                        (0-100, where 100 = very high noise)
    :return: numpy array with Gaussian noise added
    """
    # Convert to float for processing
    image_float = image_array.astype(np.float32)
    
    # Calculate standard deviation based on noise_level
    std_dev = noise_level * 2
    
    # Generate Gaussian noise with mean=0 and calculated std deviation
    gaussian_noise = np.random.normal(0, std_dev, image_array.shape)
    
    # Add noise to the image
    noisy_image = image_float + gaussian_noise
    
    # Ensure values are within valid range
    noisy_image = np.clip(noisy_image, 0, 255)
    return noisy_image.astype(np.uint8)


def image_to_base64(image_array):
    """
    Convert numpy array to base64 string efficiently.
    :param image_array: numpy array of shape (H, W, 3)
    :return: base64 string
    """
    img = Image.fromarray(image_array)
    img_io = BytesIO()
    img.save(img_io, 'PNG', optimize=True)
    img_io.seek(0)
    return base64.b64encode(img_io.getvalue()).decode('utf-8')


@app.route('/api/generate')
def run_model():
    # Image generation parameters
    params = {
        "seed": 0,
        "randomize_seed": True,
        "width": 512,
        "height": 512,
        "num_inference_steps": 5,
    }

    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    folder_path = os.path.join(script_dir, "words")
    word_dict = {}

    for file in os.scandir(folder_path):
        if file.is_file():
            category = os.path.splitext(file.name)[0]

            with open(file.path, "r", encoding="utf-8") as f:
                words = [line.strip().lower() for line in f.readlines()]

            word_dict[category] = words

    category1, category2 = random.sample(tuple(word_dict.keys()), 2)
    word1 = random.choice(word_dict[category1])
    word2 = random.choice(word_dict[category2])
    prompt = f"{word1} and {word2} merged together into one hybrid entity"
    print(f"started generation for the words {word1} and {word2}")

    try:
        # generate image. result is a tuple (filepath, random_seed)
        result = client.predict(
                prompt=prompt,
                api_name="/infer",
                **params
        )

        # Extract the image file path from the result tuple
        image_path = result[0]

        # Load the image from the file path
        img = Image.open(image_path)

        # Convert to numpy array once
        np_img = np.array(img)

        # Generate base64 for original image
        original_base64 = image_to_base64(np_img)
        noisy_images_base64 = [f'data:image/png;base64,{original_base64}']

        # Generate 9 more noisy versions with increasing Gaussian noise levels
        for i in range(9):
            # Create gradual noise progression: 10%, 20%, 30%, ..., 90%
            noise_level = (i + 1) * 10
            np_img_noisy = add_gaussian_noise_to_image(
                np_img, noise_level=noise_level
            )
            noisy_base64 = image_to_base64(np_img_noisy)
            noisy_images_base64.append(f'data:image/png;base64,{noisy_base64}')

        print("finished generation")

    except Exception as e:
        print("generation failed:", e)
        # Create a simple blue image as fallback
        fallback_img = np.full((512, 512, 3), [0, 0, 255], dtype=np.uint8)
        fallback_base64 = image_to_base64(fallback_img)
        noisy_images_base64 = [f'data:image/png;base64,{fallback_base64}'] * 10

    # Reverse the order as in original code
    noisy_images_base64 = noisy_images_base64[::-1]
    return jsonify({
        'categories': [category1, category2], 
        'correctWords': [word1, word2],
        'images': noisy_images_base64
    })


@app.route('/api/evaluate', methods=['POST'])
def check():
    data = request.json
    if data is None:
        return jsonify({'error': 'No JSON data provided'}), 400

    guess = data.get('userGuess')
    answer = data.get('answer')
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""
I will give you a guess and an answer. Give a score of 1 if the guess is 
similar semantically (i.e. a synonym) to the answer and a score of 0 otherwise.
Please only return a single number of either 0 or 1.
Guess: {guess}
Answer: {answer}"""
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    return jsonify({
        'score': chat_completion.choices[0].message.content, 
        'status': 'ok'
    })
