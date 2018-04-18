ws.on('distribute', save_file);
ws.on('retrieve', read_file);
ws.on('chunk', download_chunk);
ws.on('delete', delete_chunk);