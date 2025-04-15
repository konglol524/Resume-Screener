import os
import re
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict
import string
import nltk
import scipy.sparse as sp
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords, wordnet
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# New imports for BERT with TensorFlow
from transformers import TFBertModel, AutoTokenizer, TFAutoModel
import tensorflow as tf

# Download necessary NLTK resources
nltk.download("punkt", quiet=True)
nltk.download("averaged_perceptron_tagger", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("stopwords", quiet=True)


class BiasedDocumentMatcher:
    def __init__(self, config: Dict = None, extra_keywords: List[str] = None):
        """
        Advanced document matching with configurable NLP techniques and keyword scoring

        Args:
            config (Dict): Configuration dictionary for matching
            extra_keywords (List[str]): List of keywords to give extra points for
        """
        # Default configuration
        self.config = {
            "remove_stopwords": True,
            "lemmatize": True,
            "similarity_method": "bow",  # Options: "bow", "tfidf", or "bert"
            "use_keywords": True,
            "keyword_weight": 0.01,  # Weight for extra keywords
        }

        # Update with user-provided configuration
        if config:
            self.config.update(config)

        # Initialize extra keywords
        self.extra_keywords = set(extra_keywords) if extra_keywords else set()

        # Initialize resources for classical NLP methods
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = (
            set(stopwords.words("english"))
            if self.config["remove_stopwords"]
            else set()
        )
        # Verb tags to remove
        self.verb_tags = ["VB", "VBD", "VBG", "VBN", "VBP", "VBZ"]

        # If using BERT for similarity, initialize the tokenizer and TensorFlow model.
        if self.config["similarity_method"] == "bert":
            # TensorFlow compatible SBERT model from Hugging Face.
            self.tokenizer = AutoTokenizer.from_pretrained(
                "sentence-transformers/all-MiniLM-L6-v2"
            )
            self.model = TFAutoModel.from_pretrained(
                "sentence-transformers/all-MiniLM-L6-v2"
            )

    def get_bert_embedding(self, text: str) -> np.ndarray:
        """
        Get BERT embedding for the given text using TensorFlow

        Args:
            text (str): Input text

        Returns:
            np.ndarray: Dense embedding vector
        """
        # Tokenize and encode text using BERT's tokenizer with TensorFlow tensors.
        inputs = self.tokenizer(
            text, return_tensors="tf", truncation=True, padding=True
        )
        outputs = self.model(inputs)
        # Mean pool over token embeddings (last_hidden_state shape: [batch_size, seq_len, hidden_size])
        embedding = tf.reduce_mean(outputs.last_hidden_state, axis=1).numpy()[0]
        return embedding

    def process_texts(self, text: str) -> str:
        text = text.lower()
        text = re.sub("\n", " ", text)  # remove new line characters
        text = re.sub("http\S+\s*", " ", text)  # remove URLs
        text = re.sub(r"[^\x00-\x7f]", r" ", text)  # remove extra characters
        text = re.sub("\s+", " ", text)  # remove extra whitespace
        text = re.sub("[^a-zA-Z1-9]", " ", text)
        return text

    def process_tokens(self, text: str) -> List[str]:
        """
        Advanced text preprocessing

        Args:
            text (str): Input text

        Returns:
            List[str]: Preprocessed tokens
        """
        # text = re.sub(r"[^a-zA-Z1-9\s]", "", text)
        tokens = word_tokenize(text)
        # Part of speech tagging
        pos_tags = nltk.pos_tag(tokens)

        # Preprocessing
        processed_tokens = []
        for token, pos in pos_tags:
            # Skip numbers
            if token.isdigit():
                continue

            # Lemmatize
            if self.config["lemmatize"]:
                token = self.lemmatizer.lemmatize(token)

            # Skip stopwords
            if self.config["remove_stopwords"] and token in self.stop_words:
                continue

            # Skip verbs
            if pos in self.verb_tags:
                continue

            # Skip grammatical words
            if pos in ["DT", "IN", "TO", "PRP", "WP"]:
                continue

            processed_tokens.append(token)

        return processed_tokens

    def add_extra_keywords(self, new_keywords: List[str]) -> None:
        """
        Add extra keywords to give bonus points

        Args:
            new_keywords (List[str]): List of keywords to add
        """
        self.extra_keywords.update(new_keywords)

    def calculate_keyword_bonus(self, doc_tokens: List[str]) -> float:
        """
        Calculate bonus points for extra keywords

        Args:
            doc_tokens (List[str]): Preprocessed document tokens

        Returns:
            float: Keyword bonus score
        """
        bonus = 0
        if self.config["use_keywords"]:
            # Find matches between document tokens and extra keywords
            keyword_matches = set(doc_tokens) & self.extra_keywords
            # Calculate bonus based on number of matches
            bonus = len(keyword_matches) * self.config["keyword_weight"]
        return bonus

    def calculate_similarity(self, doc1_text: str, doc2_text: str) -> float:
        """
        Calculate advanced similarity between two documents

        Args:
            doc1_text (str): First document
            doc2_text (str): Second document

        Returns:
            float: Similarity score
        """
        # Basic clean up
        doc1_text = self.process_texts(doc1_text)
        doc2_text = self.process_texts(doc2_text)

        # Calculate keyword bonus for the first document
        doc1_tokens = self.process_tokens(doc1_text)
        keyword_bonus = self.calculate_keyword_bonus(doc1_tokens)

        # Choose vectorization method based on configuration
        if self.config["similarity_method"] == "bert":
            # Use BERT embeddings (TensorFlow version)
            emb1 = self.get_bert_embedding(doc1_text)
            emb2 = self.get_bert_embedding(doc2_text)
            similarity = cosine_similarity([emb1], [emb2])[0][0]
        else:
            # For "tfidf" or "bow", preprocess the text into tokens first.
            doc1_tokens = self.process_tokens(doc1_text)
            doc2_tokens = self.process_tokens(doc2_text)

            # Choose vectorizer based on configuration
            if self.config["similarity_method"] == "tfidf":
                vectorizer = TfidfVectorizer(
                    preprocessor=self.process_tokens,
                    tokenizer=lambda x: x,
                    lowercase=False,
                )
            else:  # Default: Bag of Words
                vectorizer = CountVectorizer(
                    preprocessor=self.process_tokens,
                    tokenizer=lambda x: x,
                    lowercase=False,
                )
            # Combine documents for vectorization
            doc_matrix = vectorizer.fit_transform(
                [" ".join(doc1_tokens), " ".join(doc2_tokens)]
            )
            similarity = cosine_similarity(doc_matrix[0:1], doc_matrix[1:2])[0][0]

        # Combine similarity with keyword bonus
        final_score = similarity + keyword_bonus
        return final_score
