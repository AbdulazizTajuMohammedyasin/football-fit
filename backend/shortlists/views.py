from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SavedPlayer, SavedShortlist
from .serializers import (
    MAX_PLAYERS_PER_SHORTLIST,
    AddPlayerSerializer,
    SavedShortlistSerializer,
)


class SavedShortlistViewSet(viewsets.ModelViewSet):
    """The signed-in user's saved shortlists. Other users' lists are invisible (404)."""

    serializer_class = SavedShortlistSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "options"]

    def get_queryset(self):
        return SavedShortlist.objects.filter(owner=self.request.user).prefetch_related("entries")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"], url_path="players")
    def add_player(self, request, pk=None):
        shortlist = self.get_object()
        payload = AddPlayerSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        if shortlist.entries.count() >= MAX_PLAYERS_PER_SHORTLIST:
            raise ValidationError(
                {"player_slug": f"A shortlist can hold up to {MAX_PLAYERS_PER_SHORTLIST} players."}
            )
        try:
            with transaction.atomic():
                SavedPlayer.objects.create(shortlist=shortlist, **payload.validated_data)
        except IntegrityError as exc:
            raise ValidationError({"player_slug": "This player is already on the list."}) from exc
        shortlist.save(update_fields=["updated_at"])
        # Re-read so the response does not use the entries prefetched before the insert.
        shortlist = self.get_queryset().get(pk=shortlist.pk)
        return Response(self.get_serializer(shortlist).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"players/(?P<player_slug>[-\w]+)")
    def remove_player(self, request, pk=None, player_slug=None):
        shortlist = self.get_object()
        entry = get_object_or_404(SavedPlayer, shortlist=shortlist, player_slug=player_slug)
        entry.delete()
        shortlist.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
