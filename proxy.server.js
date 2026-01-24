import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[Proxy] ${req.method} ${req.url}`);
    next();
});

// Proxy for OpenAI
app.use('/api/openai', createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/openai': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        // Ensure Authorization header is passed
        if (req.headers.authorization) {
             proxyReq.setHeader('Authorization', req.headers.authorization);
        }
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (OpenAI):', err);
        res.status(500).send('Proxy Error');
    }
}));

// Proxy for Gemini (Google)
app.use('/api/google', createProxyMiddleware({
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/google': '',
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (Google):', err);
        res.status(500).send('Proxy Error');
    }
}));

// Proxy for Anthropic (Claude)
app.use('/api/anthropic', createProxyMiddleware({
    target: 'https://api.anthropic.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api/anthropic': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        if (req.headers['x-api-key']) {
            proxyReq.setHeader('x-api-key', req.headers['x-api-key']);
        }
        if (req.headers['anthropic-version']) {
            proxyReq.setHeader('anthropic-version', req.headers['anthropic-version']);
        }
        if (req.headers['anthropic-dangerous-direct-browser-access']) {
            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', req.headers['anthropic-dangerous-direct-browser-access']);
        }
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (Anthropic):', err);
        res.status(500).send('Proxy Error');
    }
}));

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
