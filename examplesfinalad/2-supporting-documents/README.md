# Student Attrition Model

Final degree project · Computer Science · June 2020

A model that scores an enrolled student by the risk of leaving before the second
year, trained on anonymized registrar records and served behind a small HTTP
endpoint. Developed and graded as an individual capstone project.

## Requirements

- Python 3.7 installed on your machine
- The packages in `requirements.txt`
- The registrar export saved as `data/students.csv` (not included; contains
  university data)

## Repository layout

- `features.py` — dataset loading and the preprocessing pipeline
- `train.py` — model selection, evaluation, and writing `model.joblib`
- `evaluate.py` — metrics and feature importances for a saved model
- `app.py` — Flask service that scores one student
- `requirements.txt` — pinned dependencies

## Run locally

Create the environment, install dependencies, train, then start the service.

1. `python -m venv .venv` and activate it
2. `pip install -r requirements.txt`
3. `python train.py --data data/students.csv --out model.joblib`
4. `python evaluate.py --data data/students.csv --model model.joblib`
5. `python app.py` (serves on port 8000)

Check the service:

```
curl -s localhost:8000/health
curl -s -X POST localhost:8000/predict -H "Content-Type: application/json" \
  -d '{"age_at_enrollment": 18, "admission_score": 640, "first_term_gpa": 7.1,
       "credits_enrolled": 6, "credits_passed_first_term": 4,
       "attendance_rate_first_term": 0.82, "commute_distance_km": 12.5,
       "program": "CC", "prior_school_type": "public", "shift": "morning",
       "scholarship_holder": "no", "works_while_studying": "yes"}'
```

## Deployment (faculty server)

Done by hand at the end of the project:

1. Train locally, then copy `model.joblib` to the faculty server with `scp`
2. SSH in, create the virtual environment, `pip install -r requirements.txt`
3. Start `app.py` inside `screen` so it keeps running after logout

There is no automated pipeline. If the data changes I retrain on my laptop and copy
a new `model.joblib` over the old one; the running service has to be restarted by
hand to pick it up, and nothing records which export produced which file.

Last updated 2020-06-30 before the final defense.
