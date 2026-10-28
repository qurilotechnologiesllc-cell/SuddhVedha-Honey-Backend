const APP_DIR = '/var/www/shuddhveda-honey-backend';

module.exports = {
    apps: [
        {
            name: 'shuddhveda-honey-backend',          // wahi purana naam
            script: 'index.js',
            cwd: APP_DIR,
            exec_mode: 'fork',
            instances: 1,
            max_memory_restart: '500M',
            env: { NODE_ENV: 'production' },
        },
        {
            name: 'shuddhveda-honey-email-worker',
            script: 'workers/email.worker.js',
            cwd: APP_DIR,
            exec_mode: 'fork',
            instances: 1,
            max_memory_restart: '300M',
            kill_timeout: 15000,                       // deploy pe chal rahe email jobs ko poora hone do
            exp_backoff_restart_delay: 200,            // crash hone pe loop mein na girey
            env: { NODE_ENV: 'production' },
        },
    ],
};