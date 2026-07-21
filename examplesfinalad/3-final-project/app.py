import joblib
import pandas as pd
from flask import Flask, jsonify, request

from features import CATEGORICAL, NUMERIC

app = Flask(__name__)
model = joblib.load("model.joblib")

FIELDS = NUMERIC + CATEGORICAL
THRESHOLD = 0.5


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    missing = [field for field in FIELDS if field not in payload]
    if missing:
        return jsonify({"error": "missing fields", "fields": missing}), 400
    row = pd.DataFrame([{field: payload[field] for field in FIELDS}])
    proba = float(model.predict_proba(row)[0, 1])
    return jsonify({"probability": round(proba, 4), "label": int(proba >= THRESHOLD)})


if __name__ == "__main__":
    app.run(port=8000)
