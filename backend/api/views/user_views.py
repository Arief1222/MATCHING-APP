from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import BasePermission
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User, Group
from django.core.exceptions import ObjectDoesNotExist
from api.permission import IsSuperadminOrKepalaBpsReadOnly

class UserManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSuperadminOrKepalaBpsReadOnly]

    def get(self, request):
        """
        Menampilkan semua user dan role mereka.
        """
        users = User.objects.all()
        data = []
        for user in users:
            data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "roles": [group.name for group in user.groups.all()]
            })
        return Response(data)

    def post(self, request):
        """
        Membuat user baru beserta role-nya.
        """
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role')

        if not all([username, email, password, role]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.get(name=role)
        except Group.DoesNotExist:
            return Response({"error": f"Role '{role}' tidak ditemukan"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create(
            username=username,
            email=email,
            password=make_password(password)
        )
        user.groups.add(group)
        return Response({
            "message": "User created successfully",
            "username": user.username,
            "email": user.email,
            "role": role
        }, status=status.HTTP_201_CREATED)

    def put(self, request):
        """
        Mengedit user berdasarkan ID. Hanya bisa ubah email, password, dan role.
        """
        user_id = request.data.get('id')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role')

        if not user_id:
            return Response({"error": "Missing user ID"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if email:
            user.email = email
        if password:
            user.password = make_password(password)
        if role:
            try:
                group = Group.objects.get(name=role)
                user.groups.clear()  # hapus semua role sebelumnya
                user.groups.add(group)
            except Group.DoesNotExist:
                return Response({"error": f"Role '{role}' tidak ditemukan"}, status=status.HTTP_400_BAD_REQUEST)

        user.save()
        return Response({"message": "User updated successfully"})

    def delete(self, request):
        """
        Menghapus user berdasarkan ID.
        """
        user_id = request.data.get('id')

        if not user_id:
            return Response({"error": "Missing user ID"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({"message": "User deleted successfully"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)