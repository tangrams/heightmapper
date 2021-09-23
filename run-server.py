from http.server import HTTPServer, SimpleHTTPRequestHandler, test
import sys

# Allows the app to run locally without hitting CORS issues:
class CORSRequestHandler(SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header('Access-Control-Allow-Origin', '*')
    SimpleHTTPRequestHandler.end_headers(self)

if __name__ == '__main__':
  test(CORSRequestHandler, HTTPServer, port=int(sys.argv[1] if len(sys.argv) > 1 else 8000))
