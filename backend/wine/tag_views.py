from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from wine.models import Tag
from wine.serializers import TagSerializer


class TagListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tags = Tag.objects.all()
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)
