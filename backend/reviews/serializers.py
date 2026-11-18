from rest_framework import serializers

from .models import Review


class ReviewInputSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(min_length=3, max_length=1000)


class ReviewSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    author = serializers.CharField(source="author_name")
    date = serializers.DateTimeField(source="created_at")

    class Meta:
        model = Review
        fields = ["id", "author", "rating", "text", "date"]
