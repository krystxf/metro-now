import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3008;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World from TypeScript Express!');
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'dataloader'
    });
});

app.get('/status', (req: Request, res: Response) => {
    res.json({
        service: 'dataloader',
        version: '1.0.0',
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        port: port
    });
});

app.listen(port, () => {
    console.log(`🚀 Dataloader app listening on port ${port}`);
    console.log(`📍 Health check available at http://localhost:${port}/health`);
    console.log(`📍 Status endpoint available at http://localhost:${port}/status`);
});
