import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, TFAutoModel
import tensorflow as tf


class Document:
    def __init__(self, name, embedding):
        self.name = name  # First attribute
        self.embedding = embedding  # Second attribute


class BiasedDocumentMatcher:
    def __init__(self, config: Dict = None):
        # Default configuration
        self.config = {
            "threshold": 0.52,
        }  # Update with user-provided configuration
        if config:
            self.config.update(config)
        self.job = None
        self.resumes = list()
        self.tokenizer = AutoTokenizer.from_pretrained(
            "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.model = TFAutoModel.from_pretrained(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

    def get_sbert_embedding(self, text: str) -> np.ndarray:
        # Tokenize and encode text using BERT's tokenizer with TensorFlow tensors.
        inputs = self.tokenizer(
            text, return_tensors="tf", truncation=True, padding=True
        )
        outputs = self.model(inputs)
        # Mean pool over token embeddings (last_hidden_state shape: [batch_size, seq_len, hidden_size])
        embedding = tf.reduce_mean(outputs.last_hidden_state, axis=1).numpy()[0]
        return embedding

    def set_job(self, job_name, job_text: str):
        self.job = Document(job_name, self.get_sbert_embedding(job_text))

    def remove_job(self):
        self.job = None

    def add_resume(self, resume_name, resume_text: str):
        self.resumes.append(
            Document(resume_name, (self.get_sbert_embedding(resume_text)))
        )

    def remove_resume(self, idx: int):
        self.resumes.pop(idx)

    def remove_all_resumes(self):
        self.resumes = []

    def calculate_similarity(self, emb1, emb2) -> float:
        similarity = cosine_similarity([emb1], [emb2])[0][0]
        return similarity

    def match_resumes(self):
        scores = []
        for resume in self.resumes:
            score = float(
                self.calculate_similarity(resume.embedding, self.job.embedding)
            )
            # if score > self.config["threshold"]:
            scores.append((score, resume.name))

        return scores
