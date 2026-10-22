from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("meta/", views.meta, name="meta"),
    path("clubs/", views.club_list, name="club-list"),
    path("clubs/<slug:slug>/", views.club_detail, name="club-detail"),
    path("clubs/<slug:slug>/needs/", views.club_needs_view, name="club-needs"),
    path(
        "clubs/<slug:slug>/recommendations/",
        views.club_recommendations,
        name="club-recommendations",
    ),
    path("players/", views.player_list, name="player-list"),
    path("players/<slug:slug>/", views.player_detail, name="player-detail"),
    path("compare/", views.compare, name="compare"),
]
