import { Router } from 'express';
import {
  getDeliveryOrderByIdHandler,
  getDeliveryOrdersHandler,
} from '../controllers/salesOrderController';
import { checkIsLoggedIn } from '../middlewares/authMiddleware';

const router = Router();

router.use(checkIsLoggedIn);

router.get('/', getDeliveryOrdersHandler);
router.get('/:id', getDeliveryOrderByIdHandler);

export default router;
