import os
import sys
import time
import glob
import pickle
import socket

import re

from urlparse import urlparse, parse_qs
import urllib

import xbmc
import xbmcplugin
import xbmcaddon

import SimpleJSONRPCServer
import zipstream2

import xbmcdb
import m3u


HOSTNAME = ''
PORT_NUMBER = 9100

""" ----------------------------------------------------------------------

We override the SimpleJSONRPCRequestHandler for two reasons:

  - we want to provide some simple GET-based services, like download_songs()
    (so the end user can click on a link and download a big ZIP archive of songs)

  - we need to use CORS headers to allow for cross-origin scripts (because the
    XBMC web interface add-on is running on one port, and this web service is
    running on another port, which is technically cross-origin

---------------------------------------------------------------------- """
class qooxtunesJSONRPCRequestHandler(
        SimpleJSONRPCServer.SimpleJSONRPCRequestHandler):

    def download_songs (self, download_id):

        self.log_message ("download_id: %s\n" % download_id)

        filename = "download-" + download_id + ".dat"
        fullpath = os.path.join (xbmc.translatePath('special://temp'), filename)

        self.log_message ("fullpath: %s\n" % fullpath)

        songids = pickle.load ( open (fullpath, "rb") )

        os.unlink (fullpath)

        download_filename = "qooxtunes-" + download_id + ".zip"

        self.send_response(200)
        self.send_CORS_headers ()
        self.send_header ('Content-type' , 'application/zip')
        self.send_header ('Content-Disposition', 'attachment; filename="%s"' % download_filename)
        self.end_headers ()

        self.log_message ("songids: %s\n" % songids)

        db = xbmcdb.songdb()
        songs = db.get_songs (songids)

        song_file_paths = []
        for s in songs:
            if len (s.files) > 0:
                song_file_paths.append (s.files[0])

        self.log_message ("writing zip stream...")
        self.log_message ("file mode: " + self.wfile.mode)

        for data in zipstream2.ZipStream(song_file_paths, "qooxtunes-" + download_id, zipstream2.ZIP_STORED):
            self.log_message ("  - data")
            self.wfile.write(data)
            self.wfile.flush ();

        self.wfile.flush ();
        self.log_message ("done.")

        return

    def send_CORS_OPTIONS_headers (self):
        self.send_CORS_headers ()
        self.send_header ('Access-Control-Allow-Methods', self.headers["Access-Control-Request-Method"])
        self.send_header ("Access-Control-Allow-Headers", self.headers["Access-Control-Request-Headers"])

    def send_CORS_headers (self):
        self.send_header('Access-Control-Allow-Origin', '*')
        #self.send_header ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

        #self.send_header ("Access-Control-Allow-Headers", "X-Requested-With, referer, user-agent, pragma, cache-control, origin, x-qoo
        #self.send_header ("Access-Control-Allow-Headers", "pragma, cache-control, x-qooxdoo-response-type, content-type")
        #self.send_header ("Access-Control-Allow-Headers", "pragma, cache-control, x-qooxdoo-response-type, content-type, host, connect

        self.send_header ('Access-Control-Max-Age', 1)

    #### need this for cross-origin requests
    def do_OPTIONS(self):           
        self.send_response(200, "ok")       
        self.send_CORS_OPTIONS_headers ()
        self.end_headers ()
        #self.connection.shutdown(1)



    def is_rpc_path_valid(self):
        o = urlparse (self.path)

        if self.rpc_paths:
            return o.path in self.rpc_paths
        else:
            # If .rpc_paths is empty, just assume all paths are legal
            return True



    def do_POST(self):
        if not self.is_rpc_path_valid():
            self.send_response(404)
            self.send_CORS_headers ()
            self.end_headers ()
            self.wfile.write ("invalid path")
            return
        try:
            max_chunk_size = 10*1024*1024
            size_remaining = int(self.headers["content-length"])
            L = []
            while size_remaining:
                chunk_size = min(size_remaining, max_chunk_size)
                L.append(self.rfile.read(chunk_size))
                size_remaining -= len(L[-1])
            data = ''.join(L)
            response = self.server._marshaled_dispatch(data)
            self.send_response(200)
        except Exception, e:
            self.send_response(500)
            err_lines = traceback.format_exc().splitlines()
            trace_string = '%s | %s' % (err_lines[-3], err_lines[-1])
            fault = jsonrpclib.Fault(-32603, 'Server error: %s' % trace_string)
            response = fault.response()
        if response == None:
            response = ''
        self.send_header("Content-type", "application/json-rpc")
        self.send_header("Content-length", str(len(response)))
        self.send_CORS_headers ()
        self.end_headers()
        self.wfile.write(response)

        #### this call is in the parent class, but under python 2.7 on openelec, it seems
        #### to kill the socket before the client gets any data!
        #self.connection.shutdown(1)



    def do_GET (self):
        o = urlparse (self.path)

        if o.path == "/download_songs":
            qs = parse_qs (o.query)
            self.download_songs (qs['download_id'][0])
            return
        else:
            self.send_response(404)
            self.send_CORS_headers ()
            self.end_headers ()
            self.wfile.write ("invalid path")
            return

""" ----------------------------------------------------------------------

Here is our actual web service class with most of the methods

---------------------------------------------------------------------- """
class qooxtunesWebService:
    def __init__(self):
        # make all of the string functions available through
        # string.func_name
        import string
        self.string = string



    def _listMethods(self):
        # implement this method so that system.listMethods
        # knows to advertise the strings methods
        return list_public_methods(self) + \
                ['string.' + method for method in list_public_methods(self.string)]



    def get_download_songs_url (self, songids):

        download_id = str (time.time ()) + "-" + str (os.getpid ())
        filename = "download-" + download_id + ".dat"
        fullpath = os.path.join (xbmc.translatePath('special://temp'), filename)

        pickle.dump (songids, open (fullpath, "wb"))

        return "/download_songs?download_id=" + download_id



    def _get_path_list( self, paths ):
        #### we do not want the slash at end
        if ( paths.endswith( "\\" ) or paths.endswith( "/" ) ):
            paths = paths[ : -1 ]

        #### if this is not a multipath return it as a list
        if ( not paths.startswith( "multipath://" ) ): return [ paths ]

        #### we need to parse out the separate paths in a multipath share
        fpaths = []

        #### multipaths are separated by a forward slash(why not a pipe)
        path_list = paths[ 12 : ].split( "/" )

        #### enumerate thru our path list and unquote the url
        for path in path_list:
            #### we do not want the slash at end
            if ( path.endswith( "\\" ) or path.endswith( "/" ) ):
                path = path[ : -1 ]

            path = urllib.unquote_plus(path)

            if path.startswith( "special://" ):
                path = xbmc.translatePath (path)

            #### add our path
            fpaths.append (path)

        return fpaths



    def set_leaf(self, tree, branches, leaf):
        if not tree.has_key(branches[0]):
            tree[branches[0]] = {'children' : {}}
        if len(branches) == 1:
            tree[branches[0]]['children'] = leaf
            return
        self.set_leaf(tree[branches[0]]['children'], branches[1:], leaf)



    def traverse_playlist_dir (self, tree, startpath):
        for root, dirs, files in os.walk(startpath):
            branches = [startpath]
            if root != startpath:
                branches.extend(os.path.relpath(root, startpath).split('/'))

            dirs.sort()
            files.sort()

            playlist_dirs = []
            for d in dirs:
                name = urllib.unquote (d);
                playlist_dirs.append ([d, name])

            playlist_files = []
            for f in files:
                if not f.endswith ('.m3u'):
                    continue

                name = re.sub (r'\.m3u$', '', f)
                name = urllib.unquote (name);
                playlist_files.append ([f, name])


            self.set_leaf(tree, branches, dict([(d[0],{'relpath': d[0], 'name': d[1]}) for d in playlist_dirs]+ \
                                  [(f[0], {'relpath': f[0], 'name': f[1]}) for f in playlist_files]))
            if root == startpath:
                tree[root]['name'] = root
                tree[root]['fullpath'] = root



    def get_playlists (self, media_type):
        print "[get_playlists] type = %s" % media_type

        if (media_type == 'music'):
            paths = xbmc.translatePath('special://musicplaylists')

        paths = self._get_path_list (paths);

        tree = {}
        for path in paths:
            self.traverse_playlist_dir (tree, path)

        return tree



    def get_playlist_tracks (self, media_type, playlist):
        print "[get_playlist_tracks]  playlist['name']: %s\n" % playlist['name']

        filename = ''
        for component in playlist['path']:
            filename = os.path.join (filename, component);

        print "[get_playlist_tracks]  %s\n" % filename
        print "[get_playlist_tracks] creating m3u object..."
        m = m3u.m3u (filename, media_type)
        print "[get_playlist_tracks] getting tracks..."
        tracks = m.get_tracks ()

        return tracks



    def create_playlist_folder (self, media_type, playlist_folder):
        print "[create_playlist_folder] <%s> playlist_folder['name']: %s\n" % (media_type, playlist_folder['name'])

        ncomp = len (playlist_folder['path'])
        last_component = urllib.quote (playlist_folder['path'][ncomp - 1], '')
        playlist_folder['path'][ncomp - 1] = last_component

        filename = ''
        for component in playlist_folder['path']:
            if filename == '':
                filename = component
            else:
                filename = os.path.join (filename, component);

        print "[create_playlist_folder] full path: %s\n" % filename

        #try:
            #os.mkdir (filename)
        #except IOError as e:
            #return False;

        os.mkdir (filename)

        return last_component


        
    def create_playlist (self, media_type, playlist):
        print "[create_playlist] <%s> playlist['name']: %s\n" % (media_type, playlist['name'])

        ncomp = len (playlist['path'])
        last_component = urllib.quote (playlist['path'][ncomp - 1], '')
        playlist['path'][ncomp - 1] = last_component

        filename = ''
        for component in playlist['path']:
            if filename == '':
                filename = component
            else:
                filename = os.path.join (filename, component);

        print "[create_playlist] full path: %s\n" % filename
        print "[create_playlist] creating m3u object..."
        m = m3u.m3u (filename, media_type)
        print "[create_playlist] saving playlist..."
        result = m.save ()

        if result:
            return last_component

        return False



    def save_playlist_tracks (self, media_type, playlist, trackids):
        print "[save_playlist_tracks] <%s> playlist['name']: %s\n" % (media_type, playlist['name'])

        filename = ''
        for component in playlist['path']:
            if filename == '':
                filename = component
            else:
                filename = os.path.join (filename, component);

        print "[save_playlist_tracks] full path: %s\n" % filename
        print "[save_playlist_tracks] creating m3u object..."
        m = m3u.m3u (filename, media_type)
        m.set_tracks (trackids)
        print "[save_playlist_tracks] saving playlist..."
        result = m.save ()

        return result



    def rename_playlist_or_folder (self, media_type, old_path_components, new_path_components):
        old_filename = ''
        for component in old_path_components:
            if old_filename == '':
                old_filename = component
            else:
                old_filename = os.path.join (old_filename, component);

        ncomp = len (new_path_components)
        last_component = urllib.quote (new_path_components[ncomp - 1], '')
        new_path_components[ncomp - 1] = last_component

        new_filename = ''
        for component in new_path_components:
            if new_filename == '':
                new_filename = component
            else:
                new_filename = os.path.join (new_filename, component);

        print "[rename_playlist_or_folder] <%s> %s ==> %s\n" % (media_type, old_filename, new_filename)

        if os.path.exists (new_filename):
            print "[rename_playlist_or_folder] error - %s already exists\n", new_filename
            return False

        os.rename (old_filename, new_filename)

        if os.path.exists (new_filename):
            return last_component

        print "[rename_playlist_or_folder] error - %s not created\n", new_filename
        return False



    def delete_playlist (self, media_type, path_components):
        filename = '';
        for component in path_components:
            if filename == '':
                filename = component
            else:
                filename = os.path.join (filename, component);

        print "[delete_playlist] <%s> %s\n" % (media_type, filename)
        print "[delete_playlist] creating m3u object..."
        os.unlink (filename)

        if os.path.exists (filename):
            print "[delete_playlist] error - %s still exists\n", filename
            return False

        return True



    def delete_folder (self, media_type, path_components):
        filename = '';
        for component in path_components:
            if filename == '':
                filename = component
            else:
                filename = os.path.join (filename, component);

        print "[delete_folder] <%s> %s\n" % (media_type, filename)
        print "[delete_folder] creating m3u object..."
        os.rmdir (filename)

        if os.path.exists (filename):
            print "[delete_folder] error - %s still exists\n", filename
            return False

        return True



    def save_multiple_tracks (self, media_type, track_ids, changes):
        print "[save_multiple_tracks] <%s>\n" % (media_type)

        if media_type == 'music':
            db = xbmcdb.songdb()
            db.save_multiple_songs (track_ids, changes)
            return


    def get_song_count (self):
        num_songs = xbmcdb.song_db.get_song_count ();
        return num_songs


    def hello (self):
        return "qooxtunes"



#### rather than setting HOSTNAME to socket.getfqdn(), we set it to empty
#### so that it can respond to any hostname valid for the current machine
#### (i.e., its IP address, its hostname, localhost, etc.)
HOSTNAME = ''

__settings__  = xbmcaddon.Addon('webinterface.qooxtunes')
PORT_NUMBER = int (__settings__.getSetting('ws_port'))

server = SimpleJSONRPCServer.SimpleJSONRPCServer((HOSTNAME, PORT_NUMBER), qooxtunesJSONRPCRequestHandler)
server.register_introspection_functions()
server.register_instance(qooxtunesWebService ())
#server.register_function(get_download_songs_url)


print time.asctime(), "Server started - %s:%s" % (HOSTNAME, PORT_NUMBER)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
server.server_close()
print time.asctime(), "Server stopped - %s:%s" % (HOSTNAME, PORT_NUMBER)
