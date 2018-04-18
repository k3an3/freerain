let ws = io.connect('//' + document.domain + ':' + location.port);
let filelist = $('#listing');

let upload = $('#upload');

$('#listing').on("click", "li", e => {
    fetch_manifest(e.target.id);
});


let instance = null;
let priv = localStorage.getItem('privkey');
if (priv != null) {
    console.log("Loading key");
    kbpgp.KeyManager.import_from_armored_pgp({armored: priv}, (err, ins) => {
        console.log(err);
        console.log(ins)
        if (ins.is_pgp_locked)
            ins.unlock_pgp({
                passphrase: 'typical'
            }, e => {});
        instance = ins;
    });
} else {
    console.log("Generating key...");
    kbpgp.KeyManager.generate_ecc({userid: "Bo Jackson <user@example.com>"}, (err, ins) => {
        instance = ins;
        console.log("Done generating key.");
        ins.sign({}, err => {
            ins.export_pgp_private({passphrase: 'typical'}, (err, key) => {
                console.log(key + " " + err);
                localStorage.setItem('privkey', key);
            });
        });
    });
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
            let crypt_params = {
                msg: fr.result,
                encrypt_for: instance,
                //sign_with: instance,
            };
            kbpgp.box(crypt_params, (err, string, buf) => {
                ws.emit('upload', {
                        file: string,
                        name: fr.name,
                        count: 3
                    },
                    record_file);
            });
        });


        fr.readAsArrayBuffer(file);
    }
    console.log("did a thing");
});