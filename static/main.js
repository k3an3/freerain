let ws = io.connect('//' + document.domain + ':' + location.port);
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
let request = window.indexedDB.open("storage", 1);
let filelist = $('#listing');
let db;

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
            filelist.append('<li id="' + cursor.value.hash + '">' + cursor.value.name + '</li>');
            cursor.continue();
        }
    }
};

let upload = $('#upload');

function record_file(data) {
    let os = db.transaction(["mapping"], "readwrite").objectStore("mapping");
    let request = os.add(data)
    request.onsuccess = event => {
        console.log(data);
    };
}

upload.on("drop", e => {

    // prevent browser default behavior on drop
    e.preventDefault();

    // iterate over the files dragged on to the browser
    for (let x = 0; x < e.originalEvent.dataTransfer.files.length; x++) {

        // instantiate a new FileReader object
        let fr = new FileReader();
        let file = e.originalEvent.dataTransfer.files[x];
        fr.name = file.name;

        // loading files from the file system is an asynchronous
        // operation, run this function when the loading process
        // is complete
        fr.addEventListener("loadend", () => {
            // send the file over web sockets
            ws.emit('upload', {
                file: fr.result,
                name: fr.name,
                count: 3
            },
                record_file);
        });

        // load the file into an array buffer
        fr.readAsArrayBuffer(file);
    }
    console.log("did a thing");
});