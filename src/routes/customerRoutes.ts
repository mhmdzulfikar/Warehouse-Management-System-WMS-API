import { Router } from 'express';
import { createCustomerHandler, getCustomersHandler } from '../controllers/customerController';
import { checkIsLoggedIn } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createCustomerSchema } from '../validations/customerValidation';

const router = Router();

router.use(checkIsLoggedIn);

router.get('/', getCustomersHandler);
router.post('/', validateRequest(createCustomerSchema), createCustomerHandler);

export default router;
