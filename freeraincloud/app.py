import flask_assets
from flask import Flask, render_template
from flask_socketio import SocketIO
from webassets.loaders import PythonLoader

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins=[])

assets = flask_assets.Environment()
assets.init_app(app)
assets_loader = PythonLoader('freeraincloud.assets')
for name, bundle in assets_loader.load_bundles().items():
    assets.register(name, bundle)


@app.route("/")
def index():
    return render_template('index.html')


if __name__ == "__main__":
    app.run()
