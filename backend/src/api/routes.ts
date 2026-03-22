import { Router } from 'express';
import { uploadRoutes } from '../modules/upload/upload.controller';
import { projectRoutes } from '../modules/project/project.controller';
import { systemRoutes } from '../modules/system/system.controller';

const apiRouter = Router();

apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/system', systemRoutes);

export default apiRouter;
