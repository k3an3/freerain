import hashlib


chunk_size_b = 1000000


def distribute_shards(data, copies: int = 3):
    h = hashlib.sha3_256(data).hexdigest()
    chunk_size = min(len(data), chunk_size_b)
    manifest = []
    from app import socketio
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i+chunk_size]
        tmp_h = hashlib.sha3_256(chunk).hexdigest()
        socketio.emit('distribute', {'hash': tmp_h,
                                     'data': chunk})
        manifest.append(tmp_h)
    return h, manifest
