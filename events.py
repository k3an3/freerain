from flask_socketio import emit

from app import socketio
from utils import distribute_shards


@socketio.on('upload')
def upload(data):
    h, m = distribute_shards(data['file'], data['count'])
    return {'hash': h, 'name': data['name'], 'manifest': m}


@socketio.on('fetch')
def fetch(data):
    emit('')
