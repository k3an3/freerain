import flask_assets
from flask import Flask, render_template, request, flash, redirect
from flask_socketio import SocketIO
from webassets.loaders import PythonLoader

from utils import distribute_shards

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins=[])

assets = flask_assets.Environment()
assets.init_app(app)
assets_loader = PythonLoader('assets')
for name, bundle in assets_loader.load_bundles().items():
    assets.register(name, bundle)


@app.route("/")
def index():
    return render_template('index.html')


@app.route("/upload", methods=['POST'])
def upload():
    if 'file' not in request.files:
        flash('No file part')
        return redirect('/')
    file = request.files['file']
    # if user does not select file, browser also
    # submit a empty part without filename
    if file.filename == '':
        flash('No selected file')
        return redirect(request.url)
    if file:
        manifest = distribute_shards(file.stream.read())
        return redirect('/')


if __name__ == "__main__":
    app.run()
