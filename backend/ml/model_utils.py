import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor

from config import Config

MODEL_PATH = Config.MODEL_DIR / "downscaling_model.joblib"
METRICS_PATH = Config.MODEL_DIR / "metrics.json"


def make_model(name: str = "random_forest"):
    if name == "random_forest":
        return RandomForestRegressor(n_estimators=150, min_samples_leaf=3, n_jobs=-1, random_state=42)
    if name == "gradient_boosting":  # swap in XGBoost the same way later
        return GradientBoostingRegressor(random_state=42)
    raise ValueError(f"Unknown model: {name}")


def save_model(bundle: dict, path=MODEL_PATH):
    Config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)


def load_model(path=MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError("Model not trained yet. Run: python -m ml.train")
    return joblib.load(path)


def regression_metrics(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    err = y_pred - y_true
    ss_tot = ((y_true - y_true.mean()) ** 2).sum()
    corr = float(np.corrcoef(y_true, y_pred)[0, 1]) if y_pred.std() > 0 else 0.0
    return {"mae": round(float(np.abs(err).mean()), 3), "rmse": round(float(np.sqrt((err**2).mean())), 3),
            "r2": round(float(1 - (err**2).sum() / ss_tot), 3), "bias": round(float(err.mean()), 3), "correlation": round(corr, 3)}


def event_metrics(y_true, y_pred, threshold: float = 25.0) -> dict:
    t, p = np.asarray(y_true) >= threshold, np.asarray(y_pred) >= threshold
    tp, fp, fn = int((t & p).sum()), int((~t & p).sum()), int((t & ~p).sum())
    prec, rec = tp / max(tp + fp, 1), tp / max(tp + fn, 1)
    return {"precision": round(prec, 3), "recall": round(rec, 3), "f1": round(2 * prec * rec / max(prec + rec, 1e-9), 3),
            "csi": round(tp / max(tp + fp + fn, 1), 3), "threshold_mm": threshold}
