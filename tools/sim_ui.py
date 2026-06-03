"""Interactive UI for the fault simulator -- a view, not a model.

A stdlib http.server (no extra deps, no build step, no JS toolchain) that serves
one static page and runs the REAL engine on every request. The page owns no
physics: it renders the flow + circuit graphs from graph.yaml, offers a
condition knob per node (choices come straight from faults.settable, so each
node offers exactly its allowed axis), and on every change POSTs the fault set
to /solve, which calls simulate.simulate() and returns the solve to paint back.

    python3 tools/sim_ui.py            # then open http://127.0.0.1:8765/
"""
from __future__ import annotations

import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import faults
from simulate import GRAPH, simulate

HERE = Path(__file__).resolve().parent
HTML = HERE / "sim_ui.html"


def _graph_payload():
    graph = faults.load(GRAPH)
    nodes, axis = faults.expand(graph)
    return {
        "flow": graph["flow"],
        "circuit": graph["circuit"],
        "kinds": graph["kinds"],
        "fail_axis": axis,
        "settable": faults.settable(nodes),
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._send(200, HTML.read_text(), "text/html; charset=utf-8")
        elif self.path == "/graph":
            self._send(200, json.dumps(_graph_payload()))
        else:
            self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/solve":
            self._send(404, json.dumps({"error": "not found"}))
            return
        n = int(self.headers.get("Content-Length", 0))
        try:
            req = json.loads(self.rfile.read(n) or b"{}")
            if not isinstance(req, dict):
                raise ValueError("request body must be a JSON object")
            rep = simulate(req.get("commanded_zones", []),
                           req.get("conditions", {}),
                           req.get("concurrent_zones"))
            self._send(200, json.dumps(rep))
        except ValueError as e:        # invalid condition -> faults.py message
            self._send(400, json.dumps({"error": str(e)}))
        except Exception as e:         # never 500 silently; surface it
            self._send(500, json.dumps({"error": repr(e)}))

    def log_message(self, *a):         # quiet
        pass


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    port = int(argv[0]) if argv else 8765
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"irrigation simulator UI -> http://127.0.0.1:{port}/  (Ctrl-C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
