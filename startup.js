// PM2 起動スクリプト
const pm2 = require('pm2');

pm2.connect(function(err) {
  if (err) {
    console.error('PM2接続エラー:', err);
    process.exit(2);
  }
  
  pm2.start({
    script: 'dist/index.js',
    name: 'discord-voice-mover-bot',
    exec_mode: 'fork',
    max_memory_restart: '200M',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production'
    },
    output: './logs/pm2_out.log',
    error: './logs/pm2_error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }, function(err, apps) {
    pm2.disconnect();
    if (err) {
      console.error('PM2起動エラー:', err);
      return;
    }
    console.log('PM2が正常に起動しました');
  });
});
