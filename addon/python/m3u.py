import os
import re
import codecs
import string

import xbmcdb


class m3u:
    
    #### music | video
    media_type = 'music'

    filename = ''
    tracks = []

    def __init__ (self, filename, media_type):
        self.filename = filename
        self.media_type = media_type

    def save (self):
        print "[m3u.save] opening %s for writing..." % self.filename;
        try:
            outfile = codecs.open(self.filename, mode="w", encoding="utf-8")
        except Exception as e:
            print "Error opening %s: %s" % self.filename, e
            return False

        outfile.write ("#EXTM3U\n")

        for t in self.tracks:
            if (len (t.files) > 0):
                outfile.write ("#EXTINF:" + str(t.duration) + ", " + t.artist + " - " + t.title + "\n")
                outfile.write (t.files[0] + "\n")

        outfile.close ()
        return True

    def set_tracks (self, songids):

        if (self.media_type == 'music'):
            db = xbmcdb.songdb ()
            db_tracks = db.get_songs (songids)

        track_lookup = {}
        for t in db_tracks:
            track_lookup[t.id] = t

        self.tracks = []
        for id in songids:
            if id in track_lookup:
                t = track_lookup[id]
                self.tracks.append (t)

    def get_tracks (self):
        tracks = []

        try:
            infile = codecs.open(self.filename, mode="r", encoding="utf-8")
        except Exception as e:
            return tracks

        duration = 0
        title = ''
        line = infile.readline()
        track_num = 0
        while (line != ""):

            if line.find(ur"#EXTINF") != -1:
                (duration, title) = re.match(ur"#EXTINF:(\d+),(.+)", line).groups()
                duration = int(duration)

            elif (re.match(ur"^\s*#", line) == None) and (re.search(ur"\w", line) != None):
                track_num = track_num + 1
                if self.media_type == 'music':
                    t = xbmcdb.song ()
                    t.track_num = track_num
                    t.title = title
                    t.duration = duration
                    t.files.append(string.strip (line))
                    print "[m3u.get_tracks]  - " + t.files[0].encode('utf-8') + "..."
                    tracks.append (t)
                    duration = 0
                    title = ''

            line = infile.readline()

        infile.close ()

        if self.media_type == 'music':
            print "[m3u.get_tracks] looking up song ids..."
            db = xbmcdb.songdb ()
            db.lookup_m3u_tracks (tracks)

        return tracks



if __name__ == "__main__":
    import sys
    import codecs
    if (len(sys.argv) != 2):
        print "Usage: script infile.m3u"
        sys.exit(1)
    try:
        m = m3u (sys.argv[1])
        tracks = m.get_tracks()

        for t in tracks:
            print "%s" % t.title
            print "%d" % t.duration
            print "%s" % t.files[0]
            print "\n"


    except Exception as e:
        print "Error when processing source file : ", e
        sys.exit(1)
