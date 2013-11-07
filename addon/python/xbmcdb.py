import os

import re

import xbmc
import m3u

try:
    from sqlite3 import dbapi2 as sqlite
    print "[xbmcdb] Loading sqlite3 as DB engine"
except:
    from pysqlite2 import dbapi2 as sqlite
    print "[xbmcdb] Loading pysqlite2 as DB engine"

class track: 
    def __init__ (self):
        self.id = 0
        self.media_type = ''
        self.title = ""
        self.artist = ""
        self.duration = 0
        self.files = []

class song (track): 
    def __init__ (self):
        track.__init__ (self)
        self.album = ""
        self.artist = ""
        self.album = ""

class songdb:
    
    db_path = None
    db = None

    def __init__ (self):
        xbmc_version = xbmc.getInfoLabel('System.BuildVersion')

        print "[songdb.init] xbmc_version: " + xbmc_version

        xbmc_base_version = re.match (r"^(\d+)\.", xbmc_version).group (1)

        print "[songdb.init] xbmc_base_version: " + xbmc_base_version

        db_file = '';
        if xbmc_base_version == '12':
            db_file = 'MyMusic32'
        elif xbmc_base_version == '13':
            db_file = 'MyMusic37'

        if db_file == '':
            raise Exception ('Version ' + xbmc_base_version + ' of XBMC not supported');
            
        self.db_path = os.path.join (xbmc.translatePath('special://database'), db_file + '.db')

        #### @TODO: determine whether to use sqlite or mysql
        self.db = sqlite.connect (self.db_path)


    def get_song_count (self):
        rows = self.db.execute('SELECT count(1) FROM songview')

        num_songs = 0
        for row in rows:
            num_songs = row[0]
            break

        return num_songs


    def get_songs (self, songids):
        rows = self.db.execute('SELECT idSong, strTitle, strArtists, strAlbum, strPath, strFileName FROM songview WHERE idSong in (' + ",".join (str(n) for n in songids) + ')')

        songs = []

        for row in rows:
            s = song ()
            s.id = row[0]
            s.title = row[1]
            s.artist = row[2]
            s.album = row[3]
            
            song_file_path = os.path.join (row[4], row[5])
            s.files.append (song_file_path)

            songs.append (s)

        return songs


    def map_cols (self, k):
        return {
            'title'        : 'strTitle',
            'artist'       : 'strArtists',
            'albumartist'  : 'strAlbumArtists',
            'genre'        : 'strGenres',
            'track_number' : 'iTrack',
            'album'        : 'strAlbum',
            'year'         : 'iYear',
            'comment'      : 'comment',
            'rating'       : 'rating'
            }.get(k, '')


    def save_multiple_songs (self, songids, changes):
        sql = "UPDATE songview SET "

        cols = []
        vals = []
        for key in changes:
            col = self.map_cols (key)
            if col == '':
                continue

            cols.append (col + "= ?")
            vals.append (changes[key])
            
        sql += ", ".join (cols)
        sql += " WHERE idSong in ("
        sql += ", ".join (str(n) for n in songids)
        sql += ")"
        print "[songdb.save_multiple_songs] sql: " + sql
        self.db.execute(sql, vals)
        print "[songdb.save_multiple_songs] done"


    def lookup_m3u_tracks (self, songs):
        for s in songs:
            filename = s.files[0]
            path, basename = os.path.split (filename)

            #### paths in xbmc database have trailing slash
            path = os.path.join(path, "")

            cursor = self.db.cursor ()

            #print "[songdb.lookup_m3u_tracks] looking for " + path.encode ('utf-8') + ", " + basename.encode ('utf-8')
            cursor.execute ('SELECT idSong, strTitle, strArtists, strAlbum FROM songview WHERE strPath=? AND strFileName=? COLLATE NOCASE', (path, basename))
            rows = cursor.fetchall ()
            for row in rows:
                s.id = row[0]
                s.title = row[1]
                s.artist = row[2]
                s.album = row[3]

            #### on nasty case-insensitive filesystems, we may actually have a valid
            #### path in a playlist that doesn't match the database record exactly;
            #### use the LIKE operator (slower, but case-insensitive) as a fallback for
            #### those (hopefully rare) occasions
            if len (rows) == 0:
                cursor.execute ('SELECT idSong, strTitle, strArtists, strAlbum FROM songview WHERE strPath LIKE ? AND strFileName LIKE ?', (path, basename))
                rows = cursor.fetchall ()
                for row in rows:
                    s.id = row[0]
                    s.title = row[1]
                    s.artist = row[2]
                    s.album = row[3]
