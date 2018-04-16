window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.requestFileSystem(window.PERSISTENT, 10000000, onInitFs, errorHandler)
let request = window.indexedDB.open("storage", 1);
let db;
let filesystem;
let reverse_map = {};
let download = {};
let chunk_size = 64;

function onInitFs(fs) {
    console.log('Using FileSystemAPI: ' + fs.name);
    filesystem = null; //fs;
}

function errorHandler(e) {
    var msg = '';

    switch (e.code) {
        case 10:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case 1:
            msg = 'NOT_FOUND_ERR';
            break;
        case 2:
            msg = 'SECURITY_ERR';
            break;
        case 9:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case 7:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    };

    console.log('Error: ' + msg);
    if (filesystem == null)
        console.log('Falling back to IndexedDB.');
}


request.onupgradeneeded = event => {
    let tdb = event.target.result;
    tdb.createObjectStore("filestore", {keyPath: "hash"});
    let store = tdb.createObjectStore("mapping", {keyPath: "hash"});
    store.createIndex("name", "name", { unique: false});
};

request.onsuccess = event => {
    db = event.target.result;
    db.transaction("mapping").objectStore("mapping").openCursor().onsuccess = evt => {
        let cursor = evt.target.result;
        if (cursor) {
            console.log(cursor.value);
            filelist.append('<li class="file" id="' + cursor.value.hash + '">' + cursor.value.name + '</li>');
            cursor.continue();
        }
    }
};

function record_file(data) {
    let os = db.transaction(["mapping"], "readwrite").objectStore("mapping");
    let request = os.add(data)
    request.onsuccess = event => {
        console.log(data);
    };
}

function download_chunk(hash, data) {
    reverse_map[hash]['data'] = data;
    let org_hash = reverse_map[hash]['hash']
    download[org_hash]['count']++;
    if (download[org_hash]['count'] == download[org_hash]['manifest'].length) {
        let result = new ArrayBuffer(chunk_size * download[org_hash['manifest'].length]);
        let i = 0;
        $.each(download[org_hash]['manifest'], e => {
            result[i] = reverse_map[hash]['data'];
        });
        var data = new Blob([result]);
        $('#downloadframe').attr('src', URL.createObjectURL(data));
    a.href = URL.createObjectURL(data);
    }
}

function fetch_manifest(hash) {
    db.transaction("mapping").objectStore("mapping").get(hash).onsuccess = event => {
        let i = 0;
        download[org_hash]['manifest'] = event.target.result.manifest;
        download[org_hash]['count'] = 0;
        $.each(event.target.result.manifest, e => {
            reverse_map[e] = {hash: hash, order: i};
            ws.emit('fetch', {hash: e});
            i++;
        });
    };
}

function save_file(data) {
    if (filesystem != null) {
        filesystem.root.getFile(data['hash'], {create: true}, fe => {
            fe.createWriter(fileWriter => {

                fileWriter.onwriteend = e => {
                    console.log('Write completed.');
                };

                fileWriter.onerror = e => {
                    console.log('Write failed: ' + e.toString());
                };

                var blob = new Blob([data['data']], {type: 'application/octet-binary'});

                fileWriter.write(blob);

            }, errorHandler);
        }, errorHandler);

    } else {
        let os = db.transaction(["filestore"], "readwrite").objectStore("filestore");
        let request = os.add(data);
        request.onsuccess = event => {
            console.log(data);
        };
    }
}

function read_file(data) {
    let filedata = null;
    if (filesystem != null) {
        filesystem.root.getFile(data['hash'], {}, fe => {
            fe.file(file => {
                var reader = new FileReader();

                reader.onloadend = e => {
                    filedata = this.result;
                };

                reader.readAsText(file);
            })
        }, errorHandler);
    } else {
        db.transaction("filestore").objectStore("filestore").get(hash).onsuccess = event => {
            data = event.target.result.value;
        };
    }

    ws.emit('retrieval', {data: filedata, hash: data['hash'], sid: data['sid']});
}
