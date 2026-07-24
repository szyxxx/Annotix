import sqlite3
import os
import json
import hashlib

class SQLiteCache:
    def __init__(self, db_path: str = "annotix_cache.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS inference_cache (
                    hash TEXT PRIMARY KEY,
                    annotations TEXT,
                    img_h INTEGER,
                    img_w INTEGER
                )
            """)
            conn.commit()

    def _hash_image_and_classes(self, image_path: str, classes: list) -> str:
        sha256 = hashlib.sha256()
        with open(image_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        # Include classes in hash so we don't return old cache if user changed requested classes
        classes_str = ",".join(sorted(classes))
        sha256.update(classes_str.encode('utf-8'))
        return sha256.hexdigest()

    def get_cache(self, image_path: str, classes: list):
        img_hash = self._hash_image_and_classes(image_path, classes)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT annotations, img_h, img_w FROM inference_cache WHERE hash = ?", (img_hash,))
            row = cursor.fetchone()
            if row:
                return {
                    "annotations": json.loads(row[0]),
                    "image_size": [row[1], row[2]]
                }
        return None

    def set_cache(self, image_path: str, classes: list, annotations: list, img_h: int, img_w: int):
        img_hash = self._hash_image_and_classes(image_path, classes)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO inference_cache (hash, annotations, img_h, img_w)
                VALUES (?, ?, ?, ?)
            """, (img_hash, json.dumps(annotations), img_h, img_w))
            conn.commit()
