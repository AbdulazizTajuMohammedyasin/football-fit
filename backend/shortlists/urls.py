from rest_framework.routers import SimpleRouter

from .views import SavedShortlistViewSet

router = SimpleRouter()
router.register("shortlists", SavedShortlistViewSet, basename="saved-shortlist")

urlpatterns = router.urls
