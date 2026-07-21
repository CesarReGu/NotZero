import argparse
import json

import joblib
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from features import CATEGORICAL, NUMERIC, load_dataset


def top_features(model, count=15):
    classifier = model.named_steps["classifier"]
    encoder = model.named_steps["preprocess"].named_transformers_["categorical"].named_steps["encode"]
    names = list(NUMERIC) + list(encoder.get_feature_names(CATEGORICAL))
    importances = classifier.feature_importances_
    order = np.argsort(importances)[::-1][:count]
    return [(names[index], round(float(importances[index]), 4)) for index in order]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--model", default="model.joblib")
    args = parser.parse_args()

    model = joblib.load(args.model)
    X, y = load_dataset(args.data)
    proba = model.predict_proba(X)[:, 1]
    predictions = model.predict(X)

    report = {
        "accuracy": round(accuracy_score(y, predictions), 4),
        "precision": round(precision_score(y, predictions), 4),
        "recall": round(recall_score(y, predictions), 4),
        "f1": round(f1_score(y, predictions), 4),
        "roc_auc": round(roc_auc_score(y, proba), 4),
        "average_precision": round(average_precision_score(y, proba), 4),
        "positive_rate": round(float(np.mean(y)), 4),
        "top_features": top_features(model),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
