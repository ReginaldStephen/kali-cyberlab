from django.urls import path
from . import views

urlpatterns = [
    path('api/system/health', views.system_health_view, name='system_health'),
    path('api/terminal/execute', views.terminal_execute_view, name='terminal_execute'),
    path('api/scan/network', views.network_scan_view, name='network_scan'),
]
