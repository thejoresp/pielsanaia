import logging

from PIL import Image
from io import BytesIO
import tensorflow as tf
from tensorflow.keras.preprocessing.image import img_to_array
from backend.config.model_config import LUNARES_MODEL_PATH, ACNE_MODEL_PATH, ROSACEA_MODEL_PATH

logger = logging.getLogger(__name__)

# --- INICIO: Funciones para modelo lunares.keras ---
LUNARES_MODEL = None
LUNARES_CLASS_NAMES = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
LUNARES_CLASS_LABELS = {
    'akiec': 'Queratosis Actínica',
    'bcc': 'Carcinoma Basocelular',
    'bkl': 'Queratosis Benigna',
    'df': 'Dermatofibroma',
    'mel': 'Melanoma',
    'nv': 'Lúnar Común (Nevus)',
    'vasc': 'Lesión Vascular'
}

def load_lunares_model():
    global LUNARES_MODEL
    if LUNARES_MODEL is None:
        try:
            logger.info("Cargando modelo lunares.keras desde %s", LUNARES_MODEL_PATH)
            LUNARES_MODEL = tf.keras.models.load_model(LUNARES_MODEL_PATH)
            logger.info("Modelo lunares.keras cargado")
        except Exception:
            logger.exception("Error cargando el modelo lunares.keras")
            LUNARES_MODEL = None
    return LUNARES_MODEL

def predict_lunares_class(image_bytes: bytes):
    model = load_lunares_model()
    if model is None:
        logger.error("El modelo lunares.keras no está cargado")
        return None, None
    try:
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_resized = img.resize((224, 224))
        img_array = img_to_array(img_resized)
        img_array = img_array / 255.0
        img_array = img_array.reshape((1, 224, 224, 3))
        preds = model.predict(img_array, verbose=0)
        pred_idx = preds.argmax(axis=1)[0]
        pred_class = LUNARES_CLASS_NAMES[pred_idx]
        pred_label = LUNARES_CLASS_LABELS[pred_class]
        probabilities = {LUNARES_CLASS_LABELS[LUNARES_CLASS_NAMES[i]]: float(preds[0][i]) for i in range(len(LUNARES_CLASS_NAMES))}
        return pred_label, probabilities
    except Exception:
        logger.exception("Error al predecir con lunares.keras")
        return None, None
# --- FIN: Funciones para modelo lunares.keras --- 

# --- INICIO: Funciones para modelo acne.keras ---
ACNE_CLASS_NAMES = ['acne', 'no_acne']
ACNE_CLASS_LABELS = {
    'acne': 'Con acné',
    'no_acne': 'Sin acné'
}
ACNE_MODEL = None

def load_acne_model():
    global ACNE_MODEL
    if ACNE_MODEL is None:
        try:
            logger.info("Cargando modelo acne.keras desde %s", ACNE_MODEL_PATH)
            ACNE_MODEL = tf.keras.models.load_model(ACNE_MODEL_PATH)
            logger.info("Modelo acne.keras cargado")
        except Exception:
            logger.exception("Error cargando el modelo acne.keras")
            ACNE_MODEL = None
    return ACNE_MODEL

def predict_acne_class(image_bytes: bytes):
    model = load_acne_model()
    if model is None:
        logger.error("El modelo acne.keras no está cargado")
        return None, None
    try:
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_resized = img.resize((224, 224))
        img_array = img_to_array(img_resized)
        img_array = img_array / 255.0
        img_array = img_array.reshape((1, 224, 224, 3))
        preds = model.predict(img_array, verbose=0)
        # Como es binario, salida sigmoid: 0 = no_acne, 1 = acne
        pred_idx = int(preds[0][0] > 0.5)
        pred_class = ACNE_CLASS_NAMES[pred_idx]
        pred_label = ACNE_CLASS_LABELS[pred_class]
        probabilities = {
            ACNE_CLASS_LABELS[ACNE_CLASS_NAMES[1]]: float(preds[0][0]),
            ACNE_CLASS_LABELS[ACNE_CLASS_NAMES[0]]: float(1 - preds[0][0])
        }
        return pred_label, probabilities
    except Exception:
        logger.exception("Error al predecir con acne.keras")
        return None, None
# --- FIN: Funciones para modelo acne.keras ---

# --- INICIO: Funciones para modelo rosacea.keras ---
ROSACEA_CLASS_NAMES = ['rosacea', 'no_rosacea']
ROSACEA_CLASS_LABELS = {
    'rosacea': 'Con rosácea',
    'no_rosacea': 'Sin rosácea'
}
ROSACEA_MODEL = None

def load_rosacea_model():
    global ROSACEA_MODEL
    if ROSACEA_MODEL is None:
        try:
            logger.info("Cargando modelo rosacea.keras desde %s", ROSACEA_MODEL_PATH)
            ROSACEA_MODEL = tf.keras.models.load_model(ROSACEA_MODEL_PATH)
            logger.info("Modelo rosacea.keras cargado")
        except Exception:
            logger.exception("Error cargando el modelo rosacea.keras")
            ROSACEA_MODEL = None
    return ROSACEA_MODEL

def predict_rosacea_class(image_bytes: bytes):
    model = load_rosacea_model()
    if model is None:
        logger.error("El modelo rosacea.keras no está cargado")
        return None, None
    try:
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img_resized = img.resize((224, 224))
        img_array = img_to_array(img_resized)
        img_array = img_array / 255.0
        img_array = img_array.reshape((1, 224, 224, 3))
        preds = model.predict(img_array, verbose=0)
        pred_idx = int(preds[0][0] > 0.5)
        pred_class = ROSACEA_CLASS_NAMES[pred_idx]
        pred_label = ROSACEA_CLASS_LABELS[pred_class]
        probabilities = {
            ROSACEA_CLASS_LABELS[ROSACEA_CLASS_NAMES[1]]: float(preds[0][0]),
            ROSACEA_CLASS_LABELS[ROSACEA_CLASS_NAMES[0]]: float(1 - preds[0][0])
        }
        return pred_label, probabilities
    except Exception:
        logger.exception("Error al predecir con rosacea.keras")
        return None, None
# --- FIN: Funciones para modelo rosacea.keras --- 