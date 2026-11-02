"""Rutas de los modelos .keras y configuración de TensorFlow.

Los modelos no están en el repo ni en la imagen: se suben a backend/modelos/
(en Docker, volumen de solo lectura). Cada ruta se puede cambiar por variable
de entorno. Este módulo no crea carpetas: si falta un modelo, la carga lazy
de skin_analysis_service lo loguea y el endpoint responde con error.
"""
import os
from pathlib import Path

import tensorflow as tf
from dotenv import load_dotenv

# Se importa antes de que los controllers lean sus variables: en desarrollo
# local (sin Docker) es lo que carga el .env.
load_dotenv()

MODELOS_DIR = Path(__file__).resolve().parents[1] / "modelos"

LUNARES_MODEL_PATH = os.getenv("LUNARES_MODEL_PATH") or str(MODELOS_DIR / "ham10000" / "lunares.keras")
ACNE_MODEL_PATH = os.getenv("ACNE_MODEL_PATH") or str(MODELOS_DIR / "acne" / "acne.keras")
ROSACEA_MODEL_PATH = os.getenv("ROSACEA_MODEL_PATH") or str(MODELOS_DIR / "rosacea" / "rosacea.keras")

# Solo CPU, con un número fijo de hilos para no acaparar la VPS.
tf.config.set_visible_devices([], "GPU")
tf.config.threading.set_inter_op_parallelism_threads(4)
tf.config.threading.set_intra_op_parallelism_threads(4)
