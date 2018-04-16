from tempfile import SpooledTemporaryFile

from app import socketio
from utils import distribute_shards


@socketio.on('upload')
def upload(data):
    t = SpooledTemporaryFile()
    t.write(data['file'])
    distribute_shards(t, data['count'])
    t.close()


@socketio.on('fetch')
def fetch(data):
    emit('')
