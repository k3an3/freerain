from webassets import Bundle

common_js = Bundle(
    'dist/js/jquery.min.js',
    'dist/js/socket.io.slim.js',
    'dist/js/kbpgp.js',
    Bundle(
        'main.js',
        'storage.js',
        'events.js',
        filters='jsmin',
        output='public/js/common.js'
    ),
)

common_css = Bundle(
    Bundle(
        'style.css',
        filters='cssmin',
        output='public/css/common.css'
    )
)
