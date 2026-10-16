"""Independent ZIP integrity and HTML/CSS resource closure for website checks."""
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import sys
import zipfile


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if "id" in values:
            assert values["id"] not in self.ids, values["id"]
            self.ids.add(values["id"])
        for key in ("href", "src"):
            if key in values:
                self.refs.append(values[key])


def verify(file):
    with zipfile.ZipFile(file) as archive:
        assert archive.testzip() is None
        names = set(archive.namelist())
        assert len(names) == len(archive.namelist())
        assert all(not name.startswith("/") and ".." not in PurePosixPath(name).parts for name in names)
        manifest = json.loads(archive.read("manifest.json"))
        assert len(manifest["files"]) == len(names) - 1
        for item in manifest["files"]:
            data = archive.read(item["name"])
            assert len(data) == item["bytes"]
            assert hashlib.sha256(data).hexdigest() == item["sha256"]
        parser = Links()
        parser.feed(archive.read("index.html").decode())
        for ref in parser.refs:
            if ref.startswith("#"):
                assert ref == "#" or ref[1:] in parser.ids, ref
            else:
                assert ":" not in ref and ref.split("#")[0] in names, ref
        pattern = r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)'''
        for name in (name for name in names if name.endswith(".css")):
            for match in re.findall(pattern, archive.read(name).decode()):
                url = next(value for value in match if value)
                if not url.startswith(("data:", "#")):
                    assert str(PurePosixPath(name).parent / url) in names, url


if __name__ == "__main__":
    files = list(Path(sys.argv[1]).glob("*.zip")) if Path(sys.argv[1]).is_dir() else [Path(file) for file in sys.argv[1:]]
    assert files, "No website ZIPs found."
    for file in files:
        verify(file)
    print(f"Independent ZIP CRC, hashes, safe paths and HTML/CSS resource closure passed for {len(files)} exports.")
