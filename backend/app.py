from flask import Flask, jsonify, request

from config import Config
from database import db
from routes.helpers import ApiError
from routes.location_routes import bp as location_bp
from routes.weather_routes import bp as weather_bp
from services.gis_service import load_training_locations as load_locations


def create_app() -> Flask:
    app = Flask(__name__)
    db.init_db(load_locations())
    app.register_blueprint(location_bp)
    app.register_blueprint(weather_bp)

    @app.get("/api/health")
    def health():
        from ml.model_utils import MODEL_PATH
        return jsonify({"status": "ok", "model_loaded": MODEL_PATH.exists(), "mode": "demo", "label": Config.DATA_LABEL})

    @app.after_request
    def cors(resp):
        origin = request.headers.get("Origin", "")
        if origin in Config.CORS_ORIGINS:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
            resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return resp

    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify({"error": e.message}), e.status

    @app.errorhandler(FileNotFoundError)
    def model_missing(e):
        return jsonify({"error": "ML model unavailable. Run: python -m ml.train"}), 503

    @app.errorhandler(LookupError)
    def not_found(e):
        return jsonify({"error": str(e)}), 404

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception(e)
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5000, debug=False)
