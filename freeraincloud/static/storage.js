window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.requestFileSystem(window.PERSISTENT, 10000000, onInitFs, errorHandler)
let request = window.indexedDB.open("storage", 1);
let db;
let filesystem;
let reverse_map = {};
let download = {};

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
    update_file_listing();
};

function update_file_listing() {
    if (db != null)
        filelist.find('tr').remove();
        db.transaction("mapping").objectStore("mapping").openCursor().onsuccess = evt => {
            let cursor = evt.target.result;
            if (cursor) {
                filelist.append("<tr><td>" + cursor.value.name + "</td><td>" + 0 + '</td><td>' + 0 + '</td><td>' +
                    '<div class="btn-group" role="group">' +
                    '<button type="button" id="download-' + cursor.value.hash + '" class="btn btn-sm btn-outline-primary file-action">Download</button>' +
                    '<button type="button" id="delete-' + cursor.value.hash + '" class="btn btn-sm btn-outline-danger file-action">Delete</button>' +
                    '</div>' +
                    '<div id="progressdiv-' + cursor.value.hash + '" class="progress dlprogress">' +
                    '  <div id="progress-' + cursor.value.hash + '" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%"></div>' +
                    '</div></td></tr>');
                cursor.continue();
                $('.dlprogress').hide();
            }
        }
}

function record_file(data) {
    let os = db.transaction(["mapping"], "readwrite").objectStore("mapping");
    let request = os.add(data)
    request.onsuccess = event => {};
    update_file_listing();
    progressdiv.hide();
}

function start_download(content, filename) {
    let a = document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([content], {'type': 'application/octet-stream'}));
    a.download = filename;
    a.click();
}

function download_file(content, filename, hash) {
    let bar = $('#progress-' + hash);
    bar.addClass('bg-success');
    bar.text('Decrypting');

    kbpgp.unbox({keyfetch: instance, armored: content}, (err, res) => {
        if (err) {
            console.log(err);
        } else {
            start_download(base64ToArrayBuffer(res[0]), filename);
        }
    });
}

function get_all_chunks(hash) {
    let result = "";
    let dec = new TextDecoder();
    download[hash].manifest.forEach(e => {
        result += dec.decode(reverse_map[e].data);
    });
    return result;
}

function download_chunk(data) {
    let hash = data.hash;
    if (reverse_map[hash] == null)
        reverse_map[hash] = {};
    reverse_map[hash].data = data.data;
    let org_hash = reverse_map[hash].hash;
    let bar = $('#progress-' + org_hash);
    bar.removeClass('bg-warning');
    let progress = 100 * download[org_hash].count / download[org_hash].manifest.length;
    bar.text(Math.floor(progress) + "%");
    download[org_hash].count++;
    bar.attr('style', 'width: ' + progress + '%');
    if (download[org_hash].count == download[org_hash].manifest.length) {
        download_file(get_all_chunks(org_hash), download[org_hash].name, org_hash);
        bar.attr('style', 'width: 0%');
        $('#progressdiv-' + org_hash).hide();
    }
}

function fetch_manifest(hash) {
    $('#progressdiv-' + hash).show();
    let bar = $('#progress-' + hash);
    bar.attr('style', 'width: 100%');
    bar.addClass('bg-warning');
    bar.text('Requesting...');
    db.transaction("mapping").objectStore("mapping").get(hash).onsuccess = event => {
        let i = 0;
        if (download[hash] == null)
            download[hash] = {}
        download[hash].manifest = event.target.result.manifest;
        download[hash].name = event.target.result.name
        download[hash].count = 0;
        event.target.result.manifest.forEach(e => {
            reverse_map[e] = {hash: hash, order: i};
            ws.emit('fetch', {hash: e});
            i++;
        });
    };
}

function delete_manifest(hash) {
    let os = db.transaction("mapping", "readwrite").objectStore("mapping");
    os.get(hash).onsuccess = event => {
        if (download[hash] != null)
            delete download[hash];
        event.target.result.manifest.forEach(e => {
            ws.emit('delete', {hash: e});
        });
    };
    os.delete(hash);
    update_file_listing();
}

function delete_chunk(data) {
     db.transaction("filestore", "readwrite").objectStore("filestore").delete(data.hash);
}

function save_file(data) {
    if (filesystem != null) {
        filesystem.root.getFile(data.hash, {create: true}, fe => {
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
        request.onsuccess = event => {};
    }
}

function read_file(data) {
    let filedata = null;
    if (filesystem != null) {
        filesystem.root.getFile(data.hash, {}, fe => {
            fe.file(file => {
                var reader = new FileReader();

                reader.onloadend = e => {
                    filedata = this.result;
                    ws.emit('retrieval', {data: filedata, hash: data.hash, sid: data.sid});
                };

                reader.readAsText(file);
            })
        }, errorHandler);
    } else {
        db.transaction("filestore").objectStore("filestore").get(data.hash).onsuccess = event => {
            if (event.target.result != null) {
                filedata = event.target.result.data;
                ws.emit('retrieval', {data: filedata, hash: data.hash, sid: data.sid});
            }
        };
    }
}

