from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('info/', views.info, name='info'),
    path('channels/', views.channels, name='channels'),
    path('main/<room_num>', views.room, name='room'),
    path('ending/', views.ending, name='ending'),
    path('tutorial/', views.tutorial, name='tutorial'),
    path('ajax_method/', views.ajax_method, name='ajax_method'),
    #path('download-csv/', views.download_csv, name='download_csv'),
]
