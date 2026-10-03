import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, send_from_directory
from config import Config
from extensions import db, cors


def create_app():
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
    app = Flask(__name__, static_folder=frontend_dist, static_url_path='/')
    app.config.from_object(Config)

    # Ensure required directories exist
    os.makedirs(os.path.join(os.path.dirname(__file__), 'instance'), exist_ok=True)
    secure_photos_dir = os.path.join(os.path.dirname(__file__), 'secure_photos')
    os.makedirs(secure_photos_dir, exist_ok=True)

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Import all models so SQLAlchemy discovers them
    import models.attempt
    import models.mcq
    import models.excel
    import models.sql
    import models.coding
    import models.submission
    import models.id_photo   # College ID card photos (24-hour retention)

    # Register blueprints
    from routes.exam_routes import exam_bp
    from routes.admin_routes import admin_bp
    app.register_blueprint(exam_bp)
    app.register_blueprint(admin_bp)

    # Serve React SPA Frontend in Production (Single-Server deployment)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return "Backend API is running. Build frontend with 'npm run build' to view full UI.", 200

    with app.app_context():
        db.create_all()
        # Seed database with all 4 sections
        from seed.seed_data import seed_database
        seed_database()

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, port=port, host='0.0.0.0')
