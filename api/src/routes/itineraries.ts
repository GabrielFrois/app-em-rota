import { Router } from 'express';
import {
  listMyItineraries, listSharedItineraries, getItinerary,
  createItinerary, updateItinerary, deleteItinerary,
  createActivity, updateActivity, deleteActivity,
  shareItinerary, removeShare,
} from '../controllers/itineraryController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/',       listMyItineraries);
router.get('/shared', listSharedItineraries);
router.get('/:id',    getItinerary);
router.post('/',      createItinerary);
router.patch('/:id',  updateItinerary);
router.delete('/:id', deleteItinerary);

router.post('/:id/share',                 shareItinerary);
router.delete('/:id/share/:targetUserId', removeShare);

router.post('/days/:dayId/activities',        createActivity);
router.patch('/activities/:activityId',       updateActivity);
router.delete('/activities/:activityId',      deleteActivity);

export default router;
