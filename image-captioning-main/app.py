import os
# Cross-platform Keras cache handling
os.environ['KERAS_HOME'] = os.path.join(os.getcwd(), '.keras_cache')

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.vgg16 import VGG16, preprocess_input
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, LSTM, Embedding, Dropout, add
import io

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
MODEL_PATH = './100epoch_best_model.h5'
CAPTIONS_PATH = './archive/captions.txt'
MAX_LENGTH = 35

# Global variables for models and tokenizer
vgg_model = None
caption_model = None
tokenizer = None

def load_vgg_model():
    model = VGG16()
    model = Model(inputs=model.inputs, outputs=model.layers[-2].output)
    return model

def build_model(vocab_size, max_length):
    inputs1 = Input(shape=(4096,))
    fe1 = Dropout(0.4)(inputs1)
    fe2 = Dense(256, activation='relu')(fe1)
    inputs2 = Input(shape=(max_length,))
    se1 = Embedding(vocab_size, 256, mask_zero=True)(inputs2)
    se2 = Dropout(0.4)(se1)
    se3 = LSTM(256)(se2)
    decoder1 = add([fe2, se3])
    decoder2 = Dense(256, activation='relu')(decoder1)
    outputs = Dense(vocab_size, activation='softmax')(decoder2)
    model = Model(inputs=[inputs1, inputs2], outputs=outputs)
    model.compile(loss='categorical_crossentropy', optimizer='adam')
    return model

def get_tokenizer(captions_path):
    if not os.path.exists(captions_path):
        return None
    with open(captions_path, 'r') as f:
        next(f)
        captions_doc = f.read()
    mapping = {}
    for line in captions_doc.split('\n'):
        tokens = line.split(',')
        if len(line) < 2: continue
        image_id, caption = tokens[0], tokens[1:]
        image_id = image_id.split('.')[0]
        caption = " ".join(caption).lower().replace('[^A-Za-z]', '').replace('\s+', ' ')
        caption = 'startseq ' + " ".join([word for word in caption.split() if len(word)>1]) + ' endseq'
        if image_id not in mapping: mapping[image_id] = []
        mapping[image_id].append(caption)
    all_captions = [cap for caps in mapping.values() for cap in caps]
    tokenizer = Tokenizer()
    tokenizer.fit_on_texts(all_captions)
    return tokenizer

def idx_to_word(integer, tokenizer):
    for word, index in tokenizer.word_index.items():
        if index == integer: return word
    return None

def predict_caption(model, image_feature, tokenizer, max_length):
    in_text = 'startseq'
    for i in range(max_length):
        sequence = tokenizer.texts_to_sequences([in_text])[0]
        sequence = pad_sequences([sequence], max_length)
        yhat = model.predict([image_feature, sequence], verbose=0)
        yhat = np.argmax(yhat)
        word = idx_to_word(yhat, tokenizer)
        if word is None: break
        in_text += " " + word
        if word == 'endseq': break
    return in_text.replace('startseq ', '').replace(' endseq', '')

def init_models():
    global vgg_model, caption_model, tokenizer
    print("Initializing models. This may take a moment...")
    tokenizer = get_tokenizer(CAPTIONS_PATH)
    vocab_size = len(tokenizer.word_index) + 1
    vgg_model = load_vgg_model()
    caption_model = build_model(vocab_size, MAX_LENGTH)
    caption_model.load_weights(MODEL_PATH)
    print("Models initialized successfully.")

# Initialize models once on startup
init_models()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    img_bytes = file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB').resize((224, 224))
    
    img_array = img_to_array(img)
    img_array = img_array.reshape((1, 224, 224, 3))
    img_array = preprocess_input(img_array)
    
    feature = vgg_model.predict(img_array, verbose=0)
    caption = predict_caption(caption_model, feature, tokenizer, MAX_LENGTH)
    
    # Improved logic to extract action (primary verb)
    words = caption.split()
    action = "Unknown"
    # 1. Look for 'ing' words (highest priority)
    for word in words:
        if word.lower().endswith('ing'):
            action = word.capitalize()
            break
    
    if action == "Unknown":
        # 2. Skip common subjects/counts to find the verb
        subjects = {'a', 'an', 'the', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 
                    'people', 'person', 'man', 'woman', 'boy', 'girl', 'child', 'children', 'dog', 'cat', 'staged', 'player', 'athlete', 'someone'}
        for word in words:
            if word.lower() not in subjects and len(word) > 2:
                action = word.capitalize()
                break
    
    if action == "Unknown" and len(words) > 1:
        # Fallback to the second word
        action = words[1].capitalize()
    
    return jsonify({
        'caption': caption,
        'action': action
    })

if __name__ == '__main__':
    # Use the port assigned by Render, or default to 5000 for local development
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
