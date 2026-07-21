import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

TARGET = "dropped_out"

NUMERIC = [
    "age_at_enrollment",
    "admission_score",
    "first_term_gpa",
    "credits_enrolled",
    "credits_passed_first_term",
    "attendance_rate_first_term",
    "commute_distance_km",
]

CATEGORICAL = [
    "program",
    "prior_school_type",
    "shift",
    "scholarship_holder",
    "works_while_studying",
]


def load_dataset(path):
    frame = pd.read_csv(path)
    frame = frame.drop_duplicates(subset="student_id")
    frame = frame[frame["credits_enrolled"] > 0]
    y = frame[TARGET].astype(int)
    X = frame[NUMERIC + CATEGORICAL]
    return X, y


def build_preprocessor():
    numeric = Pipeline(steps=[
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline(steps=[
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("encode", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer(transformers=[
        ("numeric", numeric, NUMERIC),
        ("categorical", categorical, CATEGORICAL),
    ])
