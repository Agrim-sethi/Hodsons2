import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

function updateCsvPlugin() {
  return {
    name: 'update-csv',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/mark-attendance' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', () => {
            try {
              const { compNumber, date } = JSON.parse(body);
              const csvPath = path.resolve(__dirname, 'Attendance.csv');
              if (fs.existsSync(csvPath)) {
                let content = fs.readFileSync(csvPath, 'utf8');
                const lines = content.trim().split('\n');
                const updatedLines = lines.map((line, idx) => {
                  let found = false;
                  if (idx === 0) return line;
                  const parts = line.split(',');
                  if (parts.length >= 6 && parts[0].trim() === compNumber.trim()) {
                    found = true;
                    parts[5] = parts[5].trim() === 'Yes' ? 'No' : 'Yes';
                    const ongoingDate = date || new Date().toISOString().split('T')[0];
                    parts[4] = ongoingDate;
                    return parts.join(',');
                  }
                  return line;
                });

                // Check if any row was actually modified or matched
                const hasMatch = lines.some((line, idx) => {
                  if (idx === 0) return false;
                  const parts = line.split(',');
                  return parts.length >= 6 && parts[0].trim() === compNumber.trim();
                });

                if (hasMatch) {
                  fs.writeFileSync(csvPath, updatedLines.join('\n'));
                  res.end(JSON.stringify({ success: true }));
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: `Computer Number ${compNumber} not found in system` }));
                }
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'Attendance.csv not found' }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), updateCsvPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
