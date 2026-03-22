import { Router } from 'express';
import { uploadRoutes } from '../modules/upload/upload.controller';
import { projectRoutes } from '../modules/project/project.controller';

const apiRouter = Router();

apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/projects', projectRoutes);

export default apiRouter;
