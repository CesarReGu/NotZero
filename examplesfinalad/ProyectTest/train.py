import argparse

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

from features import build_preprocessor, load_dataset


def build_model():
    return Pipeline(steps=[
        ("preprocess", build_preprocessor()),
        ("classifier", RandomForestClassifier(random_state=42, class_weight="balanced")),
    ])


def select(model, X_train, y_train):
    grid = {
        "classifier__n_estimators": [200, 400],
        "classifier__max_depth": [None, 12, 20],
        "classifier__min_samples_leaf": [1, 5],
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = GridSearchCV(model, grid, scoring="roc_auc", cv=cv, n_jobs=-1)
    search.fit(X_train, y_train)
    return search.best_estimator_


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", default="model.joblib")
    args = parser.parse_args()

    X, y = load_dataset(args.data)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    baseline = Pipeline(steps=[
        ("preprocess", build_preprocessor()),
        ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])
    baseline_auc = cross_val_score(baseline, X_train, y_train, scoring="roc_auc", cv=5)
    print("baseline_cv_roc_auc", round(float(np.mean(baseline_auc)), 4))

    model = select(build_model(), X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    predictions = model.predict(X_test)
    print("test_roc_auc", round(roc_auc_score(y_test, proba), 4))
    print(classification_report(y_test, predictions, digits=3))
    print(confusion_matrix(y_test, predictions))

    joblib.dump(model, args.out)


if __name__ == "__main__":
    main()
