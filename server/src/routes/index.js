import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import adminRoutes from './admin.routes.js';
import couponRoutes from './coupon.routes.js';
import reviewRoutes from './review.routes.js';
import wishlistRoutes from './wishlist.routes.js';

const apiRouter = Router();

// Mount routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/coupons', couponRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/wishlist', wishlistRoutes);

export default apiRouter;
