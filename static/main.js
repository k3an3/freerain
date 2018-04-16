let ws = io.connect('//' + document.domain + ':' + location.port);
let filelist = $('#listing');

let upload = $('#upload');

$('#listing').on("click", "li", e => {
    fetch_manifest(e.target.id);
});

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