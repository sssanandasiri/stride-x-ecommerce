import os
import shutil
import tempfile
from io import BytesIO

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from catalog.factories import make_product, staff_token
from catalog.models import Product

TEMP_MEDIA = tempfile.mkdtemp()


def fake_image(fmt="PNG", size=(40, 40), name="photo.png", content_type="image/png"):
    buffer = BytesIO()
    Image.new("RGB", size, "red").save(buffer, fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ImageUploadTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        cache.clear()
        make_product("belt", stock=5, category="belts")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {staff_token()}")

    def upload(self, file):
        return self.client.post("/api/products/belt/image/", {"image": file}, format="multipart")

    def test_valid_upload_is_saved_with_a_random_name_and_served_as_a_full_url(self):
        response = self.upload(fake_image(name="../../evil name.png"))
        self.assertEqual(response.status_code, 200)
        url = response.data["image"]
        self.assertIn("/media/products/", url)
        self.assertTrue(url.endswith(".png"))
        self.assertNotIn("evil", url)                      # the user's file name is never used
        product = Product.objects.get(slug="belt")
        self.assertTrue(os.path.exists(product.image_file.path))

    def test_only_staff_may_upload(self):
        self.client.credentials()
        self.assertEqual(self.upload(fake_image()).status_code, 401)

    def test_non_images_and_disguised_files_are_rejected(self):
        fake = SimpleUploadedFile("shell.png", b"<?php echo 'hi'; ?>", content_type="image/png")
        self.assertEqual(self.upload(fake).status_code, 400)
        gif = fake_image("GIF", name="a.gif", content_type="image/gif")
        self.assertEqual(self.upload(gif).status_code, 400)   # only JPG / PNG / WebP are allowed

    def test_oversized_files_are_rejected(self):
        big = SimpleUploadedFile("big.png", b"0" * (5 * 1024 * 1024 + 1), content_type="image/png")
        self.assertEqual(self.upload(big).status_code, 400)

    def test_missing_file_is_a_clear_error(self):
        response = self.client.post("/api/products/belt/image/", {}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_replacing_a_photo_deletes_the_old_file(self):
        self.upload(fake_image())
        first_path = Product.objects.get(slug="belt").image_file.path
        self.upload(fake_image(size=(50, 50)))
        self.assertFalse(os.path.exists(first_path))
        self.assertTrue(os.path.exists(Product.objects.get(slug="belt").image_file.path))

    def test_typing_a_new_image_path_replaces_the_uploaded_photo(self):
        self.upload(fake_image())
        path = Product.objects.get(slug="belt").image_file.path
        response = self.client.patch("/api/products/belt/", {"image": "/images/belt.webp"}, format="json")
        self.assertEqual(response.data["image"], "/images/belt.webp")
        self.assertFalse(os.path.exists(path))

    def test_deleting_a_product_deletes_its_photo(self):
        self.upload(fake_image())
        path = Product.objects.get(slug="belt").image_file.path
        self.assertEqual(self.client.delete("/api/products/belt/").status_code, 204)
        self.assertFalse(os.path.exists(path))
