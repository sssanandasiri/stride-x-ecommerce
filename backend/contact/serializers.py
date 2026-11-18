from rest_framework import serializers


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    subject = serializers.CharField(max_length=150, required=False, allow_blank=True)
    message = serializers.CharField(min_length=5, max_length=3000)
    # Honeypot: this field is hidden from humans in the form. Bots fill every
    # field they see in the HTML, so a filled-in value means "probably a bot".
    hp_check = serializers.CharField(required=False, allow_blank=True, max_length=200)


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        return value.strip().lower()  # Test@Example.com and test@example.com are the same person
