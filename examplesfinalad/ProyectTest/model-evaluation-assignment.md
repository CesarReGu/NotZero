# Data Mining — Assignment 5

Classifier evaluation under class imbalance
Universidad Politécnica del Norte · Fourth year · Delivered April 2020

## Objective given by the instructor

Take a trained classifier on an imbalanced dataset, evaluate it correctly, and
justify the metric you would report to a decision-maker. Accuracy alone is not an
acceptable answer.

## Part A. Why accuracy is misleading here

The positive class is 21% of the data. A model that always predicts "does not drop
out" reaches 79% accuracy while catching zero of the students it exists to find.
Accuracy rewards the majority class, so it hides exactly the failure that matters.

## Part B. The metrics I computed

For the held-out split I built the confusion matrix and derived precision, recall,
and F1 from it, then computed ROC AUC and average precision from the predicted
probabilities:

| Metric              | Value |
|---------------------|-------|
| Precision           | 0.58  |
| Recall              | 0.79  |
| F1                  | 0.67  |
| ROC AUC             | 0.857 |
| Average precision   | 0.71  |

Recall is the number I would report first, because the cost of a false negative
(a student who leaves and was never flagged) is higher than the cost of a false
positive (a student who is offered advising they did not need).

## Part C. Cross-validation

I used 5-fold stratified cross-validation for model selection so that each fold
keeps the 21% positive rate, and I only touched the test split once, for the final
numbers above. Choosing the threshold and the hyperparameters on the test split
would have inflated every metric in this table.

```python
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipeline, X_train, y_train, scoring="roc_auc", cv=cv)
```

## Instructor feedback received

"Correct evaluation and the right metric for the problem. This is a solid offline
result. In practice a model like this is retrained on fresh data and watched after
it is deployed, because its inputs change over time and the offline number stops
describing it. That subject is not part of this program."

## What I would improve

I know how to measure a model before it ships. What I have not done is keep
measuring it after: recording each run so results are reproducible, and checking on
a deployed model so I can tell when it has gone stale. The evaluation is the part I
can already defend; the part that continues after deployment is the gap.
