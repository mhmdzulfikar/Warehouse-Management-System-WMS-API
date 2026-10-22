import { Router } from 'express';
import {
  confirmSalesOrderHandler,
  createSalesOrderHandler,
  getDeliveryOrderByIdHandler,
  getDeliveryOrdersHandler,
  getSalesOrderByIdHandler,
  getSalesOrdersHandler,
  packSalesOrderHandler,
  pickSalesOrderHandler,
  shipSalesOrderHandler,
} from '../controllers/salesOrderController';
import { checkIsLoggedIn } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import {
  createSalesOrderSchema,
  shipSalesOrderSchema,
  updatePackingSchema,
  updatePickingSchema,
} from '../validations/salesOrderValidation';

const router = Router();

router.use(checkIsLoggedIn);

// Sales Orders Routes
router.get('/', getSalesOrdersHandler);
router.get('/:id', getSalesOrderByIdHandler);
router.post('/', validateRequest(createSalesOrderSchema), createSalesOrderHandler);
router.post('/:id/confirm', confirmSalesOrderHandler);
router.post('/:id/pick', validateRequest(updatePickingSchema), pickSalesOrderHandler);
router.post('/:id/pack', validateRequest(updatePackingSchema), packSalesOrderHandler);
router.post('/:id/ship', validateRequest(shipSalesOrderSchema), shipSalesOrderHandler);

export default router;
