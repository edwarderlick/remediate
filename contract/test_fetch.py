# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
import urllib.request
from genlayer import *

class TestFetch(gl.Contract):
    dummy: u256

    def __init__(self):
        self.dummy = u256(1)

    @gl.public.write
    def test_osv(self, advisory_id: str) -> str:
        def fetch_task() -> str:
            url = f"https://api.osv.dev/v1/vulns/{advisory_id}"
            try:
                res = gl.nondet.web.render(url, mode="text")
                return f"GL_WEB_RENDER: {len(res)} bytes"
            except Exception as e:
                return f"GL_WEB_RENDER_ERR: {str(e)}"
        
        try:
            return gl.eq_principle.strict_eq(fetch_task)
        except Exception as e:
            return f"EXEC_ERR: {str(e)}"

    @gl.public.write
    def test_urllib(self, advisory_id: str) -> str:
        def fetch_task() -> str:
            url = f"https://api.osv.dev/v1/vulns/{advisory_id}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                res = urllib.request.urlopen(req, timeout=10)
                data = res.read().decode('utf-8')
                return f"URLLIB_OK: {len(data)} bytes"
            except Exception as e:
                return f"URLLIB_ERR: {str(e)}"
                
        try:
            return gl.eq_principle.strict_eq(fetch_task)
        except Exception as e:
            return f"EXEC_ERR: {str(e)}"

    @gl.public.write
    def test_storage(self, advisory_id: str) -> str:
        def fetch_task() -> str:
            url = f"https://storage.googleapis.com/osv-vulnerabilities/GitHub%20Advisories/{advisory_id}.json"
            try:
                res = gl.nondet.web.render(url, mode="text")
                return f"STORAGE_GL_WEB: {len(res)} bytes"
            except Exception as e:
                return f"STORAGE_GL_WEB_ERR: {str(e)}"
                
        try:
            return gl.eq_principle.strict_eq(fetch_task)
        except Exception as e:
            return f"EXEC_ERR: {str(e)}"
