module.exports = {
  testDir: 'pruebas',
  use: { baseURL: 'http://127.0.0.1:8123', launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'python3 -m http.server 8123 --bind 127.0.0.1', url: 'http://127.0.0.1:8123/index.html', reuseExistingServer: true },
};
