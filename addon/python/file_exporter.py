import shutil
import os
import errno

class file_exporter:

    def __init__(self):
        self.error_message = ''

    def get_error_message (self):
        return self.error_message

    def tally_path_segments (self, file):
        while (file != ''):

            (first, last) = os.path.split (file)
            if first == file:
                #### we've hit the top of the path, so bail out
                break

            if first not in self.path_segments:
                self.path_segments[first] = 0

            self.path_segments[first] += 1
            file = first

    def get_base_path (self):
        self.path_segments = {}
        for file in self.files:
            self.tally_path_segments (file)

        max_path_len = 0
        max_path = ''
        for segment in self.path_segments:
            if self.path_segments[segment] == len (self.files):
                if len (segment) > max_path_len:
                    max_path_len = len (segment)
                    max_path = segment

        #### use join() to append a final separator; this is important when
        #### we strip the base path from the full filenames
        self.base_path = os.path.join (max_path, '')


    def export (self, export_path, files):
        self.files = files

        self.base_path = ''
        print "  calculating base path..."
        self.get_base_path ()
        print "  base path : " + self.base_path

        for file in self.files:
            print "  - exporting file '" + file + "'..."
            basename = file.replace (self.base_path, '')
            export_file = os.path.join (export_path, basename)
            print "    writing to '" + export_file + "'..."

            (first, last) = os.path.split (export_file)
            try:
                print "    making dir '" + first + "'..."
                os.makedirs (first)
            except OSError as e:
                #### ignore directory already exists
                if e.errno == errno.EEXIST:
                    pass
                else:
                    self.error_message = "Could not copy '" + file + "' to '" + export_file + "': " + e.strerror
                    return False

            print "    copying file..."
            try:
                shutil.copy2(file, export_file)
            except OSError as e:
                self.error_message = "Could not copy '" + file + "' to '" + export_file + "': " + e.strerror
                return False

        return True

