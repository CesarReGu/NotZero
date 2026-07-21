# Predicting Student Attrition from Academic and Enrollment Records

Final degree project report · B.S. Computer Science
Universidad Politécnica del Norte · Facultad de Ingeniería y Ciencias
Submitted June 2020 · Defended July 2020

## 1. Problem statement

Roughly one in five students in the faculty leaves before the second year, and
the coordination office usually notices only after the term ends. This project
builds a model that scores each enrolled student by the risk of leaving, using
only information available at the end of the first term, so that advising can
reach the highest-risk students earlier.

## 2. Data

The registrar provided an anonymized export of 4,412 students from the 2014–2018
cohorts. Each row is one student with a `dropped_out` label. The features are the
ones known by the end of the first term:

- `age_at_enrollment`, `admission_score`, `first_term_gpa`
- `credits_enrolled`, `credits_passed_first_term`, `attendance_rate_first_term`
- `commute_distance_km`
- `program`, `prior_school_type`, `shift`, `scholarship_holder`,
  `works_while_studying`

About 21% of the rows are positive (dropped out), so the classes are imbalanced.
Missing values were present in `first_term_gpa` and `commute_distance_km` and are
filled during preprocessing rather than dropped, to avoid discarding students.

## 3. Method

Numeric columns are median-imputed and standardized; categorical columns are
most-frequent-imputed and one-hot encoded. Preprocessing and the estimator are
kept in one pipeline so the same steps apply to training and to a new student.

I compared a logistic-regression baseline against a random forest. Because the
classes are imbalanced, both use balanced class weights, model selection is done
with 5-fold stratified cross-validation, and the scoring metric is ROC AUC rather
than accuracy. The random forest's `n_estimators`, `max_depth`, and
`min_samples_leaf` were chosen with a grid search over the training split only.
The test split (20%) was untouched until the final measurement.

## 4. Results

Held-out test split (882 students):

| Model                | ROC AUC | Recall | Precision |   F1 | Accuracy |
|----------------------|---------|--------|-----------|------|----------|
| Logistic regression  |   0.809 |  0.74  |    0.52   | 0.61 |   0.79   |
| Random forest (final)|   0.857 |  0.79  |    0.58   | 0.67 |   0.83   |

The most informative features were `first_term_gpa`,
`credits_passed_first_term`, `attendance_rate_first_term`, and
`scholarship_holder`. Recall matters more than precision here: missing a student
who leaves is worse than flagging one who stays, so the 0.5 threshold could be
lowered in use.

## 5. How it runs

Training is a script (`train.py`) that reads the CSV, runs the search, prints the
metrics, and writes the fitted pipeline to `model.joblib`. A small Flask service
(`app.py`) loads that file once and returns a probability for one student posted as
JSON. Both run on my laptop and on the faculty server. The README documents the
exact commands.

## 6. Known limitations and future work

- The model is trained once, by hand, on a single static CSV export. There is no
  process to retrain it as new cohorts arrive, so it will drift as intakes change.
- Once the Flask service is started, nothing watches it. There are no live metrics,
  no record of the predictions it returns, and no alert if its inputs stop looking
  like the training data.
- I compared runs by writing the printed metrics into a spreadsheet by hand. There
  is no record of which data, parameters, and code produced a given `model.joblib`.
- Probabilities were never checked for calibration, so a score of 0.7 cannot yet be
  read as a 70% chance.
- The whole project has only ever run on a laptop and the faculty server. Serving
  it anywhere a real advising office could reach was outside the scope of the program.

Given more time I would automate retraining and add monitoring and experiment
records. The program did not teach these tools, so I would be learning them from
documentation rather than from coursework.
