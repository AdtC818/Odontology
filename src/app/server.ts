import express from 'express';
import cors from 'cors';
import { envConfig } from './config/env.config';
import apiRoutes from './routes/api.routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' })); 

app.use('/api/v1', apiRoutes);

app.listen(envConfig.port, () => {
  console.log(`🚀 Servidor OdontoLeal ejecutándose en http://localhost:${envConfig.port}/api/v1/health`);
});